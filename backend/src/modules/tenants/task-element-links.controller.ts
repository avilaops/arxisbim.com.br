import { FastifyRequest, FastifyReply } from 'fastify';
import { taskElementLinks } from '../../shared/database/schema/tenants.js';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }
  const client = postgres(process.env.DATABASE_URL);
  return drizzle(client, { schema: { taskElementLinks } });
}

export async function getTaskElementLinksHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { taskId } = (request.query as any);
    if (!taskId) {
      return reply.code(400).send({ error: 'taskId é obrigatório' });
    }
    const db = getDb();
    const result = await db.select().from(taskElementLinks).where(eq(taskElementLinks.taskId, taskId));
    reply.send(result);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao listar links', details: String(error) });
  }
}

export async function createTaskElementLinkHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const body = request.body as any;
    if (!body || !body.taskId || !body.elementId) {
      return reply.code(400).send({ error: 'taskId e elementId são obrigatórios' });
    }
    const [created] = await db.insert(taskElementLinks).values({
      taskId: body.taskId,
      elementId: body.elementId,
      action: body.action ?? body.linkType,
    }).returning();
    reply.code(201).send(created);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao criar link', details: String(error) });
  }
}

export async function getTaskElementLinkHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { id } = (request.params as any);
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const [link] = await db.select().from(taskElementLinks).where(eq(taskElementLinks.id, id)).limit(1);
    if (!link) {
      return reply.code(404).send({ error: 'Link não encontrado' });
    }
    reply.send(link);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar link', details: String(error) });
  }
}

export async function updateTaskElementLinkHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { id } = (request.params as any);
    const body = request.body as any;
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const [updated] = await db.update(taskElementLinks)
      .set({ action: body.action ?? body.linkType })
      .where(eq(taskElementLinks.id, id))
      .returning();
    if (!updated) {
      return reply.code(404).send({ error: 'Link não encontrado' });
    }
    reply.send(updated);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao atualizar link', details: String(error) });
  }
}

export async function deleteTaskElementLinkHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { id } = (request.params as any);
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const deleted = await db.delete(taskElementLinks).where(eq(taskElementLinks.id, id)).returning();
    if (!deleted.length) {
      return reply.code(404).send({ error: 'Link não encontrado' });
    }
    reply.code(204).send();
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao deletar link', details: String(error) });
  }
}
