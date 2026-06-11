import { FastifyRequest, FastifyReply } from 'fastify';
import { federatedModels, projects } from '../../shared/database/schema/projects.js';
import { eq, and } from 'drizzle-orm';
import { db } from '../../shared/database/db.js';

export async function getFederatedModelsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = request.user as any;
    const { projectId } = request.params as { projectId: string };
    if (!projectId) {
      return reply.code(400).send({ error: 'projectId é obrigatório' });
    }
    const [project] = await db.select({ id: projects.id }).from(projects).where(
      and(eq(projects.id, projectId), eq(projects.tenantId, tenantId))
    ).limit(1);
    if (!project) {
      return reply.code(404).send({ error: 'Projeto não encontrado' });
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
    const { tenantId } = request.user as any;
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
    const [project] = await db.select({ id: projects.id }).from(projects).where(
      and(eq(projects.id, projectId), eq(projects.tenantId, tenantId))
    ).limit(1);
    if (!project) {
      return reply.code(404).send({ error: 'Projeto não encontrado' });
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
    const { tenantId } = request.user as any;
    const { federatedModelId } = request.params as { projectId: string; federatedModelId: string };
    if (!federatedModelId) {
      return reply.code(400).send({ error: 'federatedModelId é obrigatório' });
    }
    const rows = await db.select({ fm: federatedModels }).from(federatedModels)
      .innerJoin(projects, eq(federatedModels.projectId, projects.id))
      .where(and(eq(federatedModels.id, federatedModelId), eq(projects.tenantId, tenantId)))
      .limit(1);
    if (!rows.length) {
      return reply.code(404).send({ error: 'Federated model não encontrado' });
    }
    reply.send(rows[0].fm);
  } catch (error) {
    const err = error as Error;
    reply.code(500).send({ error: 'Erro ao buscar federated model', message: err.message });
  }
}

export async function updateFederatedModelHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = request.user as any;
    const { federatedModelId } = request.params as { projectId: string; federatedModelId: string };
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
    const rows = await db.select({ id: federatedModels.id }).from(federatedModels)
      .innerJoin(projects, eq(federatedModels.projectId, projects.id))
      .where(and(eq(federatedModels.id, federatedModelId), eq(projects.tenantId, tenantId)))
      .limit(1);
    if (!rows.length) {
      return reply.code(404).send({ error: 'Federated model não encontrado' });
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
    reply.send(updated);
  } catch (error) {
    const err = error as Error;
    reply.code(500).send({ error: 'Erro ao atualizar federated model', message: err.message });
  }
}

export async function deleteFederatedModelHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = request.user as any;
    const { federatedModelId } = request.params as { projectId: string; federatedModelId: string };
    if (!federatedModelId) {
      return reply.code(400).send({ error: 'federatedModelId é obrigatório' });
    }
    const rows = await db.select({ id: federatedModels.id }).from(federatedModels)
      .innerJoin(projects, eq(federatedModels.projectId, projects.id))
      .where(and(eq(federatedModels.id, federatedModelId), eq(projects.tenantId, tenantId)))
      .limit(1);
    if (!rows.length) {
      return reply.code(404).send({ error: 'Federated model não encontrado' });
    }
    await db.delete(federatedModels).where(eq(federatedModels.id, federatedModelId));
    reply.code(204).send();
  } catch (error) {
    const err = error as Error;
    reply.code(500).send({ error: 'Erro ao deletar federated model', message: err.message });
  }
}
