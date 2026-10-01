import { db, withTenant } from '../../shared/database/db.js';
import { ifcModels, modelElements } from '../../shared/database/schema/projects.js';
import { eq } from 'drizzle-orm';
import { getStorage } from '../../core/storage/index.js';
import { IfcParserStructureService } from './ifc-parser-structure.service.js';
import { extractProperties } from './ifc-properties.extractor.js';
import { IfcGeometryPipelineService } from './ifc-geometry-pipeline.service.js';

export async function processModelGeometry(
  ifcModelId: string,
  tenantId: string,
  projectId: string
): Promise<any> {
  console.log(`[Queue Geometry Job] Starting processing for IFC Model ${ifcModelId}...`);

  return withTenant(tenantId, async (tx) => {
    // 1. Get model record
    const [model] = await tx
      .select()
      .from(ifcModels)
      .where(eq(ifcModels.id, ifcModelId))
      .limit(1);

    if (!model) {
      throw new Error(`IFC Model ${ifcModelId} not found in database`);
    }

    // 2. Set status to processing
    //
    // O status vai nas COLUNAS `status` e `processing_error` da tabela, nao
    // dentro do jsonb `metadata`. Antes ia nos dois lugares errados: o tipo de
    // `metadata` nao tem `status` nem `error` (por isso os erros de
    // type-check), e ninguem lia `metadata.status` em lugar nenhum, entao
    // aquele valor era gravado e nunca consultado. Quem le de verdade e a
    // coluna `status`, que ja existe desde a migration 053.
    const currentMetadata = model.metadata || {};
    await tx
      .update(ifcModels)
      .set({
        status: 'processing',
        processingError: null,
        processingStartedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(ifcModels.id, ifcModelId));

    try {
      // 3. Download the IFC buffer from storage
      const storage = getStorage();
      const fileBuffer = await storage.download(model.fileUrl);
      // `.buffer` de um Buffer do Node e tipado como ArrayBuffer |
      // SharedArrayBuffer, e o parser so aceita ArrayBuffer. Na pratica nunca e
      // compartilhado (vem de leitura de arquivo/rede), mas o TS nao tem como
      // saber. `new Uint8Array(...).buffer` copia os bytes e devolve um
      // ArrayBuffer de verdade, o que resolve os 5 erros de type-check sem
      // `as any` escondendo o problema. A copia ja acontecia antes, no slice.
      const arrayBuffer: ArrayBuffer = new Uint8Array(fileBuffer).buffer;

      // 4. Parse structural containment and elements
      const parser = new IfcParserStructureService();
      const structure = await parser.parseStructure({
        buffer: arrayBuffer,
        modelVersionId: ifcModelId,
        reqId: `queue-parse-${ifcModelId}`
      });

      // 5. Extract properties
      const elementsProps = await extractProperties(
        arrayBuffer,
        structure.elements,
        structure.units.length
      );

      const propsMap = new Map<number, any>();
      for (const prop of elementsProps) {
        propsMap.set(prop.expressID, prop);
      }

      // 6. Build geometry & compile GLB (saves GLB to storage cache automatically)
      const geometryPipeline = new IfcGeometryPipelineService();
      const manifest = await geometryPipeline.buildGeometry({
        buffer: arrayBuffer,
        modelVersionId: ifcModelId,
        tenantId,
        reqId: `queue-geom-${ifcModelId}`
      });

      const meshMap = new Map<number, any>();
      for (const element of manifest.elements) {
        meshMap.set(element.expressID, element);
      }

      // 7. Delete existing elements to prevent duplicates if retried
      await tx.delete(modelElements).where(eq(modelElements.ifcModelId, ifcModelId));

      // 8. Batch insert all elements into modelElements table
      console.log(`[Queue Geometry Job] Inserting ${structure.elements.length} elements into modelElements table...`);
      const batchSize = 100;
      const elementsToInsert = [];

      for (const el of structure.elements) {
        const elProps = propsMap.get(el.expressID);
        const meshRef = meshMap.get(el.expressID);

        elementsToInsert.push({
          ifcModelId,
          expressId: el.expressID,
          globalId: el.globalId,
          type: el.type,
          name: el.name || elProps?.name,
          properties: elProps?.properties ?? {},
          geometry: meshRef ? {
            boundingBox: { min: meshRef.bounds.min, max: meshRef.bounds.max }
          } : {}
        });
      }

      for (let i = 0; i < elementsToInsert.length; i += batchSize) {
        const batch = elementsToInsert.slice(i, i + batchSize);
        await tx.insert(modelElements).values(batch);
      }

      // 9. Mark model as ready
      await tx
        .update(ifcModels)
        .set({
          status: 'ready',
          processingError: null,
          processingCompletedAt: new Date(),
          // O metadata continua guardando o que é do MODELO (esquema, contagem,
          // limites). O que é do PROCESSAMENTO saiu daqui para as colunas.
          metadata: {
            ...currentMetadata,
            elements: structure.elements.length,
            schema: structure.schema,
            application: structure.projectName,
            bounds: manifest.modelBounds,
          },
          updatedAt: new Date(),
        })
        .where(eq(ifcModels.id, ifcModelId));

      console.log(`[Queue Geometry Job] Successfully processed IFC Model ${ifcModelId}.`);
      return { success: true, elementsCount: structure.elements.length };
    } catch (error: any) {
      console.error(`[Queue Geometry Job] Failed processing for IFC Model ${ifcModelId}:`, error);

      // 10. Mark model as failed and record error message
      await tx
        .update(ifcModels)
        .set({
          status: 'failed',
          processingError: error.message || String(error),
          processingCompletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(ifcModels.id, ifcModelId));

      throw error;
    }
  });
}
