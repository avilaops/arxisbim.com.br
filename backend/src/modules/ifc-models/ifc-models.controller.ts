
import { FastifyRequest, FastifyReply } from 'fastify';
import { ifcModels } from '../../shared/database/schema/projects.js';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
// Função utilitária para obter conexão com o banco
function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }
  const client = postgres(process.env.DATABASE_URL);
  return drizzle(client, { schema: { ifcModels } });
}

export async function getIfcModelsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { projectId } = (request.query as any);
    if (!projectId) {
      return reply.code(400).send({ error: 'projectId é obrigatório' });
    }
    const result = await db.select().from(ifcModels).where(eq(ifcModels.projectId, projectId));
    reply.send(result);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao listar IFC models', details: String(error) });
  }
}

export async function createIfcModelHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const body = request.body as any;
    if (!body || !body.projectId || !body.tenantId || !body.name || !body.originalName || !body.fileUrl) {
      return reply.code(400).send({ error: 'projectId, tenantId, name, originalName e fileUrl são obrigatórios' });
    }
    const [created] = await db.insert(ifcModels).values({
      projectId: body.projectId,
      tenantId: body.tenantId,
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
    const { id } = (request.params as any);
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const [model] = await db.select().from(ifcModels).where(eq(ifcModels.id, id)).limit(1);
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
    const { id } = (request.params as any);
    const body = request.body as any;
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
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
      .where(eq(ifcModels.id, id))
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
    const { id } = (request.params as any);
    if (!id) {
      return reply.code(400).send({ error: 'id é obrigatório' });
    }
    const deleted = await db.delete(ifcModels).where(eq(ifcModels.id, id)).returning();
    if (!deleted.length) {
      return reply.code(404).send({ error: 'IFC model não encontrado' });
    }
    reply.code(204).send();
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao deletar IFC model', details: String(error) });
  }
}
