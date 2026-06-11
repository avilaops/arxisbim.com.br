import { FastifyInstance } from 'fastify';
import { authenticateRequest } from '../../core/auth/middleware.js';
import {
  getTaskElementLinksHandler,
  createTaskElementLinkHandler,
  getTaskElementLinkHandler,
  updateTaskElementLinkHandler,
  deleteTaskElementLinkHandler
} from './task-element-links.controller.js';

export async function taskElementLinksRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: authenticateRequest };
  fastify.get('/task-element-links', auth, getTaskElementLinksHandler);
  fastify.post('/task-element-links', auth, createTaskElementLinkHandler);
  fastify.get('/task-element-links/:id', auth, getTaskElementLinkHandler);
  fastify.put('/task-element-links/:id', auth, updateTaskElementLinkHandler);
  fastify.delete('/task-element-links/:id', auth, deleteTaskElementLinkHandler);
}
