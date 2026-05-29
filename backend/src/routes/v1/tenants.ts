import { FastifyInstance } from 'fastify';
import { tenants, companies, users } from '../../shared/database/schema/tenants.js';
import { db } from '../../shared/database/db.js';
import { eq, and, desc } from 'drizzle-orm';

export async function tenantRoutes(fastify: FastifyInstance) {
  // Get all tenants (admin only)
  fastify.get('/tenants', async (request, reply) => {
    try {
      const allTenants = await db.select().from(tenants).orderBy(desc(tenants.createdAt));
      return reply.send(allTenants);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch tenants' });
    }
  });

  // Get tenant by ID
  fastify.get('/tenants/:tenantId', async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const tenant = await db.select().from(tenants).where(eq(tenants.tenantId, tenantId)).limit(1);
      if (!tenant || tenant.length === 0) {
        return reply.status(404).send({ error: 'Tenant not found' });
      }
      return reply.send(tenant[0]);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch tenant' });
    }
  });

  // Create tenant (admin only)
  fastify.post('/tenants', async (request, reply) => {
    const body = request.body as {
      name: string;
      customDomain?: string;
      maxProjects?: number;
      federationEnabled?: boolean;
    };
    try {
      const tenantId = body.customDomain || body.name.toLowerCase().replace(/\s+/g, '-');
      const [newTenant] = await db.insert(tenants).values({
        tenantId,
        name: body.name,
        branding: {
          customDomain: body.customDomain,
        },
        subscription: {
          plan: 'free',
          maxProjects: body.maxProjects,
          federationEnabled: body.federationEnabled ?? true,
        },
      }).returning();
      return reply.status(201).send(newTenant);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to create tenant' });
    }
  });

  // Update tenant
  fastify.put('/tenants/:tenantId', async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const body = request.body as {
      name?: string;
      customDomain?: string;
      maxProjects?: number;
      federationEnabled?: boolean;
    };
    try {
      const [updatedTenant] = await db.update(tenants)
        .set({
          ...(body.name && { name: body.name }),
          ...(body.customDomain !== undefined && {
            branding: { customDomain: body.customDomain }
          }),
          ...(body.maxProjects !== undefined || body.federationEnabled !== undefined) && {
            subscription: {
              plan: 'free',
              maxProjects: body.maxProjects,
              federationEnabled: body.federationEnabled,
            }
          },
          updatedAt: new Date(),
        })
        .where(eq(tenants.tenantId, tenantId))
        .returning();
      if (!updatedTenant) {
        return reply.status(404).send({ error: 'Tenant not found' });
      }
      return reply.send(updatedTenant);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update tenant' });
    }
  });

  // Delete tenant
  fastify.delete('/tenants/:tenantId', async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const [deletedTenant] = await db.delete(tenants).where(eq(tenants.tenantId, tenantId)).returning();
      if (!deletedTenant) {
        return reply.status(404).send({ error: 'Tenant not found' });
      }
      return reply.send({ message: 'Tenant deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete tenant' });
    }
  });

  // Get users for a tenant
  fastify.get('/tenants/:tenantId/users', async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const tenantUsers = await db.select().from(users).where(eq(users.tenantId, tenantId));
      return reply.send(tenantUsers);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch users' });
    }
  });
}
