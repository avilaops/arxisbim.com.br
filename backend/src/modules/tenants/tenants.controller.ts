
import { FastifyRequest, FastifyReply } from 'fastify';
import { tenants } from '../../shared/database/schema/tenants.js';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
// Função utilitária para obter conexão com o banco
function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }
  const client = postgres(process.env.DATABASE_URL);
  return drizzle(client, { schema: { tenants } });
}

export async function getTenantsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const result = await db.select().from(tenants);
    reply.send(result);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao listar tenants', details: String(error) });
  }
}

export async function createTenantHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const body = request.body as any;
    // Validação básica (ideal: usar zod)
    if (!body || !body.tenantId || !body.name) {
      return reply.code(400).send({ error: 'tenantId e name são obrigatórios' });
    }
    const [created] = await db.insert(tenants).values({
      tenantId: body.tenantId,
      name: body.name,
      branding: body.branding ?? {},
      subscription: body.subscription ?? { plan: 'free' },
      settings: body.settings ?? {},
      isActive: body.isActive ?? true,
    }).returning();
    reply.code(201).send(created);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao criar tenant', details: String(error) });
  }
}

export async function getTenantHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { tenantId } = (request.params as any);
    if (!tenantId) {
      return reply.code(400).send({ error: 'tenantId é obrigatório' });
    }
    const [tenant] = await db.select().from(tenants).where(eq(tenants.tenantId, tenantId)).limit(1);
    if (!tenant) {
      return reply.code(404).send({ error: 'Tenant não encontrado' });
    }
    reply.send(tenant);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao buscar tenant', details: String(error) });
  }
}

export async function updateTenantHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { tenantId } = (request.params as any);
    const body = request.body as any;
    if (!tenantId) {
      return reply.code(400).send({ error: 'tenantId é obrigatório' });
    }
    const [updated] = await db.update(tenants)
      .set({
        name: body.name,
        branding: body.branding,
        subscription: body.subscription,
        settings: body.settings,
        isActive: body.isActive,
        updatedAt: new Date(),
      })
      .where(eq(tenants.tenantId, tenantId))
      .returning();
    if (!updated) {
      return reply.code(404).send({ error: 'Tenant não encontrado' });
    }
    reply.send(updated);
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao atualizar tenant', details: String(error) });
  }
}

export async function deleteTenantHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const db = getDb();
    const { tenantId } = (request.params as any);
    if (!tenantId) {
      return reply.code(400).send({ error: 'tenantId é obrigatório' });
    }
    const deleted = await db.delete(tenants).where(eq(tenants.tenantId, tenantId)).returning();
    if (!deleted.length) {
      return reply.code(404).send({ error: 'Tenant não encontrado' });
    }
    reply.code(204).send();
  } catch (error) {
    reply.code(500).send({ error: 'Erro ao deletar tenant', details: String(error) });
  }
}
