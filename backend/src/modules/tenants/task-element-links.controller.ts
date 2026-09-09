import { FastifyRequest, FastifyReply } from 'fastify';
import { taskElementLinks } from '../../shared/database/schema/tenants.js';
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
  return drizzle(client, { schema: { taskElementLinks, scheduleTasks, bimSchedules, projects } });
}
function getDb() {
  if (!dbCache) dbCache = criarDb();
  return dbCache;
}

// Verify a task belongs to the tenant via schedule→project chain
async function assertTaskOwnership(db: ReturnType<typeof getDb>, taskId: string, tenantId: string) {
  const rows = await db.select({ id: scheduleTasks.id }).from(scheduleTasks)
    .innerJoin(bimSchedules, eq(scheduleTasks.scheduleId, bimSchedules.id))
    .innerJoin(projects, eq(bimSchedules.projectId, projects.id))
    .where(and(eq(scheduleTasks.id, taskId), eq(projects.tenantId, tenantId)))
    .limit(1);
  return rows.length > 0;
}

export async function getTaskElementLinksHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = request.user as any;
    const { taskId } = request.query as any;
    if (!taskId) {
      return reply.code(400).send({ error: 'taskId é obrigatório' });
    }
    const db = getDb();
    if (!await assertTaskOwnership(db, taskId, tenantId)) {
      return reply.code(404).send({ error: 'Task não encontrada' });
    }
    const result = await db.select().from(taskElementLinks).where(eq(taskElementLinks.taskId, taskId));
    reply.send(result);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao listar links', details: String(error) });
  }
}

export async function createTaskElementLinkHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = request.user as any;
    const db = getDb();
    const body = request.body as any;
    if (!body || !body.taskId || !body.elementId) {
      return reply.code(400).send({ error: 'taskId e elementId são obrigatórios' });
    }
    if (!await assertTaskOwnership(db, body.taskId, tenantId)) {
      return reply.code(404).send({ error: 'Task não encontrada' });
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
    const { tenantId } = request.user as any;
    const db = getDb();
    const { id } = request.params as any;
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    // Fetch link and verify ownership via task chain
    const rows = await db.select({ link: taskElementLinks }).from(taskElementLinks)
      .innerJoin(scheduleTasks, eq(taskElementLinks.taskId, scheduleTasks.id))
      .innerJoin(bimSchedules, eq(scheduleTasks.scheduleId, bimSchedules.id))
      .innerJoin(projects, eq(bimSchedules.projectId, projects.id))
      .where(and(eq(taskElementLinks.id, id), eq(projects.tenantId, tenantId)))
      .limit(1);
    if (!rows.length) {
      return reply.code(404).send({ error: 'Link não encontrado' });
    }
    reply.send(rows[0].link);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar link', details: String(error) });
  }
}

export async function updateTaskElementLinkHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = request.user as any;
    const db = getDb();
    const { id } = request.params as any;
    const body = request.body as any;
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const rows = await db.select({ id: taskElementLinks.id }).from(taskElementLinks)
      .innerJoin(scheduleTasks, eq(taskElementLinks.taskId, scheduleTasks.id))
      .innerJoin(bimSchedules, eq(scheduleTasks.scheduleId, bimSchedules.id))
      .innerJoin(projects, eq(bimSchedules.projectId, projects.id))
      .where(and(eq(taskElementLinks.id, id), eq(projects.tenantId, tenantId)))
      .limit(1);
    if (!rows.length) {
      return reply.code(404).send({ error: 'Link não encontrado' });
    }
    const [updated] = await db.update(taskElementLinks)
      .set({ action: body.action ?? body.linkType })
      .where(eq(taskElementLinks.id, id))
      .returning();
    reply.send(updated);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao atualizar link', details: String(error) });
  }
}

export async function deleteTaskElementLinkHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = request.user as any;
    const db = getDb();
    const { id } = request.params as any;
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const rows = await db.select({ id: taskElementLinks.id }).from(taskElementLinks)
      .innerJoin(scheduleTasks, eq(taskElementLinks.taskId, scheduleTasks.id))
      .innerJoin(bimSchedules, eq(scheduleTasks.scheduleId, bimSchedules.id))
      .innerJoin(projects, eq(bimSchedules.projectId, projects.id))
      .where(and(eq(taskElementLinks.id, id), eq(projects.tenantId, tenantId)))
      .limit(1);
    if (!rows.length) {
      return reply.code(404).send({ error: 'Link não encontrado' });
    }
    await db.delete(taskElementLinks).where(eq(taskElementLinks.id, id));
    reply.code(204).send();
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao deletar link', details: String(error) });
  }
}
