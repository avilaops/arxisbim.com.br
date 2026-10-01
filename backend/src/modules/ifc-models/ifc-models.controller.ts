import { FastifyRequest, FastifyReply } from 'fastify';
import { ifcModels } from '../../shared/database/schema/projects.js';
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
  return drizzle(client, { schema: { ifcModels } });
}
function getDb() {
  if (!dbCache) dbCache = criarDb();
  return dbCache;
}

export async function getIfcModelsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { tenantId } = request.user as any;
    const { projectId } = request.params as any;
    if (!projectId) {
      return reply.code(400).send({ error: 'projectId é obrigatório' });
    }
    const result = await db.select().from(ifcModels).where(
      and(eq(ifcModels.projectId, projectId), eq(ifcModels.tenantId, tenantId))
    );
    reply.send(result);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao listar IFC models', details: String(error) });
  }
}

export async function createIfcModelHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { tenantId } = request.user as any;
    const body = request.body as any;
    if (!body || !body.projectId || !body.name || !body.originalName || !body.fileUrl) {
      return reply.code(400).send({ error: 'projectId, name, originalName e fileUrl são obrigatórios' });
    }
    const [created] = await db.insert(ifcModels).values({
      projectId: body.projectId,
      tenantId,
      name: body.name,
      originalName: body.originalName,
      fileUrl: body.fileUrl,
      fileSizeBytes: body.fileSizeBytes,
      ifcType: body.ifcType,
      discipline: body.discipline,
      phase: body.phase,
      thumbnailUrl: body.thumbnailUrl,
      uploadedBy: body.uploadedBy,
      metadata: body.metadata ?? {},
    }).returning();
    reply.code(201).send(created);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao criar IFC model', details: String(error) });
  }
}

export async function getIfcModelHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { tenantId } = request.user as any;
    const { modelId } = request.params as any;
    if (!modelId) {
      return reply.code(400).send({ error: 'modelId é obrigatório' });
    }
    const [model] = await db.select().from(ifcModels).where(
      and(eq(ifcModels.id, modelId), eq(ifcModels.tenantId, tenantId))
    ).limit(1);
    if (!model) {
      return reply.code(404).send({ error: 'IFC model não encontrado' });
    }
    reply.send(model);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar IFC model', details: String(error) });
  }
}

export async function updateIfcModelHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { tenantId } = request.user as any;
    const { modelId } = request.params as any;
    const body = request.body as any;
    if (!modelId) {
      return reply.code(400).send({ error: 'modelId é obrigatório' });
    }
    const [updated] = await db.update(ifcModels)
      .set({
        name: body.name,
        originalName: body.originalName,
        fileUrl: body.fileUrl,
        fileSizeBytes: body.fileSizeBytes,
        ifcType: body.ifcType,
        discipline: body.discipline,
        phase: body.phase,
        thumbnailUrl: body.thumbnailUrl,
        uploadedBy: body.uploadedBy,
        metadata: body.metadata,
        updatedAt: new Date(),
      })
      .where(and(eq(ifcModels.id, modelId), eq(ifcModels.tenantId, tenantId)))
      .returning();
    if (!updated) {
      return reply.code(404).send({ error: 'IFC model não encontrado' });
    }
    reply.send(updated);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao atualizar IFC model', details: String(error) });
  }
}

export async function deleteIfcModelHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { tenantId } = request.user as any;
    const { modelId } = request.params as any;
    if (!modelId) {
      return reply.code(400).send({ error: 'modelId é obrigatório' });
    }
    const deleted = await db.delete(ifcModels).where(
      and(eq(ifcModels.id, modelId), eq(ifcModels.tenantId, tenantId))
    ).returning();
    if (!deleted.length) {
      return reply.code(404).send({ error: 'IFC model não encontrado' });
    }
    reply.code(204).send();
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao deletar IFC model', details: String(error) });
  }
}
