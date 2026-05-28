import { pgTable, varchar, text, jsonb, timestamp, boolean, index, uuid } from 'drizzle-orm/pg-core';
import { users, tenants } from './tenants.js';
// Tabela de notificações
export const notifications = pgTable('notifications', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(), // ifc_upload_complete, comment_added, task_assigned, etc.
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    priority: varchar('priority', { length: 20 }).notNull().default('medium'), // low, medium, high, critical
    actionUrl: text('action_url'), // URL para ação (link para o modelo, comentário, etc.)
    metadata: jsonb('metadata').default({}).notNull(), // Dados adicionais (IDs, nomes, etc.)
    isRead: boolean('is_read').notNull().default(false),
    readAt: timestamp('read_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
    userIdIdx: index('notifications_user_id_idx').on(table.userId),
    tenantIdIdx: index('notifications_tenant_id_idx').on(table.tenantId),
    isReadIdx: index('notifications_is_read_idx').on(table.isRead),
    typeIdx: index('notifications_type_idx').on(table.type),
    createdAtIdx: index('notifications_created_at_idx').on(table.createdAt),
}));
// Tabela de preferências de notificação
export const notificationPreferences = pgTable('notification_preferences', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tenantId: varchar('tenant_id', { length: 255 }).notNull().references(() => tenants.tenantId, { onDelete: 'cascade' }),
    notificationType: varchar('notification_type', { length: 50 }).notNull(), // ifc_upload_complete, etc.
    channels: jsonb('channels').$type().notNull().default(['in_app']), // ['in_app', 'email', 'push', 'sms']
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
    userIdIdx: index('notification_prefs_user_id_idx').on(table.userId),
    tenantIdIdx: index('notification_prefs_tenant_id_idx').on(table.tenantId),
    typeIdx: index('notification_prefs_type_idx').on(table.notificationType),
}));
//# sourceMappingURL=notifications.js.map