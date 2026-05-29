import { FastifyInstance } from 'fastify';
import { createCompanyHandler, getCompaniesHandler, getCompanyHandler, updateCompanyHandler, deleteCompanyHandler } from './companies.controller.js';

export async function companiesRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/companies', getCompaniesHandler);
  fastify.post('/api/v1/companies', createCompanyHandler);
  fastify.get('/api/v1/companies/:companyId', getCompanyHandler);
  fastify.put('/api/v1/companies/:companyId', updateCompanyHandler);
  fastify.delete('/api/v1/companies/:companyId', deleteCompanyHandler);
}
