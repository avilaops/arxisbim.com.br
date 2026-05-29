import { FastifyInstance } from 'fastify';
import { createTenantHandler, getTenantsHandler, getTenantHandler, updateTenantHandler, deleteTenantHandler } from './tenants.controller.js';

export async function tenantsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/tenants', getTenantsHandler);
  fastify.post('/api/v1/tenants', createTenantHandler);
  fastify.get('/api/v1/tenants/:tenantId', getTenantHandler);
  fastify.put('/api/v1/tenants/:tenantId', updateTenantHandler);
  fastify.delete('/api/v1/tenants/:tenantId', deleteTenantHandler);
}
