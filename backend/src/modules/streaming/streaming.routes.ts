import type { FastifyInstance } from 'fastify';
import { streamingOrchestrator } from './streaming-orchestrator.service.js';

export function createStreamingRoutes() {
  return async (fastify: FastifyInstance) => {
    fastify.post<{ Body: { projectId: string } }>(
      '/streaming/session',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['Streaming'],
          summary: 'Request Unreal Engine streaming session',
          body: {
            type: 'object',
            required: ['projectId'],
            properties: {
              projectId: { type: 'string', format: 'uuid' },
            },
          },
        },
      },
      async (request, reply) => {
        const { projectId } = request.body;
        const userId = request.user!.userId;

        try {
          const session = await streamingOrchestrator.allocateInstance(userId, projectId);
          reply.code(201).send(session);
        } catch (err: any) {
          fastify.log.error(err);
          reply.code(500).send({ error: 'Failed to allocate streaming instance' });
        }
      }
    );

    fastify.get<{ Params: { sessionId: string } }>(
      '/streaming/session/:sessionId',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['Streaming'],
          summary: 'Get streaming session status',
          params: {
            type: 'object',
            required: ['sessionId'],
            properties: {
              sessionId: { type: 'string' },
            },
          },
        },
      },
      async (request, reply) => {
        const session = await streamingOrchestrator.getSession(request.params.sessionId);
        if (!session) {
          return reply.code(404).send({ error: 'Session not found' });
        }
        reply.send(session);
      }
    );

    fastify.delete<{ Params: { sessionId: string } }>(
      '/streaming/session/:sessionId',
      {
        onRequest: [fastify.authenticate],
        schema: {
          tags: ['Streaming'],
          summary: 'Terminate streaming session',
          params: {
            type: 'object',
            required: ['sessionId'],
            properties: {
              sessionId: { type: 'string' },
            },
          },
        },
      },
      async (request, reply) => {
        const success = await streamingOrchestrator.terminateSession(request.params.sessionId);
        if (!success) {
          return reply.code(404).send({ error: 'Session not found or failed to delete' });
        }
        reply.code(204).send();
      }
    );
  };
}

export async function registerStreamingRoutes(fastify: FastifyInstance) {
  fastify.register(createStreamingRoutes(), { prefix: '/api/v1' });
}
