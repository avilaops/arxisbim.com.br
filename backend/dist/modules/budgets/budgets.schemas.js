import { z } from 'zod';
/**
 * Sprint 8 — BIM 5D Budget persistence schemas (Zod).
 */
const linkedElementsSchema = z.array(z.union([z.string(), z.number()])).default([]);
export const costItemInputSchema = z.object({
    description: z.string().min(1).max(500),
    unit: z.string().min(1).max(32),
    quantity: z.number().finite(),
    unitPrice: z.number().finite(),
    linkedElements: linkedElementsSchema.optional(),
    position: z.number().int().nonnegative().optional(),
});
export const updateCostItemSchema = costItemInputSchema.partial();
export const createBudgetSchema = z.object({
    projectId: z.string().uuid(),
    name: z.string().min(1).max(255),
    description: z.string().max(2000).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    items: z.array(costItemInputSchema).optional(),
});
export const updateBudgetSchema = z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});
export const listBudgetsQuerySchema = z.object({
    projectId: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    offset: z.coerce.number().int().nonnegative().default(0),
});
//# sourceMappingURL=budgets.schemas.js.map