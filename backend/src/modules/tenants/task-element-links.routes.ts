import { FastifyInstance } from 'fastify';
import {
  getTaskElementLinksHandler,
  createTaskElementLinkHandler,
  getTaskElementLinkHandler,
  updateTaskElementLinkHandler,
  deleteTaskElementLinkHandler
} from './task-element-links.controller.js';

export async function taskElementLinksRoutes(fastify: FastifyInstance) {
  fastify.get('/task-element-links', getTaskElementLinksHandler);
  fastify.post('/task-element-links', createTaskElementLinkHandler);
  fastify.get('/task-element-links/:id', getTaskElementLinkHandler);
  fastify.put('/task-element-links/:id', updateTaskElementLinkHandler);
  fastify.delete('/task-element-links/:id', deleteTaskElementLinkHandler);
}
