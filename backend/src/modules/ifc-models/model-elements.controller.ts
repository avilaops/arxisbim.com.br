import { FastifyRequest, FastifyReply } from 'fastify';
import { modelElements } from '../../shared/database/schema/projects.js';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }
  const client = postgres(process.env.DATABASE_URL);
  return drizzle(client, { schema: { modelElements } });
}

export async function getModelElementsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { ifcModelId } = (request.query as any);
    if (!ifcModelId) {
      return reply.code(400).send({ error: 'ifcModelId é obrigatório' });
    }
    const db = getDb();
    const result = await db.select().from(modelElements).where(eq(modelElements.ifcModelId, ifcModelId));
    reply.send(result);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao listar elementos', details: String(error) });
  }
}

export async function getModelElementHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { id } = (request.params as any);
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const [element] = await db.select().from(modelElements).where(eq(modelElements.id, id)).limit(1);
    if (!element) {
      return reply.code(404).send({ error: 'Elemento não encontrado' });
    }
    reply.send(element);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar elemento', details: String(error) });
  }
}

export async function createModelElementHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const body = request.body as any;
    if (!body || !body.ifcModelId || !body.expressId || !body.type) {
      return reply.code(400).send({ error: 'ifcModelId, expressId e type são obrigatórios' });
    }
    const [created] = await db.insert(modelElements).values({
      ifcModelId: body.ifcModelId,
      expressId: body.expressId,
      globalId: body.globalId,
      type: body.type,
      name: body.name,
      properties: body.properties ?? {},
      geometry: body.geometry ?? {},
    }).returning();
    reply.code(201).send(created);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao criar elemento', details: String(error) });
  }
}

export async function updateModelElementHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { id } = (request.params as any);
    const body = request.body as any;
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const [updated] = await db.update(modelElements)
      .set({
        type: body.type,
        name: body.name,
        properties: body.properties,
        geometry: body.geometry,
      })
      .where(eq(modelElements.id, id))
      .returning();
    if (!updated) {
      return reply.code(404).send({ error: 'Elemento não encontrado' });
    }
    reply.send(updated);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao atualizar elemento', details: String(error) });
  }
}

export async function deleteModelElementHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { id } = (request.params as any);
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const deleted = await db.delete(modelElements).where(eq(modelElements.id, id)).returning();
    if (!deleted.length) {
      return reply.code(404).send({ error: 'Elemento não encontrado' });
    }
    reply.code(204).send();
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao deletar elemento', details: String(error) });
  }
}
