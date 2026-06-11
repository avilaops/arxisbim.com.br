import { FastifyRequest, FastifyReply } from 'fastify';
import { timelineSimulations } from '../../shared/database/schema/tenants.js';
import { bimSchedules } from '../../shared/database/schema/scheduling.js';
import { projects } from '../../shared/database/schema/projects.js';
import { eq, and, desc } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }
  const client = postgres(process.env.DATABASE_URL);
  return drizzle(client, { schema: { timelineSimulations, bimSchedules, projects } });
}

// Verify schedule belongs to the tenant
async function assertScheduleOwnership(db: ReturnType<typeof getDb>, scheduleId: string, tenantId: string) {
  const rows = await db.select({ id: bimSchedules.id }).from(bimSchedules)
    .innerJoin(projects, eq(bimSchedules.projectId, projects.id))
    .where(and(eq(bimSchedules.id, scheduleId), eq(projects.tenantId, tenantId)))
    .limit(1);
  return rows.length > 0;
}

export async function getTimelineSimulationsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = request.user as any;
    const { scheduleId } = request.query as any;
    if (!scheduleId) {
      return reply.code(400).send({ error: 'scheduleId é obrigatório' });
    }
    const db = getDb();
    if (!await assertScheduleOwnership(db, scheduleId, tenantId)) {
      return reply.code(404).send({ error: 'Schedule não encontrado' });
    }
    const result = await db.select().from(timelineSimulations)
      .where(eq(timelineSimulations.scheduleId, scheduleId))
      .orderBy(desc(timelineSimulations.createdAt));
    reply.send(result);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao listar simulações', details: String(error) });
  }
}

export async function createTimelineSimulationHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = request.user as any;
    const db = getDb();
    const body = request.body as any;
    if (!body || !body.scheduleId) {
      return reply.code(400).send({ error: 'scheduleId é obrigatório' });
    }
    if (!await assertScheduleOwnership(db, body.scheduleId, tenantId)) {
      return reply.code(404).send({ error: 'Schedule não encontrado' });
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

// GET/PUT/DELETE by scheduleId (it's the table's natural key)
export async function getTimelineSimulationHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = request.user as any;
    const db = getDb();
    const { id: scheduleId } = request.params as any;
    if (!scheduleId) {
      return reply.code(400).send({ error: 'scheduleId é obrigatório' });
    }
    if (!await assertScheduleOwnership(db, scheduleId, tenantId)) {
      return reply.code(404).send({ error: 'Simulação não encontrada' });
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
    const { tenantId } = request.user as any;
    const db = getDb();
    const { id: scheduleId } = request.params as any;
    const body = request.body as any;
    if (!scheduleId) {
      return reply.code(400).send({ error: 'scheduleId é obrigatório' });
    }
    if (!await assertScheduleOwnership(db, scheduleId, tenantId)) {
      return reply.code(404).send({ error: 'Simulação não encontrada' });
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
    const { tenantId } = request.user as any;
    const db = getDb();
    const { id: scheduleId } = request.params as any;
    if (!scheduleId) {
      return reply.code(400).send({ error: 'scheduleId é obrigatório' });
    }
    if (!await assertScheduleOwnership(db, scheduleId, tenantId)) {
      return reply.code(404).send({ error: 'Simulação não encontrada' });
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
