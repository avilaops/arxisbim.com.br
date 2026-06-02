import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, integer, bigint, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

// =====================================
// AUDIT_LOGS (Rastreabilidade completa)
// =====================================
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
  userId: uuid('user_id'), // Pode ser null para ações do sistema
  action: varchar('action', { length: 100 }).notNull(), // 'user.created', 'user.login', 'project.created', etc
  resource: varchar('resource', { length: 100 }).notNull(), // 'user', 'project', 'model', etc
  resourceId: varchar('resource_id', { length: 255 }), // ID do recurso afetado
  metadata: jsonb('metadata').$type<{
    ip?: string;
    userAgent?: string;
    method?: string;
    path?: string;
    statusCode?: number;
    duration?: number;
    changes?: Record<string, any>;
    error?: string;
  }>(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => ({
  // Indexes otimizados para queries comuns
  tenantIdTimestampIdx: index('audit_logs_tenant_id_timestamp_idx').on(table.tenantId, table.timestamp.desc()),
  userIdTimestampIdx: index('audit_logs_user_id_timestamp_idx').on(table.userId, table.timestamp.desc()),
  actionTimestampIdx: index('audit_logs_action_timestamp_idx').on(table.action, table.timestamp.desc()),
  resourceTimestampIdx: index('audit_logs_resource_timestamp_idx').on(table.resource, table.timestamp.desc()),
  resourceIdIdx: index('audit_logs_resource_id_idx').on(table.resourceId),
  timestampIdx: index('audit_logs_timestamp_idx').on(table.timestamp.desc()),
}));

// =====================================
// USER_SESSIONS (Gestão de sessões)
// =====================================
export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
  refreshToken: text('refresh_token').notNull().unique(),
  deviceInfo: jsonb('device_info').$type<{
    userAgent?: string;
    ip?: string;
    device?: string;
    browser?: string;
    os?: string;
  }>(),
  expiresAt: timestamp('expires_at').notNull(),
  lastActivityAt: timestamp('last_activity_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at'),
  ipAddress: varchar('ip_address', { length: 255 }),
  isRevoked: boolean('is_revoked').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  accessTokenJti: varchar('access_token_jti', { length: 255 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  revokedAt: timestamp('revoked_at'),
}, (table) => ({
  userIdIdx: index('user_sessions_user_id_idx').on(table.userId),
  tenantIdIdx: index('user_sessions_tenant_id_idx').on(table.tenantId),
  refreshTokenIdx: uniqueIndex('user_sessions_refresh_token_idx').on(table.refreshToken),
  expiresAtIdx: index('user_sessions_expires_at_idx').on(table.expiresAt),
  // Index composto para queries de sessões ativas
  userActiveIdx: index('user_sessions_user_active_idx').on(table.userId, table.isRevoked, table.expiresAt),
}));

// =====================================
// USER_PREFERENCES (Configurações do usuário)
// =====================================
export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique(),
  tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
  theme: varchar('theme', { length: 20 }).default('dark'), // 'light', 'dark', 'auto'
  language: varchar('language', { length: 10 }).default('pt-BR'),
  notifications: jsonb('notifications').$type<{
    email?: boolean;
    push?: boolean;
    inApp?: boolean;
  }>().default({ email: true, push: true, inApp: true }),
  vrSettings: jsonb('vr_settings').$type<{
    handedness?: 'left' | 'right';
    comfort?: 'low' | 'medium' | 'high';
    snapTurning?: boolean;
    teleportation?: boolean;
  }>(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: uniqueIndex('user_preferences_user_id_idx').on(table.userId),
  tenantIdIdx: index('user_preferences_tenant_id_idx').on(table.tenantId),
}));

// =====================================
// METRICS (Observabilidade)
// =====================================
export const metrics = pgTable('metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
  metricName: varchar('metric_name', { length: 100 }).notNull(), // 'api.request', 'db.query', 'auth.login', etc
  metricType: varchar('metric_type', { length: 50 }).notNull(), // 'counter', 'gauge', 'histogram', 'summary'
  value: bigint('value', { mode: 'number' }).notNull(),
  labels: jsonb('labels').$type<Record<string, string>>(), // { method: 'GET', endpoint: '/api/v1/users', status: '200' }
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => ({
  // Indexes para agregações rápidas
  tenantMetricTimestampIdx: index('metrics_tenant_metric_timestamp_idx').on(table.tenantId, table.metricName, table.timestamp.desc()),
  metricNameTimestampIdx: index('metrics_metric_name_timestamp_idx').on(table.metricName, table.timestamp.desc()),
  timestampIdx: index('metrics_timestamp_idx').on(table.timestamp.desc()),
  // Index composto para queries de métricas específicas
  tenantMetricTypeIdx: index('metrics_tenant_metric_type_idx').on(table.tenantId, table.metricName, table.metricType),
}));

// =====================================
// API_RATE_LIMITS (Rate limiting)
// =====================================
export const apiRateLimits = pgTable('api_rate_limits', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
  userId: uuid('user_id'),
  identifier: varchar('identifier', { length: 255 }).notNull(), // IP ou userId
  endpoint: varchar('endpoint', { length: 255 }).notNull(),
  requestCount: integer('request_count').notNull().default(0),
  windowStart: timestamp('window_start').notNull(),
  windowEnd: timestamp('window_end').notNull(),
}, (table) => ({
  // Unique constraint para evitar duplicatas na janela
  identifierEndpointWindowIdx: uniqueIndex('api_rate_limits_identifier_endpoint_window_idx').on(
    table.identifier,
    table.endpoint,
    table.windowStart
  ),
  tenantIdIdx: index('api_rate_limits_tenant_id_idx').on(table.tenantId),
  windowEndIdx: index('api_rate_limits_window_end_idx').on(table.windowEnd),
}));

// =====================================
// ERROR_LOGS (Tracking de erros)
// =====================================
export const errorLogs = pgTable('error_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: varchar('tenant_id', { length: 255 }).references(() => tenants.tenantId, { onDelete: 'cascade' }),
  userId: uuid('user_id'),
  errorCode: varchar('error_code', { length: 50 }),
  errorMessage: text('error_message').notNull(),
  stackTrace: text('stack_trace'),
  context: jsonb('context').$type<{
    method?: string;
    path?: string;
    query?: Record<string, any>;
    body?: Record<string, any>;
    headers?: Record<string, string>;
    userAgent?: string;
    ip?: string;
  }>(),
  severity: varchar('severity', { length: 20 }).notNull().default('error'), // 'error', 'warning', 'critical'
  resolved: boolean('resolved').default(false),
  resolvedAt: timestamp('resolved_at'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => ({
  tenantIdTimestampIdx: index('error_logs_tenant_id_timestamp_idx').on(table.tenantId, table.timestamp.desc()),
  errorCodeTimestampIdx: index('error_logs_error_code_timestamp_idx').on(table.errorCode, table.timestamp.desc()),
  severityTimestampIdx: index('error_logs_severity_timestamp_idx').on(table.severity, table.timestamp.desc()),
  resolvedIdx: index('error_logs_resolved_idx').on(table.resolved),
  timestampIdx: index('error_logs_timestamp_idx').on(table.timestamp.desc()),
}));

// =====================================
// PERFORMANCE_METRICS (Performance tracking)
// =====================================
export const performanceMetrics = pgTable('performance_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
  userId: uuid('user_id'),
  operation: varchar('operation', { length: 100 }).notNull(), // 'db.query', 'api.request', 'file.upload', etc
  duration: integer('duration').notNull(), // em milissegundos
  metadata: jsonb('metadata').$type<{
    query?: string;
    endpoint?: string;
    method?: string;
    statusCode?: number;
    fileSize?: number;
    cacheHit?: boolean;
  }>(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => ({
  // Indexes para análise de performance
  operationTimestampIdx: index('performance_metrics_operation_timestamp_idx').on(table.operation, table.timestamp.desc()),
  tenantIdTimestampIdx: index('performance_metrics_tenant_id_timestamp_idx').on(table.tenantId, table.timestamp.desc()),
  durationIdx: index('performance_metrics_duration_idx').on(table.duration.desc()),
  timestampIdx: index('performance_metrics_timestamp_idx').on(table.timestamp.desc()),
}));

// =====================================
// AUTH_TOKENS (Tokens de reset e verificação)
// =====================================
export const authTokens = pgTable('auth_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  tokenType: varchar('token_type', { length: 50 }).notNull(), // 'password_reset', 'email_verification', '2fa_setup'
  expiresAt: timestamp('expires_at').notNull(),
  isUsed: boolean('is_used').default(false).notNull(),
  usedAt: timestamp('used_at'),
  metadata: jsonb('metadata').$type<{
    email?: string;
    ipAddress?: string;
    userAgent?: string;
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tokenIdx: uniqueIndex('auth_tokens_token_idx').on(table.token),
  userIdTokenTypeIdx: index('auth_tokens_user_id_token_type_idx').on(table.userId, table.tokenType),
  expiresAtIdx: index('auth_tokens_expires_at_idx').on(table.expiresAt),
  isUsedIdx: index('auth_tokens_is_used_idx').on(table.isUsed),
}));
