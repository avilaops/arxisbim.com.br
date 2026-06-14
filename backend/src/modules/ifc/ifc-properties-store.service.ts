/**
 * Property persistence (S13) — grava ElementProperties em lotes.
 *
 * 50k elementos = 50k rows: insere em batches de 1000 dentro de transação p/ não
 * estourar memória nem segurar lock gigante. Idempotente por modelo (limpa antes).
 * (Distinto do `ifc-properties.service.ts` legado de análise.)
 */
import { eq } from 'drizzle-orm';
import { db } from '../../shared/database/db.js';
import { elementProperties } from '../../shared/database/schema/element-properties.js';
import type { ElementProperties } from './ifc-properties.dto.js';

export const PROPERTIES_BATCH_SIZE = 1000;

/** Quebra um array em chunks de tamanho fixo. */
export function chunk<T>(arr: ReadonlyArray<T>, size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Decimal do drizzle espera string; null permanece null. */
function dec(n: number | null): string | null { return n == null ? null : String(n); }

export class IfcPropertiesStore {
  /** Persiste as propriedades de um modelo (substitui as existentes). */
  async persist(modelVersionId: string, props: ReadonlyArray<ElementProperties>): Promise<number> {
    // Reprocessamento: limpa o que havia antes p/ não duplicar.
    await db.delete(elementProperties).where(eq(elementProperties.modelVersionId, modelVersionId));

    let inserted = 0;
    for (const batch of chunk(props, PROPERTIES_BATCH_SIZE)) {
      const rows = batch.map((p) => ({
        modelVersionId,
        expressId: p.expressID,
        globalId: p.globalId,
        ifcType: p.ifcType,
        name: p.name,
        storeyId: p.storeyId,
        areaM2: dec(p.areaM2),
        volumeM3: dec(p.volumeM3),
        lengthM: dec(p.lengthM),
        properties: p.properties,
      }));
      await db.transaction(async (tx) => {
        await tx.insert(elementProperties).values(rows);
      });
      inserted += rows.length;
    }
    return inserted;
  }
}
