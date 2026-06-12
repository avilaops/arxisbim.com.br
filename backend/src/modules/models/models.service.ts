import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { db, withTenant } from '../../shared/database/db.js';
import { projects, models, modelVersions } from '../../shared/database/schema/projects.js';
import { files } from '../../shared/database/schema/files.js';

function notFound(msg: string) {
  return Object.assign(new Error(msg), { statusCode: 404 });
}

export class ModelsService {
  /** Verifica que o projeto pertence ao tenant e não foi deletado. */
  private async assertProject(projectId: string, tenantId: string) {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.tenantId, tenantId), isNull(projects.deletedAt)))
      .limit(1);
    if (!project) throw notFound('Project not found');
  }

  /** Verifica que o model pertence (via project) ao tenant. Retorna a linha. */
  private async assertModel(modelId: string, tenantId: string) {
    const [row] = await db
      .select({
        id: models.id,
        projectId: models.projectId,
        name: models.name,
        currentVersionId: models.currentVersionId,
      })
      .from(models)
      .innerJoin(projects, eq(models.projectId, projects.id))
      .where(and(
        eq(models.id, modelId),
        eq(projects.tenantId, tenantId),
        isNull(models.deletedAt),
        isNull(projects.deletedAt),
      ))
      .limit(1);
    if (!row) throw notFound('Model not found');
    return row;
  }

  async list(projectId: string, tenantId: string) {
    await this.assertProject(projectId, tenantId);
    return db.select().from(models)
      .where(and(eq(models.projectId, projectId), isNull(models.deletedAt)))
      .orderBy(desc(models.createdAt));
  }

  async get(modelId: string, tenantId: string) {
    const model = await this.assertModel(modelId, tenantId);
    const versions = await db.select().from(modelVersions)
      .where(eq(modelVersions.modelId, modelId))
      .orderBy(desc(modelVersions.version));
    return { ...model, versions };
  }

  /**
   * Cria model + versão 1 com status 'uploading' (atômico).
   * Retorna model e a versão criada.
   */
  async create(projectId: string, tenantId: string, input: { name: string; storageKey?: string }) {
    await this.assertProject(projectId, tenantId);

    return withTenant(tenantId, async (tx) => {
      const [model] = await tx.insert(models)
        .values({ projectId, name: input.name })
        .returning();

      const [version] = await tx.insert(modelVersions)
        .values({
          modelId: model.id,
          version: 1,
          status: 'uploading',
          storageKey: input.storageKey ?? null,
        })
        .returning();

      return { ...model, version };
    });
  }

  /**
   * Resolve um upload confirmado (S02 files pipeline) do próprio tenant.
   * Retorna storageKey/sha256/fileSize prontos para a versão.
   */
  private async resolveFile(fileId: string, tenantId: string) {
    const [file] = await db
      .select({ storageKey: files.storageKey, sha256: files.sha256, sizeBytes: files.sizeBytes, status: files.status })
      .from(files)
      .where(and(eq(files.id, fileId), eq(files.tenantId, tenantId)))
      .limit(1);
    if (!file) throw notFound('File not found');
    if (file.status !== 'uploaded') {
      throw Object.assign(new Error('Upload ainda não confirmado'), { statusCode: 409 });
    }
    return { storageKey: file.storageKey, sha256: file.sha256 ?? undefined, fileSize: file.sizeBytes ?? undefined };
  }

  /**
   * Novo upload do mesmo model → cria nova model_version com número incrementado.
   * Aceita `fileId` (registro do pipeline S02) OU campos avulsos.
   */
  async createVersion(modelId: string, tenantId: string, input: { fileId?: string; storageKey?: string; sha256?: string; fileSize?: number }) {
    await this.assertModel(modelId, tenantId);

    if (input.fileId) {
      const resolved = await this.resolveFile(input.fileId, tenantId);
      input = { ...input, ...resolved };
    }

    return withTenant(tenantId, async (tx) => {
      // MAX(version) + 1 dentro da transação; UNIQUE(model_id, version) garante consistência
      const [{ next }] = await tx
        .select({ next: sql<number>`COALESCE(MAX(${modelVersions.version}), 0) + 1` })
        .from(modelVersions)
        .where(eq(modelVersions.modelId, modelId));

      const [version] = await tx.insert(modelVersions)
        .values({
          modelId,
          version: Number(next),
          status: 'uploading',
          storageKey: input.storageKey ?? null,
          sha256: input.sha256 ?? null,
          fileSize: input.fileSize ?? null,
        })
        .returning();

      return version;
    });
  }

  /**
   * Atualiza status de uma versão. Quando vira 'ready':
   *  - current_version_id do model aponta para ela
   *  - status cacheado do projeto é atualizado
   */
  async updateVersionStatus(
    versionId: string,
    tenantId: string,
    input: { status: 'uploading' | 'processing' | 'ready' | 'failed'; sha256?: string; fileSize?: number; metadata?: Record<string, any> },
  ) {
    // Ownership: version → model → project → tenant
    const [row] = await db
      .select({ versionId: modelVersions.id, modelId: modelVersions.modelId, projectId: models.projectId })
      .from(modelVersions)
      .innerJoin(models, eq(modelVersions.modelId, models.id))
      .innerJoin(projects, eq(models.projectId, projects.id))
      .where(and(eq(modelVersions.id, versionId), eq(projects.tenantId, tenantId)))
      .limit(1);
    if (!row) throw notFound('Version not found');

    return withTenant(tenantId, async (tx) => {
      const now = new Date();
      const [version] = await tx.update(modelVersions)
        .set({
          status: input.status,
          ...(input.sha256 && { sha256: input.sha256 }),
          ...(input.fileSize !== undefined && { fileSize: input.fileSize }),
          ...(input.metadata && { metadata: input.metadata as any }),
          ...(input.status === 'ready' && { processedAt: now }),
        })
        .where(eq(modelVersions.id, versionId))
        .returning();

      if (input.status === 'ready') {
        await tx.update(models)
          .set({ currentVersionId: versionId })
          .where(eq(models.id, row.modelId));
      }

      // Cache de status do projeto (S03: dashboard lê sem varrer versões)
      const projectStatus =
        input.status === 'ready' ? 'ready'
        : input.status === 'failed' ? 'failed'
        : 'processing';
      await tx.update(projects)
        .set({ status: projectStatus, updatedAt: now })
        .where(eq(projects.id, row.projectId));

      return version;
    });
  }

  /** Soft-delete do model. */
  async delete(modelId: string, tenantId: string) {
    await this.assertModel(modelId, tenantId);
    await db.update(models)
      .set({ deletedAt: new Date() })
      .where(eq(models.id, modelId));
  }
}
