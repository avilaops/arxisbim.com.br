
import { FastifyRequest, FastifyReply } from 'fastify';
import { companies } from '../../shared/database/schema/tenants.js';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
// Função utilitária para obter conexão com o banco
function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }
  const client = postgres(process.env.DATABASE_URL);
  return drizzle(client, { schema: { companies } });
}

export async function getCompaniesHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const result = await db.select().from(companies);
    reply.send(result);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao listar companies', details: String(error) });
  }
}

export async function createCompanyHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const body = request.body as any;
    if (!body || !body.companyId || !body.tenantId || !body.name) {
      return reply.code(400).send({ error: 'companyId, tenantId e name são obrigatórios' });
    }
    const [created] = await db.insert(companies).values({
      companyId: body.companyId,
      tenantId: body.tenantId,
      name: body.name,
      branding: body.branding ?? {},
      isActive: body.isActive ?? true,
    }).returning();
    reply.code(201).send(created);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao criar company', details: String(error) });
  }
}

export async function getCompanyHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { companyId } = (request.params as any);
    if (!companyId) {
      return reply.code(400).send({ error: 'companyId é obrigatório' });
    }
    const [company] = await db.select().from(companies).where(eq(companies.companyId, companyId)).limit(1);
    if (!company) {
      return reply.code(404).send({ error: 'Company não encontrada' });
    }
    reply.send(company);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar company', details: String(error) });
  }
}

export async function updateCompanyHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { companyId } = (request.params as any);
    const body = request.body as any;
    if (!companyId) {
      return reply.code(400).send({ error: 'companyId é obrigatório' });
    }
    const [updated] = await db.update(companies)
      .set({
        name: body.name,
        branding: body.branding,
        isActive: body.isActive,
        updatedAt: new Date(),
      })
      .where(eq(companies.companyId, companyId))
      .returning();
    if (!updated) {
      return reply.code(404).send({ error: 'Company não encontrada' });
    }
    reply.send(updated);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao atualizar company', details: String(error) });
  }
}

export async function deleteCompanyHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { companyId } = (request.params as any);
    if (!companyId) {
      return reply.code(400).send({ error: 'companyId é obrigatório' });
    }
    const deleted = await db.delete(companies).where(eq(companies.companyId, companyId)).returning();
    if (!deleted.length) {
      return reply.code(404).send({ error: 'Company não encontrada' });
    }
    reply.code(204).send();
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao deletar company', details: String(error) });
  }
}
