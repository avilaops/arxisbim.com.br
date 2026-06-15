import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, integer, date, decimal, index, primaryKey } from 'drizzle-orm/pg-core';
import { projects } from './projects.js';
import { users } from './tenants.js';
import { scenarios } from './scenarios.js';

// =====================================
// BIM_SCHEDULES (4D scheduling - Legado)
// =====================================
export const bimSchedules = pgTable('bim_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index('bim_schedules_project_id_idx').on(table.projectId),
}));

// =====================================
// SCHEDULE_TASKS (Legado)
// =====================================
export const scheduleTasks = pgTable('schedule_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  scheduleId: uuid('schedule_id').notNull().references(() => bimSchedules.id, { onDelete: 'cascade' }),
  taskName: varchar('task_name', { length: 255 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  progress: integer('progress').default(0), // 0-100
  dependencies: jsonb('dependencies').$type<string[]>(), // Task IDs
  isCriticalPath: boolean('is_critical_path').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  scheduleIdIdx: index('schedule_tasks_schedule_id_idx').on(table.scheduleId),
}));

// =====================================
// NEW 4D BIM SCHEDULING (Sprint 25)
// =====================================

export const schedules = pgTable('schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  scenarioId: uuid('scenario_id').references(() => scenarios.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  startDate: date('start_date').notNull(),
  source: varchar('source', { length: 20 }).notNull().default('manual'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index('schedules_project_id_idx').on(table.projectId),
  scenarioIdIdx: index('schedules_scenario_id_idx').on(table.scenarioId),
}));

export const activities = pgTable('activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  scheduleId: uuid('schedule_id').notNull().references(() => schedules.id, { onDelete: 'cascade' }),
  externalId: varchar('external_id', { length: 100 }),
  name: varchar('name', { length: 500 }).notNull(),
  plannedStart: date('planned_start').notNull(),
  plannedEnd: date('planned_end').notNull(),
  actualStart: date('actual_start'),
  actualEnd: date('actual_end'),
  durationDays: integer('duration_days'), // generated column (planned_end - planned_start)
  percentComplete: decimal('percent_complete', { precision: 5, scale: 2 }).default('0.00'),
  wbsCode: varchar('wbs_code', { length: 100 }),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  scheduleIdIdx: index('activities_schedule_id_idx').on(table.scheduleId),
  externalIdIdx: index('activities_external_id_idx').on(table.externalId),
}));

export const activityPredecessors = pgTable('activity_predecessors', {
  activityId: uuid('activity_id').notNull().references(() => activities.id, { onDelete: 'cascade' }),
  predecessorId: uuid('predecessor_id').notNull().references(() => activities.id, { onDelete: 'cascade' }),
  lagDays: integer('lag_days').default(0),
  type: varchar('type', { length: 10 }).default('FS'), // 'FS' | 'SS' | 'FF' | 'SF'
}, (table) => ({
  pk: primaryKey({ columns: [table.activityId, table.predecessorId] }),
}));

export const activityElements = pgTable('activity_elements', {
  activityId: uuid('activity_id').notNull().references(() => activities.id, { onDelete: 'cascade' }),
  globalId: varchar('global_id', { length: 22 }).notNull(),
  stateDuring: varchar('state_during', { length: 20 }).default('active'), // 'active' | 'temporary' | 'removed'
}, (table) => ({
  pk: primaryKey({ columns: [table.activityId, table.globalId] }),
}));

export const scheduleImportJobs = pgTable('schedule_import_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'processing' | 'success' | 'failed'
  errorMessage: text('error_message'),
  errors: jsonb('errors'), // Array of validation errors
  scheduleId: uuid('schedule_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectIdIdx: index('schedule_import_jobs_project_id_idx').on(table.projectId),
  statusIdx: index('schedule_import_jobs_status_idx').on(table.status),
}));

