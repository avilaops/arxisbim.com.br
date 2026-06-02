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
    const { scheduleId } = (request.query as any);
    if (!scheduleId) {
      return reply.code(400).send({ error: 'scheduleId é obrigatório' });
    }
    const db = getDb();
    const result = await db.select().from(timelineSimulations)
      .where(eq(timelineSimulations.scheduleId, scheduleId));
    reply.send(result);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao listar simulações', details: String(error) });
  }
}

export async function createTimelineSimulationHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const body = request.body as any;
    if (!body || !body.scheduleId) {
      return reply.code(400).send({ error: 'scheduleId é obrigatório' });
    }
    const [created] = await db.insert(timelineSimulations).values({
      scheduleId: body.scheduleId,
      name: body.name,
      simulationDate: body.simulationDate ? new Date(body.simulationDate) : undefined,
      snapshot: body.snapshot,
    }).returning();
    reply.code(201).send(created);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao criar simulação', details: String(error) });
  }
}

export async function getTimelineSimulationHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { scheduleId } = (request.params as any);
    if (!scheduleId) {
      return reply.code(400).send({ error: 'scheduleId é obrigatório' });
    }
    const [simulation] = await db.select().from(timelineSimulations)
      .where(eq(timelineSimulations.scheduleId, scheduleId))
      .limit(1);
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
    const { scheduleId } = (request.params as any);
    const body = request.body as any;
    if (!scheduleId) {
      return reply.code(400).send({ error: 'scheduleId é obrigatório' });
    }
    const [updated] = await db.update(timelineSimulations)
      .set({
        name: body.name,
        simulationDate: body.simulationDate ? new Date(body.simulationDate) : undefined,
        snapshot: body.snapshot,
      })
      .where(eq(timelineSimulations.scheduleId, scheduleId))
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
    const { scheduleId } = (request.params as any);
    if (!scheduleId) {
      return reply.code(400).send({ error: 'scheduleId é obrigatório' });
    }
    const deleted = await db.delete(timelineSimulations)
      .where(eq(timelineSimulations.scheduleId, scheduleId))
      .returning();
    if (!deleted.length) {
      return reply.code(404).send({ error: 'Simulação não encontrada' });
    }
    reply.code(204).send();
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao deletar simulação', details: String(error) });
  }
}
