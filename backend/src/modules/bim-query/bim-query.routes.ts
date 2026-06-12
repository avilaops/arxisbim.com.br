// =====================================
// BIM Query Routes
// =====================================

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { BIMQueryService } from './bim-query.service.js';
import type { BIMQuery, QueryContext } from './bim-query.types.js';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { z } from 'zod';

// =====================================
// Schemas de validação
// =====================================

const PropertyFilterSchema = z.object({
  property: z.string(),
  operator: z.enum(['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN', 'NOT IN', 'CONTAINS', 'STARTS_WITH', 'ENDS_WITH']),
  value: z.any(),
});

const SpatialFilterSchema = z.object({
  operator: z.enum(['WITHIN_BOX', 'WITHIN_SPHERE', 'NEAR_POINT', 'INTERSECTS', 'ON_LEVEL']),
  params: z.object({
    min: z.array(z.number()).length(3).optional(),
    max: z.array(z.number()).length(3).optional(),
    center: z.array(z.number()).length(3).optional(),
    radius: z.number().optional(),
    level: z.string().optional(),
  }),
});

const BIMQuerySchema: any = z.object({
  type: z.string().optional(),
  filters: z.array(z.any()).optional(), // Recursive, simplificado
  select: z.array(z.string()).optional(),
  aggregation: z
    .object({
      operation: z.enum(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'GROUP_CONCAT']),
      field: z.string().optional(),
      groupBy: z.array(z.string()).optional(),
    })
    .optional(),
  orderBy: z
    .array(
      z.object({
        field: z.string(),
        direction: z.enum(['ASC', 'DESC']),
      })
    )
    .optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
  useCache: z.boolean().optional(),
  cacheTTL: z.number().int().positive().optional(),
});

const ExecuteQueryBodySchema = z.object({
  query: BIMQuerySchema.optional(),
  queryString: z.string().optional(), // SQL-like string
});

// =====================================
// Route Handlers
// =====================================

interface ExecuteQueryRequest {
  Params: { projectId: string; modelId: string };
  Body: z.infer<typeof ExecuteQueryBodySchema>;
}

async function executeQueryHandler(
  request: FastifyRequest<ExecuteQueryRequest>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { projectId, modelId } = request.params;
    const { query: queryObj, queryString } = request.body;
    const user = (request as any).user;

    if (!queryObj && !queryString) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Either query or queryString is required',
      });
    }

    // Parse query
    let query: BIMQuery;
    if (queryString) {
      query = BIMQueryService.parseQuery(queryString);
    } else {
      query = queryObj!;
    }

    // Build context
    const context: QueryContext = {
      modelId,
      projectId,
      tenantId: user.tenantId,
      userId: user.userId,
    };

    // Execute query
    const result = await BIMQueryService.executeQuery(modelId, query, context);

    reply.status(200).send(result);
  } catch (error: any) {
    request.log.error(error);
    reply.status(500).send({
      error: 'Internal Server Error',
      message: error.message || 'Failed to execute query',
    });
  }
}

interface QueryByTypeRequest {
  Params: { projectId: string; modelId: string; type: string };
  Querystring: { limit?: string; offset?: string };
}

async function queryByTypeHandler(
  request: FastifyRequest<QueryByTypeRequest>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { projectId, modelId, type } = request.params;
    const { limit, offset } = request.query;
    const user = (request as any).user;

    const query: BIMQuery = {
      type,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    const context: QueryContext = {
      modelId,
      projectId,
      tenantId: user.tenantId,
      userId: user.userId,
    };

    const result = await BIMQueryService.executeQuery(modelId, query, context);

    reply.status(200).send(result);
  } catch (error: any) {
    request.log.error(error);
    reply.status(500).send({
      error: 'Internal Server Error',
      message: error.message || 'Failed to query by type',
    });
  }
}

interface QueryByPropertyRequest {
  Params: { projectId: string; modelId: string };
  Querystring: { property: string; value: string; operator?: string };
}

async function queryByPropertyHandler(
  request: FastifyRequest<QueryByPropertyRequest>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { projectId, modelId } = request.params;
    const { property, value, operator = '=' } = request.query;
    const user = (request as any).user;

    const query: BIMQuery = {
      filters: [
        {
          property,
          operator: operator as any,
          value,
        },
      ],
    };

    const context: QueryContext = {
      modelId,
      projectId,
      tenantId: user.tenantId,
      userId: user.userId,
    };

    const result = await BIMQueryService.executeQuery(modelId, query, context);

    reply.status(200).send(result);
  } catch (error: any) {
    request.log.error(error);
    reply.status(500).send({
      error: 'Internal Server Error',
      message: error.message || 'Failed to query by property',
    });
  }
}

interface ParseQueryRequest {
  Body: { queryString: string };
}

async function parseQueryHandler(
  request: FastifyRequest<ParseQueryRequest>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { queryString } = request.body;

    const query = BIMQueryService.parseQuery(queryString);
    const sqlBack = BIMQueryService.toSQL(query);

    reply.status(200).send({
      query,
      sql: sqlBack,
    });
  } catch (error: any) {
    request.log.error(error);
    reply.status(400).send({
      error: 'Bad Request',
      message: error.message || 'Failed to parse query',
    });
  }
}

interface ClearCacheRequest {
  Params: { projectId: string; modelId?: string };
}

async function clearCacheHandler(
  request: FastifyRequest<ClearCacheRequest>,
  reply: FastifyReply
): Promise<void> {
  try {
    const { modelId } = request.params;

    BIMQueryService.clearCache(modelId);

    reply.status(200).send({
      message: 'Cache cleared successfully',
      modelId: modelId || 'all',
    });
  } catch (error: any) {
    request.log.error(error);
    reply.status(500).send({
      error: 'Internal Server Error',
      message: error.message || 'Failed to clear cache',
    });
  }
}

// =====================================
// Register Routes
// =====================================

export async function bimQueryRoutes(app: FastifyInstance) {
  // Execute query (POST com body)
  app.post('/api/v1/projects/:projectId/models/:modelId/query', {
    schema: {
      tags: ['BIM Query'],
      description: 'Execute BIM query on model',
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
          query: { type: 'object' },
          queryString: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            elements: { type: 'array' },
            aggregation: { type: 'object' },
            totalCount: { type: 'number' },
            executionTime: { type: 'number' },
            cached: { type: 'boolean' },
            query: { type: 'object' },
          },
        },
      },
    },
    preHandler: authenticateRequest,
    handler: executeQueryHandler,
  });

  // Query by type (GET shortcut)
  app.get('/api/v1/projects/:projectId/models/:modelId/query/type/:type', {
    schema: {
      tags: ['BIM Query'],
      description: 'Query elements by IFC type',
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
          limit: { type: 'string' },
          offset: { type: 'string' },
        },
      },
    },
    preHandler: authenticateRequest,
    handler: queryByTypeHandler,
  });

  // Query by property (GET shortcut)
  app.get('/api/v1/projects/:projectId/models/:modelId/query/property', {
    schema: {
      tags: ['BIM Query'],
      description: 'Query elements by property',
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
          operator: { type: 'string' },
        },
      },
    },
    preHandler: authenticateRequest,
    handler: queryByPropertyHandler,
  });

  // Parse query string (utility)
  app.post('/api/v1/bim-query/parse', {
    schema: {
      tags: ['BIM Query'],
      description: 'Parse SQL-like query string to BIMQuery object',
      body: {
        type: 'object',
        required: ['queryString'],
        properties: {
          queryString: { type: 'string' },
        },
      },
    },
    preHandler: authenticateRequest,
    handler: parseQueryHandler,
  });

  // Clear cache
  app.delete('/api/v1/projects/:projectId/models/:modelId/query/cache', {
    schema: {
      tags: ['BIM Query'],
      description: 'Clear query cache for model',
      params: {
        type: 'object',
        required: ['projectId'],
        properties: {
          projectId: { type: 'string' },
          modelId: { type: 'string' },
        },
      },
    },
    preHandler: authenticateRequest,
    handler: clearCacheHandler,
  });
}
