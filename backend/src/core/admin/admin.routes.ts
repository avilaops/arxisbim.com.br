import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc, sql, count, and, ilike, or } from 'drizzle-orm';
import { db } from '../../shared/database/index.js';
import {
  users,
  tenants,
  billingSubscriptions,
  billingInvoices,
  projects,
  ifcModels,
  auditLogs,
} from '../../shared/database/schema/index.js';
import { authenticateRequest } from '../auth/middleware.js';
import { isSuperAdmin } from './super-admin.middleware.js';
import { EmailService } from './email.service.js';

const emailService = new EmailService();

export async function adminRoutes(fastify: FastifyInstance) {
  // Gate do admin: role 'admin' OU super-admin (nicolas@avila.inc).
  const adminGate = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as { role?: string; email?: string; permissions?: string[] } | undefined;
    if (!user) return reply.code(401).send({ error: 'Não autenticado.' });
    const ok = user.role === 'admin' || user.permissions?.includes('admin') || isSuperAdmin(user.email);
    if (!ok) return reply.code(403).send({ error: 'Acesso restrito a administradores.' });
  };
  const preHandler = [authenticateRequest, adminGate];

  // ─────────────────────────────────────────
  // USERS — paginado + busca server-side
  // ─────────────────────────────────────────

  fastify.get('/users', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '25', q = '' } = request.query as any;
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset   = (pageNum - 1) * limitNum;

    const whereClause = q
      ? or(ilike(users.email, `%${q}%`), ilike(users.name, `%${q}%`))
      : undefined;

    const base = db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      tenantId: users.tenantId,
      isActive: users.isActive,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
      lastLoginAt: users.lastLoginAt,
    }).from(users);

    const [rows, [totalRow]] = await Promise.all([
      (whereClause ? base.where(whereClause) : base)
        .orderBy(desc(users.createdAt)).limit(limitNum).offset(offset),
      whereClause
        ? db.select({ v: count() }).from(users).where(whereClause)
        : db.select({ v: count() }).from(users),
    ]);

    return reply.send({
      users: rows,
      total: totalRow?.v ?? 0,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil((totalRow?.v ?? 0) / limitNum),
    });
  });

  fastify.patch('/users/:id', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { role, isActive, permissions } = request.body as any;
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (role !== undefined)        updateData.role = role;
    if (isActive !== undefined)    updateData.isActive = isActive;
    if (permissions !== undefined) updateData.permissions = permissions;
    const [updated] = await db.update(users).set(updateData).where(eq(users.id, id))
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
  // TENANTS — com usage (storage, modelos)
  // ─────────────────────────────────────────

  fastify.get('/tenants', { preHandler }, async (_req: FastifyRequest, reply: FastifyReply) => {
    const rows = await db.select({
      id: tenants.id,
      tenantId: tenants.tenantId,
      name: tenants.name,
      isActive: tenants.isActive,
      subscription: tenants.subscription,
      featureFlags: tenants.featureFlags,
      createdAt: tenants.createdAt,
    }).from(tenants).orderBy(desc(tenants.createdAt));

    const enriched = await Promise.all(rows.map(async (t) => {
      const [[userCount], [projectCount], [modelCount], [storageRow]] = await Promise.all([
        db.select({ v: count() }).from(users).where(eq(users.tenantId, t.tenantId)),
        db.select({ v: count() }).from(projects).where(eq(projects.tenantId, t.tenantId)),
        db.select({ v: count() }).from(ifcModels).where(eq(ifcModels.tenantId, t.tenantId)),
        db.select({ bytes: sql<number>`COALESCE(SUM(file_size), 0)` }).from(ifcModels).where(eq(ifcModels.tenantId, t.tenantId)),
      ]);
      return {
        ...t,
        userCount:    Number(userCount?.v    ?? 0),
        projectCount: Number(projectCount?.v ?? 0),
        modelCount:   Number(modelCount?.v   ?? 0),
        storageBytes: Number(storageRow?.bytes ?? 0),
      };
    }));

    return reply.send({ tenants: enriched, total: enriched.length });
  });

  fastify.patch('/tenants/:tenantId', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const { isActive, name, subscription } = request.body as any;
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (isActive !== undefined)     updateData.isActive = isActive;
    if (name !== undefined)         updateData.name = name;
    if (subscription !== undefined) updateData.subscription = subscription;
    const [updated] = await db.update(tenants).set(updateData).where(eq(tenants.tenantId, tenantId)).returning();
    if (!updated) return reply.status(404).send({ error: 'Tenant não encontrado.' });
    return reply.send({ tenant: updated });
  });

  // ─────────────────────────────────────────
  // FEATURE FLAGS por tenant
  // ─────────────────────────────────────────

  fastify.get('/tenants/:tenantId/flags', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const [tenant] = await db.select({ featureFlags: tenants.featureFlags }).from(tenants).where(eq(tenants.tenantId, tenantId));
    if (!tenant) return reply.status(404).send({ error: 'Tenant não encontrado.' });
    return reply.send({ flags: tenant.featureFlags ?? {} });
  });

  fastify.patch('/tenants/:tenantId/flags', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const flags = request.body as Record<string, boolean>;
    const [existing] = await db.select({ featureFlags: tenants.featureFlags }).from(tenants).where(eq(tenants.tenantId, tenantId));
    if (!existing) return reply.status(404).send({ error: 'Tenant não encontrado.' });
    const merged = { ...(existing.featureFlags ?? {}), ...flags };
    const [updated] = await db.update(tenants).set({ featureFlags: merged, updatedAt: new Date() })
      .where(eq(tenants.tenantId, tenantId))
      .returning({ tenantId: tenants.tenantId, featureFlags: tenants.featureFlags });
    return reply.send({ flags: updated.featureFlags });
  });

  // ─────────────────────────────────────────
  // AUDIT LOGS — paginado, filtrável
  // ─────────────────────────────────────────

  fastify.get('/audit', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { page = '1', limit = '50', tenantId: tId, action, resource } = request.query as any;
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
    const offset   = (pageNum - 1) * limitNum;

    const conditions: any[] = [];
    if (tId)     conditions.push(eq(auditLogs.tenantId, tId));
    if (action)  conditions.push(eq(auditLogs.action, action));
    if (resource) conditions.push(eq(auditLogs.resource, resource));
    const whereClause = conditions.length ? and(...conditions) : undefined;

    const base = db.select().from(auditLogs);
    const [rows, [totalRow]] = await Promise.all([
      (whereClause ? base.where(whereClause) : base)
        .orderBy(desc(auditLogs.timestamp)).limit(limitNum).offset(offset),
      whereClause
        ? db.select({ v: count() }).from(auditLogs).where(whereClause)
        : db.select({ v: count() }).from(auditLogs),
    ]);

    // Enrich: user emails
    const userIds = [...new Set(rows.map(r => r.userId).filter(Boolean))] as string[];
    const userMap: Record<string, string> = {};
    if (userIds.length) {
      const uRows = await db.select({ id: users.id, email: users.email, name: users.name })
        .from(users).where(sql`id = ANY(${userIds})`);
      uRows.forEach(u => { userMap[u.id] = u.email || u.name || u.id; });
    }

    return reply.send({
      logs: rows.map(r => ({ ...r, userEmail: r.userId ? (userMap[r.userId] ?? r.userId) : 'sistema' })),
      total: totalRow?.v ?? 0,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil((totalRow?.v ?? 0) / limitNum),
    });
  });

  // ─────────────────────────────────────────
  // BILLING
  // ─────────────────────────────────────────

  fastify.get('/billing/subscriptions', { preHandler }, async (_req: FastifyRequest, reply: FastifyReply) => {
    const subs = await db.select().from(billingSubscriptions).orderBy(desc(billingSubscriptions.createdAt));
    return reply.send({ subscriptions: subs, total: subs.length });
  });

  fastify.get('/billing/invoices', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, limit = '50' } = request.query as any;
    const query = db.select().from(billingInvoices).orderBy(desc(billingInvoices.createdAt)).limit(parseInt(limit));
    const invoices = tenantId ? await query.where(eq(billingInvoices.tenantId, tenantId)) : await query;
    return reply.send({ invoices, total: invoices.length });
  });

  // ─────────────────────────────────────────
  // STATS
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
      .select({ plan: sql<string>`subscription->>'plan'`, count: count() })
      .from(tenants).groupBy(sql`subscription->>'plan'`);
    return reply.send({
      totalUsers:    totalUsers?.v   ?? 0,
      activeUsers:   activeUsers?.v  ?? 0,
      totalTenants:  totalTenants?.v ?? 0,
      totalProjects: totalProjects?.v ?? 0,
      totalModels:   totalModels?.v  ?? 0,
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
      const tenantRows = await db.select({ tenantId: tenants.tenantId }).from(tenants).where(filter as any);
      const tenantIds = tenantRows.map(r => r.tenantId);
      if (tenantIds.length) {
        const userRows = await db.select({ email: users.email, name: users.name })
          .from(users).where(sql`tenant_id = ANY(${tenantIds}) AND is_active = true`);
        recipients = userRows;
      }
    }
    if (!recipients.length) return reply.status(400).send({ error: 'Nenhum destinatário encontrado.' });
    const result = await emailService.sendMarketing({ templateId, recipients, subject, customBody, sentBy: caller.email });
    return reply.send({ sent: result.sent, failed: result.failed, total: recipients.length });
  });

  fastify.post('/emails/test', { preHandler }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { templateId, email } = request.body as any;
    const caller = (request as any).user;
    const to = email || caller.email;
    await emailService.sendMarketing({ templateId, recipients: [{ email: to, name: 'Teste' }], sentBy: caller.email });
    return reply.send({ ok: true, sentTo: to });
  });
}
