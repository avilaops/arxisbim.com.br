import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { tenants, users } from '../../shared/database/schema/tenants.js';
import { db } from '../../shared/database/db.js';
import { eq, desc } from 'drizzle-orm';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { isSuperAdmin } from '../../core/admin/super-admin.middleware.js';
import { z } from 'zod';

const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  customDomain: z.string().max(255).optional(),
  maxProjects: z.number().int().min(0).optional(),
  federationEnabled: z.boolean().optional(),
});
const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  customDomain: z.string().max(255).optional(),
  maxProjects: z.number().int().min(0).optional(),
  federationEnabled: z.boolean().optional(),
});

async function adminGate(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user as { role?: string; email?: string; permissions?: string[] } | undefined;
  if (!user) return reply.code(401).send({ error: 'Não autenticado.' });
  const ok = user.role === 'admin' || user.permissions?.includes('admin') || isSuperAdmin(user.email);
  if (!ok) return reply.code(403).send({ error: 'Acesso restrito a administradores.' });
}

export async function tenantRoutes(fastify: FastifyInstance) {
  const admin = { preHandler: [authenticateRequest, adminGate] };
  const auth = { preHandler: authenticateRequest };

  // Admin: list all tenants
  fastify.get('/tenants', admin, async (_request, reply) => {
    try {
      const allTenants = await db.select().from(tenants).orderBy(desc(tenants.createdAt));
      return reply.send(allTenants);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch tenants' });
    }
  });

  // Auth: get own tenant only
  fastify.get('/tenants/:tenantId', auth, async (request, reply) => {
    const { tenantId: userTenantId } = request.user as any;
    const { tenantId } = request.params as { tenantId: string };
    const user = request.user as any;
    const isAdmin = user.role === 'admin' || user.permissions?.includes('admin') || isSuperAdmin(user.email);
    if (!isAdmin && userTenantId !== tenantId) {
      return reply.status(403).send({ error: 'Acesso negado.' });
    }
    try {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, tenantId)).limit(1);
      if (!tenant) {
        return reply.status(404).send({ error: 'Tenant not found' });
      }
      return reply.send(tenant);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch tenant' });
    }
  });

  // Admin: create tenant
  fastify.post('/tenants', admin, async (request, reply) => {
    const parsed = createTenantSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation error', details: parsed.error.issues });
    }
    const body = parsed.data;
    try {
      const tenantId = body.customDomain || body.name.toLowerCase().replace(/\s+/g, '-');
      const [newTenant] = await db.insert(tenants).values({
        tenantId,
        name: body.name,
        branding: { customDomain: body.customDomain },
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

  // Admin: update tenant
  fastify.put('/tenants/:tenantId', admin, async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const parsed = updateTenantSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation error', details: parsed.error.issues });
    }
    const body = parsed.data;
    try {
      const [updatedTenant] = await db.update(tenants)
        .set({
          ...(body.name && { name: body.name }),
          ...(body.customDomain !== undefined && {
            branding: { customDomain: body.customDomain }
          }),
          ...((body.maxProjects !== undefined || body.federationEnabled !== undefined) && {
            subscription: {
              plan: 'free',
              maxProjects: body.maxProjects,
              federationEnabled: body.federationEnabled,
            }
          }),
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

  // Admin: delete tenant
  fastify.delete('/tenants/:tenantId', admin, async (request, reply) => {
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

  // Auth: list users of own tenant (admin sees any)
  fastify.get('/tenants/:tenantId/users', auth, async (request, reply) => {
    const { tenantId: userTenantId } = request.user as any;
    const { tenantId } = request.params as { tenantId: string };
    const user = request.user as any;
    const isAdmin = user.role === 'admin' || user.permissions?.includes('admin') || isSuperAdmin(user.email);
    if (!isAdmin && userTenantId !== tenantId) {
      return reply.status(403).send({ error: 'Acesso negado.' });
    }
    try {
      // Colunas explícitas: `select()` devolvia a linha inteira, e a linha inteira
      // inclui `password_hash`, `two_factor_secret` e os códigos de backup. Qualquer
      // membro do workspace recebia o hash e o segredo de 2FA dos colegas.
      const tenantUsers = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          emailVerified: users.emailVerified,
          twoFactorEnabled: users.twoFactorEnabled,
          createdAt: users.createdAt,
          lastLoginAt: users.lastLoginAt,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.tenantId, tenantId));
      return reply.send(tenantUsers);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch users' });
    }
  });
}
