import { FastifyInstance } from 'fastify';
import { createTenantHandler, getTenantsHandler, getTenantHandler, updateTenantHandler, deleteTenantHandler } from './tenants.controller.js';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { isSuperAdmin } from '../../core/admin/super-admin.middleware.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

export async function tenantsRoutes(fastify: FastifyInstance) {
  // Only admin role or super-admin email can manage tenants
  const adminGate = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as { role?: string; email?: string; permissions?: string[] } | undefined;
    if (!user) return reply.code(401).send({ error: 'Não autenticado.' });
    const ok = user.role === 'admin' || user.permissions?.includes('admin') || isSuperAdmin(user.email);
    if (!ok) return reply.code(403).send({ error: 'Acesso restrito a administradores.' });
  };
  const preHandler = [authenticateRequest, adminGate];

  fastify.get('/api/v1/tenants', { preHandler }, getTenantsHandler);
  fastify.post('/api/v1/tenants', { preHandler }, createTenantHandler);
  fastify.get('/api/v1/tenants/:tenantId', { preHandler }, getTenantHandler);
  fastify.put('/api/v1/tenants/:tenantId', { preHandler }, updateTenantHandler);
  fastify.delete('/api/v1/tenants/:tenantId', { preHandler }, deleteTenantHandler);
}
