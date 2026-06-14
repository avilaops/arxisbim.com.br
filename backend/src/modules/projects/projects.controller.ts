import type { FastifyRequest, FastifyReply } from 'fastify';
import { ProjectsService } from './projects.service.js';
import { createProjectSchema, updateProjectSchema, listProjectsQuerySchema, updateProjectTypeMapSchema } from './projects.schemas.js';
import { assertCanCreateProject, PlanLimitError, SubscriptionInactiveError } from '../../core/billing/plan-limits.js';

function sendError(reply: FastifyReply, err: any) {
  const status = err?.statusCode ?? 500;
  return reply.code(status).send({ error: err?.message ?? 'Internal server error' });
}

export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  async list(request: FastifyRequest, reply: FastifyReply) {
    const { tenantId } = request.user as any;
    const query = listProjectsQuerySchema.parse(request.query ?? {});
    const result = await this.projectsService.list(tenantId, query);
    return reply.send(result);
  }

  async get(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user as any;
    try {
      const project = await this.projectsService.get(id, tenantId);
      return reply.send(project);
    } catch (err) {
      return sendError(reply, err);
    }
  }

  async getBySlug(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };
    const { tenantId } = request.user as any;
    try {
      const project = await this.projectsService.getBySlug(slug, tenantId);
      return reply.send(project);
    } catch (err) {
      return sendError(reply, err);
    }
  }

  async create(request: FastifyRequest, reply: FastifyReply) {
    const { tenantId } = request.user as any;
    const body = createProjectSchema.parse(request.body);
    try {
      await assertCanCreateProject(tenantId);
    } catch (err) {
      if (err instanceof SubscriptionInactiveError) {
        return reply.code(err.statusCode).send({ code: err.code, status: err.status });
      }
      if (err instanceof PlanLimitError) {
        return reply.code(err.statusCode).send({
          code: err.code,
          resource: err.resource,
          limit: err.limit,
          current: err.current,
        });
      }
      throw err;
    }
    const project = await this.projectsService.create(tenantId, body);
    return reply.code(201).send(project);
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user as any;
    const body = updateProjectSchema.parse(request.body);
    try {
      const project = await this.projectsService.update(id, tenantId, body);
      return reply.send(project);
    } catch (err) {
      return sendError(reply, err);
    }
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user as any;
    try {
      await this.projectsService.delete(id, tenantId);
      return reply.code(204).send();
    } catch (err) {
      return sendError(reply, err);
    }
  }

  async getTypeMap(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user as any;
    try {
      const result = await this.projectsService.getTypeMap(id, tenantId);
      return reply.send(result);
    } catch (err) {
      return sendError(reply, err);
    }
  }

  async updateTypeMap(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { tenantId } = request.user as any;
    const parsed = updateProjectTypeMapSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Validation error', details: parsed.error.format() });
    }
    try {
      const result = await this.projectsService.updateTypeMap(id, tenantId, parsed.data.map);
      return reply.send(result);
    } catch (err) {
      return sendError(reply, err);
    }
  }
}
