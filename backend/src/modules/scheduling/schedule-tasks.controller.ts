import { FastifyRequest, FastifyReply } from 'fastify';
import { scheduleTasks } from '../../shared/database/schema/scheduling.js';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Função utilitária para obter conexão com o banco
function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }
  const client = postgres(process.env.DATABASE_URL);
  return drizzle(client, { schema: { scheduleTasks } });
}

export async function getScheduleTasksHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { scheduleId } = (request.query as any);
    if (!scheduleId) {
      return reply.code(400).send({ error: 'scheduleId é obrigatório' });
    }
    const db = getDb();
    const result = await db.select().from(scheduleTasks).where(eq(scheduleTasks.scheduleId, scheduleId));
    reply.send(result);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao listar tasks', details: String(error) });
  }
}

export async function createScheduleTaskHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const body = request.body as any;
    if (!body || !body.scheduleId || !body.taskName || !body.startDate || !body.endDate) {
      return reply.code(400).send({ error: 'scheduleId, taskName, startDate e endDate são obrigatórios' });
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
    const db = getDb();
    const { id } = (request.params as any);
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const [task] = await db.select().from(scheduleTasks).where(eq(scheduleTasks.id, id)).limit(1);
    if (!task) {
      return reply.code(404).send({ error: 'Task não encontrada' });
    }
    reply.send(task);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar task', details: String(error) });
  }
}

export async function updateScheduleTaskHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { id } = (request.params as any);
    const body = request.body as any;
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
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
    if (!updated) {
      return reply.code(404).send({ error: 'Task não encontrada' });
    }
    reply.send(updated);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao atualizar task', details: String(error) });
  }
}

export async function deleteScheduleTaskHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { id } = (request.params as any);
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const deleted = await db.delete(scheduleTasks).where(eq(scheduleTasks.id, id)).returning();
    if (!deleted.length) {
      return reply.code(404).send({ error: 'Task não encontrada' });
    }
    reply.code(204).send();
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao deletar task', details: String(error) });
  }
}
