import { FastifyInstance } from 'fastify';
import { projects, ifcModels, federatedModels } from '../../shared/database/schema/projects.js';
import { tenants, companies } from '../../shared/database/schema/tenants.js';
import { db } from '../../shared/database/db.js';
import { eq, desc, and } from 'drizzle-orm';

export async function projectRoutes(fastify: FastifyInstance) {
  // Get all projects for a tenant
  fastify.get('/tenants/:tenantId/projects', async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const tenantProjects = await db.select().from(projects).where(eq(projects.tenantId, tenantId)).orderBy(desc(projects.createdAt));
      return reply.send(tenantProjects);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch projects' });
    }
  });

  // Get projects for a company
  fastify.get('/companies/:companyId/projects', async (request, reply) => {
    const { companyId } = request.params as { companyId: string };
    try {
      const companyProjects = await db.select().from(projects).where(eq(projects.companyId, companyId)).orderBy(desc(projects.createdAt));
      return reply.send(companyProjects);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch projects' });
    }
  });

  // Get project by ID
  fastify.get('/projects/:projectId', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    try {
      const project = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
      if (!project || project.length === 0) {
        return reply.status(404).send({ error: 'Project not found' });
      }
      return reply.send(project[0]);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch project' });
    }
  });

  // Create project for a tenant and company
  fastify.post('/tenants/:tenantId/companies/:companyId/projects', async (request, reply) => {
    const { tenantId, companyId } = request.params as { tenantId: string; companyId: string };
    const body = request.body as {
      name: string;
      description?: string;
      location?: {
        address?: string;
        city?: string;
        country?: string;
        coordinates?: { lat: number; lng: number };
      };
    };
    try {
      // Verify tenant and company exist
      const tenant = await db.select().from(tenants).where(eq(tenants.tenantId, tenantId)).limit(1);
      if (!tenant || tenant.length === 0) {
        return reply.status(404).send({ error: 'Tenant not found' });
      }

      const company = await db.select().from(companies).where(eq(companies.companyId, companyId)).limit(1);
      if (!company || company.length === 0) {
        return reply.status(404).send({ error: 'Company not found' });
      }

      const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) + '-' + Date.now().toString(36);
      const [newProject] = await db.insert(projects).values({
        tenantId,
        companyId,
        slug,
        name: body.name,
        description: body.description,
        location: body.location,
        status: 'active',
      }).returning();
      return reply.status(201).send(newProject);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to create project' });
    }
  });

  // Update project
  fastify.put('/projects/:projectId', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    const body = request.body as {
      name?: string;
      description?: string;
      location?: {
        address?: string;
        city?: string;
        country?: string;
        coordinates?: { lat: number; lng: number };
      };
      status?: 'active' | 'archived' | 'completed';
    };
    try {
      const [updatedProject] = await db.update(projects)
        .set({
          ...(body.name && { name: body.name }),
          ...(body.description !== undefined && { description: body.description }),
          ...(body.location !== undefined && { location: body.location }),
          ...(body.status && { status: body.status }),
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId))
        .returning();
      if (!updatedProject) {
        return reply.status(404).send({ error: 'Project not found' });
      }
      return reply.send(updatedProject);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update project' });
    }
  });

  // Delete project
  fastify.delete('/projects/:projectId', async (request, reply) => {
    const { projectId } = request.params as { projectId: string };
    try {
      const [deletedProject] = await db.delete(projects).where(eq(projects.id, projectId)).returning();
      if (!deletedProject) {
        return reply.status(404).send({ error: 'Project not found' });
      }
      return reply.send({ message: 'Project deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete project' });
    }
  });
}
