/**
 * IFC Structure Parser Service (S07) — spawna o worker web-ifc e devolve o
 * `IFCStructure`. Emite logs no formato do S06 (sucesso/falha com req_id,
 * model_version_id, schema, file_size_mb, elements, duration_ms, error_type).
 *
 * O worker roda em thread separada: parse WASM não bloqueia o event loop.
 */
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { logger } from '../../core/observability/service.js';
import type { IFCStructure } from './ifc-structure.dto.js';
import type { ParseRequest, ParseResult } from './ifc-parser.worker.js';

export interface ParseStructureInput {
  buffer: ArrayBuffer;
  modelVersionId: string;
  reqId: string;
  /** Timeout do parse. Default 60s (benchmark S07/risco de 200MB > 60s). */
  timeoutMs?: number;
}

export class IfcParseError extends Error {
  constructor(public readonly errorType: string, message: string) {
    super(message);
    this.name = 'IfcParseError';
  }
}

function workerUrl(): URL {
  // Em prod o worker compilado fica ao lado deste service (dist/modules/ifc/).
  return new URL('./ifc-parser.worker.js', import.meta.url);
}

export class IfcParserStructureService {
  /** Faz parse de um buffer IFC e retorna o DTO estável. Spawna 1 worker por parse. */
  async parseStructure(input: ParseStructureInput): Promise<IFCStructure> {
    const { buffer, modelVersionId, reqId, timeoutMs = 60_000 } = input;

    const result = await this.runWorker({ buffer, modelVersionId, reqId }, timeoutMs);

    if (!result.ok) {
      // Falha: log no formato S06 + erro tipado p/ o caller marcar status=failed.
      logger.error('IFC parse failed', undefined, {
        req_id: reqId,
        model_version_id: modelVersionId,
        status: 'failed',
        error_type: result.errorType,
        duration_ms: result.durationMs,
      });
      throw new IfcParseError(result.errorType, result.message);
    }

    logger.info('IFC parse success', {
      req_id: reqId,
      model_version_id: modelVersionId,
      schema: result.structure.schema,
      file_size_mb: Math.round(result.fileSizeMb),
      elements: result.structure.stats.totalElements,
      duration_ms: result.durationMs,
      status: 'success',
    });

    return result.structure;
  }

  private runWorker(req: ParseRequest, timeoutMs: number): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const worker = new Worker(fileURLToPath(workerUrl()));

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        worker.terminate().catch(() => {});
        reject(new IfcParseError('IFC_PARSE_TIMEOUT', `parse excedeu ${timeoutMs}ms`));
      }, timeoutMs);

      worker.once('message', (result: ParseResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        worker.terminate().catch(() => {});
        resolve(result);
      });

      worker.once('error', (err: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        worker.terminate().catch(() => {});
        reject(new IfcParseError('IFC_WORKER_ERROR', err instanceof Error ? err.message : String(err)));
      });

      // Crash duro do WASM pode encerrar a thread sem emitir 'message' — sem este
      // handler a Promise só resolveria no timeout (60s pendurado). Rejeita na hora.
      worker.once('exit', (code: number) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(new IfcParseError('IFC_WORKER_EXIT', `worker saiu com código ${code} antes de responder`));
      });

      // ArrayBuffer transferível: evita copiar o arquivo inteiro p/ o worker.
      worker.postMessage(req, [req.buffer]);
    });
  }
}
