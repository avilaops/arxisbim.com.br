import { pgTable, uuid, varchar, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const emailQueue = pgTable('email_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  to: varchar('to', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  html: text('html').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending | sent | failed
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),
  lastError: text('last_error'),
  scheduledAt: timestamp('scheduled_at').defaultNow().notNull(),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  metadata: jsonb('metadata').$type<{ emailType?: string; tenantId?: string; userId?: string }>(),
}, (table) => ({
  statusIdx: index('email_queue_status_idx').on(table.status),
  scheduledAtIdx: index('email_queue_scheduled_at_idx').on(table.scheduledAt),
}));
