import { FastifyInstance } from 'fastify';
import {
  getNotificationsHandler,
  createNotificationHandler,
  getNotificationHandler,
  updateNotificationHandler,
  deleteNotificationHandler
} from './notifications.controller.js';

export async function notificationsRoutes(fastify: FastifyInstance) {
  fastify.get('/notifications', getNotificationsHandler);
  fastify.post('/notifications', createNotificationHandler);
  fastify.get('/notifications/:id', getNotificationHandler);
  fastify.put('/notifications/:id', updateNotificationHandler);
  fastify.delete('/notifications/:id', deleteNotificationHandler);
}
