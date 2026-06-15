import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CostsService } from './costs.service.js';
import type { Sql } from 'postgres';
import {
  CreateCostTableSchema,
  UpdateCostTableSchema,
  CreateCostItemSchema,
  UpdateCostItemSchema,
  CreateElementCostLinkSchema,
  UpdateElementCostLinkSchema,
} from './costs.schemas.js';

export function createCostsRoutes(sql: Sql) {
  const costsService = new CostsService(sql);

  return async (fastify: FastifyInstance) => {
    // ==================== COST TABLES ====================

    // POST /api/v1/cost-tables
    fastify.post<{ Body: any }>(
      '/cost-tables',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['Costs'],
          summary: 'Create cost table',
          body: CreateCostTableSchema,
        },
      },
      async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
        try {
          const data = CreateCostTableSchema.parse(request.body);
          const result = await costsService.createCostTable(
            data.project_id,
            request.user!.userId,
            data
          );
          reply.code(201).send(result);
        } catch (err) {
          fastify.log.error(err);
          reply.code(400).send({ error: 'Failed to create cost table' });
        }
      }
    );

    // GET /api/v1/projects/:projectId/cost-tables
    fastify.get<{ Params: { projectId: string } }>(
      '/projects/:projectId/cost-tables',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['Costs'],
          summary: 'List cost tables for project',
          params: { projectId: { type: 'string', format: 'uuid' } },
        },
      },
      async (request: FastifyRequest<{ Params: { projectId: string } }>, reply: FastifyReply) => {
        try {
          const tables = await costsService.listCostTablesByProject(request.params.projectId);
          reply.send(tables);
        } catch (err) {
          fastify.log.error(err);
          reply.code(500).send({ error: 'Failed to fetch cost tables' });
        }
      }
    );

    // GET /api/v1/cost-tables/:tableId
    fastify.get<{ Params: { tableId: string } }>(
      '/cost-tables/:tableId',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['Costs'],
          summary: 'Get cost table',
          params: { tableId: { type: 'string', format: 'uuid' } },
        },
      },
      async (request: FastifyRequest<{ Params: { tableId: string } }>, reply: FastifyReply) => {
        try {
          const table = await costsService.getCostTable(request.params.tableId);
          if (!table) {
            return reply.code(404).send({ error: 'Cost table not found' });
          }
          reply.send(table);
        } catch (err) {
          fastify.log.error(err);
          reply.code(500).send({ error: 'Failed to fetch cost table' });
        }
      }
    );

    // PATCH /api/v1/cost-tables/:tableId
    fastify.patch<{ Params: { tableId: string }; Body: any }>(
      '/cost-tables/:tableId',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['Costs'],
          summary: 'Update cost table',
          params: { tableId: { type: 'string', format: 'uuid' } },
        },
      },
      async (request: FastifyRequest<{ Params: { tableId: string }; Body: any }>, reply: FastifyReply) => {
        try {
          const data = UpdateCostTableSchema.parse(request.body);
          const result = await costsService.updateCostTable(request.params.tableId, data);
          reply.send(result);
        } catch (err) {
          fastify.log.error(err);
          reply.code(400).send({ error: 'Failed to update cost table' });
        }
      }
    );

    // DELETE /api/v1/cost-tables/:tableId
    fastify.delete<{ Params: { tableId: string } }>(
      '/cost-tables/:tableId',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['Costs'],
          summary: 'Delete cost table',
          params: { tableId: { type: 'string', format: 'uuid' } },
        },
      },
      async (request: FastifyRequest<{ Params: { tableId: string } }>, reply: FastifyReply) => {
        try {
          const success = await costsService.deleteCostTable(request.params.tableId);
          if (!success) {
            return reply.code(404).send({ error: 'Cost table not found' });
          }
          reply.code(204).send();
        } catch (err) {
          fastify.log.error(err);
          reply.code(500).send({ error: 'Failed to delete cost table' });
        }
      }
    );

    // ==================== COST ITEMS ====================

    // POST /api/v1/cost-tables/:tableId/items
    fastify.post<{ Params: { tableId: string }; Body: any }>(
      '/cost-tables/:tableId/items',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['Costs'],
          summary: 'Create cost item',
          params: { tableId: { type: 'string', format: 'uuid' } },
        },
      },
      async (request: FastifyRequest<{ Params: { tableId: string }; Body: any }>, reply: FastifyReply) => {
        try {
          const data = CreateCostItemSchema.parse(request.body);
          const result = await costsService.createCostItem(request.params.tableId, data);
          reply.code(201).send(result);
        } catch (err) {
          fastify.log.error(err);
          reply.code(400).send({ error: 'Failed to create cost item' });
        }
      }
    );

    // GET /api/v1/cost-tables/:tableId/items
    fastify.get<{ Params: { tableId: string } }>(
      '/cost-tables/:tableId/items',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['Costs'],
          summary: 'List cost items',
          params: { tableId: { type: 'string', format: 'uuid' } },
        },
      },
      async (request: FastifyRequest<{ Params: { tableId: string } }>, reply: FastifyReply) => {
        try {
          const items = await costsService.listCostItemsByTable(request.params.tableId);
          reply.send(items);
        } catch (err) {
          fastify.log.error(err);
          reply.code(500).send({ error: 'Failed to fetch cost items' });
        }
      }
    );

    // GET /api/v1/cost-items/:itemId
    fastify.get<{ Params: { itemId: string } }>(
      '/cost-items/:itemId',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['Costs'],
          summary: 'Get cost item',
          params: { itemId: { type: 'string', format: 'uuid' } },
        },
      },
      async (request: FastifyRequest<{ Params: { itemId: string } }>, reply: FastifyReply) => {
        try {
          const item = await costsService.getCostItem(request.params.itemId);
          if (!item) {
            return reply.code(404).send({ error: 'Cost item not found' });
          }
          reply.send(item);
        } catch (err) {
          fastify.log.error(err);
          reply.code(500).send({ error: 'Failed to fetch cost item' });
        }
      }
    );

    // PATCH /api/v1/cost-items/:itemId
    fastify.patch<{ Params: { itemId: string }; Body: any }>(
      '/cost-items/:itemId',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['Costs'],
          summary: 'Update cost item',
          params: { itemId: { type: 'string', format: 'uuid' } },
        },
      },
      async (request: FastifyRequest<{ Params: { itemId: string }; Body: any }>, reply: FastifyReply) => {
        try {
          const data = UpdateCostItemSchema.parse(request.body);
          const result = await costsService.updateCostItem(request.params.itemId, data);
          reply.send(result);
        } catch (err) {
          fastify.log.error(err);
          reply.code(400).send({ error: 'Failed to update cost item' });
        }
      }
    );

    // DELETE /api/v1/cost-items/:itemId
    fastify.delete<{ Params: { itemId: string } }>(
      '/cost-items/:itemId',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['Costs'],
          summary: 'Delete cost item',
          params: { itemId: { type: 'string', format: 'uuid' } },
        },
      },
      async (request: FastifyRequest<{ Params: { itemId: string } }>, reply: FastifyReply) => {
        try {
          const success = await costsService.deleteCostItem(request.params.itemId);
          if (!success) {
            return reply.code(404).send({ error: 'Cost item not found' });
          }
          reply.code(204).send();
        } catch (err) {
          fastify.log.error(err);
          reply.code(500).send({ error: 'Failed to delete cost item' });
        }
      }
    );

    // ==================== ELEMENT COST LINKS ====================

    // POST /api/v1/element-cost-links
    fastify.post<{ Body: any }>(
      '/element-cost-links',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['Costs'],
          summary: 'Create element cost link',
        },
      },
      async (request: FastifyRequest<{ Body: any }>, reply: FastifyReply) => {
        try {
          const data = CreateElementCostLinkSchema.parse(request.body);
          const result = await costsService.createElementCostLink(request.user!.userId, data);
          reply.code(201).send(result);
        } catch (err) {
          fastify.log.error(err);
          reply.code(400).send({ error: 'Failed to create element cost link' });
        }
      }
    );

    // GET /api/v1/scenarios/:scenarioId/element-cost-links
    fastify.get<{ Params: { scenarioId: string } }>(
      '/scenarios/:scenarioId/element-cost-links',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['Costs'],
          summary: 'List element cost links by scenario',
          params: { scenarioId: { type: 'string', format: 'uuid' } },
        },
      },
      async (request: FastifyRequest<{ Params: { scenarioId: string } }>, reply: FastifyReply) => {
        try {
          const links = await costsService.listElementCostLinksByScenario(request.params.scenarioId);
          reply.send(links);
        } catch (err) {
          fastify.log.error(err);
          reply.code(500).send({ error: 'Failed to fetch element cost links' });
        }
      }
    );

    // GET /api/v1/element-cost-links/:linkId
    fastify.get<{ Params: { linkId: string } }>(
      '/element-cost-links/:linkId',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['Costs'],
          summary: 'Get element cost link',
          params: { linkId: { type: 'string', format: 'uuid' } },
        },
      },
      async (request: FastifyRequest<{ Params: { linkId: string } }>, reply: FastifyReply) => {
        try {
          const link = await costsService.getElementCostLink(request.params.linkId);
          if (!link) {
            return reply.code(404).send({ error: 'Element cost link not found' });
          }
          reply.send(link);
        } catch (err) {
          fastify.log.error(err);
          reply.code(500).send({ error: 'Failed to fetch element cost link' });
        }
      }
    );

    // PATCH /api/v1/element-cost-links/:linkId
    fastify.patch<{ Params: { linkId: string }; Body: any }>(
      '/element-cost-links/:linkId',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['Costs'],
          summary: 'Update element cost link',
          params: { linkId: { type: 'string', format: 'uuid' } },
        },
      },
      async (request: FastifyRequest<{ Params: { linkId: string }; Body: any }>, reply: FastifyReply) => {
        try {
          const data = UpdateElementCostLinkSchema.parse(request.body);
          const result = await costsService.updateElementCostLink(request.params.linkId, data);
          reply.send(result);
        } catch (err) {
          fastify.log.error(err);
          reply.code(400).send({ error: 'Failed to update element cost link' });
        }
      }
    );

    // DELETE /api/v1/element-cost-links/:linkId
    fastify.delete<{ Params: { linkId: string } }>(
      '/element-cost-links/:linkId',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['Costs'],
          summary: 'Delete element cost link',
          params: { linkId: { type: 'string', format: 'uuid' } },
        },
      },
      async (request: FastifyRequest<{ Params: { linkId: string } }>, reply: FastifyReply) => {
        try {
          const success = await costsService.deleteElementCostLink(request.params.linkId);
          if (!success) {
            return reply.code(404).send({ error: 'Element cost link not found' });
          }
          reply.code(204).send();
        } catch (err) {
          fastify.log.error(err);
          reply.code(500).send({ error: 'Failed to delete element cost link' });
        }
      }
    );
  };
}

export async function registerCostsRoutes(fastify: FastifyInstance, sql: Sql) {
  fastify.register(createCostsRoutes(sql), { prefix: '/api/v1' });
}
