import { FastifyInstance } from 'fastify';
import { federatedModels, ifcModels, projects } from '../../shared/database/schema/projects.js';
import { db } from '../../shared/database/db.js';
import { eq, desc, and } from 'drizzle-orm';

export async function federatedModelRoutes(fastify: FastifyInstance) {
  // Get federated models for a project
  fastify.get('/projects/:projectId/federated-models', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    try {
      const federated = await db.select().from(federatedModels).where(eq(federatedModels.projectId, projectId)).orderBy(desc(federatedModels.createdAt));
      return reply.send(federated);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch federated models' });
    }
  });

  // Get federated model by ID
  fastify.get('/federated-models/:federatedId', async (request, reply) => {
    const { federatedId } = request.params as { federatedId: string };
    try {
      const model = await db.select().from(federatedModels).where(eq(federatedModels.id, federatedId)).limit(1);
      if (!model || model.length === 0) {
        return reply.status(404).send({ error: 'Federated model not found' });
      }
      return reply.send(model[0]);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch federated model' });
    }
  });

  // Create federated model
  fastify.post('/projects/:projectId/federated-models', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const body = request.body as {
      name: string;
      description?: string;
      modelReferences: Array<{
        ifcModelId: string;
        position?: { x: number; y: number; z: number };
        rotation?: { x: number; y: number; z: number };
        scale?: { x: number; y: number; z: number };
        visible?: boolean;
      }>;
    };

    try {
      // Verify project exists
      const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
      if (!project || project.length === 0) {
        return reply.status(404).send({ error: 'Project not found' });
      }

      // Verify all IFC models exist
      const modelIds = body.modelReferences.map(ref => ref.ifcModelId);
      const existingModels = await db.select().from(ifcModels).where(eq(ifcModels.projectId, projectId));
      const existingIds = new Set(existingModels.map(m => m.id));
      
      for (const modelId of modelIds) {
        if (!existingIds.has(modelId)) {
          return reply.status(400).send({ error: `IFC model ${modelId} not found in project` });
        }
      }

      const [newFederated] = await db.insert(federatedModels).values({
        projectId,
        name: body.name,
        description: body.description,
        models: body.modelReferences.map(ref => ({
          ifcModelId: ref.ifcModelId,
          transformation: {
            position: ref.position || { x: 0, y: 0, z: 0 },
            rotation: ref.rotation || { x: 0, y: 0, z: 0 },
            scale: ref.scale || { x: 1, y: 1, z: 1 },
          },
          visible: ref.visible ?? true,
        })),
      }).returning();

      return reply.status(201).send(newFederated);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to create federated model' });
    }
  });

  // Update federated model
  fastify.put('/federated-models/:federatedId', async (request, reply) => {
    const { federatedId } = request.params as { federatedId: string };
    const body = request.body as {
      name?: string;
      description?: string;
      models?: Array<{
        ifcModelId: string;
        transformation?: {
          position: { x: number; y: number; z: number };
          rotation: { x: number; y: number; z: number };
          scale: { x: number; y: number; z: number };
        };
        visible?: boolean;
      }>;
    };

    try {
      const [updatedFederated] = await db.update(federatedModels)
        .set({
          ...(body.name && { name: body.name }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.models && { models: body.models }),
          updatedAt: new Date(),
        })
        .where(eq(federatedModels.id, federatedId))
        .returning();

      if (!updatedFederated) {
        return reply.status(404).send({ error: 'Federated model not found' });
      }

      return reply.send(updatedFederated);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update federated model' });
    }
  });

  // Delete federated model
  fastify.delete('/federated-models/:federatedId', async (request, reply) => {
    const { federatedId } = request.params as { federatedId: string };
    try {
      const [deletedFederated] = await db.delete(federatedModels).where(eq(federatedModels.id, federatedId)).returning();
      if (!deletedFederated) {
        return reply.status(404).send({ error: 'Federated model not found' });
      }
      return reply.send({ message: 'Federated model deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete federated model' });
    }
  });

  // Add IFC model to federated model
  fastify.post('/federated-models/:federatedId/models', async (request, reply) => {
    const { federatedId } = request.params as { federatedId: string };
    const body = request.body as {
      ifcModelId: string;
      position?: { x: number; y: number; z: number };
      rotation?: { x: number; y: number; z: number };
      scale?: { x: number; y: number; z: number };
      visible?: boolean;
    };

    try {
      // Get current federated model
      const federated = await db.select().from(federatedModels).where(eq(federatedModels.id, federatedId)).limit(1);
      if (!federated || federated.length === 0) {
        return reply.status(404).send({ error: 'Federated model not found' });
      }

      // Verify IFC model exists
      const ifcModel = await db.select().from(ifcModels).where(eq(ifcModels.id, body.ifcModelId)).limit(1);
      if (!ifcModel || ifcModel.length === 0) {
        return reply.status(404).send({ error: 'IFC model not found' });
      }

      // Add reference
      const newModel = {
        ifcModelId: body.ifcModelId,
        transformation: {
          position: body.position || { x: 0, y: 0, z: 0 },
          rotation: body.rotation || { x: 0, y: 0, z: 0 },
          scale: body.scale || { x: 1, y: 1, z: 1 },
        },
        visible: body.visible ?? true,
      };
      const updatedModels = [...(federated[0].models || []), newModel];

      const [updatedFederated] = await db.update(federatedModels)
        .set({
          models: updatedModels,
          updatedAt: new Date(),
        })
        .where(eq(federatedModels.id, federatedId))
        .returning();

      return reply.send(updatedFederated);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to add model to federated model' });
    }
  });

  // Remove IFC model from federated model
  fastify.delete('/federated-models/:federatedId/models/:ifcModelId', async (request, reply) => {
    const { federatedId, ifcModelId } = request.params as { federatedId: string; ifcModelId: string };

    try {
      // Get current federated model
      const federated = await db.select().from(federatedModels).where(eq(federatedModels.id, federatedId)).limit(1);
      if (!federated || federated.length === 0) {
        return reply.status(404).send({ error: 'Federated model not found' });
      }

      // Remove reference
      const updatedModels = (federated[0].models || []).filter(ref => ref.ifcModelId !== ifcModelId);

      const [updatedFederated] = await db.update(federatedModels)
        .set({
          models: updatedModels,
          updatedAt: new Date(),
        })
        .where(eq(federatedModels.id, federatedId))
        .returning();

      return reply.send(updatedFederated);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to remove model from federated model' });
    }
  });

  // Update IFC model transform in federated model
  fastify.put('/federated-models/:federatedId/models/:ifcModelId', async (request, reply) => {
    const { federatedId, ifcModelId } = request.params as { federatedId: string; ifcModelId: string };
    const body = request.body as {
      position?: { x: number; y: number; z: number };
      rotation?: { x: number; y: number; z: number };
      scale?: { x: number; y: number; z: number };
      visible?: boolean;
    };

    try {
      // Get current federated model
      const federated = await db.select().from(federatedModels).where(eq(federatedModels.id, federatedId)).limit(1);
      if (!federated || federated.length === 0) {
        return reply.status(404).send({ error: 'Federated model not found' });
      }

      // Update reference
      const updatedModels = (federated[0].models || []).map(ref => {
        if (ref.ifcModelId === ifcModelId) {
          return {
            ...ref,
            transformation: {
              position: body.position || ref.transformation?.position || { x: 0, y: 0, z: 0 },
              rotation: body.rotation || ref.transformation?.rotation || { x: 0, y: 0, z: 0 },
              scale: body.scale || ref.transformation?.scale || { x: 1, y: 1, z: 1 },
            },
            visible: body.visible ?? ref.visible,
          };
        }
        return ref;
      });

      const [updatedFederated] = await db.update(federatedModels)
        .set({
          models: updatedModels,
          updatedAt: new Date(),
        })
        .where(eq(federatedModels.id, federatedId))
        .returning();

      return reply.send(updatedFederated);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update model transform' });
    }
  });
}
