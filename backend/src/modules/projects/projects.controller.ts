import type { FastifyRequest, FastifyReply } from 'fastify';
import { ProjectsService } from './projects.service.js';
import { createProjectSchema, updateProjectSchema } from './projects.schemas.js';

export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    const { tenantId } = request.user as any;
    const projects = await this.projectsService.list(tenantId);
    return reply.send(projects);
  }

  async get(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user as any;
    const project = await this.projectsService.get(id, tenantId);
    return reply.send(project);
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const { tenantId } = request.user as any;
    const body = createProjectSchema.parse(request.body);
    const project = await this.projectsService.create(tenantId, body);
    return reply.code(201).send(project);
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user as any;
    const body = updateProjectSchema.parse(request.body);
    const project = await this.projectsService.update(id, tenantId, body);
    return reply.send(project);
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user as any;
    await this.projectsService.delete(id, tenantId);
    return reply.code(204).send();
  }
}
