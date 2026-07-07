import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const leads = pgTable('leads', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  company: text('company'),
  ifcFileName: text('ifc_file_name'),
  ifcFileSize: text('ifc_file_size'),
  grade: text('grade'), // 'A', 'B', 'C', 'D'
  scoreOverall: text('score_overall'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
