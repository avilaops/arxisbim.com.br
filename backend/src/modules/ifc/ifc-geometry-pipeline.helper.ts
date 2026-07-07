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
    const currentMetadata = model.metadata || {};
    await tx
      .update(ifcModels)
      .set({
        metadata: {
          ...currentMetadata,
          status: 'processing',
          error: null,
        },
        updatedAt: new Date(),
      })
      .where(eq(ifcModels.id, ifcModelId));

    try {
      // 3. Download the IFC buffer from storage
      const storage = getStorage();
      const fileBuffer = await storage.download(model.fileUrl);
      const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);

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
          metadata: {
            ...currentMetadata,
            status: 'ready',
            error: null,
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
          metadata: {
            ...currentMetadata,
            status: 'failed',
            error: error.message || String(error),
          },
          updatedAt: new Date(),
        })
        .where(eq(ifcModels.id, ifcModelId));

      throw error;
    }
  });
}
