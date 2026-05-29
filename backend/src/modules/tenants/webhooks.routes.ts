import { FastifyInstance } from 'fastify';
import {
  getWebhooksHandler,
  createWebhookHandler,
  getWebhookHandler,
  updateWebhookHandler,
  deleteWebhookHandler
} from './webhooks.controller.js';

export async function webhooksRoutes(fastify: FastifyInstance) {
  fastify.get('/webhooks', getWebhooksHandler);
  fastify.post('/webhooks', createWebhookHandler);
  fastify.get('/webhooks/:id', getWebhookHandler);
  fastify.put('/webhooks/:id', updateWebhookHandler);
  fastify.delete('/webhooks/:id', deleteWebhookHandler);
}
