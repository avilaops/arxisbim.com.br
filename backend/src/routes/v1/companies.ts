import { FastifyInstance } from 'fastify';
import { companies } from '../../shared/database/schema/tenants.js';
import { db } from '../../shared/database/db.js';
import { eq, and, desc } from 'drizzle-orm';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { z } from 'zod';

const colorsSchema = z.object({ primary: z.string(), secondary: z.string() });
const createCompanySchema = z.object({
  name: z.string().min(1).max(255),
  logo: z.string().max(2000).optional(),
  colors: colorsSchema.optional(),
});
const updateCompanySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  logo: z.string().max(2000).optional(),
  colors: colorsSchema.optional(),
  isActive: z.boolean().optional(),
});

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
    const parsed = createCompanySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation error', details: parsed.error.issues });
    }
    const body = parsed.data;
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
    const parsed = updateCompanySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation error', details: parsed.error.issues });
    }
    const body = parsed.data;
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
