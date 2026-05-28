import { pgTable, uuid, varchar, text, timestamp, jsonb, boolean, integer, date, index } from 'drizzle-orm/pg-core';
import { projects } from './projects.js';
import { users } from './tenants.js';
// =====================================
// BIM_SCHEDULES (4D scheduling)
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
// SCHEDULE_TASKS
// =====================================
export const scheduleTasks = pgTable('schedule_tasks', {
    id: uuid('id').primaryKey().defaultRandom(),
    scheduleId: uuid('schedule_id').notNull().references(() => bimSchedules.id, { onDelete: 'cascade' }),
    taskName: varchar('task_name', { length: 255 }).notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    progress: integer('progress').default(0), // 0-100
    dependencies: jsonb('dependencies').$type(), // Task IDs
    isCriticalPath: boolean('is_critical_path').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    scheduleIdIdx: index('schedule_tasks_schedule_id_idx').on(table.scheduleId),
}));
// =====================================
// TASK_ELEMENT_LINKS (link tasks to IFC elements)
// =====================================
export const taskElementLinks = pgTable('task_element_links', {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id').notNull().references(() => scheduleTasks.id, { onDelete: 'cascade' }),
    elementId: varchar('element_id', { length: 255 }).notNull(), // IFC element GlobalId
    action: varchar('action', { length: 50 }), // 'construct', 'demolish', 'temporary'
}, (table) => ({
    taskIdIdx: index('task_element_links_task_id_idx').on(table.taskId),
}));
// =====================================
// TIMELINE_SIMULATIONS (saved playback states)
// =====================================
export const timelineSimulations = pgTable('timeline_simulations', {
    id: uuid('id').primaryKey().defaultRandom(),
    scheduleId: uuid('schedule_id').notNull().references(() => bimSchedules.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }),
    simulationDate: date('simulation_date').notNull(),
    snapshot: jsonb('snapshot').$type(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    scheduleIdIdx: index('timeline_simulations_schedule_id_idx').on(table.scheduleId),
}));
//# sourceMappingURL=scheduling.js.map