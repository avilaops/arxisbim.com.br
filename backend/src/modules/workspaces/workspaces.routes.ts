import { FastifyInstance, FastifyRequest } from 'fastify';
import { randomBytes, createHash } from 'crypto';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '../../shared/database/db.js';
import { tenants, users } from '../../shared/database/schema/tenants.js';
import { memberships, workspaceInvites } from '../../shared/database/schema/workspaces.js';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { AuthService } from '../../core/auth/auth.service.js';
import { emailService } from '../../core/email/email.service.js';

const authService = new AuthService();

type AuthedUser = { userId: string; email: string; tenantId: string; role: string; permissions: string[] };
function getUser(req: FastifyRequest): AuthedUser | null {
  return ((req as any).user as AuthedUser) ?? null;
}

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://arxisvr.avilaops.com';

function workspaceSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'workspace';
  const rand = randomBytes(4).toString('hex');
  return `w-${base}-${rand}`;
}

async function membershipRole(userId: string, tenantId: string): Promise<string | null> {
  const [m] = await db.select().from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.tenantId, tenantId), eq(memberships.status, 'active')))
    .limit(1);
  return m?.role ?? null;
}

export async function workspaceRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: authenticateRequest };

  // Criar um novo workspace (tenant) — o criador vira owner.
  fastify.post('/workspaces', auth, async (req, reply) => {
    const user = getUser(req);
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });
    const { name } = (req.body as { name?: string }) || {};
    if (!name || !name.trim()) return reply.code(400).send({ error: 'Nome do workspace é obrigatório' });

    const tenantId = workspaceSlug(name);
    await db.insert(tenants).values({ tenantId, name: name.trim(), isActive: true }).onConflictDoNothing();
    await db.insert(memberships).values({ userId: user.userId, tenantId, role: 'owner', status: 'active' })
      .onConflictDoNothing();

    return reply.code(201).send({ tenantId, name: name.trim(), role: 'owner' });
  });

  // Listar meus workspaces.
  fastify.get('/workspaces', auth, async (req, reply) => {
    const user = getUser(req);
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });
    const rows = await db
      .select({ tenantId: memberships.tenantId, role: memberships.role, name: tenants.name })
      .from(memberships)
      .innerJoin(tenants, eq(memberships.tenantId, tenants.tenantId))
      .where(and(eq(memberships.userId, user.userId), eq(memberships.status, 'active')));
    return reply.send(rows.map(r => ({ ...r, active: r.tenantId === user.tenantId })));
  });

  // Convidar alguém para um workspace (só owner/admin).
  fastify.post('/workspaces/:tenantId/invites', auth, async (req, reply) => {
    const user = getUser(req);
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });
    const { tenantId } = req.params as { tenantId: string };
    const role = await membershipRole(user.userId, tenantId);
    if (role !== 'owner' && role !== 'admin') return reply.code(403).send({ error: 'Apenas owner/admin podem convidar' });

    const body = (req.body as { email?: string; role?: string }) || {};
    const email = (body.email || '').trim().toLowerCase();
    const inviteRole = ['admin', 'member', 'viewer'].includes(body.role || '') ? body.role! : 'member';
    if (!email || !email.includes('@')) return reply.code(400).send({ error: 'Email inválido' });

    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
    await db.insert(workspaceInvites).values({
      tenantId, email, role: inviteRole, token, status: 'pending', invitedBy: user.userId, expiresAt,
    });

    const [ws] = await db.select({ name: tenants.name }).from(tenants).where(eq(tenants.tenantId, tenantId)).limit(1);
    const acceptUrl = `${FRONTEND_URL}/accept-invite.html?token=${token}`;
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2>Você foi convidado para o workspace <strong>${ws?.name || tenantId}</strong></h2>
        <p>Você foi convidado como <strong>${inviteRole}</strong> no ArxisVR.</p>
        <p><a href="${acceptUrl}" style="display:inline-block;padding:12px 24px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none">Aceitar convite</a></p>
        <p style="color:#888;font-size:13px">O convite expira em 7 dias. Se você não esperava isto, ignore este email.</p>
      </div>`;
    try {
      await emailService.sendCustomEmail(email, `Convite para o workspace ${ws?.name || tenantId}`, html, tenantId);
    } catch (e) {
      fastify.log.error(e);
    }

    return reply.code(201).send({ ok: true, email, role: inviteRole, token, acceptUrl });
  });

  // Meus convites pendentes (pelo meu email).
  fastify.get('/invites', auth, async (req, reply) => {
    const user = getUser(req);
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });
    const rows = await db
      .select({ token: workspaceInvites.token, tenantId: workspaceInvites.tenantId, role: workspaceInvites.role, name: tenants.name, expiresAt: workspaceInvites.expiresAt })
      .from(workspaceInvites)
      .innerJoin(tenants, eq(workspaceInvites.tenantId, tenants.tenantId))
      .where(and(
        eq(workspaceInvites.email, user.email.toLowerCase()),
        eq(workspaceInvites.status, 'pending'),
        gt(workspaceInvites.expiresAt, new Date()),
      ));
    return reply.send(rows);
  });

  // Aceitar convite → cria membership.
  fastify.post('/invites/:token/accept', auth, async (req, reply) => {
    const user = getUser(req);
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });
    const { token } = req.params as { token: string };
    const [inv] = await db.select().from(workspaceInvites).where(eq(workspaceInvites.token, token)).limit(1);
    if (!inv) return reply.code(404).send({ error: 'Convite não encontrado' });
    if (inv.status !== 'pending') return reply.code(409).send({ error: 'Convite já utilizado' });
    if (inv.expiresAt.getTime() < Date.now()) {
      await db.update(workspaceInvites).set({ status: 'expired' }).where(eq(workspaceInvites.id, inv.id));
      return reply.code(410).send({ error: 'Convite expirado' });
    }
    if (inv.email.toLowerCase() !== user.email.toLowerCase()) {
      return reply.code(403).send({ error: 'Este convite é para outro email' });
    }

    await db.insert(memberships)
      .values({ userId: user.userId, tenantId: inv.tenantId, role: inv.role, status: 'active' })
      .onConflictDoNothing();
    await db.update(workspaceInvites)
      .set({ status: 'accepted', acceptedBy: user.userId, acceptedAt: new Date() })
      .where(eq(workspaceInvites.id, inv.id));

    return reply.send({ ok: true, tenantId: inv.tenantId, role: inv.role });
  });

  // Recusar convite.
  fastify.post('/invites/:token/decline', auth, async (req, reply) => {
    const user = getUser(req);
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });
    const { token } = req.params as { token: string };
    const [inv] = await db.select().from(workspaceInvites).where(eq(workspaceInvites.token, token)).limit(1);
    if (!inv) return reply.code(404).send({ error: 'Convite não encontrado' });
    if (inv.email.toLowerCase() !== user.email.toLowerCase()) return reply.code(403).send({ error: 'Convite de outro email' });
    if (inv.status === 'pending') {
      await db.update(workspaceInvites).set({ status: 'declined' }).where(eq(workspaceInvites.id, inv.id));
    }
    return reply.send({ ok: true });
  });

  // Trocar o workspace ativo → emite novo token com o tenant escolhido.
  fastify.post('/workspaces/:tenantId/switch', auth, async (req, reply) => {
    const user = getUser(req);
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });
    const { tenantId } = req.params as { tenantId: string };
    const role = await membershipRole(user.userId, tenantId);
    if (!role) return reply.code(403).send({ error: 'Você não é membro deste workspace' });

    const [u] = await db.select({ name: users.name, permissions: users.permissions, companyId: users.companyId })
      .from(users).where(eq(users.id, user.userId)).limit(1);

    const token = authService.issueAccessToken({
      userId: user.userId,
      email: user.email,
      name: u?.name || '',
      tenantId,
      companyId: u?.companyId || undefined,
      role,
      permissions: (u?.permissions as string[]) || [],
    } as any);

    return reply.send({ token, tenantId, role });
  });
}
