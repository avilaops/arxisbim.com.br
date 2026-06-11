import { FastifyRequest, FastifyReply } from 'fastify';
import { scenarios } from '../../shared/database/schema/scenarios.js';
import { eq, and } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }
  const client = postgres(process.env.DATABASE_URL);
  return drizzle(client, { schema: { scenarios } });
}

export async function getScenariosHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { tenantId } = request.user as any;
    const { projectId } = request.params as any;
    if (!projectId) {
      return reply.code(400).send({ error: 'projectId é obrigatório' });
    }
    const result = await db.select().from(scenarios).where(
      and(eq(scenarios.projectId, projectId), eq(scenarios.tenantId, tenantId))
    );
    reply.send(result);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao listar scenarios', details: String(error) });
  }
}

export async function createScenarioHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { tenantId } = request.user as any;
    const body = request.body as any;
    if (!body || !body.projectId || !body.name || !body.camera || !body.player || !body.config) {
      return reply.code(400).send({ error: 'projectId, name, camera, player e config são obrigatórios' });
    }
    const [created] = await db.insert(scenarios).values({
      tenantId,
      projectId: body.projectId,
      createdBy: body.createdBy,
      name: body.name,
      description: body.description ?? '',
      presetId: body.presetId,
      camera: body.camera,
      player: body.player,
      config: body.config,
      metadata: body.metadata ?? {},
    }).returning();
    reply.code(201).send(created);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao criar scenario', details: String(error) });
  }
}

export async function getScenarioHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { tenantId } = request.user as any;
    const { scenarioId } = request.params as any;
    if (!scenarioId) {
      return reply.code(400).send({ error: 'scenarioId é obrigatório' });
    }
    const [scenario] = await db.select().from(scenarios).where(
      and(eq(scenarios.id, scenarioId), eq(scenarios.tenantId, tenantId))
    ).limit(1);
    if (!scenario) {
      return reply.code(404).send({ error: 'Scenario não encontrado' });
    }
    reply.send(scenario);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar scenario', details: String(error) });
  }
}

export async function updateScenarioHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { tenantId } = request.user as any;
    const { scenarioId } = request.params as any;
    const body = request.body as any;
    if (!scenarioId) {
      return reply.code(400).send({ error: 'scenarioId é obrigatório' });
    }
    const [updated] = await db.update(scenarios)
      .set({
        name: body.name,
        description: body.description,
        presetId: body.presetId,
        camera: body.camera,
        player: body.player,
        config: body.config,
        metadata: body.metadata,
        updatedAt: new Date(),
      })
      .where(and(eq(scenarios.id, scenarioId), eq(scenarios.tenantId, tenantId)))
      .returning();
    if (!updated) {
      return reply.code(404).send({ error: 'Scenario não encontrado' });
    }
    reply.send(updated);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao atualizar scenario', details: String(error) });
  }
}

export async function deleteScenarioHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { tenantId } = request.user as any;
    const { scenarioId } = request.params as any;
    if (!scenarioId) {
      return reply.code(400).send({ error: 'scenarioId é obrigatório' });
    }
    const deleted = await db.delete(scenarios).where(
      and(eq(scenarios.id, scenarioId), eq(scenarios.tenantId, tenantId))
    ).returning();
    if (!deleted.length) {
      return reply.code(404).send({ error: 'Scenario não encontrado' });
    }
    reply.code(204).send();
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao deletar scenario', details: String(error) });
  }
}
