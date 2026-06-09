import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc, sql, count } from 'drizzle-orm';
import { db } from '../../shared/database/index.js';
import {
  users,
  tenants,
  billingSubscriptions,
  billingInvoices,
  projects,
  ifcModels,
} from '../../shared/database/schema/index.js';
import { authenticateRequest } from '../auth/middleware.js';
import { isSuperAdmin } from './super-admin.middleware.js';
import { EmailService } from './email.service.js';

const emailService = new EmailService();

export async function adminRoutes(fastify: FastifyInstance) {
  // Gate do admin: role 'admin' OU super-admin (nicolas@avila.inc).
  // NÃO basta ser 'owner' — todo usuário é owner do próprio tenant pessoal,
  // o que abriria o admin pra qualquer um. (Furo corrigido.)
  const adminGate = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as { role?: string; email?: string; permissions?: string[] } | undefined;
    if (!user) return reply.code(401).send({ error: 'Não autenticado.' });
    const ok = user.role === 'admin' || user.permissions?.includes('admin') || isSuperAdmin(user.email);
    if (!ok) return reply.code(403).send({ error: 'Acesso restrito a administradores.' });
  };
  const preHandler = [authenticateRequest, adminGate];

  // ─────────────────────────────────────────
  // USERS
  // ─────────────────────────────────────────

  fastify.get('/users', { preHandler }, async (_req: FastifyRequest, reply: FastifyReply) => {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        tenantId: users.tenantId,
        isActive: users.isActive,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
    return reply.send({ users: rows, total: rows.length });
  });

  fastify.patch('/users/:id', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { role, isActive, permissions } = request.body as any;

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (permissions !== undefined) updateData.permissions = permissions;

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({ id: users.id, email: users.email, role: users.role, isActive: users.isActive });

    if (!updated) return reply.status(404).send({ error: 'Usuário não encontrado.' });
    return reply.send({ user: updated });
  });

  fastify.delete('/users/:id', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const caller = (request as any).user;
    if (caller.userId === id) return reply.status(400).send({ error: 'Você não pode excluir sua própria conta.' });
    await db.update(users).set({ isActive: false }).where(eq(users.id, id));
    return reply.send({ ok: true });
  });

  // ─────────────────────────────────────────
  // TENANTS
  // ─────────────────────────────────────────

  fastify.get('/tenants', { preHandler }, async (_req: FastifyRequest, reply: FastifyReply) => {
    const rows = await db
      .select({
        id: tenants.id,
        tenantId: tenants.tenantId,
        name: tenants.name,
        isActive: tenants.isActive,
        subscription: tenants.subscription,
        createdAt: tenants.createdAt,
      })
      .from(tenants)
      .orderBy(desc(tenants.createdAt));

    const enriched = await Promise.all(rows.map(async (t) => {
      const [userCount] = await db
        .select({ value: count() })
        .from(users)
        .where(eq(users.tenantId, t.tenantId));
      const [projectCount] = await db
        .select({ value: count() })
        .from(projects)
        .where(eq(projects.tenantId, t.tenantId));
      return { ...t, userCount: userCount?.value ?? 0, projectCount: projectCount?.value ?? 0 };
    }));

    return reply.send({ tenants: enriched, total: enriched.length });
  });

  fastify.patch('/tenants/:tenantId', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const { isActive, name, subscription } = request.body as any;

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (isActive !== undefined) updateData.isActive = isActive;
    if (name !== undefined) updateData.name = name;
    if (subscription !== undefined) updateData.subscription = subscription;

    const [updated] = await db
      .update(tenants)
      .set(updateData)
      .where(eq(tenants.tenantId, tenantId))
      .returning();

    if (!updated) return reply.status(404).send({ error: 'Tenant não encontrado.' });
    return reply.send({ tenant: updated });
  });

  // ─────────────────────────────────────────
  // BILLING
  // ─────────────────────────────────────────

  fastify.get('/billing/subscriptions', { preHandler }, async (_req: FastifyRequest, reply: FastifyReply) => {
    const subs = await db
      .select()
      .from(billingSubscriptions)
      .orderBy(desc(billingSubscriptions.createdAt));
    return reply.send({ subscriptions: subs, total: subs.length });
  });

  fastify.get('/billing/invoices', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, limit = '50' } = request.query as any;
    const query = db
      .select()
      .from(billingInvoices)
      .orderBy(desc(billingInvoices.createdAt))
      .limit(parseInt(limit));

    const invoices = tenantId
      ? await query.where(eq(billingInvoices.tenantId, tenantId))
      : await query;

    return reply.send({ invoices, total: invoices.length });
  });

  // ─────────────────────────────────────────
  // STATS (dashboard summary)
  // ─────────────────────────────────────────

  fastify.get('/stats', { preHandler }, async (_req: FastifyRequest, reply: FastifyReply) => {
    const [[totalUsers], [totalTenants], [totalProjects], [totalModels], [activeUsers]] =
      await Promise.all([
        db.select({ v: count() }).from(users),
        db.select({ v: count() }).from(tenants),
        db.select({ v: count() }).from(projects),
        db.select({ v: count() }).from(ifcModels),
        db.select({ v: count() }).from(users).where(eq(users.isActive, true)),
      ]);

    const planBreakdown = await db
      .select({
        plan: sql<string>`subscription->>'plan'`,
        count: count(),
      })
      .from(tenants)
      .groupBy(sql`subscription->>'plan'`);

    return reply.send({
      totalUsers: totalUsers?.v ?? 0,
      activeUsers: activeUsers?.v ?? 0,
      totalTenants: totalTenants?.v ?? 0,
      totalProjects: totalProjects?.v ?? 0,
      totalModels: totalModels?.v ?? 0,
      planBreakdown,
    });
  });

  // ─────────────────────────────────────────
  // EMAIL MARKETING
  // ─────────────────────────────────────────

  fastify.get('/emails/templates', { preHandler }, async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ templates: emailService.getTemplates() });
  });

  fastify.post('/emails/send', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { templateId, recipientType, customEmails, subject, customBody } = request.body as any;
    const caller = (request as any).user;

    let recipients: { email: string; name: string }[] = [];

    if (recipientType === 'custom' && customEmails?.length) {
      recipients = customEmails.map((e: string) => ({ email: e, name: e }));
    } else {
      const filter = recipientType === 'free'
        ? sql`subscription->>'plan' = 'free' OR subscription IS NULL`
        : recipientType === 'paid'
          ? sql`subscription->>'plan' != 'free' AND subscription IS NOT NULL`
          : sql`1=1`;

      const tenantRows = await db
        .select({ tenantId: tenants.tenantId })
        .from(tenants)
        .where(filter as any);

      const tenantIds = tenantRows.map(r => r.tenantId);
      if (tenantIds.length) {
        const userRows = await db
          .select({ email: users.email, name: users.name })
          .from(users)
          .where(sql`tenant_id = ANY(${tenantIds}) AND is_active = true`);
        recipients = userRows;
      }
    }

    if (!recipients.length) {
      return reply.status(400).send({ error: 'Nenhum destinatário encontrado.' });
    }

    const result = await emailService.sendMarketing({
      templateId,
      recipients,
      subject,
      customBody,
      sentBy: caller.email,
    });

    return reply.send({ sent: result.sent, failed: result.failed, total: recipients.length });
  });

  fastify.post('/emails/test', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { templateId, email } = request.body as any;
    const caller = (request as any).user;
    const to = email || caller.email;

    await emailService.sendMarketing({
      templateId,
      recipients: [{ email: to, name: 'Teste' }],
      sentBy: caller.email,
    });

    return reply.send({ ok: true, sentTo: to });
  });
}
