import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

// =====================================
// ANALYTICS_EVENTS — Rastreamento first-party (próprio, sem Google/Facebook)
// -------------------------------------
// Captura TUDO: visitas da landing (anônimas), cliques, conversões, e ações
// de usuários logados no app. Diferente de audit_logs/metrics, NÃO exige
// tenant_id (visitante anônimo não tem tenant). Visível só no painel do
// super-admin (nicolas@avila.inc).
// =====================================
export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Identidade (todos opcionais — anônimo na landing)
  anonId: varchar('anon_id', { length: 64 }),        // visitante (cookie/localStorage first-party)
  sessionId: varchar('session_id', { length: 64 }),  // sessão de navegação
  userId: uuid('user_id'),                            // quando logado
  tenantId: varchar('tenant_id', { length: 255 }),   // SEM FK: anônimo não tem tenant

  // Evento
  name: varchar('name', { length: 120 }).notNull(),       // 'page_view', 'cta_click', 'signup', 'checkout_start'...
  category: varchar('category', { length: 60 }),          // 'landing', 'auth', 'billing', 'app'...

  // Contexto de página
  path: varchar('path', { length: 512 }),
  referrer: varchar('referrer', { length: 512 }),

  // UTM / tags de campanha (controle do dono)
  utm: jsonb('utm').$type<{
    source?: string; medium?: string; campaign?: string; term?: string; content?: string;
    [k: string]: string | undefined;
  }>(),

  // Propriedades arbitrárias do evento + "tags" livres
  props: jsonb('props').$type<Record<string, unknown>>(),

  // Enriquecimento server-side
  ip: varchar('ip', { length: 64 }),
  userAgent: text('user_agent'),
  country: varchar('country', { length: 2 }),

  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => ({
  timestampIdx: index('analytics_events_timestamp_idx').on(table.timestamp.desc()),
  nameTimestampIdx: index('analytics_events_name_timestamp_idx').on(table.name, table.timestamp.desc()),
  anonIdx: index('analytics_events_anon_idx').on(table.anonId, table.timestamp.desc()),
  userIdx: index('analytics_events_user_idx').on(table.userId, table.timestamp.desc()),
  pathIdx: index('analytics_events_path_idx').on(table.path),
  categoryIdx: index('analytics_events_category_idx').on(table.category, table.timestamp.desc()),
}));
