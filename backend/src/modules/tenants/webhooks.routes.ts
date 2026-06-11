import { FastifyInstance } from 'fastify';
import { authenticateRequest } from '../../core/auth/middleware.js';
import {
  getWebhooksHandler,
  createWebhookHandler,
  getWebhookHandler,
  updateWebhookHandler,
  deleteWebhookHandler
} from './webhooks.controller.js';

export async function webhooksRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: authenticateRequest };
  fastify.get('/webhooks', auth, getWebhooksHandler);
  fastify.post('/webhooks', auth, createWebhookHandler);
  fastify.get('/webhooks/:id', auth, getWebhookHandler);
  fastify.put('/webhooks/:id', auth, updateWebhookHandler);
  fastify.delete('/webhooks/:id', auth, deleteWebhookHandler);
}
