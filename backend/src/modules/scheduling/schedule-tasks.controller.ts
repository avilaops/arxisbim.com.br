import { FastifyRequest, FastifyReply } from 'fastify';
import { scheduleTasks, bimSchedules } from '../../shared/database/schema/scheduling.js';
import { projects } from '../../shared/database/schema/projects.js';
import { eq, and } from 'drizzle-orm';
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
  return drizzle(client, { schema: { scheduleTasks, bimSchedules, projects } });
}
function getDb() {
  if (!dbCache) dbCache = criarDb();
  return dbCache;
}

export async function getScheduleTasksHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = request.user as any;
    const { scheduleId } = request.query as any;
    if (!scheduleId) {
      return reply.code(400).send({ error: 'scheduleId é obrigatório' });
    }
    const db = getDb();
    const rows = await db.select({ id: bimSchedules.id }).from(bimSchedules)
      .innerJoin(projects, eq(bimSchedules.projectId, projects.id))
      .where(and(eq(bimSchedules.id, scheduleId), eq(projects.tenantId, tenantId)))
      .limit(1);
    if (!rows.length) {
      return reply.code(404).send({ error: 'Schedule não encontrado' });
    }
    const result = await db.select().from(scheduleTasks).where(eq(scheduleTasks.scheduleId, scheduleId));
    reply.send(result);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao listar tasks', details: String(error) });
  }
}

export async function createScheduleTaskHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = request.user as any;
    const db = getDb();
    const body = request.body as any;
    if (!body || !body.scheduleId || !body.taskName || !body.startDate || !body.endDate) {
      return reply.code(400).send({ error: 'scheduleId, taskName, startDate e endDate são obrigatórios' });
    }
    const rows = await db.select({ id: bimSchedules.id }).from(bimSchedules)
      .innerJoin(projects, eq(bimSchedules.projectId, projects.id))
      .where(and(eq(bimSchedules.id, body.scheduleId), eq(projects.tenantId, tenantId)))
      .limit(1);
    if (!rows.length) {
      return reply.code(404).send({ error: 'Schedule não encontrado' });
    }
    const [created] = await db.insert(scheduleTasks).values({
      scheduleId: body.scheduleId,
      taskName: body.taskName,
      startDate: body.startDate,
      endDate: body.endDate,
      progress: body.progress ?? 0,
      dependencies: body.dependencies ?? [],
      isCriticalPath: body.isCriticalPath ?? false,
    }).returning();
    reply.code(201).send(created);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao criar task', details: String(error) });
  }
}

export async function getScheduleTaskHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = request.user as any;
    const db = getDb();
    const { id } = request.params as any;
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const rows = await db.select({ t: scheduleTasks }).from(scheduleTasks)
      .innerJoin(bimSchedules, eq(scheduleTasks.scheduleId, bimSchedules.id))
      .innerJoin(projects, eq(bimSchedules.projectId, projects.id))
      .where(and(eq(scheduleTasks.id, id), eq(projects.tenantId, tenantId)))
      .limit(1);
    if (!rows.length) {
      return reply.code(404).send({ error: 'Task não encontrada' });
    }
    reply.send(rows[0].t);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar task', details: String(error) });
  }
}

export async function updateScheduleTaskHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = request.user as any;
    const db = getDb();
    const { id } = request.params as any;
    const body = request.body as any;
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const rows = await db.select({ id: scheduleTasks.id }).from(scheduleTasks)
      .innerJoin(bimSchedules, eq(scheduleTasks.scheduleId, bimSchedules.id))
      .innerJoin(projects, eq(bimSchedules.projectId, projects.id))
      .where(and(eq(scheduleTasks.id, id), eq(projects.tenantId, tenantId)))
      .limit(1);
    if (!rows.length) {
      return reply.code(404).send({ error: 'Task não encontrada' });
    }
    const [updated] = await db.update(scheduleTasks)
      .set({
        taskName: body.taskName,
        startDate: body.startDate,
        endDate: body.endDate,
        progress: body.progress,
        dependencies: body.dependencies,
        isCriticalPath: body.isCriticalPath,
      })
      .where(eq(scheduleTasks.id, id))
      .returning();
    reply.send(updated);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao atualizar task', details: String(error) });
  }
}

export async function deleteScheduleTaskHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = request.user as any;
    const db = getDb();
    const { id } = request.params as any;
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const rows = await db.select({ id: scheduleTasks.id }).from(scheduleTasks)
      .innerJoin(bimSchedules, eq(scheduleTasks.scheduleId, bimSchedules.id))
      .innerJoin(projects, eq(bimSchedules.projectId, projects.id))
      .where(and(eq(scheduleTasks.id, id), eq(projects.tenantId, tenantId)))
      .limit(1);
    if (!rows.length) {
      return reply.code(404).send({ error: 'Task não encontrada' });
    }
    await db.delete(scheduleTasks).where(eq(scheduleTasks.id, id));
    reply.code(204).send();
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao deletar task', details: String(error) });
  }
}
