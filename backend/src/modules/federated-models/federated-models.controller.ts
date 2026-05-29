
import { FastifyRequest, FastifyReply } from 'fastify';
import { federatedModels } from '../../shared/database/schema/projects.js';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
// Função utilitária para obter conexão com o banco
function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }
  const client = postgres(process.env.DATABASE_URL);
  return drizzle(client, { schema: { federatedModels } });
}

export async function getFederatedModelsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { projectId } = (request.query as any);
    if (!projectId) {
      return reply.code(400).send({ error: 'projectId é obrigatório' });
    }
    const result = await db.select().from(federatedModels).where(eq(federatedModels.projectId, projectId));
    reply.send(result);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao listar federated models', details: String(error) });
  }
}

export async function createFederatedModelHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const body = request.body as any;
    if (!body || !body.projectId || !body.name) {
      return reply.code(400).send({ error: 'projectId e name são obrigatórios' });
    }
    const [created] = await db.insert(federatedModels).values({
      projectId: body.projectId,
      name: body.name,
      description: body.description ?? '',
      models: body.models ?? [],
    }).returning();
    reply.code(201).send(created);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao criar federated model', details: String(error) });
  }
}

export async function getFederatedModelHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { id } = (request.params as any);
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const [model] = await db.select().from(federatedModels).where(eq(federatedModels.id, id)).limit(1);
    if (!model) {
      return reply.code(404).send({ error: 'Federated model não encontrado' });
    }
    reply.send(model);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar federated model', details: String(error) });
  }
}

export async function updateFederatedModelHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { id } = (request.params as any);
    const body = request.body as any;
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const [updated] = await db.update(federatedModels)
      .set({
        name: body.name,
        description: body.description,
        models: body.models,
        updatedAt: new Date(),
      })
      .where(eq(federatedModels.id, id))
      .returning();
    if (!updated) {
      return reply.code(404).send({ error: 'Federated model não encontrado' });
    }
    reply.send(updated);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao atualizar federated model', details: String(error) });
  }
}

export async function deleteFederatedModelHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { id } = (request.params as any);
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const deleted = await db.delete(federatedModels).where(eq(federatedModels.id, id)).returning();
    if (!deleted.length) {
      return reply.code(404).send({ error: 'Federated model não encontrado' });
    }
    reply.code(204).send();
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao deletar federated model', details: String(error) });
  }
}
