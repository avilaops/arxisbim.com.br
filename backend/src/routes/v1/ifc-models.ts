import { FastifyInstance } from 'fastify';
import { ifcModels, projects } from '../../shared/database/schema/projects.js';
import { tenants } from '../../shared/database/schema/tenants.js';
import { db } from '../../shared/database/db.js';
import { eq, desc } from 'drizzle-orm';
import { LocalStorageService } from '../../core/storage/local-storage.service.js';

const storageService = new LocalStorageService();

export async function ifcModelRoutes(fastify: FastifyInstance) {
  // Get IFC models for a project
  fastify.get('/projects/:projectId/ifc-models', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    try {
      const models = await db.select().from(ifcModels).where(eq(ifcModels.projectId, projectId)).orderBy(desc(ifcModels.uploadedAt));
      return reply.send(models);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch IFC models' });
    }
  });

  // Get IFC model by ID
  fastify.get('/ifc-models/:modelId', async (request, reply) => {
    const { modelId } = request.params as { modelId: string };
    try {
      const model = await db.select().from(ifcModels).where(eq(ifcModels.id, modelId)).limit(1);
      if (!model || model.length === 0) {
        return reply.status(404).send({ error: 'IFC model not found' });
      }
      return reply.send(model[0]);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch IFC model' });
    }
  });

  // Upload IFC model to a project
  fastify.post('/projects/:projectId/ifc-models', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };

    try {
      // Verify project exists
      const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
      if (!project || project.length === 0) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      // Handle file upload
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      const file = data.file;
      const filename = data.filename;
      const mimetype = data.mimetype;

      if (!filename.toLowerCase().endsWith('.ifc')) {
        return reply.status(400).send({ error: 'Only IFC files are allowed' });
      }

      // Generate storage key
      const storageKey = `${project[0].tenantId}/${projectId}/${filename}`;

      // Save file to storage
      const { size: fileSizeBytes } = await storageService.upload(storageKey, file);
      const fileUrl = `/api/v1/storage/${storageKey}`;

      // Create IFC model record
      const [newModel] = await db.insert(ifcModels).values({
        projectId,
        tenantId: project[0].tenantId,
        name: filename.replace('.ifc', ''),
        originalName: filename,
        fileUrl,
        fileSizeBytes,
        ifcType: 'IFC2X3', // Default, could be detected from file
        discipline: 'architecture', // Default, could be detected
        phase: 'new', // Default
      }).returning();

      return reply.status(201).send(newModel);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to upload IFC model' });
    }
  });

  // Update IFC model
  fastify.put('/ifc-models/:modelId', async (request, reply) => {
    const { modelId } = request.params as { modelId: string };
    const body = request.body as {
      name?: string;
      discipline?: string;
      phase?: string;
      metadata?: {
        author?: string;
        application?: string;
        schema?: string;
        timestamp?: string;
        version?: string;
        description?: string;
        elements?: number;
        bounds?: {
          min: [number, number, number];
          max: [number, number, number];
        };
      };
    };
    try {
      const [updatedModel] = await db.update(ifcModels)
        .set({
          ...(body.name && { name: body.name }),
          ...(body.discipline && { discipline: body.discipline }),
          ...(body.phase && { phase: body.phase }),
          ...(body.metadata && { metadata: body.metadata }),
          updatedAt: new Date(),
        })
        .where(eq(ifcModels.id, modelId))
        .returning();
      if (!updatedModel) {
        return reply.status(404).send({ error: 'IFC model not found' });
      }
      return reply.send(updatedModel);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update IFC model' });
    }
  });

  // Delete IFC model
  fastify.delete('/ifc-models/:modelId', async (request, reply) => {
    const { modelId } = request.params as { modelId: string };
    try {
      // Get model to delete file from storage
      const model = await db.select().from(ifcModels).where(eq(ifcModels.id, modelId)).limit(1);
      if (!model || model.length === 0) {
        return reply.status(404).send({ error: 'IFC model not found' });
      }

      // Delete file from storage (extract storage key from URL)
      const storageKey = model[0].fileUrl.replace('/api/v1/storage/', '');
      await storageService.delete(storageKey);

      // Delete from database
      const [deletedModel] = await db.delete(ifcModels).where(eq(ifcModels.id, modelId)).returning();
      return reply.send({ message: 'IFC model deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete IFC model' });
    }
  });

  // Download IFC model
  fastify.get('/ifc-models/:modelId/download', async (request, reply) => {
    const { modelId } = request.params as { modelId: string };
    try {
      const model = await db.select().from(ifcModels).where(eq(ifcModels.id, modelId)).limit(1);
      if (!model || model.length === 0) {
        return reply.status(404).send({ error: 'IFC model not found' });
      }

      // Get file from storage
      const storageKey = model[0].fileUrl.replace('/api/v1/storage/', '');
      const fileStream = await storageService.download(storageKey);

      // Set headers for download
      reply.header('Content-Type', 'application/ifc');
      reply.header('Content-Disposition', `attachment; filename="${model[0].originalName}"`);

      return reply.send(fileStream);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to download IFC model' });
    }
  });
}
