import { FastifyInstance, FastifyRequest } from 'fastify';
import { ifcModels, projects, modelElements } from '../../shared/database/schema/projects.js';
import { sessions, participants } from '../../shared/database/schema/sessions.js';
import { db } from '../../shared/database/db.js';
import { eq, desc, and, or } from 'drizzle-orm';
import { storage as storageService } from '../../core/storage/index.js';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { z } from 'zod';
import { recordUpload } from '../../core/observability/metrics.js';
import { ifcProcessingQueue } from '../../modules/ifc/ifc-queue.service.js';
import { assessIfcSchemaSupport } from '../../modules/ifc/ifc-schema-support.js';

const updateIfcModelSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  discipline: z.string().max(50).optional(),
  phase: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type AuthedUser = {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  tenantId: string;
};

function getUser(request: FastifyRequest): AuthedUser | null {
  return ((request as any).user as AuthedUser) ?? null;
}

/**
 * Um participante de uma sessão ATIVA/aguardando sobre o projeto do modelo pode
 * acessá-lo, mesmo sendo de outro tenant (convite externo de reunião).
 */
async function isSessionParticipant(userId: string, projectId: string): Promise<boolean> {
  const rows = await db
    .select({ id: participants.id })
    .from(participants)
    .innerJoin(sessions, eq(participants.sessionId, sessions.id))
    .where(
      and(
        eq(participants.userId, userId),
        eq(sessions.projectId, projectId),
        or(eq(sessions.status, 'active'), eq(sessions.status, 'waiting')),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** Leitura/download: mesmo tenant OU participante de sessão ativa no projeto. */
async function canReadModel(
  user: AuthedUser,
  model: { tenantId: string; projectId: string },
): Promise<boolean> {
  if (model.tenantId === user.tenantId) return true;
  return isSessionParticipant(user.userId, model.projectId);
}

export async function ifcModelRoutes(fastify: FastifyInstance) {
  // Todas as rotas de modelo exigem autenticação.
  const auth = { preHandler: authenticateRequest };

  // Listar todos os modelos do tenant do usuário.
  fastify.get('/ifc-models', auth, async (request, reply) => {
    const user = getUser(request);
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });
    try {
      const models = await db
        .select()
        .from(ifcModels)
        .where(eq(ifcModels.tenantId, user.tenantId))
        .orderBy(desc(ifcModels.uploadedAt));
      return reply.send(models);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch IFC models' });
    }
  });

  // Listar modelos de um projeto (somente o próprio tenant).
  fastify.get('/projects/:projectId/ifc-models', auth, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const user = getUser(request);
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });
    try {
      const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
      if (!project.length) return reply.status(404).send({ error: 'Project not found' });
      if (project[0].tenantId !== user.tenantId) {
        return reply.status(403).send({ error: 'Forbidden' });
      }
      const models = await db
        .select()
        .from(ifcModels)
        .where(eq(ifcModels.projectId, projectId))
        .orderBy(desc(ifcModels.uploadedAt));
      return reply.send(models);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch IFC models' });
    }
  });

  // Obter modelo por ID (mesmo tenant ou participante de sessão).
  fastify.get('/ifc-models/:modelId', auth, async (request, reply) => {
    const { modelId } = request.params as { modelId: string };
    const user = getUser(request);
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });
    try {
      const model = await db.select().from(ifcModels).where(eq(ifcModels.id, modelId)).limit(1);
      if (!model.length) return reply.status(404).send({ error: 'IFC model not found' });
      if (!(await canReadModel(user, model[0]))) {
        return reply.status(403).send({ error: 'Forbidden' });
      }
      return reply.send(model[0]);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch IFC model' });
    }
  });

  // Upload de modelo para um projeto (somente membros do próprio tenant).
  fastify.post('/projects/:projectId/ifc-models', auth, async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const user = getUser(request);
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });

    try {
      const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
      if (!project.length) return reply.status(404).send({ error: 'Project not found' });
      if (project[0].tenantId !== user.tenantId) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const data = await request.file();
      if (!data) return reply.status(400).send({ error: 'No file uploaded' });

      const filename = data.filename;

      if (!filename.toLowerCase().endsWith('.ifc')) {
        return reply.status(400).send({ error: 'Only IFC files are allowed' });
      }

      const fileBuffer = await data.toBuffer();

      // Rejeita cedo esquemas que o pipeline (web-ifc) não processa — IFC2X2,
      // anteriores ou sem FILE_SCHEMA — em vez de falhar no worker de geometria.
      const schemaSupport = assessIfcSchemaSupport(fileBuffer);
      if (!schemaSupport.supported) {
        return reply.status(422).send({
          error: schemaSupport.reason,
          code: 'UNSUPPORTED_IFC_SCHEMA',
          schema: schemaSupport.schema,
        });
      }

      const storageKey = `tenants/${project[0].tenantId}/${projectId}/${filename}`;
      const { size: fileSizeBytes } = await storageService.upload(storageKey, fileBuffer, {
        contentType: 'application/x-step'
      });
      const fileUrl = `/api/v1/storage/${storageKey}`;

      const [newModel] = await db.insert(ifcModels).values({
        projectId,
        tenantId: project[0].tenantId,
        name: filename.replace('.ifc', ''),
        originalName: filename,
        fileUrl,
        fileSizeBytes,
        ifcType: schemaSupport.normalized,
        discipline: 'architecture',
        phase: 'new',
        metadata: {
          status: 'queued',
          error: null,
        } as any,
      }).returning();

      recordUpload(true, { tenantId: project[0].tenantId, kind: 'ifc' });

      // Enfileira o processamento em background usando a fila existente
      await ifcProcessingQueue.addJob(
        'geometry',
        newModel.id,
        projectId,
        project[0].tenantId,
        'high'
      );

      return reply.status(201).send(newModel);
    } catch (error) {
      fastify.log.error(error);
      recordUpload(false, { tenantId: user.tenantId, kind: 'ifc' });
      return reply.status(500).send({ error: 'Failed to upload IFC model' });
    }
  });

  // Atualizar modelo (somente o próprio tenant).
  fastify.put('/ifc-models/:modelId', auth, async (request, reply) => {
    const { modelId } = request.params as { modelId: string };
    const user = getUser(request);
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });
    const parsed = updateIfcModelSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: 'Validation error', details: parsed.error.issues });
    const body = parsed.data;
    try {
      const existing = await db.select().from(ifcModels).where(eq(ifcModels.id, modelId)).limit(1);
      if (!existing.length) return reply.status(404).send({ error: 'IFC model not found' });
      if (existing[0].tenantId !== user.tenantId) {
        return reply.status(403).send({ error: 'Forbidden' });
      }
      const [updatedModel] = await db.update(ifcModels)
        .set({
          ...(body.name && { name: body.name }),
          ...(body.discipline && { discipline: body.discipline }),
          ...(body.phase && { phase: body.phase }),
          ...(body.metadata && { metadata: body.metadata as any }),
          updatedAt: new Date(),
        })
        .where(eq(ifcModels.id, modelId))
        .returning();
      return reply.send(updatedModel);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update IFC model' });
    }
  });

  // Deletar modelo (somente o próprio tenant).
  fastify.delete('/ifc-models/:modelId', auth, async (request, reply) => {
    const { modelId } = request.params as { modelId: string };
    const user = getUser(request);
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });
    try {
      const model = await db.select().from(ifcModels).where(eq(ifcModels.id, modelId)).limit(1);
      if (!model.length) return reply.status(404).send({ error: 'IFC model not found' });
      if (model[0].tenantId !== user.tenantId) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const storageKey = model[0].fileUrl.replace('/api/v1/storage/', '');
      await storageService.delete(storageKey);
      await db.delete(ifcModels).where(eq(ifcModels.id, modelId));
      return reply.send({ message: 'IFC model deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete IFC model' });
    }
  });

  // Download do arquivo IFC (mesmo tenant ou participante de sessão ativa).
  fastify.get('/ifc-models/:modelId/download', auth, async (request, reply) => {
    const { modelId } = request.params as { modelId: string };
    const user = getUser(request);
    if (!user) return reply.status(401).send({ error: 'Unauthorized' });
    try {
      const model = await db.select().from(ifcModels).where(eq(ifcModels.id, modelId)).limit(1);
      if (!model.length) return reply.status(404).send({ error: 'IFC model not found' });
      if (!(await canReadModel(user, model[0]))) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const storageKey = model[0].fileUrl.replace('/api/v1/storage/', '');
      const fileStream = await storageService.download(storageKey);

      reply.header('Content-Type', 'application/ifc');
      reply.header('Content-Disposition', `attachment; filename="${model[0].originalName}"`);
      return reply.send(fileStream);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to download IFC model' });
    }
  });
}
