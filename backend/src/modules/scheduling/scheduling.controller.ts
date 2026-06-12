
import { FastifyRequest, FastifyReply } from 'fastify';
import { bimSchedules } from '../../shared/database/schema/scheduling.js';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
// Função utilitária para obter conexão com o banco
function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }
  const client = postgres(process.env.DATABASE_URL);
  return drizzle(client, { schema: { bimSchedules } });
}

export async function getSchedulingsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    // A rota é /api/v1/projects/:projectId/scheduling — usa o path param,
    // com fallback para query string (compatibilidade retroativa).
    const projectId = (request.params as any)?.projectId ?? (request.query as any)?.projectId;
    if (!projectId) {
      return reply.code(400).send({ error: 'projectId é obrigatório' });
    }
    const result = await db.select().from(bimSchedules).where(eq(bimSchedules.projectId, projectId));
    reply.send(result);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao listar schedulings', details: String(error) });
  }
}

export async function createSchedulingHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const body = request.body as any;
    if (!body || !body.projectId || !body.name || !body.startDate || !body.endDate || !body.createdBy) {
      return reply.code(400).send({ error: 'projectId, name, startDate, endDate e createdBy são obrigatórios' });
    }
    const [created] = await db.insert(bimSchedules).values({
      projectId: body.projectId,
      name: body.name,
      description: body.description ?? '',
      startDate: body.startDate,
      endDate: body.endDate,
      createdBy: body.createdBy,
    }).returning();
    reply.code(201).send(created);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao criar scheduling', details: String(error) });
  }
}

export async function getSchedulingHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { id } = (request.params as any);
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const [scheduling] = await db.select().from(bimSchedules).where(eq(bimSchedules.id, id)).limit(1);
    if (!scheduling) {
      return reply.code(404).send({ error: 'Scheduling não encontrado' });
    }
    reply.send(scheduling);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar scheduling', details: String(error) });
  }
}

export async function updateSchedulingHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { id } = (request.params as any);
    const body = request.body as any;
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const [updated] = await db.update(bimSchedules)
      .set({
        name: body.name,
        description: body.description,
        startDate: body.startDate,
        endDate: body.endDate,
        updatedAt: new Date(),
      })
      .where(eq(bimSchedules.id, id))
      .returning();
    if (!updated) {
      return reply.code(404).send({ error: 'Scheduling não encontrado' });
    }
    reply.send(updated);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao atualizar scheduling', details: String(error) });
  }
}

export async function deleteSchedulingHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { id } = (request.params as any);
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const deleted = await db.delete(bimSchedules).where(eq(bimSchedules.id, id)).returning();
    if (!deleted.length) {
      return reply.code(404).send({ error: 'Scheduling não encontrado' });
    }
    reply.code(204).send();
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao deletar scheduling', details: String(error) });
  }
}
