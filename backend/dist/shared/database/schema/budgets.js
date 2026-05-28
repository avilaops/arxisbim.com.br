import { pgTable, uuid, varchar, text, timestamp, jsonb, integer, real, index, } from 'drizzle-orm/pg-core';
import { projects } from './projects.js';
import { tenants, users } from './tenants.js';
// =====================================
// BUDGETS (5D cost management)
// =====================================
export const budgets = pgTable('budgets', {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: varchar('tenant_id', { length: 255 })
        .notNull()
        .references(() => tenants.tenantId, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
        .notNull()
        .references(() => projects.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    totalCost: real('total_cost').notNull().default(0),
    metadata: jsonb('metadata').$type(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    tenantIdIdx: index('budgets_tenant_id_idx').on(table.tenantId),
    projectIdIdx: index('budgets_project_id_idx').on(table.projectId),
    createdByIdx: index('budgets_created_by_idx').on(table.createdBy),
    tenantProjectUpdatedIdx: index('budgets_tenant_project_updated_idx').on(table.tenantId, table.projectId, table.updatedAt.desc()),
}));
// =====================================
// BUDGET COST ITEMS
// =====================================
export const budgetCostItems = pgTable('budget_cost_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    budgetId: uuid('budget_id')
        .notNull()
        .references(() => budgets.id, { onDelete: 'cascade' }),
    /** sequencing for stable client-side ordering. */
    position: integer('position').notNull().default(0),
    description: varchar('description', { length: 500 }).notNull(),
    unit: varchar('unit', { length: 32 }).notNull(),
    quantity: real('quantity').notNull().default(0),
    unitPrice: real('unit_price').notNull().default(0),
    totalPrice: real('total_price').notNull().default(0),
    /** Array of IFC expressIDs (number) or GUIDs (string) linked to this item. */
    linkedElements: jsonb('linked_elements').$type().notNull().default([]),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
    budgetIdIdx: index('budget_cost_items_budget_id_idx').on(table.budgetId),
    budgetPositionIdx: index('budget_cost_items_budget_position_idx').on(table.budgetId, table.position),
}));
//# sourceMappingURL=budgets.js.map