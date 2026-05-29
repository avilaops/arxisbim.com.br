import { FastifyRequest, FastifyReply } from 'fastify';
import { timelineSimulations } from '../../shared/database/schema/tenants.js';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }
  const client = postgres(process.env.DATABASE_URL);
  return drizzle(client, { schema: { timelineSimulations } });
}

export async function getTimelineSimulationsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = (request.query as any);
    if (!tenantId) {
      return reply.code(400).send({ error: 'tenantId é obrigatório' });
    }
    const db = getDb();
    const result = await db.select().from(timelineSimulations).where(eq(timelineSimulations.tenantId, tenantId));
    reply.send(result);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao listar simulações', details: String(error) });
  }
}

export async function createTimelineSimulationHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const body = request.body as any;
    if (!body || !body.tenantId || !body.name) {
      return reply.code(400).send({ error: 'tenantId e name são obrigatórios' });
    }
    const [created] = await db.insert(timelineSimulations).values({
      tenantId: body.tenantId,
      name: body.name,
      description: body.description,
      startDate: body.startDate,
      endDate: body.endDate,
      status: body.status,
      createdAt: new Date(),
    }).returning();
    reply.code(201).send(created);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao criar simulação', details: String(error) });
  }
}

export async function getTimelineSimulationHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { id } = (request.params as any);
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const [simulation] = await db.select().from(timelineSimulations).where(eq(timelineSimulations.id, id)).limit(1);
    if (!simulation) {
      return reply.code(404).send({ error: 'Simulação não encontrada' });
    }
    reply.send(simulation);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar simulação', details: String(error) });
  }
}

export async function updateTimelineSimulationHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { id } = (request.params as any);
    const body = request.body as any;
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const [updated] = await db.update(timelineSimulations)
      .set({
        name: body.name,
        description: body.description,
        startDate: body.startDate,
        endDate: body.endDate,
        status: body.status,
      })
      .where(eq(timelineSimulations.id, id))
      .returning();
    if (!updated) {
      return reply.code(404).send({ error: 'Simulação não encontrada' });
    }
    reply.send(updated);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao atualizar simulação', details: String(error) });
  }
}

export async function deleteTimelineSimulationHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { id } = (request.params as any);
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const deleted = await db.delete(timelineSimulations).where(eq(timelineSimulations.id, id)).returning();
    if (!deleted.length) {
      return reply.code(404).send({ error: 'Simulação não encontrada' });
    }
    reply.code(204).send();
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao deletar simulação', details: String(error) });
  }
}
