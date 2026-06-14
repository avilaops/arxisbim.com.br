import { eq, and, or, sql } from 'drizzle-orm';
import { db } from '../../shared/database/db.js';
import { elementProperties } from '../../shared/database/schema/element-properties.js';

export interface BIMSearchParams {
  q?: string;
  type?: string;
  pset?: Record<string, any>;
  limit?: number;
  offset?: number;
}

export class BIMSearchService {
  /**
   * Executa busca na tabela element_properties
   */
  async search(modelVersionId: string, params: BIMSearchParams = {}) {
    const limit = Math.min(params.limit ?? 200, 200);
    const offset = params.offset ?? 0;

    const conditions: any[] = [eq(elementProperties.modelVersionId, modelVersionId)];

    // Filtro por q (exact GUID ou partial name)
    if (params.q && params.q.trim()) {
      const term = params.q.trim();
      const isGuid = term.length === 22 && !term.includes(' '); // GUID do IFC tem 22 chars sem espacos
      if (isGuid) {
        conditions.push(
          or(
            eq(elementProperties.globalId, term),
            sql`${elementProperties.name} ILIKE ${'%' + term + '%'}`
          )
        );
      } else {
        conditions.push(sql`${elementProperties.name} ILIKE ${'%' + term + '%'}`);
      }
    }

    // Filtro por type
    if (params.type && params.type.trim()) {
      conditions.push(
        sql`LOWER(${elementProperties.ifcType}) = ${params.type.trim().toLowerCase()}`
      );
    }

    // Filtro por PropertySet
    if (params.pset && Object.keys(params.pset).length > 0) {
      conditions.push(
        sql`${elementProperties.properties} @> ${JSON.stringify(params.pset)}::jsonb`
      );
    }

    // Executa busca com ordenação determinística por express_id
    const items = await db
      .select({
        id: elementProperties.id,
        modelVersionId: elementProperties.modelVersionId,
        expressId: elementProperties.expressId,
        globalId: elementProperties.globalId,
        ifcType: elementProperties.ifcType,
        name: elementProperties.name,
        properties: elementProperties.properties,
        areaM2: elementProperties.areaM2,
        volumeM3: elementProperties.volumeM3,
        lengthM: elementProperties.lengthM,
      })
      .from(elementProperties)
      .where(and(...conditions))
      .orderBy(elementProperties.expressId)
      .limit(limit)
      .offset(offset);

    return items;
  }
}
