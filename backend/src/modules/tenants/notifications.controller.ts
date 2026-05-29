import { FastifyRequest, FastifyReply } from 'fastify';
import { notifications } from '../../shared/database/schema/tenants.js';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }
  const client = postgres(process.env.DATABASE_URL);
  return drizzle(client, { schema: { notifications } });
}

export async function getNotificationsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = (request.query as any);
    if (!tenantId) {
      return reply.code(400).send({ error: 'tenantId é obrigatório' });
    }
    const db = getDb();
    const result = await db.select().from(notifications).where(eq(notifications.tenantId, tenantId));
    reply.send(result);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao listar notificações', details: String(error) });
  }
}

export async function createNotificationHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const body = request.body as any;
    if (!body || !body.tenantId || !body.type || !body.message) {
      return reply.code(400).send({ error: 'tenantId, type e message são obrigatórios' });
    }
    const [created] = await db.insert(notifications).values({
      tenantId: body.tenantId,
      type: body.type,
      message: body.message,
      read: body.read ?? false,
      createdAt: new Date(),
    }).returning();
    reply.code(201).send(created);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao criar notificação', details: String(error) });
  }
}

export async function getNotificationHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { id } = (request.params as any);
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
    if (!notification) {
      return reply.code(404).send({ error: 'Notificação não encontrada' });
    }
    reply.send(notification);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar notificação', details: String(error) });
  }
}

export async function updateNotificationHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { id } = (request.params as any);
    const body = request.body as any;
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const [updated] = await db.update(notifications)
      .set({
        type: body.type,
        message: body.message,
        read: body.read,
      })
      .where(eq(notifications.id, id))
      .returning();
    if (!updated) {
      return reply.code(404).send({ error: 'Notificação não encontrada' });
    }
    reply.send(updated);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao atualizar notificação', details: String(error) });
  }
}

export async function deleteNotificationHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { id } = (request.params as any);
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const deleted = await db.delete(notifications).where(eq(notifications.id, id)).returning();
    if (!deleted.length) {
      return reply.code(404).send({ error: 'Notificação não encontrada' });
    }
    reply.code(204).send();
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao deletar notificação', details: String(error) });
  }
}
