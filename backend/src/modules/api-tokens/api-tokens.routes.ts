import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getApiTokensService } from './api-tokens.service.js';
import { requireRole } from '../../core/auth/middleware.js';

const createTokenSchema = z.object({
  name: z.string().min(1).max(120),
  scopes: z.array(z.enum([
    'projects:read',
    'projects:write',
    'models:read',
    'models:write',
    'planning:read',
    'planning:write',
    'budgets:read',
    'budgets:write',
    'scenarios:read',
    'scenarios:write',
  ])).min(1, 'Token deve ter pelo menos um escopo'),
  environment: z.enum(['live', 'test']).default('live'),
  expiresAt: z.string().datetime().optional().nullable(),
});

export async function apiTokensRoutes(fastify: FastifyInstance) {
  const apiTokensService = getApiTokensService();
  /**
   * GET /api/v1/api-tokens
   * Listar tokens do tenant (apenas owner/admin)
   */
  fastify.get('/api-tokens', {
    preHandler: [fastify.authenticate, requireRole('owner', 'admin')],
    schema: {
      description: 'Listar tokens API do tenant',
      tags: ['api-tokens'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              prefix: { type: 'string' },
              scopes: { type: 'array' },
              environment: { type: 'string' },
              expiresAt: { type: 'string', nullable: true },
              createdAt: { type: 'string' },
              lastUsedAt: { type: 'string', nullable: true },
              lastUsedIp: { type: 'string', nullable: true },
              revokedAt: { type: 'string', nullable: true },
            },
          },
        },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = (request as any).user;
        const tokens = await apiTokensService.listTokens(tenantId);
        return reply.send(tokens);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Failed to fetch tokens' });
      }
    },
  });

  /**
   * POST /api/v1/api-tokens
   * Criar novo token (apenas owner/admin)
   */
  fastify.post('/api-tokens', {
    preHandler: [fastify.authenticate, requireRole('owner', 'admin')],
    schema: {
      description: 'Criar novo token API',
      tags: ['api-tokens'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'scopes'],
        properties: {
          name: { type: 'string' },
          scopes: { type: 'array', items: { type: 'string' } },
          environment: { type: 'string', enum: ['live', 'test'] },
          expiresAt: { type: 'string', nullable: true },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            token: { type: 'object' },
            plainToken: { type: 'string' },
          },
        },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, userId } = (request as any).user;
        const body = createTokenSchema.parse(request.body);

        const result = await apiTokensService.createToken({
          tenantId,
          createdById: userId,
          name: body.name,
          scopes: body.scopes,
          environment: body.environment,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        });

        fastify.log.info({
          message: 'API token created',
          tokenId: result.token.id,
          tenantId,
          userId,
          environment: body.environment,
        });

        return reply.status(201).send(result);
      } catch (error: any) {
        fastify.log.error(error);
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ 
            error: 'Validation failed', 
            details: error.issues 
          });
        }
        return reply.status(500).send({ error: error.message || 'Failed to create token' });
      }
    },
  });

  /**
   * DELETE /api/v1/api-tokens/:tokenId
   * Revogar token (apenas owner/admin)
   */
  fastify.delete('/api-tokens/:tokenId', {
    preHandler: [fastify.authenticate, requireRole('owner', 'admin')],
    schema: {
      description: 'Revogar token API',
      tags: ['api-tokens'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { tokenId: { type: 'string' } },
      },
      response: {
        200: { type: 'object', properties: { message: { type: 'string' } } },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, userId } = (request as any).user;
        const { tokenId } = request.params as { tokenId: string };

        await apiTokensService.revokeToken(tenantId, tokenId, userId);

        fastify.log.info({
          message: 'API token revoked',
          tokenId,
          tenantId,
          userId,
        });

        return reply.send({ message: 'Token revogado com sucesso' });
      } catch (error: any) {
        fastify.log.error(error);
        if (error.message.includes('not found')) {
          return reply.status(404).send({ error: 'Token not found' });
        }
        return reply.status(500).send({ error: error.message || 'Failed to revoke token' });
      }
    },
  });
}
