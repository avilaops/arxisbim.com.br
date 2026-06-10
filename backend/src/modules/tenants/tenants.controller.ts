import { FastifyRequest, FastifyReply } from 'fastify';
import { tenants } from '../../shared/database/schema/tenants.js';
import { eq, count } from 'drizzle-orm';
import { db } from '../../shared/database/db.js';
import { z } from 'zod';

// ─── Schemas ────────────────────────────────────────────────────────────────

const createTenantSchema = z.object({
  tenantId: z.string().min(3).max(64).regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
  name: z.string().min(1).max(255),
  branding: z.record(z.string(), z.any()).optional(),
  subscription: z.record(z.string(), z.any()).optional(),
  settings: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean().optional(),
});

const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  branding: z.record(z.string(), z.any()).optional(),
  subscription: z.record(z.string(), z.any()).optional(),
  settings: z.record(z.string(), z.any()).optional(),
  isActive: z.boolean().optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function internalError(request: FastifyRequest, reply: FastifyReply, error: unknown) {
  request.log.error(error);
  return reply.code(500).send({ error: 'Erro interno do servidor' });
}

// ─── Handlers ───────────────────────────────────────────────────────────────

export async function getTenantsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { page, limit } = paginationSchema.parse(request.query);
    const offset = (page - 1) * limit;

    const [result, [{ total }]] = await Promise.all([
      db.select().from(tenants).limit(limit).offset(offset),
      db.select({ total: count() }).from(tenants),
    ]);

    return reply.send({ data: result, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({ error: 'Parâmetros inválidos', issues: error.issues });
    }
    return internalError(request, reply, error);
  }
}

export async function createTenantHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = createTenantSchema.parse(request.body);

    // Check duplicate
    const [existing] = await db
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(eq(tenants.tenantId, body.tenantId))
      .limit(1);

    if (existing) {
      return reply.code(409).send({ error: 'Tenant já existe' });
    }

    const [created] = await db.insert(tenants).values({
      tenantId: body.tenantId,
      name: body.name,
      branding: (body.branding ?? {}) as any,
      subscription: (body.subscription ?? { plan: 'free' }) as any,
      settings: (body.settings ?? {}) as any,
      isActive: body.isActive ?? true,
    }).returning();

    return reply.code(201).send(created);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({ error: 'Dados inválidos', issues: error.issues });
    }
    return internalError(request, reply, error);
  }
}

export async function getTenantHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = request.params as { tenantId: string };

    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.tenantId, tenantId))
      .limit(1);

    if (!tenant) {
      return reply.code(404).send({ error: 'Tenant não encontrado' });
    }

    return reply.send(tenant);
  } catch (error) {
    return internalError(request, reply, error);
  }
}

export async function updateTenantHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = request.params as { tenantId: string };
    const body = updateTenantSchema.parse(request.body);

    // Build partial update — never overwrite with undefined
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.branding !== undefined) updateData.branding = body.branding;
    if (body.subscription !== undefined) updateData.subscription = body.subscription;
    if (body.settings !== undefined) updateData.settings = body.settings;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const [updated] = await db
      .update(tenants)
      .set(updateData)
      .where(eq(tenants.tenantId, tenantId))
      .returning();

    if (!updated) {
      return reply.code(404).send({ error: 'Tenant não encontrado' });
    }

    return reply.send(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.code(400).send({ error: 'Dados inválidos', issues: error.issues });
    }
    return internalError(request, reply, error);
  }
}

export async function deleteTenantHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { tenantId } = request.params as { tenantId: string };

    // Soft delete — preserves audit trail, billing history, and tenant data integrity
    const [deactivated] = await db
      .update(tenants)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(tenants.tenantId, tenantId))
      .returning({ tenantId: tenants.tenantId });

    if (!deactivated) {
      return reply.code(404).send({ error: 'Tenant não encontrado' });
    }

    return reply.code(200).send({ message: 'Tenant desativado com sucesso', tenantId });
  } catch (error) {
    return internalError(request, reply, error);
  }
}
