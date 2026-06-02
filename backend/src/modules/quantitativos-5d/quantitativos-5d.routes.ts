/**
 * Quantitativos 5D Routes
 * 
 * API REST para cálculo de takeoff (quantificação) BIM
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Quantitativos5DService } from './quantitativos-5d.service.js';
import type { TakeoffParams } from './quantitativos-5d.types.js';

const TakeoffParamsSchema = z.object({
  types: z.array(z.string()).optional(),
  propertyFilters: z.array(z.object({
    property: z.string(),
    operator: z.enum(['=', '!=', '>', '<', 'LIKE', 'IN']),
    value: z.any(),
  })).optional(),
  query: z.string().optional(),
  quantities: z.array(z.enum(['volume', 'area', 'length', 'count', 'weight'])).optional(),
  groupBy: z.array(z.string()).optional(),
  rules: z.array(z.object({
    type: z.enum(['waste_factor', 'unit_conversion', 'custom_formula', 'productivity_factor']),
    name: z.string().optional(),
    applyToTypes: z.array(z.string()).optional(),
    value: z.number(),
    formula: z.string().optional(),
  })).optional(),
  includeCost: z.boolean().optional(),
  useCache: z.boolean().optional(),
});

export async function quantitativos5DRoutes(server: FastifyInstance) {
  /**
   * POST /api/v1/projects/:projectId/models/:modelId/takeoff
   * Calcula takeoff completo do modelo
   */
  server.post<{
    Params: { projectId: string; modelId: string };
    Body: z.infer<typeof TakeoffParamsSchema>;
  }>(
    '/api/v1/projects/:projectId/models/:modelId/takeoff',
    {
      schema: {
        tags: ['Quantitativos 5D'],
        description: 'Calcula takeoff (quantificação) do modelo BIM',
        params: {
          type: 'object',
          required: ['projectId', 'modelId'],
          properties: {
            projectId: { type: 'string' },
            modelId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          properties: {
            types: { type: 'array', items: { type: 'string' } },
            propertyFilters: { type: 'array' },
            query: { type: 'string' },
            quantities: { type: 'array', items: { type: 'string', enum: ['volume', 'area', 'length', 'count', 'weight'] } },
            groupBy: { type: 'array', items: { type: 'string' } },
            rules: { type: 'array' },
            includeCost: { type: 'boolean' },
            useCache: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const { projectId, modelId } = request.params;
      const params = TakeoffParamsSchema.parse(request.body);

      const result = await Quantitativos5DService.calculateTakeoff(
        projectId,
        modelId,
        params as TakeoffParams
      );

      reply.send(result);
    }
  );

  /**
   * GET /api/v1/projects/:projectId/models/:modelId/takeoff/type/:type
   * Calcula takeoff por tipo IFC
   */
  server.get<{
    Params: { projectId: string; modelId: string; type: string };
    Querystring: { includeCost?: string; useCache?: string };
  }>(
    '/api/v1/projects/:projectId/models/:modelId/takeoff/type/:type',
    {
      schema: {
        tags: ['Quantitativos 5D'],
        description: 'Calcula takeoff por tipo IFC',
        params: {
          type: 'object',
          required: ['projectId', 'modelId', 'type'],
          properties: {
            projectId: { type: 'string' },
            modelId: { type: 'string' },
            type: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            includeCost: { type: 'string', enum: ['true', 'false'] },
            useCache: { type: 'string', enum: ['true', 'false'] },
          },
        },
      },
    },
    async (request, reply) => {
      const { projectId, modelId, type } = request.params;
      const includeCost = request.query.includeCost === 'true';
      const useCache = request.query.useCache !== 'false';

      const items = await Quantitativos5DService.calculateByType(
        projectId,
        modelId,
        type,
        { includeCost, useCache }
      );

      reply.send({ items });
    }
  );

  /**
   * GET /api/v1/projects/:projectId/models/:modelId/takeoff/property
   * Calcula takeoff por propriedade
   */
  server.get<{
    Params: { projectId: string; modelId: string };
    Querystring: { property: string; value: string; includeCost?: string };
  }>(
    '/api/v1/projects/:projectId/models/:modelId/takeoff/property',
    {
      schema: {
        tags: ['Quantitativos 5D'],
        description: 'Calcula takeoff por propriedade',
        params: {
          type: 'object',
          required: ['projectId', 'modelId'],
          properties: {
            projectId: { type: 'string' },
            modelId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          required: ['property', 'value'],
          properties: {
            property: { type: 'string' },
            value: { type: 'string' },
            includeCost: { type: 'string', enum: ['true', 'false'] },
          },
        },
      },
    },
    async (request, reply) => {
      const { projectId, modelId } = request.params;
      const { property, value, includeCost } = request.query;

      const items = await Quantitativos5DService.calculateByProperty(
        projectId,
        modelId,
        property,
        value,
        { includeCost: includeCost === 'true' }
      );

      reply.send({ items });
    }
  );

  /**
   * DELETE /api/v1/projects/:projectId/models/:modelId/takeoff/cache
   * Limpa cache de takeoff do modelo
   */
  server.delete<{
    Params: { projectId: string; modelId: string };
  }>(
    '/api/v1/projects/:projectId/models/:modelId/takeoff/cache',
    {
      schema: {
        tags: ['Quantitativos 5D'],
        description: 'Limpa cache de takeoff do modelo',
        params: {
          type: 'object',
          required: ['projectId', 'modelId'],
          properties: {
            projectId: { type: 'string' },
            modelId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { modelId } = request.params;
      
      Quantitativos5DService.clearCache(modelId);
      
      reply.send({ success: true, message: 'Cache cleared' });
    }
  );

  /**
   * POST /api/v1/projects/:projectId/models/:modelId/takeoff/group
   * Agrupa takeoff items
   */
  server.post<{
    Params: { projectId: string; modelId: string };
    Body: {
      params: z.infer<typeof TakeoffParamsSchema>;
      groupBy: string[];
    };
  }>(
    '/api/v1/projects/:projectId/models/:modelId/takeoff/group',
    {
      schema: {
        tags: ['Quantitativos 5D'],
        description: 'Calcula e agrupa takeoff',
        params: {
          type: 'object',
          required: ['projectId', 'modelId'],
          properties: {
            projectId: { type: 'string' },
            modelId: { type: 'string' },
          },
        },
        body: {
          type: 'object',
          required: ['groupBy'],
          properties: {
            params: { type: 'object' },
            groupBy: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    async (request, reply) => {
      const { projectId, modelId } = request.params;
      const { params, groupBy } = request.body;

      const result = await Quantitativos5DService.calculateTakeoff(
        projectId,
        modelId,
        { ...params, groupBy } as TakeoffParams
      );

      reply.send(result);
    }
  );

  /**
   * GET /api/v1/projects/:projectId/models/:modelId/takeoff/summary
   * Resumo de quantitativos (totais por tipo)
   */
  server.get<{
    Params: { projectId: string; modelId: string };
    Querystring: { includeCost?: string };
  }>(
    '/api/v1/projects/:projectId/models/:modelId/takeoff/summary',
    {
      schema: {
        tags: ['Quantitativos 5D'],
        description: 'Resumo de quantitativos por tipo',
        params: {
          type: 'object',
          required: ['projectId', 'modelId'],
          properties: {
            projectId: { type: 'string' },
            modelId: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            includeCost: { type: 'string', enum: ['true', 'false'] },
          },
        },
      },
    },
    async (request, reply) => {
      const { projectId, modelId } = request.params;
      const includeCost = request.query.includeCost === 'true';

      const result = await Quantitativos5DService.calculateTakeoff(
        projectId,
        modelId,
        {
          groupBy: ['Type'],
          includeCost,
        }
      );

      reply.send({
        totals: result.totals,
        totalCost: result.totalCost,
        grouped: result.grouped,
        stats: result.stats,
      });
    }
  );
}
