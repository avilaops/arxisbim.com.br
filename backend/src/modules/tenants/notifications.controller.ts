import { FastifyRequest, FastifyReply } from 'fastify';
import { notifications } from '../../shared/database/schema/notifications.js';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Um pool por modulo, criado na primeira chamada. Ate 09/09/2026 isto abria
// um `postgres()` NOVO a cada requisicao e nunca o fechava: cada chamada
// deixava uma conexao ociosa no servidor ate o Postgres esgotar os 100 slots
// ("remaining connection slots are reserved") e derrubar todos os apps da
// maquina. O incidente de 09/09 foi este vazamento.
let dbCache: ReturnType<typeof criarDb> | null = null;
function criarDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }
  const client = postgres(process.env.DATABASE_URL, { max: 4 });
  return drizzle(client, { schema: { notifications } });
}
function getDb() {
  if (!dbCache) dbCache = criarDb();
  return dbCache;
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
    if (!body || !body.tenantId || !body.type || !body.message || !body.userId || !body.title) {
      return reply.code(400).send({ error: 'tenantId, type, message, userId e title são obrigatórios' });
    }
    const [created] = await db.insert(notifications).values({
      tenantId: body.tenantId,
      userId: body.userId,
      title: body.title,
      type: body.type,
      message: body.message,
      isRead: body.read ?? false,
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
        isRead: body.read,
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
