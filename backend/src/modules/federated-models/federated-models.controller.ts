
import { FastifyRequest, FastifyReply } from 'fastify';
import { federatedModels } from '../../shared/database/schema/projects.js';
import { eq } from 'drizzle-orm';
import { db } from '../../shared/database/db.js';

export async function getFederatedModelsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { projectId } = request.params as { projectId: string };
    if (!projectId) {
      return reply.code(400).send({ error: 'projectId é obrigatório' });
    }
    const result = await db.select().from(federatedModels).where(eq(federatedModels.projectId, projectId));
    reply.send(result);
  } catch (error) {
    const err = error as Error;
    reply.code(500).send({ error: 'Erro ao listar federated models', message: err.message });
  }
}

export async function createFederatedModelHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { projectId } = request.params as { projectId: string };
    const body = request.body as {
      name: string;
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
    if (!body || !body.name) {
      return reply.code(400).send({ error: 'name é obrigatório' });
    }
    const [created] = await db.insert(federatedModels).values({
      projectId,
      name: body.name,
      description: body.description ?? '',
      models: body.models ?? [],
    }).returning();
    reply.code(201).send(created);
  } catch (error) {
    const err = error as Error;
    reply.code(500).send({ error: 'Erro ao criar federated model', message: err.message });
  }
}

export async function getFederatedModelHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { projectId, federatedModelId } = request.params as { projectId: string; federatedModelId: string };
    if (!federatedModelId) {
      return reply.code(400).send({ error: 'federatedModelId é obrigatório' });
    }
    const [model] = await db.select().from(federatedModels).where(eq(federatedModels.id, federatedModelId)).limit(1);
    if (!model) {
      return reply.code(404).send({ error: 'Federated model não encontrado' });
    }
    reply.send(model);
  } catch (error) {
    const err = error as Error;
    reply.code(500).send({ error: 'Erro ao buscar federated model', message: err.message });
  }
}

export async function updateFederatedModelHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { projectId, federatedModelId } = request.params as { projectId: string; federatedModelId: string };
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
    if (!federatedModelId) {
      return reply.code(400).send({ error: 'federatedModelId é obrigatório' });
    }
    const [updated] = await db.update(federatedModels)
      .set({
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.models && { models: body.models }),
        updatedAt: new Date(),
      })
      .where(eq(federatedModels.id, federatedModelId))
      .returning();
    if (!updated) {
      return reply.code(404).send({ error: 'Federated model não encontrado' });
    }
    reply.send(updated);
  } catch (error) {
    const err = error as Error;
    reply.code(500).send({ error: 'Erro ao atualizar federated model', message: err.message });
  }
}

export async function deleteFederatedModelHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { projectId, federatedModelId } = request.params as { projectId: string; federatedModelId: string };
    if (!federatedModelId) {
      return reply.code(400).send({ error: 'federatedModelId é obrigatório' });
    }
    const deleted = await db.delete(federatedModels).where(eq(federatedModels.id, federatedModelId)).returning();
    if (!deleted.length) {
      return reply.code(404).send({ error: 'Federated model não encontrado' });
    }
    reply.code(204).send();
  } catch (error) {
    const err = error as Error;
    reply.code(500).send({ error: 'Erro ao deletar federated model', message: err.message });
  }
}
