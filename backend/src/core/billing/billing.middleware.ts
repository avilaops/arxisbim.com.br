/**
 * Billing preHandlers para Fastify.
 *
 * `requireActiveSubscription` é o gate central de status de assinatura para rotas
 * de escrita. Use-o em POST/PUT/PATCH/DELETE que criam ou mutam recursos, depois
 * de `authenticateRequest` (precisa de `request.user.tenantId`).
 *
 * Leitura (GET) nunca deve usar este gate — contas são permanentes e os dados
 * continuam acessíveis mesmo com assinatura inadimplente.
 */
import type { FastifyRequest, FastifyReply } from 'fastify';
import { assertSubscriptionActive, SubscriptionInactiveError } from './plan-limits.js';

export async function requireActiveSubscription(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const tenantId = (request as any).user?.tenantId as string | undefined;
  if (!tenantId) return; // auth middleware já trata ausência de usuário

  try {
    await assertSubscriptionActive(tenantId);
  } catch (err) {
    if (err instanceof SubscriptionInactiveError) {
      return reply.code(err.statusCode).send({ code: err.code, status: err.status });
    }
    throw err;
  }
}
