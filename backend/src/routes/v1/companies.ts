import { FastifyInstance } from 'fastify';
import { companies } from '../../shared/database/schema/tenants.js';
import { db } from '../../shared/database/db.js';
import { eq, and, desc } from 'drizzle-orm';
import { authenticateRequest } from '../../core/auth/middleware.js';

export async function companyRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: authenticateRequest };

  // List companies for the authenticated tenant
  fastify.get('/tenants/:tenantId/companies', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    try {
      const tenantCompanies = await db.select().from(companies).where(eq(companies.tenantId, tenantId)).orderBy(desc(companies.createdAt));
      return reply.send(tenantCompanies);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch companies' });
    }
  });

  // Get company by ID — scoped to tenant
  fastify.get('/companies/:companyId', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { companyId } = request.params as { companyId: string };
    try {
      const [company] = await db.select().from(companies).where(
        and(eq(companies.companyId, companyId), eq(companies.tenantId, tenantId))
      ).limit(1);
      if (!company) {
        return reply.status(404).send({ error: 'Company not found' });
      }
      return reply.send(company);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch company' });
    }
  });

  // Create company for the authenticated tenant
  fastify.post('/tenants/:tenantId/companies', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const body = request.body as {
      name: string;
      logo?: string;
      colors?: { primary: string; secondary: string };
    };
    try {
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

  // Update company — scoped to tenant
  fastify.put('/companies/:companyId', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
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
          ...((body.logo !== undefined || body.colors !== undefined) && {
            branding: {
              logo: body.logo,
              colors: body.colors,
            }
          }),
          ...(body.isActive !== undefined && { isActive: body.isActive }),
          updatedAt: new Date(),
        })
        .where(and(eq(companies.companyId, companyId), eq(companies.tenantId, tenantId)))
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

  // Delete company — scoped to tenant
  fastify.delete('/companies/:companyId', auth, async (request, reply) => {
    const { tenantId } = request.user as any;
    const { companyId } = request.params as { companyId: string };
    try {
      const [deletedCompany] = await db.delete(companies).where(
        and(eq(companies.companyId, companyId), eq(companies.tenantId, tenantId))
      ).returning();
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
