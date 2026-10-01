import { FastifyInstance } from 'fastify';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { metaService, type MetaError } from './meta.service.js';
import { conversionsService, type CapiEvent } from './conversions.service.js';
import { FRONTEND_URL } from '../../core/config/domains.js';

/**
 * Rotas Meta (Facebook) — Graph API + Marketing API (Ads).
 * Montadas sob /api/v1/meta. Todas exigem autenticação ArxisVR.
 * O token Graph usado é o FACEBOOK_TOKEN do servidor (ou ?token= para testes).
 */
export async function metaRoutes(fastify: FastifyInstance) {
  const auth = { preHandler: authenticateRequest };

  const handle = (fn: () => Promise<any>) => async (_req: any, reply: any) => {
    try {
      return reply.send({ success: true, data: await fn() });
    } catch (err) {
      const e = err as MetaError;
      fastify.log.error(e);
      return reply.status(e.statusCode || 500).send({
        success: false,
        error: e.message || 'Meta API error',
        fbCode: e.fbCode,
        fbType: e.fbType,
      });
    }
  };

  // Status/validade do token configurado (app, escopos, expiração)
  fastify.get('/meta/token', auth, async (request, reply) => {
    const token = (request.query as any)?.token;
    return handle(() => metaService.debugToken(token))(request, reply);
  });

  // Perfil do owner do token
  fastify.get('/meta/me', auth, async (request, reply) => {
    const token = (request.query as any)?.token;
    return handle(() => metaService.getMe(token))(request, reply);
  });

  // Páginas do Facebook
  fastify.get('/meta/pages', auth, async (request, reply) => {
    const token = (request.query as any)?.token;
    return handle(() => metaService.getPages(token))(request, reply);
  });

  // Contas de anúncio (Facebook Ads)
  fastify.get('/meta/ad-accounts', auth, async (request, reply) => {
    const token = (request.query as any)?.token;
    return handle(() => metaService.getAdAccounts(token))(request, reply);
  });

  // Campanhas de uma conta
  fastify.get('/meta/ad-accounts/:adAccountId/campaigns', auth, async (request, reply) => {
    const { adAccountId } = request.params as { adAccountId: string };
    const token = (request.query as any)?.token;
    return handle(() => metaService.getCampaigns(adAccountId, token))(request, reply);
  });

  // Insights de uma conta
  fastify.get('/meta/ad-accounts/:adAccountId/insights', auth, async (request, reply) => {
    const { adAccountId } = request.params as { adAccountId: string };
    const q = request.query as any;
    return handle(() => metaService.getInsights(adAccountId, q?.datePreset || 'last_30d', q?.token))(request, reply);
  });

  // ── Conversions API (CAPI) — eventos server-side ──

  // Envia eventos para o Pixel. Body: { events: CapiEvent[], testEventCode?: string }
  // Enriquece user_data com IP/User-Agent da requisição quando ausentes.
  fastify.post('/meta/conversions', auth, async (request, reply) => {
    const body = (request.body || {}) as { events?: CapiEvent[]; testEventCode?: string };
    const ip = (request.headers['cf-connecting-ip'] as string) || request.ip;
    const ua = request.headers['user-agent'] as string | undefined;
    const events = (body.events || []).map((e) => ({
      ...e,
      userData: { clientIpAddress: ip, clientUserAgent: ua, ...(e.userData || {}) },
    }));
    return handle(() => conversionsService.send(events, body.testEventCode))(request, reply);
  });

  // Atalho de validação: envia 1 PageView de teste (usa FACEBOOK_TEST_EVENT_CODE
  // ou o testEventCode do body) para aparecer na aba Test Events.
  fastify.post('/meta/conversions/test', auth, async (request, reply) => {
    const body = (request.body || {}) as { testEventCode?: string; eventName?: string };
    const ip = (request.headers['cf-connecting-ip'] as string) || request.ip;
    const ua = request.headers['user-agent'] as string | undefined;
    const event: CapiEvent = {
      eventName: body.eventName || 'PageView',
      actionSource: 'website',
      eventSourceUrl: (request.headers['referer'] as string) || `${FRONTEND_URL}/`,
      userData: { clientIpAddress: ip, clientUserAgent: ua },
    };
    return handle(() => conversionsService.send([event], body.testEventCode))(request, reply);
  });
}
