import { FastifyRequest, FastifyReply } from 'fastify';
import { modelElements, ifcModels } from '../../shared/database/schema/projects.js';
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
  return drizzle(client, { schema: { modelElements, ifcModels } });
}
function getDb() {
  if (!dbCache) dbCache = criarDb();
  return dbCache;
}

export async function getModelElementsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = request.user as any;
    const { ifcModelId } = request.query as any;
    if (!ifcModelId) {
      return reply.code(400).send({ error: 'ifcModelId é obrigatório' });
    }
    const db = getDb();
    // Verify the ifcModel belongs to the tenant
    const [model] = await db.select({ id: ifcModels.id }).from(ifcModels).where(
      and(eq(ifcModels.id, ifcModelId), eq(ifcModels.tenantId, tenantId))
    ).limit(1);
    if (!model) {
      return reply.code(404).send({ error: 'IFC model não encontrado' });
    }
    const result = await db.select().from(modelElements).where(eq(modelElements.ifcModelId, ifcModelId));
    reply.send(result);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao listar elementos', details: String(error) });
  }
}

export async function getModelElementHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = request.user as any;
    const db = getDb();
    const { id } = request.params as any;
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const rows = await db.select({ el: modelElements }).from(modelElements)
      .innerJoin(ifcModels, eq(modelElements.ifcModelId, ifcModels.id))
      .where(and(eq(modelElements.id, id), eq(ifcModels.tenantId, tenantId)))
      .limit(1);
    if (!rows.length) {
      return reply.code(404).send({ error: 'Elemento não encontrado' });
    }
    reply.send(rows[0].el);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar elemento', details: String(error) });
  }
}

export async function createModelElementHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = request.user as any;
    const db = getDb();
    const body = request.body as any;
    if (!body || !body.ifcModelId || !body.expressId || !body.type) {
      return reply.code(400).send({ error: 'ifcModelId, expressId e type são obrigatórios' });
    }
    const [model] = await db.select({ id: ifcModels.id }).from(ifcModels).where(
      and(eq(ifcModels.id, body.ifcModelId), eq(ifcModels.tenantId, tenantId))
    ).limit(1);
    if (!model) {
      return reply.code(404).send({ error: 'IFC model não encontrado' });
    }
    const [created] = await db.insert(modelElements).values({
      ifcModelId: body.ifcModelId,
      expressId: body.expressId,
      globalId: body.globalId,
      type: body.type,
      name: body.name,
      properties: body.properties ?? {},
      geometry: body.geometry ?? {},
    }).returning();
    reply.code(201).send(created);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao criar elemento', details: String(error) });
  }
}

export async function updateModelElementHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = request.user as any;
    const db = getDb();
    const { id } = request.params as any;
    const body = request.body as any;
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const rows = await db.select({ id: modelElements.id }).from(modelElements)
      .innerJoin(ifcModels, eq(modelElements.ifcModelId, ifcModels.id))
      .where(and(eq(modelElements.id, id), eq(ifcModels.tenantId, tenantId)))
      .limit(1);
    if (!rows.length) {
      return reply.code(404).send({ error: 'Elemento não encontrado' });
    }
    const [updated] = await db.update(modelElements)
      .set({
        type: body.type,
        name: body.name,
        properties: body.properties,
        geometry: body.geometry,
      })
      .where(eq(modelElements.id, id))
      .returning();
    reply.send(updated);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao atualizar elemento', details: String(error) });
  }
}

export async function deleteModelElementHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = request.user as any;
    const db = getDb();
    const { id } = request.params as any;
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const rows = await db.select({ id: modelElements.id }).from(modelElements)
      .innerJoin(ifcModels, eq(modelElements.ifcModelId, ifcModels.id))
      .where(and(eq(modelElements.id, id), eq(ifcModels.tenantId, tenantId)))
      .limit(1);
    if (!rows.length) {
      return reply.code(404).send({ error: 'Elemento não encontrado' });
    }
    await db.delete(modelElements).where(eq(modelElements.id, id));
    reply.code(204).send();
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao deletar elemento', details: String(error) });
  }
}

export async function getModelElementByExpressIdHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = request.user as any;
    const { modelId, expressId } = request.params as any;
    if (!modelId || !expressId) {
      return reply.code(400).send({ error: 'modelId e expressId são obrigatórios' });
    }
    const expressIdInt = parseInt(expressId, 10);
    if (isNaN(expressIdInt)) {
      return reply.code(400).send({ error: 'expressId deve ser um número inteiro' });
    }

    const db = getDb();

    // Verify the IFC model belongs to the user's tenant
    const [model] = await db.select({ id: ifcModels.id }).from(ifcModels).where(
      and(eq(ifcModels.id, modelId), eq(ifcModels.tenantId, tenantId))
    ).limit(1);

    if (!model) {
      return reply.code(404).send({ error: 'IFC model não encontrado ou sem acesso' });
    }

    // Query using the composite index
    const [element] = await db.select().from(modelElements).where(
      and(eq(modelElements.ifcModelId, modelId), eq(modelElements.expressId, expressIdInt))
    ).limit(1);

    if (!element) {
      return reply.code(404).send({ error: 'Elemento não encontrado' });
    }

    reply.send(element);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar elemento', details: String(error) });
  }
}
