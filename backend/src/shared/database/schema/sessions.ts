import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { projects } from './projects.js';
import { users } from './tenants.js';

// =====================================
// ENUMS
// =====================================
export const sessionStatusEnum = pgEnum('session_status', [
  'waiting',
  'active',
  'ended',
  'cancelled',
]);

export const participantRoleEnum = pgEnum('participant_role', [
  'architect',
  'client',
  'viewer',
  'guest',
]);

export const presenceStatusEnum = pgEnum('presence_status', [
  'online',
  'offline',
  'reconnecting',
]);

export const sessionEventTypeEnum = pgEnum('session_event_type', [
  'material_changed',
  'object_moved',
  'object_hidden',
  'object_isolated',
  'annotation_added',
  'annotation_removed',
  'camera_moved',
  'voice_joined',
  'voice_left',
  'laser_pointed',
  'participant_joined',
  'participant_left',
  'chat_message',
  'recording_started',
  'recording_stopped',
  'session_ended',
]);

// =====================================
// SESSIONS
// =====================================
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  hostId: uuid('host_id').notNull().references(() => users.id),

  // Snapshot: estado imutável do projeto no momento da criação
  snapshotId: varchar('snapshot_id', { length: 255 }),

  // Versão incremental dos eventos (stateVersion = qtd eventos aplicados)
  stateVersion: integer('state_version').notNull().default(0),

  status: sessionStatusEnum('status').notNull().default('waiting'),

  // Token público de acesso (convites por link)
  inviteToken: varchar('invite_token', { length: 64 }).unique(),
  inviteExpiresAt: timestamp('invite_expires_at'),

  // Limites de billing
  maxParticipants: integer('max_participants').notNull().default(2),

  startedAt: timestamp('started_at'),
  endedAt: timestamp('ended_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index('sessions_project_id_idx').on(table.projectId),
  hostIdIdx: index('sessions_host_id_idx').on(table.hostId),
  statusIdx: index('sessions_status_idx').on(table.status),
  inviteTokenIdx: uniqueIndex('sessions_invite_token_uidx').on(table.inviteToken),
}));

// =====================================
// PARTICIPANTS
// Identidade persistente (quem foi convidado e qual o papel)
// =====================================
export const participants = pgTable('participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),

  // Usuário autenticado OU convidado sem conta
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  guestName: varchar('guest_name', { length: 255 }),
  guestEmail: varchar('guest_email', { length: 255 }),

  role: participantRoleEnum('role').notNull().default('viewer'),

  // Permissões granulares além do role
  permissions: jsonb('permissions').$type<string[]>().default([]),

  invitedAt: timestamp('invited_at').defaultNow().notNull(),
  firstJoinedAt: timestamp('first_joined_at'),
}, (table) => ({
  sessionIdIdx: index('participants_session_id_idx').on(table.sessionId),
  userIdIdx: index('participants_user_id_idx').on(table.userId),
  sessionUserUniqueIdx: uniqueIndex('participants_session_user_uidx').on(table.sessionId, table.userId),
}));

// =====================================
// PRESENCE
// Estado de conexão (pode mudar muitas vezes por sessão)
// =====================================
export const presence = pgTable('presence', {
  id: uuid('id').primaryKey().defaultRandom(),
  participantId: uuid('participant_id').notNull().references(() => participants.id, { onDelete: 'cascade' }),

  socketId: varchar('socket_id', { length: 255 }),
  status: presenceStatusEnum('status').notNull().default('offline'),

  // Posição e estado do avatar na cena 3D
  avatarState: jsonb('avatar_state').$type<{
    position: [number, number, number];
    rotation: [number, number, number];
    animation?: string;
  }>(),

  joinedAt: timestamp('joined_at').notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),
}, (table) => ({
  participantIdIdx: index('presence_participant_id_idx').on(table.participantId),
  statusIdx: index('presence_status_idx').on(table.status),
}));

// =====================================
// SESSION_EVENTS
// Log append-only de tudo que aconteceu na sessão.
// Estado atual = snapshotId + todos os eventos em ordem.
// =====================================
export const sessionEvents = pgTable('session_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),

  // Número de sequência global dentro da sessão (para replay ordenado)
  sequence: integer('sequence').notNull(),

  actorId: uuid('actor_id').references(() => participants.id, { onDelete: 'set null' }),

  type: sessionEventTypeEnum('type').notNull(),

  // Dados do evento (schema varia por type)
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  sessionIdIdx: index('session_events_session_id_idx').on(table.sessionId),
  sessionSequenceUniqueIdx: uniqueIndex('session_events_session_sequence_uidx').on(table.sessionId, table.sequence),
  typeIdx: index('session_events_type_idx').on(table.type),
  createdAtIdx: index('session_events_created_at_idx').on(table.createdAt),
}));

// =====================================
// SESSION_RECORDINGS
// Gravação = snapshot + intervalo de eventos + áudio/vídeo opcionais
// =====================================
export const sessionRecordings = pgTable('session_recordings', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),

  // Intervalo de eventos cobertos por esta gravação
  eventStartSequence: integer('event_start_sequence').notNull().default(1),
  eventEndSequence: integer('event_end_sequence'),

  // URL de áudio/vídeo armazenado (opcional)
  storageUrl: text('storage_url'),
  durationSeconds: integer('duration_seconds'),

  startedAt: timestamp('started_at').notNull().defaultNow(),
  endedAt: timestamp('ended_at'),
}, (table) => ({
  sessionIdIdx: index('session_recordings_session_id_idx').on(table.sessionId),
}));

// =====================================
// SESSION_BILLING_USAGE
// Hook para billing: minutos de sessão por plano
// =====================================
export const sessionBillingUsage = pgTable('session_billing_usage', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),

  participantCount: integer('participant_count').notNull().default(0),
  durationMinutes: integer('duration_minutes').notNull().default(0),

  // Snapshot do plano no momento (evita desnormalização futura)
  planSlug: varchar('plan_slug', { length: 50 }),

  billedAt: timestamp('billed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  sessionIdIdx: index('session_billing_usage_session_id_idx').on(table.sessionId),
  projectIdIdx: index('session_billing_usage_project_id_idx').on(table.projectId),
}));
