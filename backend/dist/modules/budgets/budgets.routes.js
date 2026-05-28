import { authenticateRequest } from '../../core/auth/middleware.js';
import { BudgetsController } from './budgets.controller.js';
import { BudgetsService } from './budgets.service.js';
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
export async function budgetsRoutes(fastify) {
    const service = new BudgetsService();
    const controller = new BudgetsController(service);
    const security = [{ bearerAuth: [] }];
    const tag = ['budgets'];
    fastify.get('/', {
        schema: { description: 'List budgets', tags: tag, security },
        preHandler: authenticateRequest,
        handler: controller.list,
    });
    fastify.post('/', {
        schema: { description: 'Create budget', tags: tag, security },
        preHandler: authenticateRequest,
        handler: controller.create,
    });
    fastify.get('/:id', {
        schema: { description: 'Get budget with items', tags: tag, security },
        preHandler: authenticateRequest,
        handler: controller.get,
    });
    fastify.put('/:id', {
        schema: { description: 'Update budget', tags: tag, security },
        preHandler: authenticateRequest,
        handler: controller.update,
    });
    fastify.delete('/:id', {
        schema: { description: 'Delete budget', tags: tag, security },
        preHandler: authenticateRequest,
        handler: controller.remove,
    });
    fastify.post('/:id/items', {
        schema: { description: 'Add cost item', tags: tag, security },
        preHandler: authenticateRequest,
        handler: controller.addItem,
    });
    fastify.put('/:id/items/:itemId', {
        schema: { description: 'Update cost item', tags: tag, security },
        preHandler: authenticateRequest,
        handler: controller.updateItem,
    });
    fastify.delete('/:id/items/:itemId', {
        schema: { description: 'Remove cost item', tags: tag, security },
        preHandler: authenticateRequest,
        handler: controller.removeItem,
    });
}
//# sourceMappingURL=budgets.routes.js.map