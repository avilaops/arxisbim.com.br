import { createHash } from 'node:crypto';
import { Worker } from 'node:worker_threads';
import { and, eq, isNull, desc, sql, inArray } from 'drizzle-orm';
import { withTenant } from '../../shared/database/db.js';
import { ifcModels, projects, models, modelVersions } from '../../shared/database/schema/projects.js';
import { scenarios } from '../../shared/database/schema/scenarios.js';
import { elementProperties } from '../../shared/database/schema/element-properties.js';
import { storage } from '../../core/storage/index.js';
import { chunk } from './ifc-properties-store.service.js';
import { IfcParserStructureService } from './ifc-parser-structure.service.js';
import type { ElementProperties } from './ifc-properties.dto.js';
import type { db } from '../../shared/database/db.js';

export class Ifc5dError extends Error {
  constructor(public readonly statusCode: number, message: string) { super(message); }
}

/** Accept storage keys only; never fetch URLs or accept caller-supplied paths. */
export function safeIfcStorageKey(value: string, tenantId: string): string {
  const key = value.replace(/^\/?api\/v1\/storage\//, '');
  const segments = key.split('/');
  if (/[\\:%\x00-\x1f]/.test(key) || segments.some(p => !p || p === '.' || p === '..') ||
      !key.endsWith('.ifc') ||
      !(key.startsWith(`tenants/${tenantId}/ifc/`) || (segments.length === 2 && segments[0] === 'ifc'))) {
    throw new Ifc5dError(422, 'Arquivo IFC fora do armazenamento permitido');
  }
  return key;
}

export async function extract5dProperties(buffer: Buffer): Promise<ElementProperties[]> {
  const bytes = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  const structure = await new IfcParserStructureService().parseStructure({ buffer: bytes, modelVersionId: 'prepare-5d', reqId: 'prepare-5d' });
  // Property extraction is CPU-bound too: do not run a second WASM parse on Fastify's event loop.
  const base = import.meta.url.replace('/src/', '/dist/').replace(/\.ts$/, '.js');
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./ifc-5d-properties.worker.js', base));
    let settled = false;
    const finish = (error?: Error, properties?: ElementProperties[]) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker.terminate().catch(() => {});
      if (error) reject(error); else resolve(properties!);
    };
    const timer = setTimeout(() => finish(new Ifc5dError(422, 'Extração de propriedades IFC excedeu o tempo limite')), 120_000);
    worker.once('message', result => result.ok ? finish(undefined, result.properties) : finish(new Ifc5dError(422, result.message)));
    worker.once('error', error => finish(error instanceof Error ? error : new Error(String(error))));
    worker.once('exit', code => finish(new Error(`IFC property worker exited before completion (${code})`)));
    worker.postMessage({ buffer: bytes, elements: structure.elements, lengthUnit: structure.units.length });
  });
}

type Store = typeof db;

function assertUniqueGlobalIds(elements: ReadonlyArray<{ globalId: string }>) {
  const seen = new Set<string>();
  for (const element of elements) {
    const id = element.globalId;
    if (!id || id.trim() !== id || seen.has(id)) {
      throw new Ifc5dError(422, 'IFC contém GlobalId vazio ou repetido; corrija as identidades dos elementos antes de orçar');
    }
    seen.add(id);
  }
}

async function readContext(tx: Store, modelId: string, scenarioId: string, tenantId: string, lock = false) {
  const sourceQuery = tx.select({ model: ifcModels }).from(ifcModels)
    .innerJoin(projects, eq(projects.id, ifcModels.projectId))
    .where(and(eq(ifcModels.id, modelId), eq(ifcModels.tenantId, tenantId), eq(projects.tenantId, tenantId), isNull(projects.deletedAt)));
  const [source] = await (lock ? sourceQuery.for('update', { of: ifcModels }) : sourceQuery);
  if (!source) throw new Ifc5dError(404, 'Modelo IFC não encontrado');
  const scenarioQuery = tx.select().from(scenarios)
    .where(and(eq(scenarios.id, scenarioId), eq(scenarios.tenantId, tenantId), isNull(scenarios.deletedAt)));
  const [scenario] = await (lock ? scenarioQuery.for('update') : scenarioQuery);
  if (!scenario) throw new Ifc5dError(404, 'Cenário não encontrado');
  if (scenario.projectId !== source.model.projectId) throw new Ifc5dError(409, 'Modelo e cenário devem pertencer ao mesmo projeto');
  return { source: source.model, scenario, key: safeIfcStorageKey(source.model.fileUrl, tenantId) };
}

async function findSourceVersion(tx: Store, context: Awaited<ReturnType<typeof readContext>>, lock = false) {
  const aliases = [context.key, `/api/v1/storage/${context.key}`, `api/v1/storage/${context.key}`];
  const conditions = and(eq(models.projectId, context.source.projectId), isNull(models.deletedAt), inArray(modelVersions.storageKey, aliases));
  if (context.scenario.modelVersionId) {
    const linkedQuery = tx.select({ version: modelVersions }).from(modelVersions)
      .innerJoin(models, eq(models.id, modelVersions.modelId))
      .where(and(conditions, eq(modelVersions.id, context.scenario.modelVersionId)));
    const [linked] = await (lock ? linkedQuery.for('update', { of: modelVersions }) : linkedQuery);
    if (linked) return linked.version;
  }
  // Exact storage identity within the authorized project bridges older models with different IDs.
  const query = tx.select({ version: modelVersions }).from(modelVersions)
    .innerJoin(models, eq(models.id, modelVersions.modelId)).where(conditions)
    .orderBy(desc(modelVersions.version), desc(modelVersions.id));
  const existing = await (lock ? query.for('update', { of: modelVersions }) : query);
  return existing.find(row => row.version.status === 'ready')?.version ?? existing[0]?.version;
}

function requiresExtraction(version: typeof modelVersions.$inferSelect | undefined, props: ReadonlyArray<{ globalId: string }>) {
  return !version || version.status !== 'ready' || !props.length ||
    (version.metadata?.element_count != null && version.metadata.element_count !== props.length);
}

export class Ifc5dService {
  constructor(private download = (key: string) => storage.download(key), private extract = extract5dProperties) {}

  async prepare(modelId: string, scenarioId: string, tenantId: string) {
    const initial = await withTenant(tenantId, async tx => {
      const context = await readContext(tx, modelId, scenarioId, tenantId);
      const version = await findSourceVersion(tx, context);
      const props = version ? await tx.select().from(elementProperties).where(eq(elementProperties.modelVersionId, version.id)) : [];
      const needsExtraction = requiresExtraction(version, props);
      if (!needsExtraction) assertUniqueGlobalIds(props);
      return { projectId: context.source.projectId, key: context.key, needsExtraction };
    });
    // Expensive I/O and WASM finish before opening the persistence transaction or taking cost locks.
    let prepared: { buffer: Buffer; properties: ElementProperties[] } | undefined;
    if (initial.needsExtraction) {
      const buffer = await this.download(initial.key);
      const properties = await this.extract(buffer);
      if (!properties.length) throw new Ifc5dError(422, 'IFC sem elementos para orçamento');
      assertUniqueGlobalIds(properties);
      prepared = { buffer, properties };
    }
    return withTenant(tenantId, async tx => {
      // Shared with cost calculation, pricing and CRUD. Always before row locks.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${initial.projectId}, 514005005))`);
      const context = await readContext(tx, modelId, scenarioId, tenantId, true);
      if (context.source.projectId !== initial.projectId || context.key !== initial.key) {
        throw new Ifc5dError(409, 'Modelo IFC mudou durante o preparo; tente novamente');
      }
      const { source, scenario, key } = context;
      let version = await findSourceVersion(tx, context, true);
      let createdVersion = false;
      if (!version) {
        // New legacy uploads use a durable one-to-one model ID mapping.
        await tx.insert(models).values({ id: modelId, projectId: source.projectId, name: source.name }).onConflictDoNothing();
        const [mapped] = await tx.select().from(models).where(and(eq(models.id, modelId), eq(models.projectId, source.projectId), isNull(models.deletedAt)));
        if (!mapped) throw new Ifc5dError(409, 'Mapeamento do modelo incompatível');
        const versions = await tx.select().from(modelVersions).where(eq(modelVersions.modelId, modelId)).orderBy(desc(modelVersions.version));
        [version] = await tx.insert(modelVersions).values({ modelId, version: (versions[0]?.version ?? 0) + 1, status: 'processing', storageKey: key }).returning();
        createdVersion = true;
      }
      if (!version) throw new Error('Não foi possível criar a versão IFC');
      let props = await tx.select().from(elementProperties).where(eq(elementProperties.modelVersionId, version.id));
      if (requiresExtraction(version, props)) {
        if (!prepared) throw new Ifc5dError(409, 'Propriedades IFC mudaram durante o preparo; tente novamente');
        const { buffer, properties: extracted } = prepared;
        await tx.delete(elementProperties).where(eq(elementProperties.modelVersionId, version.id));
        for (const batch of chunk(extracted, 1000)) {
          await tx.insert(elementProperties).values(batch.map(p => ({
            modelVersionId: version!.id, expressId: p.expressID, globalId: p.globalId,
            ifcType: p.ifcType, name: p.name, storeyId: p.storeyId,
            areaM2: p.areaM2 == null ? null : String(p.areaM2),
            volumeM3: p.volumeM3 == null ? null : String(p.volumeM3),
            lengthM: p.lengthM == null ? null : String(p.lengthM), properties: p.properties,
          })));
        }
        await tx.update(modelVersions).set({ status: 'ready', processedAt: new Date(), fileSize: buffer.length,
          sha256: createHash('sha256').update(buffer).digest('hex'),
          metadata: { ...version.metadata, ifcModelId: modelId, element_count: extracted.length } as typeof modelVersions.$inferInsert.metadata,
        }).where(eq(modelVersions.id, version.id));
        props = await tx.select().from(elementProperties).where(eq(elementProperties.modelVersionId, version.id));
      }
      assertUniqueGlobalIds(props);
      // Preserve extraction metadata while recording the selected source even on a ready-version reuse.
      await tx.execute(sql`UPDATE model_versions SET metadata=COALESCE(metadata, '{}'::jsonb)
        || jsonb_build_object('ifcModelId', ${source.id}::text) WHERE id=${version.id}`);
      await tx.update(models).set({ currentVersionId: version.id })
        .where(and(eq(models.id, version.modelId), createdVersion ? undefined : isNull(models.currentVersionId)));
      if (scenario.modelVersionId !== version.id) {
        // These links contain measured quantities from the previous version.
        await tx.execute(sql`DELETE FROM element_cost_links WHERE scenario_id=${scenarioId}`);
        await tx.execute(sql`UPDATE scenarios SET cached_total_cost=NULL, cached_cost_updated_at=NULL, estimated_cost=NULL
          WHERE id=${scenarioId} AND tenant_id=${tenantId}`);
      }
      await tx.update(scenarios).set({ modelVersionId: version.id, updatedAt: new Date() }).where(and(eq(scenarios.id, scenarioId), eq(scenarios.tenantId, tenantId)));
      return { modelVersionId: version.id, status: 'ready' as const, elementCount: props.length,
        quantitiesCount: props.filter(p => p.areaM2 != null || p.volumeM3 != null || p.lengthM != null).length };
    });
  }
}
