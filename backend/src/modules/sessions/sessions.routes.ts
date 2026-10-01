/**
 * Sessions Routes — /api/v1/sessions
 *
 * REST endpoints para ciclo de vida de sessões multiplayer.
 * WebSocket events são tratados no signaling-server (porta 3002).
 */

import type { FastifyInstance } from 'fastify';
import { authenticateRequest } from '../../core/auth/middleware.js';
import type { TokenPayload } from '../../core/auth/jwt.js';
import {
  createSession,
  getSession,
  getSessionByInviteToken,
  startSession,
  endSession,
  addParticipant,
  getParticipants,
  issueParticipantToken,
  verifyInviteToken,
  getEventsSince,
  startRecording,
  stopRecording,
  appendEvent,
  upsertPresence,
  markPresenceOffline,
} from './sessions.service.js';
import { db } from '../../shared/database/db.js';
import { participants } from '../../shared/database/schema/sessions.js';
import { eq, and } from 'drizzle-orm';

export async function sessionsRoutes(fastify: FastifyInstance) {

  // ─── POST /api/v1/sessions ──────────────────────────────────────────────────
  // Cria sessão + retorna inviteLink para o host compartilhar
  fastify.post('/', {
    schema: {
      description: 'Cria uma nova sessão multiplayer',
      tags: ['sessions'],
      body: {
        type: 'object',
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          snapshotId: { type: 'string' },
          maxParticipants: { type: 'number', minimum: 2, maximum: 100 },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => {
      const user = (request as any).user as TokenPayload;
      const body = request.body as any;

      // projectId é opcional: usa o do body ou um UUID sentinela para sessões sem projeto
      const projectId = body.projectId || '00000000-0000-0000-0000-000000000001';

      const { session, hostParticipant } = await createSession(
        projectId,
        user.userId,
        {
          snapshotId: body.snapshotId,
          maxParticipants: body.maxParticipants,
        },
      );

      const accessToken = issueParticipantToken(hostParticipant);
      const frontendBase = process.env.FRONTEND_URL
        ?? (process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : 'https://app.arxisvr.com');
      const inviteLink = `${frontendBase}/join?token=${session.inviteToken}`;

      return reply.code(201).send({
        session,
        participant: hostParticipant,
        accessToken,
        inviteLink,
      });
    },
  });

  // ─── GET /api/v1/sessions/:sessionId/token ─────────────────────────────────
  // Host (usuário autenticado) reobtém token de participante para sessão existente
  fastify.get('/:sessionId/token', {
    schema: {
      tags: ['sessions'],
      params: { type: 'object', properties: { sessionId: { type: 'string', format: 'uuid' } }, required: ['sessionId'] },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => {
      const user = (request as any).user as TokenPayload;
      const { sessionId } = request.params as any;

      const session = await getSession(sessionId);
      if (!session) return reply.code(404).send({ error: 'Session not found' });
      if (session.status === 'ended') return reply.code(410).send({ error: 'Session has ended' });

      const [existing] = await db
        .select()
        .from(participants)
        .where(and(eq(participants.sessionId, sessionId), eq(participants.userId, user.userId)))
        .limit(1);

      if (!existing) return reply.code(403).send({ error: 'Not a participant of this session' });

      const accessToken = issueParticipantToken(existing);
      const frontendBase = process.env.FRONTEND_URL
        ?? (process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : 'https://app.arxisvr.com');
      const inviteLink = `${frontendBase}/join?token=${session.inviteToken}`;

      return reply.send({ accessToken, participant: existing, inviteLink });
    },
  });

  // ─── GET /api/v1/sessions/:sessionId ───────────────────────────────────────
  fastify.get('/:sessionId', {
    schema: {
      tags: ['sessions'],
      params: { type: 'object', properties: { sessionId: { type: 'string', format: 'uuid' } }, required: ['sessionId'] },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => {
      const { sessionId } = request.params as any;
      const session = await getSession(sessionId);
      if (!session) return reply.code(404).send({ error: 'Session not found' });
      return reply.send({ session });
    },
  });

  // ─── POST /api/v1/sessions/:sessionId/start ─────────────────────────────────
  fastify.post('/:sessionId/start', {
    schema: {
      tags: ['sessions'],
      params: { type: 'object', properties: { sessionId: { type: 'string', format: 'uuid' } }, required: ['sessionId'] },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => {
      const { sessionId } = request.params as any;
      const updated = await startSession(sessionId);
      if (!updated) return reply.code(409).send({ error: 'Session cannot be started' });
      return reply.send({ session: updated });
    },
  });

  // ─── POST /api/v1/sessions/:sessionId/end ───────────────────────────────────
  fastify.post('/:sessionId/end', {
    schema: {
      tags: ['sessions'],
      params: { type: 'object', properties: { sessionId: { type: 'string', format: 'uuid' } }, required: ['sessionId'] },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => {
      const { sessionId } = request.params as any;
      const updated = await endSession(sessionId);
      if (!updated) return reply.code(409).send({ error: 'Session already ended' });
      return reply.send({ session: updated });
    },
  });

  // ─── GET /api/v1/sessions/join/:inviteToken ─────────────────────────────────
  // Pré-visualização pública antes de entrar (sem auth obrigatória)
  // Usado pela tela "Bem-vindo João — Projeto: Casa Família Silva"
  fastify.get('/join/:inviteToken', {
    schema: {
      tags: ['sessions'],
      params: { type: 'object', properties: { inviteToken: { type: 'string' } }, required: ['inviteToken'] },
    },
    handler: async (request, reply) => {
      const { inviteToken } = request.params as any;
      const session = await getSessionByInviteToken(inviteToken);
      if (!session) return reply.code(404).send({ error: 'Invalid or expired invite' });
      if (session.status === 'ended') return reply.code(410).send({ error: 'Session has ended' });
      if (session.inviteExpiresAt && new Date(session.inviteExpiresAt) < new Date()) {
        return reply.code(410).send({ error: 'Invite link expired' });
      }

      // Retorna info pública suficiente para a tela de entrada
      return reply.send({
        sessionId: session.id,
        status: session.status,
        projectId: session.projectId,
      });
    },
  });

  // ─── POST /api/v1/sessions/join/:inviteToken ────────────────────────────────
  // Entra na sessão via link de convite (guest sem conta ou usuário autenticado)
  fastify.post('/join/:inviteToken', {
    schema: {
      tags: ['sessions'],
      params: { type: 'object', properties: { inviteToken: { type: 'string' } }, required: ['inviteToken'] },
      body: {
        type: 'object',
        properties: {
          guestName: { type: 'string', minLength: 1, maxLength: 100 },
          guestEmail: { type: 'string', format: 'email' },
        },
      },
    },
    handler: async (request, reply) => {
      const { inviteToken } = request.params as any;
      const body = request.body as any;

      const session = await getSessionByInviteToken(inviteToken);
      if (!session) return reply.code(404).send({ error: 'Invalid or expired invite' });
      if (session.status === 'ended') return reply.code(410).send({ error: 'Session has ended' });

      // Verifica se há espaço
      const existing = await getParticipants(session.id);
      if (existing.length >= session.maxParticipants) {
        return reply.code(429).send({ error: 'Session is full' });
      }

      // Tenta autenticar como usuário registrado
      let userId: string | undefined;
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const { verifyToken } = await import('../../core/auth/jwt.js');
        const payload = await verifyToken(authHeader.slice(7));
        if (payload) userId = payload.userId;
      }

      const participant = await addParticipant(session.id, {
        userId,
        guestName: body?.guestName,
        guestEmail: body?.guestEmail,
        role: 'client',
      });

      const accessToken = issueParticipantToken(participant);

      // Auto-start se estava waiting e host e guest chegaram
      if (session.status === 'waiting') {
        await startSession(session.id);
      }

      return reply.code(201).send({
        sessionId: session.id,
        participant,
        accessToken,
      });
    },
  });

  // ─── GET /api/v1/sessions/:sessionId/participants ───────────────────────────
  fastify.get('/:sessionId/participants', {
    schema: {
      tags: ['sessions'],
      params: { type: 'object', properties: { sessionId: { type: 'string', format: 'uuid' } }, required: ['sessionId'] },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => {
      const { sessionId } = request.params as any;
      const list = await getParticipants(sessionId);
      return reply.send({ participants: list });
    },
  });

  // ─── GET /api/v1/sessions/:sessionId/events ─────────────────────────────────
  // Retorna eventos a partir de fromSequence para late-join sync
  fastify.get('/:sessionId/events', {
    schema: {
      tags: ['sessions'],
      params: { type: 'object', properties: { sessionId: { type: 'string', format: 'uuid' } }, required: ['sessionId'] },
      querystring: { type: 'object', properties: { fromSequence: { type: 'number', default: 0 } } },
    },
    handler: async (request, reply) => {
      // Valida token de participante (WS token emitido no join)
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.code(401).send({ error: 'Missing access token' });
      }
      const { verifyInviteToken: verify } = await import('./sessions.service.js');
      const payload = verify(authHeader.slice(7));
      if (!payload) return reply.code(401).send({ error: 'Invalid access token' });

      const { sessionId } = request.params as any;
      const { fromSequence } = request.query as any;

      const events = await getEventsSince(sessionId, fromSequence ?? 0);
      return reply.send({ events });
    },
  });

  // ─── POST /api/v1/sessions/:sessionId/recordings/start ──────────────────────
  fastify.post('/:sessionId/recordings/start', {
    schema: {
      tags: ['sessions'],
      params: { type: 'object', properties: { sessionId: { type: 'string', format: 'uuid' } }, required: ['sessionId'] },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => {
      const { sessionId } = request.params as any;
      const recording = await startRecording(sessionId);
      return reply.code(201).send({ recording });
    },
  });

  // ─── POST /api/v1/sessions/recordings/:recordingId/stop ─────────────────────
  fastify.post('/recordings/:recordingId/stop', {
    schema: {
      tags: ['sessions'],
      params: { type: 'object', properties: { recordingId: { type: 'string', format: 'uuid' } }, required: ['recordingId'] },
      body: { type: 'object', properties: { storageUrl: { type: 'string' } } },
      security: [{ bearerAuth: [] }],
    },
    preHandler: authenticateRequest,
    handler: async (request, reply) => {
      const { recordingId } = request.params as any;
      const body = request.body as any;
      const recording = await stopRecording(recordingId, body?.storageUrl);
      return reply.send({ recording });
    },
  });

  // ─── INTERNAL: POST /api/v1/sessions/:sessionId/events/internal ─────────────
  // Chamado exclusivamente pelo signaling-server para persistir eventos.
  // Protegido por X-Internal-Key (não exposto ao frontend).
  fastify.post('/:sessionId/events/internal', {
    schema: {
      tags: ['sessions-internal'],
      params: { type: 'object', properties: { sessionId: { type: 'string', format: 'uuid' } }, required: ['sessionId'] },
      body: {
        type: 'object',
        required: ['type'],
        properties: {
          actorId: { type: 'string' },
          type: { type: 'string' },
          payload: { type: 'object' },
        },
      },
    },
    handler: async (request, reply) => {
      const internalKey = request.headers['x-internal-key'];
      if (internalKey !== (process.env.INTERNAL_API_KEY ?? 'internal')) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
      const { sessionId } = request.params as any;
      const { actorId, type, payload } = request.body as any;
      const normalizedActorId = actorId && actorId !== '' ? actorId : null;
      const event = await appendEvent(sessionId, normalizedActorId, type, payload ?? {});
      return reply.code(201).send({ event });
    },
  });

  // ─── INTERNAL: PUT /api/v1/sessions/:sessionId/presence ─────────────────────
  fastify.put('/:sessionId/presence', {
    schema: {
      tags: ['sessions-internal'],
      params: { type: 'object', properties: { sessionId: { type: 'string', format: 'uuid' } }, required: ['sessionId'] },
      body: {
        type: 'object',
        required: ['participantId', 'status'],
        properties: {
          participantId: { type: 'string' },
          socketId: { type: 'string' },
          status: { type: 'string', enum: ['online', 'offline', 'reconnecting'] },
        },
      },
    },
    handler: async (request, reply) => {
      const internalKey = request.headers['x-internal-key'];
      if (internalKey !== (process.env.INTERNAL_API_KEY ?? 'internal')) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
      const { participantId, socketId, status } = request.body as any;
      const p = await upsertPresence(participantId, socketId ?? '', status);
      return reply.send({ presence: p });
    },
  });

  // ─── INTERNAL: PATCH /api/v1/sessions/:sessionId/participants/:participantId/joined
  fastify.patch('/:sessionId/participants/:participantId/joined', {
    schema: {
      tags: ['sessions-internal'],
      params: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', format: 'uuid' },
          participantId: { type: 'string', format: 'uuid' },
        },
        required: ['sessionId', 'participantId'],
      },
    },
    handler: async (request, reply) => {
      const internalKey = request.headers['x-internal-key'];
      if (internalKey !== (process.env.INTERNAL_API_KEY ?? 'internal')) {
        return reply.code(403).send({ error: 'Forbidden' });
      }
      const { participantId } = request.params as any;
      await db
        .update(participants)
        .set({ firstJoinedAt: new Date() })
        .where(and(eq(participants.id, participantId), eq(participants.firstJoinedAt, null as any)));
      return reply.send({ ok: true });
    },
  });
}
