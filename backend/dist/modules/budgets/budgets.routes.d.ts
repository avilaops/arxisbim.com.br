import type { FastifyInstance } from 'fastify';
/**
 * Routes for `/api/v1/budgets`.
 *
 * GET    /                  list budgets (?projectId, ?limit, ?offset)
 * POST   /                  create budget
 * GET    /:id               get budget (with items)
 * PUT    /:id               update budget meta
 * DELETE /:id               delete budget (cascade items)
 * POST   /:id/items         add cost item
 * PUT    /:id/items/:itemId update cost item
 * DELETE /:id/items/:itemId remove cost item
 */
export declare function budgetsRoutes(fastify: FastifyInstance): Promise<void>;
//# sourceMappingURL=budgets.routes.d.ts.map