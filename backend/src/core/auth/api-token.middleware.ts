import type { FastifyRequest, FastifyReply } from 'fastify';
import { getApiTokensService } from '../modules/api-tokens/api-tokens.service.js';
import { isValidApiTokenFormat, hashApiToken } from '../modules/api-tokens/utils/generateApiToken.js';

/**
 * Middleware: autentica requisições usando API Token
 * Bearer: arx_live_abc... ou arx_test_xyz...
 * 
 * NÃO expõe tokens em logs/erros, apenas token IDs e prefixos
 */
export async function authenticateApiToken(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Missing or invalid API token',
    });
  }

  const plainToken = authHeader.substring(7).trim();

  // Validate token format
  if (!isValidApiTokenFormat(plainToken)) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Invalid API token format',
    });
  }

  try {
    const tokenHash = hashApiToken(plainToken);
    const apiTokensService = getApiTokensService();
    const token = await apiTokensService.findByHash(tokenHash);

    if (!token) {
      await apiTokensService.recordFailedAuth(
        'unknown',
        'Token not found or invalid',
        request.ip,
        request.headers['user-agent'] as string
      );
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or revoked API token',
      });
    }

    // Attach token context to request (sem plaintext token)
    (request as any).apiToken = {
      tokenId: token.id,
      tenantId: token.tenant_id,
      scopes: token.scopes,
      environment: token.environment,
    };

    // Record usage
    await apiTokensService.recordTokenUsage(token.id, token.tenant_id, request.ip);

  } catch (error) {
    console.error('API token auth error:', error);
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to authenticate API token',
    });
  }
}

/**
 * Middleware: require specific API token scopes
 * Usage: requireApiScopes('projects:read', 'models:write')
 * 
 * Registra tentativas de acesso com escopo insuficiente no audit log
 */
export function requireApiScopes(...requiredScopes: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const apiToken = (request as any).apiToken;

    if (!apiToken) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'API token required for this endpoint',
      });
    }

    const hasRequiredScope = requiredScopes.some((scope) =>
      apiToken.scopes.includes(scope)
    );

    if (!hasRequiredScope) {
      // Log scope denial attempt (sem expor token)
      const apiTokensService = getApiTokensService();
      await apiTokensService.recordScopeDenied(
        apiToken.tokenId,
        apiToken.tenantId,
        requiredScopes,
        request.ip
      );

      return reply.status(403).send({
        error: 'Forbidden',
        message: `Required scopes: ${requiredScopes.join(', ')}`,
      });
    }
  };
}

/**
 * Middleware: allow both JWT (user) and API token auth
 * Se houver API token, usa. Caso contrário, fallback para JWT.
 */
export async function authenticateAny(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({
      error: 'Unauthorized',
      message: 'Missing authorization header',
    });
  }

  const token = authHeader.substring(7).trim();

  // Try API token first
  if (isValidApiTokenFormat(token)) {
    return authenticateApiToken(request, reply);
  }

  // Fallback to JWT (user auth)
  const { authenticateRequest } = await import('./middleware.js');
  return authenticateRequest(request, reply);
}
