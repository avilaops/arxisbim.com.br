import { FastifyInstance } from 'fastify';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { metaService, type MetaError } from './meta.service.js';

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
}
