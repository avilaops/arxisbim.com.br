import { FastifyInstance } from 'fastify';
import { companies, tenants } from '../../shared/database/schema/tenants.js';
import { db } from '../../shared/database/db.js';
import { eq, desc } from 'drizzle-orm';

export async function companyRoutes(fastify: FastifyInstance) {
  // Get all companies for a tenant
  fastify.get('/tenants/:tenantId/companies', async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const tenantCompanies = await db.select().from(companies).where(eq(companies.tenantId, tenantId)).orderBy(desc(companies.createdAt));
      return reply.send(tenantCompanies);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch companies' });
    }
  });

  // Get company by ID
  fastify.get('/companies/:companyId', async (request, reply) => {
    const { companyId } = request.params as { companyId: string };
    try {
      const company = await db.select().from(companies).where(eq(companies.companyId, companyId)).limit(1);
      if (!company || company.length === 0) {
        return reply.status(404).send({ error: 'Company not found' });
      }
      return reply.send(company[0]);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch company' });
    }
  });

  // Create company for a tenant
  fastify.post('/tenants/:tenantId/companies', async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const body = request.body as {
      name: string;
      logo?: string;
      colors?: { primary: string; secondary: string };
    };
    try {
      // Verify tenant exists
      const tenant = await db.select().from(tenants).where(eq(tenants.tenantId, tenantId)).limit(1);
      if (!tenant || tenant.length === 0) {
        return reply.status(404).send({ error: 'Tenant not found' });
      }

      const companyId = body.name.toLowerCase().replace(/\s+/g, '-');
      const [newCompany] = await db.insert(companies).values({
        companyId,
        tenantId,
        name: body.name,
        branding: {
          logo: body.logo,
          colors: body.colors,
        },
      }).returning();
      return reply.status(201).send(newCompany);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to create company' });
    }
  });

  // Update company
  fastify.put('/companies/:companyId', async (request, reply) => {
    const { companyId } = request.params as { companyId: string };
    const body = request.body as {
      name?: string;
      logo?: string;
      colors?: { primary: string; secondary: string };
      isActive?: boolean;
    };
    try {
      const [updatedCompany] = await db.update(companies)
        .set({
          ...(body.name && { name: body.name }),
          ...(body.logo !== undefined || body.colors !== undefined) && {
            branding: {
              logo: body.logo,
              colors: body.colors,
            }
          },
          ...(body.isActive !== undefined && { isActive: body.isActive }),
          updatedAt: new Date(),
        })
        .where(eq(companies.companyId, companyId))
        .returning();
      if (!updatedCompany) {
        return reply.status(404).send({ error: 'Company not found' });
      }
      return reply.send(updatedCompany);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to update company' });
    }
  });

  // Delete company
  fastify.delete('/companies/:companyId', async (request, reply) => {
    const { companyId } = request.params as { companyId: string };
    try {
      const [deletedCompany] = await db.delete(companies).where(eq(companies.companyId, companyId)).returning();
      if (!deletedCompany) {
        return reply.status(404).send({ error: 'Company not found' });
      }
      return reply.send({ message: 'Company deleted successfully' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete company' });
    }
  });
}
