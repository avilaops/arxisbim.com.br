/**
 * IFC Geometry Pipeline Service (S08) — spawna o worker de geometria, salva o
 * GLB no storage (cache de render) e devolve o GeometryManifest com glbKey.
 *
 * GLB é regenerável: fonte de verdade = IFC original + IFCStructure (S07). Logs
 * no formato S06. Worker em thread separada: não bloqueia event loop.
 */
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { logger } from '../../core/observability/service.js';
import { getStorage } from '../../core/storage/index.js';
import type { GeometryManifest } from './ifc-geometry.dto.js';
import type { GeometryRequest, GeometryResult } from './ifc-geometry.worker.js';

export interface BuildGeometryInput {
  buffer: ArrayBuffer;
  modelVersionId: string;
  tenantId: string;
  reqId: string;
  timeoutMs?: number;
}

export class IfcGeometryError extends Error {
  constructor(public readonly errorType: string, message: string) {
    super(message);
    this.name = 'IfcGeometryError';
  }
}

/** Key do GLB cacheado por modelo. */
export function buildGlbKey(tenantId: string, modelVersionId: string): string {
  return `tenants/${tenantId}/geometry/${modelVersionId}.glb`;
}

export class IfcGeometryPipelineService {
  /** Extrai geometria, persiste GLB e retorna o manifest (com glbKey preenchido). */
  async buildGeometry(input: BuildGeometryInput): Promise<GeometryManifest> {
    const { buffer, modelVersionId, tenantId, reqId, timeoutMs = 120_000 } = input;

    const result = await this.runWorker({ buffer, modelVersionId, reqId }, timeoutMs);

    if (!result.ok) {
      logger.error('IFC geometry failed', undefined, {
        req_id: reqId, model_version_id: modelVersionId,
        status: 'failed', error_type: result.errorType, duration_ms: result.durationMs,
      });
      throw new IfcGeometryError(result.errorType, result.message);
    }

    // Persiste o GLB (cache). Falha de storage não invalida o manifest em memória,
    // mas glbKey fica null → caller decide reprocessar.
    const glbKey = buildGlbKey(tenantId, modelVersionId);
    let savedKey: string | null = null;
    try {
      await getStorage().upload(glbKey, Buffer.from(result.glb), { contentType: 'model/gltf-binary' });
      savedKey = glbKey;
    } catch (err) {
      logger.error('GLB upload failed', err, { req_id: reqId, model_version_id: modelVersionId });
    }

    const manifest: GeometryManifest = { ...result.manifest, glbKey: savedKey };

    logger.info('IFC geometry success', {
      req_id: reqId, model_version_id: modelVersionId,
      mesh_count: manifest.meshCount,
      instanced_groups: manifest.instancedGroups.length,
      glb_bytes: result.glb.byteLength,
      duration_ms: result.durationMs, status: 'success',
    });

    return manifest;
  }

  private runWorker(req: GeometryRequest, timeoutMs: number): Promise<GeometryResult> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const worker = new Worker(fileURLToPath(new URL('./ifc-geometry.worker.js', import.meta.url)));

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        worker.terminate().catch(() => {});
        reject(new IfcGeometryError('IFC_GEOMETRY_TIMEOUT', `geometria excedeu ${timeoutMs}ms`));
      }, timeoutMs);

      worker.once('message', (result: GeometryResult) => {
        if (settled) return;
        settled = true; clearTimeout(timer);
        worker.terminate().catch(() => {});
        resolve(result);
      });
      worker.once('error', (err: unknown) => {
        if (settled) return;
        settled = true; clearTimeout(timer);
        worker.terminate().catch(() => {});
        reject(new IfcGeometryError('IFC_WORKER_ERROR', err instanceof Error ? err.message : String(err)));
      });
      worker.once('exit', (code: number) => {
        if (settled) return;
        settled = true; clearTimeout(timer);
        reject(new IfcGeometryError('IFC_WORKER_EXIT', `worker saiu com código ${code} antes de responder`));
      });

      worker.postMessage(req, [req.buffer]);
    });
  }
}
