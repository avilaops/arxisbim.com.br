import { FastifyRequest, FastifyReply } from 'fastify';
import { webhookSubscriptions } from '../../shared/database/schema/tenants.js';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }
  const client = postgres(process.env.DATABASE_URL);
  return drizzle(client, { schema: { webhookSubscriptions } });
}

export async function getWebhooksHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = (request.query as any);
    if (!tenantId) {
      return reply.code(400).send({ error: 'tenantId é obrigatório' });
    }
    const db = getDb();
    const result = await db.select().from(webhookSubscriptions).where(eq(webhookSubscriptions.tenantId, tenantId));
    reply.send(result);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao listar webhooks', details: String(error) });
  }
}

export async function createWebhookHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const body = request.body as any;
    if (!body || !body.tenantId || !body.companyId || !body.eventType || !body.url) {
      return reply.code(400).send({ error: 'tenantId, companyId, eventType e url são obrigatórios' });
    }
    const [created] = await db.insert(webhookSubscriptions).values({
      tenantId: body.tenantId,
      companyId: body.companyId,
      eventType: body.eventType,
      url: body.url,
      secret: body.secret,
      isActive: body.isActive ?? true,
    }).returning();
    reply.code(201).send(created);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao criar webhook', details: String(error) });
  }
}

export async function getWebhookHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { id } = (request.params as any);
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const [webhook] = await db.select().from(webhookSubscriptions).where(eq(webhookSubscriptions.id, id)).limit(1);
    if (!webhook) {
      return reply.code(404).send({ error: 'Webhook não encontrado' });
    }
    reply.send(webhook);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar webhook', details: String(error) });
  }
}

export async function updateWebhookHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { id } = (request.params as any);
    const body = request.body as any;
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const [updated] = await db.update(webhookSubscriptions)
      .set({
        eventType: body.eventType,
        url: body.url,
        secret: body.secret,
        isActive: body.isActive,
      })
      .where(eq(webhookSubscriptions.id, id))
      .returning();
    if (!updated) {
      return reply.code(404).send({ error: 'Webhook não encontrado' });
    }
    reply.send(updated);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao atualizar webhook', details: String(error) });
  }
}

export async function deleteWebhookHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { id } = (request.params as any);
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const deleted = await db.delete(webhookSubscriptions).where(eq(webhookSubscriptions.id, id)).returning();
    if (!deleted.length) {
      return reply.code(404).send({ error: 'Webhook não encontrado' });
    }
    reply.code(204).send();
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao deletar webhook', details: String(error) });
  }
}
