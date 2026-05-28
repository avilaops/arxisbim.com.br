import type { FastifyInstance } from 'fastify';
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
export async function budgetsRoutes(fastify: FastifyInstance) {
  const service = new BudgetsService();
  const controller = new BudgetsController(service);

  const security = [{ bearerAuth: [] }];
  const tag = ['budgets'];

  fastify.get('/', {
    schema: { description: 'List budgets', tags: tag, security },
    preHandler: authenticateRequest,
    handler: controller.list,
  } as any);

  fastify.post('/', {
    schema: { description: 'Create budget', tags: tag, security },
    preHandler: authenticateRequest,
    handler: controller.create,
  } as any);

  fastify.get('/:id', {
    schema: { description: 'Get budget with items', tags: tag, security },
    preHandler: authenticateRequest,
    handler: controller.get,
  } as any);

  fastify.put('/:id', {
    schema: { description: 'Update budget', tags: tag, security },
    preHandler: authenticateRequest,
    handler: controller.update,
  } as any);

  fastify.delete('/:id', {
    schema: { description: 'Delete budget', tags: tag, security },
    preHandler: authenticateRequest,
    handler: controller.remove,
  } as any);

  fastify.post('/:id/items', {
    schema: { description: 'Add cost item', tags: tag, security },
    preHandler: authenticateRequest,
    handler: controller.addItem,
  } as any);

  fastify.put('/:id/items/:itemId', {
    schema: { description: 'Update cost item', tags: tag, security },
    preHandler: authenticateRequest,
    handler: controller.updateItem,
  } as any);

  fastify.delete('/:id/items/:itemId', {
    schema: { description: 'Remove cost item', tags: tag, security },
    preHandler: authenticateRequest,
    handler: controller.removeItem,
  } as any);
}
