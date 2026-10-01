/**
 * Sessions Service
 *
 * Gerencia sessões multiplayer: criação, convites, eventos, presença, billing.
 * Modelo event-sourced: estado atual = snapshot + eventos ordenados por sequence.
 */

import { eq, and, asc, desc, sql } from 'drizzle-orm';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { db } from '../../shared/database/db.js';
import {
  sessions,
  participants,
  presence,
  sessionEvents,
  sessionRecordings,
  sessionBillingUsage,
} from '../../shared/database/schema/sessions.js';

/**
 * Lido na hora do uso, não no carregamento do módulo.
 *
 * Antes isto era um `throw` solto no topo. Imports ESM resolvem antes de
 * qualquer código do `index.ts` rodar, então esse throw estourava primeiro e
 * matava o processo com um stack trace cru, passando por cima da checagem de
 * `requiredEnvVars` que existe justamente para listar tudo o que falta numa
 * mensagem legível. Quem subia sem `.env` via um erro de um módulo interno em
 * vez da lista de variáveis.
 */
function jwtSecret(): string {
  const valor = process.env.JWT_SECRET;
  if (!valor) {
    throw new Error('JWT_SECRET não configurado');
  }
  return valor;
}

// ─── Token de convite (sem conta) ───────────────────────────────────────────

export interface InviteTokenPayload {
  participantId: string;
  sessionId: string;
  role: string;
  permissions: string[];
  exp?: number;
}

export function signInviteToken(payload: Omit<InviteTokenPayload, 'exp'>, expiresIn = '48h'): string {
  return jwt.sign(payload, jwtSecret(), { expiresIn } as jwt.SignOptions);
}

export function verifyInviteToken(token: string): InviteTokenPayload | null {
  try {
    return jwt.verify(token, jwtSecret()) as InviteTokenPayload;
  } catch {
    return null;
  }
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export async function createSession(
  projectId: string,
  hostId: string,
  opts?: { snapshotId?: string; maxParticipants?: number },
) {
  const inviteToken = crypto.randomBytes(32).toString('hex');
  const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

  const [session] = await db.insert(sessions).values({
    projectId,
    hostId,
    snapshotId: opts?.snapshotId ?? null,
    maxParticipants: opts?.maxParticipants ?? 2,
    inviteToken,
    inviteExpiresAt,
    status: 'waiting',
  }).returning();

  // Host é automaticamente participant com role architect
  const [hostParticipant] = await db.insert(participants).values({
    sessionId: session.id,
    userId: hostId,
    role: 'architect',
    permissions: ['voice', 'comment', 'mutate', 'record', 'end_session'],
  }).returning();

  return { session, hostParticipant };
}

export async function getSession(sessionId: string) {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  return session ?? null;
}

export async function getSessionByInviteToken(token: string) {
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.inviteToken, token));
  return session ?? null;
}

export async function startSession(sessionId: string) {
  const [updated] = await db
    .update(sessions)
    .set({ status: 'active', startedAt: new Date() })
    .where(and(eq(sessions.id, sessionId), eq(sessions.status, 'waiting')))
    .returning();
  return updated ?? null;
}

export async function endSession(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session || session.status === 'ended') return null;

  const endedAt = new Date();
  const durationMs = session.startedAt ? endedAt.getTime() - new Date(session.startedAt).getTime() : 0;
  const durationMinutes = Math.ceil(durationMs / 60_000);

  // Contar participantes únicos que entraram
  const participantList = await db
    .select()
    .from(participants)
    .where(eq(participants.sessionId, sessionId));

  const [updated] = await db
    .update(sessions)
    .set({ status: 'ended', endedAt })
    .where(eq(sessions.id, sessionId))
    .returning();

  // Registrar usage para billing
  await db.insert(sessionBillingUsage).values({
    sessionId,
    projectId: session.projectId,
    participantCount: participantList.length,
    durationMinutes,
  });

  // Evento de encerramento
  await appendEvent(sessionId, null, 'session_ended', { durationMinutes });

  return updated;
}

// ─── Participants ─────────────────────────────────────────────────────────────

export async function addParticipant(
  sessionId: string,
  opts: {
    userId?: string;
    guestName?: string;
    guestEmail?: string;
    role?: 'client' | 'viewer' | 'guest';
    permissions?: string[];
  },
) {
  const role = opts.role ?? 'viewer';
  const defaultPerms: Record<string, string[]> = {
    client: ['voice', 'comment'],
    viewer: ['comment'],
    guest: [],
  };

  const [participant] = await db.insert(participants).values({
    sessionId,
    userId: opts.userId ?? null,
    guestName: opts.guestName ?? null,
    guestEmail: opts.guestEmail ?? null,
    role,
    permissions: opts.permissions ?? defaultPerms[role] ?? [],
  }).returning();

  return participant;
}

export async function getParticipants(sessionId: string) {
  return db
    .select()
    .from(participants)
    .where(eq(participants.sessionId, sessionId));
}

/** Gera token JWT de curta duração para que o participante se autentique no WS */
export function issueParticipantToken(participant: typeof participants.$inferSelect): string {
  const payload: InviteTokenPayload = {
    participantId: participant.id,
    sessionId: participant.sessionId,
    role: participant.role,
    permissions: (participant.permissions as string[]) ?? [],
  };
  return signInviteToken(payload, '4h');
}

// ─── Presence ─────────────────────────────────────────────────────────────────

export async function upsertPresence(
  participantId: string,
  socketId: string,
  status: 'online' | 'offline' | 'reconnecting' = 'online',
) {
  // Upsert por participantId (um registro de presença por participante)
  const existing = await db
    .select()
    .from(presence)
    .where(eq(presence.participantId, participantId))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(presence)
      .set({ socketId, status, lastSeenAt: new Date() })
      .where(eq(presence.participantId, participantId))
      .returning();
    return updated;
  }

  const [created] = await db.insert(presence).values({
    participantId,
    socketId,
    status,
    joinedAt: new Date(),
    lastSeenAt: new Date(),
  }).returning();
  return created;
}

export async function markPresenceOffline(socketId: string) {
  await db
    .update(presence)
    .set({ status: 'offline', lastSeenAt: new Date() })
    .where(eq(presence.socketId, socketId));
}

// ─── SessionEvents ────────────────────────────────────────────────────────────

export async function appendEvent(
  sessionId: string,
  actorId: string | null,
  type: typeof sessionEvents.$inferInsert['type'],
  payload: Record<string, unknown> = {},
) {
  // Incrementa stateVersion atomicamente e usa como sequence
  const [updated] = await db
    .update(sessions)
    .set({ stateVersion: sql`${sessions.stateVersion} + 1` })
    .where(eq(sessions.id, sessionId))
    .returning({ stateVersion: sessions.stateVersion });

  const sequence = updated.stateVersion;

  // Verificar se actorId existe na tabela participants para evitar FK violation
  let resolvedActorId: string | null = null;
  if (actorId) {
    const [p] = await db.select({ id: participants.id }).from(participants).where(eq(participants.id, actorId)).limit(1);
    resolvedActorId = p?.id ?? null;
  }

  const [event] = await db.insert(sessionEvents).values({
    sessionId,
    sequence,
    actorId: resolvedActorId,
    type,
    payload,
  }).returning();

  return event;
}

/** Busca eventos a partir de um sequence para sincronizar cliente que entrou tarde */
export async function getEventsSince(sessionId: string, fromSequence = 0) {
  return db
    .select()
    .from(sessionEvents)
    .where(
      and(
        eq(sessionEvents.sessionId, sessionId),
        sql`${sessionEvents.sequence} > ${fromSequence}`,
      ),
    )
    .orderBy(asc(sessionEvents.sequence));
}

// ─── Recordings ───────────────────────────────────────────────────────────────

export async function startRecording(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found');

  const [recording] = await db.insert(sessionRecordings).values({
    sessionId,
    eventStartSequence: session.stateVersion + 1,
  }).returning();

  await appendEvent(sessionId, null, 'recording_started', { recordingId: recording.id });
  return recording;
}

export async function stopRecording(recordingId: string, storageUrl?: string) {
  const [recording] = await db
    .select()
    .from(sessionRecordings)
    .where(eq(sessionRecordings.id, recordingId))
    .limit(1);

  if (!recording) throw new Error('Recording not found');

  const session = await getSession(recording.sessionId);
  const endedAt = new Date();
  const durationSeconds = Math.ceil(
    (endedAt.getTime() - new Date(recording.startedAt).getTime()) / 1000,
  );

  const [updated] = await db
    .update(sessionRecordings)
    .set({
      eventEndSequence: session?.stateVersion ?? null,
      endedAt,
      durationSeconds,
      storageUrl: storageUrl ?? null,
    })
    .where(eq(sessionRecordings.id, recordingId))
    .returning();

  await appendEvent(recording.sessionId, null, 'recording_stopped', {
    recordingId,
    durationSeconds,
  });

  return updated;
}
