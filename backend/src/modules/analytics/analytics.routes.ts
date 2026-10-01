import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { and, count, desc, eq, gte, sql, like } from 'drizzle-orm';
import { db } from '../../shared/database/db.js';
import { analyticsEvents } from '../../shared/database/schema/analytics.js';
import { authenticateRequest, optionalAuth } from '../../core/auth/middleware.js';
import { requireSuperAdmin } from '../../core/admin/super-admin.middleware.js';
import { logFrontendEvent } from '../../core/observability/service.js';

// ── Ingest payload ────────────────────────────────────────────────
interface IncomingEvent {
  name?: string;
  category?: string;
  path?: string;
  referrer?: string;
  anonId?: string;
  sessionId?: string;
  utm?: Record<string, string>;
  props?: Record<string, unknown>;
  ts?: number;
}

function clamp(s: unknown, max: number): string | null {
  if (typeof s !== 'string') return null;
  return s.slice(0, max);
}

function clientIp(req: FastifyRequest): string {
  const fwd = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  return fwd || req.ip || '';
}

// ══════════════════════════════════════════════════════════════════
// PUBLIC INGEST  →  POST /api/v1/track   (sem auth; anônimo permitido)
// ══════════════════════════════════════════════════════════════════
export async function trackRoutes(fastify: FastifyInstance) {
  fastify.post('/track', {
    preHandler: optionalAuth,
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute',
        keyGenerator: (request: FastifyRequest) => {
          const body = request.body as any;
          const events = Array.isArray(body?.events) ? body.events : (body ? [body] : []);
          const firstEvent = events[0];
          return firstEvent?.anonId || firstEvent?.sessionId || clientIp(request);
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as { userId?: string; tenantId?: string } | undefined;
    const ip = clientIp(request);
    const ua = clamp(request.headers['user-agent'], 1000);

    const body = request.body as { events?: IncomingEvent[] } | IncomingEvent;
    const list: IncomingEvent[] = Array.isArray((body as any)?.events)
      ? (body as any).events
      : [body as IncomingEvent];

    const rows = list
      .filter((e) => e && typeof e.name === 'string' && e.name.trim())
      .slice(0, 50) // anti-flood por request
      .map((e) => {
        const row = {
          anonId: clamp(e.anonId, 64),
          sessionId: clamp(e.sessionId, 64),
          userId: user?.userId ?? null,
          tenantId: user?.tenantId ?? null,
          name: clamp(e.name, 120)!,
          category: clamp(e.category, 60),
          path: clamp(e.path, 512),
          referrer: clamp(e.referrer, 512),
          utm: e.utm && typeof e.utm === 'object' ? e.utm : null,
          props: e.props && typeof e.props === 'object' ? e.props : null,
          ip,
          userAgent: ua,
          country: null,
          timestamp: new Date().toISOString()
        };
        logFrontendEvent(row);
        return row;
      });

    if (!rows.length) return reply.code(202).send({ accepted: 0 });

    try {
      await db.insert(analyticsEvents).values(rows as any);
    } catch (err) {
      fastify.log.error({ err }, 'analytics ingest failed');
      // Nunca quebra o cliente por causa de telemetria.
    }
    return reply.code(202).send({ accepted: rows.length });
  });
}

// ══════════════════════════════════════════════════════════════════
// ADMIN  →  /api/v1/admin/analytics/*   (super-admin: nicolas@avila.inc)
// ══════════════════════════════════════════════════════════════════
export async function adminAnalyticsRoutes(fastify: FastifyInstance) {
  const preHandler = [authenticateRequest, requireSuperAdmin];

  function sinceFrom(range: string | undefined): Date {
    const now = Date.now();
    const map: Record<string, number> = {
      '1h': 3600e3, '24h': 86400e3, '7d': 7 * 86400e3, '30d': 30 * 86400e3, '90d': 90 * 86400e3,
    };
    return new Date(now - (map[range || '7d'] ?? map['7d']));
  }

  // Visão geral (cards do topo)
  fastify.get('/overview', { preHandler }, async (req: FastifyRequest, reply: FastifyReply) => {
    const since = sinceFrom((req.query as any)?.range);
    const [[total], [uniqueVisitors], [pageViews], [signups], [loggedEvents]] = await Promise.all([
      db.select({ v: count() }).from(analyticsEvents).where(gte(analyticsEvents.timestamp, since)),
      db.select({ v: sql<number>`count(distinct ${analyticsEvents.anonId})` }).from(analyticsEvents).where(gte(analyticsEvents.timestamp, since)),
      db.select({ v: count() }).from(analyticsEvents).where(and(gte(analyticsEvents.timestamp, since), eq(analyticsEvents.name, 'page_view'))),
      db.select({ v: count() }).from(analyticsEvents).where(and(gte(analyticsEvents.timestamp, since), eq(analyticsEvents.name, 'signup'))),
      db.select({ v: sql<number>`count(*) filter (where ${analyticsEvents.userId} is not null)` }).from(analyticsEvents).where(gte(analyticsEvents.timestamp, since)),
    ]);
    return reply.send({
      range: (req.query as any)?.range || '7d',
      totalEvents: Number(total?.v ?? 0),
      uniqueVisitors: Number(uniqueVisitors?.v ?? 0),
      pageViews: Number(pageViews?.v ?? 0),
      signups: Number(signups?.v ?? 0),
      authenticatedEvents: Number(loggedEvents?.v ?? 0),
    });
  });

  // Série temporal (eventos por hora/dia)
  fastify.get('/timeseries', { preHandler }, async (req: FastifyRequest, reply: FastifyReply) => {
    const since = sinceFrom((req.query as any)?.range);
    const bucket = (req.query as any)?.bucket === 'hour' ? 'hour' : 'day';
    const rows = await db
      .select({
        t: sql<string>`date_trunc(${bucket}, ${analyticsEvents.timestamp})`,
        events: count(),
        visitors: sql<number>`count(distinct ${analyticsEvents.anonId})`,
      })
      .from(analyticsEvents)
      .where(gte(analyticsEvents.timestamp, since))
      .groupBy(sql`1`)
      .orderBy(sql`1`);
    return reply.send({ bucket, points: rows.map((r) => ({ t: r.t, events: Number(r.events), visitors: Number(r.visitors) })) });
  });

  // Top páginas
  fastify.get('/top-pages', { preHandler }, async (req: FastifyRequest, reply: FastifyReply) => {
    const since = sinceFrom((req.query as any)?.range);
    const rows = await db
      .select({ path: analyticsEvents.path, views: count() })
      .from(analyticsEvents)
      .where(and(gte(analyticsEvents.timestamp, since), eq(analyticsEvents.name, 'page_view')))
      .groupBy(analyticsEvents.path)
      .orderBy(desc(count()))
      .limit(20);
    return reply.send({ pages: rows.map((r) => ({ path: r.path, views: Number(r.views) })) });
  });

  // Top eventos (por nome)
  fastify.get('/top-events', { preHandler }, async (req: FastifyRequest, reply: FastifyReply) => {
    const since = sinceFrom((req.query as any)?.range);
    const rows = await db
      .select({ name: analyticsEvents.name, total: count() })
      .from(analyticsEvents)
      .where(gte(analyticsEvents.timestamp, since))
      .groupBy(analyticsEvents.name)
      .orderBy(desc(count()))
      .limit(30);
    return reply.send({ events: rows.map((r) => ({ name: r.name, total: Number(r.total) })) });
  });

  // Referrers + UTM source
  fastify.get('/sources', { preHandler }, async (req: FastifyRequest, reply: FastifyReply) => {
    const since = sinceFrom((req.query as any)?.range);
    const [refs, utms] = await Promise.all([
      db.select({ referrer: analyticsEvents.referrer, total: count() })
        .from(analyticsEvents)
        .where(and(gte(analyticsEvents.timestamp, since), eq(analyticsEvents.name, 'page_view')))
        .groupBy(analyticsEvents.referrer).orderBy(desc(count())).limit(15),
      db.select({ source: sql<string>`${analyticsEvents.utm}->>'source'`, total: count() })
        .from(analyticsEvents)
        .where(and(gte(analyticsEvents.timestamp, since), sql`${analyticsEvents.utm}->>'source' is not null`))
        .groupBy(sql`1`).orderBy(desc(count())).limit(15),
    ]);
    return reply.send({
      referrers: refs.map((r) => ({ referrer: r.referrer || '(direto)', total: Number(r.total) })),
      utmSources: utms.map((r) => ({ source: r.source, total: Number(r.total) })),
    });
  });

  // Feed de eventos (paginado + filtros)
  fastify.get('/events', { preHandler }, async (req: FastifyRequest, reply: FastifyReply) => {
    const q = req.query as any;
    const since = sinceFrom(q?.range);
    const limit = Math.min(200, Math.max(1, parseInt(q?.limit || '100')));
    const conds = [gte(analyticsEvents.timestamp, since)];
    if (q?.name) conds.push(eq(analyticsEvents.name, String(q.name)));
    if (q?.category) conds.push(eq(analyticsEvents.category, String(q.category)));
    if (q?.anonId) conds.push(eq(analyticsEvents.anonId, String(q.anonId)));
    if (q?.userId) conds.push(eq(analyticsEvents.userId, String(q.userId)));
    if (q?.path) conds.push(like(analyticsEvents.path, `%${String(q.path)}%`));
    const rows = await db
      .select()
      .from(analyticsEvents)
      .where(and(...conds))
      .orderBy(desc(analyticsEvents.timestamp))
      .limit(limit);
    return reply.send({ events: rows, total: rows.length });
  });

  // Timeline de um visitante/usuário específico
  fastify.get('/visitor/:anonId', { preHandler }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { anonId } = req.params as { anonId: string };
    const rows = await db
      .select()
      .from(analyticsEvents)
      .where(eq(analyticsEvents.anonId, anonId))
      .orderBy(desc(analyticsEvents.timestamp))
      .limit(500);
    return reply.send({ anonId, events: rows, total: rows.length });
  });
}
