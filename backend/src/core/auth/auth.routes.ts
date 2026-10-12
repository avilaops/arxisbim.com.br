import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { randomBytes as cryptoRandomBytes } from 'crypto';
import { AuthService, getLoginFailCount, recordIpFailure, isIpBlocked } from './auth.service.js';
import { verifyTurnstileToken } from './turnstile.js';
import { oauthService } from './oauth.service.js';
import { authRateLimits } from './rate-limiter.js';
import {
  CAMINHO_DO_FLUXO,
  COOKIE_DO_FLUXO,
  assinarState,
  buscarPerfil,
  cookieDoFluxo,
  cookieDoFluxoVencido,
  desafioDe,
  enderecoDeAutorizacao,
  lerConfiguracao,
  lerCookie,
  novoVerificador,
  somenteLoginCentral,
  stateConfere,
} from './avilaops-oidc.js';

// Safe error message — never expose DB queries or stack traces to clients.
// Auth-domain errors (with a .code) keep their message; everything else → generic.
function safeAuthError(error: unknown): string {
  if (error instanceof Error) {
    const e = error as any;
    if (e.code && typeof e.code === 'string') return e.message;
    if (/email já cadastrado|email already registered|already exists/i.test(e.message ?? '')) {
      return 'Não foi possível concluir o cadastro';
    }
    if (e.message?.startsWith('Failed query:')) return 'Internal server error';
    if (e.message && e.message.length < 120 && !e.message.includes('SELECT') && !e.message.includes('INSERT')) {
      return e.message;
    }
  }
  return 'Internal server error';
}

const loginRateLimit        = authRateLimits.login;
const registerRateLimit     = authRateLimits.register;
const forgotPasswordLimit   = authRateLimits.forgotPassword;
const resetPasswordLimit    = authRateLimits.resetPassword;
const verifyEmailLimit      = authRateLimits.verifyEmail;
const refreshLimit          = authRateLimits.refresh;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantId: z.string().optional(),
  turnstileToken: z.string().optional(),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  tenantId: z.string().optional(),
  companyId: z.string().optional(),
  turnstileToken: z.string().optional(),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService();
  /**
   * Hook: remover Content-Type de DELETE sem body (evita erro de JSON vazio)
   */
  fastify.addHook('preParsing', async (request) => {
    if (request.method === 'DELETE') {
      const ct = request.headers['content-type'];
      if (ct?.includes('application/json') && !request.headers['content-length']) {
        delete (request.headers as any)['content-type'];
      }
    }
  });

  /**
   * Com AUTH_SSO_ONLY=true a única porta de entrada é o login central
   * (rotas /auth/avilaops, abaixo). As rotas que criam ou usam senha do
   * próprio Arxis respondem 410, para nenhum cliente antigo continuar abrindo
   * sessão por fora. Sem a variável (dev e testes) tudo segue como antes.
   */
  const ROTAS_DE_SENHA = ['/login', '/register', '/forgot-password', '/reset-password'];
  fastify.addHook('preHandler', async (request, reply) => {
    if (request.method !== 'POST' || !somenteLoginCentral()) return;
    const caminho = request.url.split('?')[0];
    if (ROTAS_DE_SENHA.some((rota) => caminho.endsWith(`/auth${rota}`))) {
      return reply.status(410).send({
        error: 'O acesso ao Arxis é feito pelo login da Ávila Ops.',
        loginUrl: `${process.env.BACKEND_URL || 'http://localhost:3001'}${CAMINHO_DO_FLUXO}`,
      });
    }
  });

  /**
   * POST /auth/login
   * Login com email e senha
   */
  fastify.post('/login', {
    preHandler: [async (request: FastifyRequest, reply: FastifyReply) => {
      const ip = (request.headers['cf-connecting-ip'] as string | undefined) ?? request.ip;
      // IP block takes priority over rate limit — must be checked first.
      if (isIpBlocked(ip)) {
        return reply.status(429).send({ error: 'IP_BLOCKED', message: 'Too many failed attempts from this IP' });
      }
      // Per-endpoint rate limit; also records an IP failure so volume attacks
      // accumulate toward the IP block threshold.
      const rlResult = await loginRateLimit(request, reply);
      if (reply.sent) {
        recordIpFailure(ip);
      }
      return rlResult;
    }],
    schema: {
      description: 'Login com email e senha',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          tenantId: { type: 'string', minLength: 1 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                tenantId: { type: 'string' },
                companyId: { type: 'string' },
                role: { type: 'string' },
                permissions: { type: 'array', items: { type: 'string' } },
              },
            },
            token: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = loginSchema.parse(request.body);
        const ip = request.headers['cf-connecting-ip'] as string | undefined ?? request.ip;
        // M2 layer 3: block IP with > 20 failures in 15 min
        if (isIpBlocked(ip)) {
          return reply.status(429).send({ error: 'IP_BLOCKED', message: 'Too many failed attempts from this IP' });
        }
        // M2 layer 2: require Turnstile when email is above failure threshold
        const captchaRequired = getLoginFailCount(body.email) >= 5;
        await verifyTurnstileToken(body.turnstileToken ?? '', ip, captchaRequired);
        const ua = request.headers['user-agent'];
        const result = await authService.login({ ...body, ip, userAgent: ua });
        return reply.send(result);
      } catch (error: any) {
        // Log full cause so Render logs show the real DB/auth error
        fastify.log.error({ err: error, cause: error?.cause?.message ?? null }, 'login error');
        const ip = request.headers['cf-connecting-ip'] as string | undefined ?? request.ip;
        recordIpFailure(ip);
        if (error?.code === 'EMAIL_NOT_VERIFIED') {
          return reply.status(403).send({ error: 'EMAIL_NOT_VERIFIED', message: error.message });
        }
        return reply.status(401).send({ error: safeAuthError(error) });
      }
    },
  });

  /**
   * POST /auth/register
   * Registrar novo usuário
   */
  fastify.post('/register', {
    preHandler: [registerRateLimit],
    schema: {
      description: 'Registrar novo usuário',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string', minLength: 2 },
          turnstileToken: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                tenantId: { type: 'string' },
                companyId: { type: 'string' },
                role: { type: 'string' },
                permissions: { type: 'array', items: { type: 'string' } },
              },
            },
            token: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        console.log('🔍 Register request.body:', JSON.stringify(request.body, null, 2));
        const body = registerSchema.parse(request.body);
        const ip = request.headers['cf-connecting-ip'] as string | undefined ?? request.ip;
        await verifyTurnstileToken(body.turnstileToken ?? '', ip);
        const result = await authService.register(body);
        // requiresEmailVerification on an existing (unverified) account = duplicate registration
        // Return 409 to fail the request without revealing "email already registered"
        if ((result as any).existingUnverified) {
          return reply.status(409).send({ requiresEmailVerification: true, message: (result as any).message });
        }
        return reply.status(201).send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(400).send({ error: safeAuthError(error) });
      }
    },
  });

  /**
   * POST /auth/refresh
   * Refresh access token
   */
  fastify.post('/refresh', {
    preHandler: [refreshLimit],
    schema: {
      description: 'Refresh access token',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = refreshTokenSchema.parse(request.body);
        const ip = request.headers['cf-connecting-ip'] as string | undefined ?? request.ip;
        const ua = request.headers['user-agent'];
        const result = await authService.refreshToken(body.refreshToken, ip, ua);
        return reply.send(result);
      } catch (error: any) {
        fastify.log.error(error);
        if (error?.message === 'TOKEN_REUSE_DETECTED') {
          return reply.status(401).send({ error: 'TOKEN_REUSE_DETECTED', message: 'Reuso de token detectado. Todas as sessões foram encerradas por segurança.' });
        }
        if (error?.message === 'TOKEN_REVOKED') {
          return reply.status(401).send({ error: 'TOKEN_REVOKED', message: 'Sessão encerrada. Faça login novamente.' });
        }
        if (error?.message === 'TOKEN_EXPIRED') {
          return reply.status(401).send({ error: 'TOKEN_EXPIRED', message: 'Sessão expirada. Faça login novamente.' });
        }
        return reply.status(401).send({ error: 'Invalid refresh token' });
      }
    },
  });

  /**
   * POST /auth/logout
   * Logout — revoga refresh token da sessão atual
   */
  fastify.post('/logout', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Logout — revoga sessão atual',
      tags: ['auth'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } },
      },
      response: {
        200: { type: 'object', properties: { message: { type: 'string' } } },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { refreshToken } = request.body as any;
        await authService.logout(refreshToken);
        return reply.send({ message: 'Logout realizado com sucesso.' });
      } catch {
        return reply.send({ message: 'Logout realizado.' });
      }
    },
  });

  /**
   * GET /auth/sessions
   * Listar sessões ativas do usuário autenticado
   */
  fastify.get('/sessions', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Listar sessões ativas',
      tags: ['auth'],
      security: [{ bearerAuth: [] }],
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId } = (request as any).user;
        const sessions = await authService.getSessions(userId);
        return reply.send(sessions);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: 'Falha ao buscar sessões' });
      }
    },
  });

  /**
   * DELETE /auth/sessions/:id
   * Revogar sessão específica
   */
  fastify.delete('/sessions/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Revogar sessão específica',
      tags: ['auth'],
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId } = (request as any).user;
        const { id } = request.params as any;
        await authService.revokeSession(id, userId);
        return reply.send({ message: 'Sessão encerrada.' });
      } catch (error: any) {
        return reply.status(403).send({ error: safeAuthError(error) });
      }
    },
  });

  /**
   * DELETE /auth/sessions
   * Revogar todas as outras sessões
   */
  fastify.delete('/sessions', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Revogar todas as outras sessões',
      tags: ['auth'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId } = (request as any).user;
        const { refreshToken } = request.body as any;
        const revoked = await authService.revokeAllOtherSessions(userId, refreshToken);
        return reply.send({ message: `${revoked} sessão(ões) encerrada(s).`, revoked });
      } catch (error: any) {
        return reply.status(500).send({ error: 'Falha ao encerrar sessões' });
      }
    },
  });

  /**
   * POST /auth/verify-email
   * Verificar email com token
   */
  // GET /auth/verify-email?token=... — link-based verification from email
  fastify.get('/verify-email', {
    preHandler: [verifyEmailLimit],
    schema: {
      description: 'Verificar email via link (GET com query param)',
      tags: ['auth'],
      querystring: {
        type: 'object',
        required: ['token'],
        properties: { token: { type: 'string' } },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { token } = request.query as { token: string };
      if (!token) return reply.status(400).send({ error: 'Token ausente' });
      try {
        const result = await authService.verifyEmail(token);
        if (!result.success) {
          return reply.status(400).send({ error: 'Token inválido ou expirado' });
        }
        return reply.send({ success: true, userId: result.userId, message: 'Email verificado com sucesso!' });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(400).send({ error: safeAuthError(error) });
      }
    },
  });

  fastify.post('/verify-email', {
    preHandler: [verifyEmailLimit],
    schema: {
      description: 'Verificar email com token',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['verificationToken'],
        properties: {
          verificationToken: { type: 'string' },
          tenantId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            userId: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { verificationToken } = request.body as any;
        const result = await authService.verifyEmail(verificationToken);
        if (!result.success) {
          return reply.status(400).send({ error: 'Token inválido ou expirado', message: 'Token inválido ou expirado' });
        }
        return reply.send({ success: true, userId: result.userId, message: 'Email verificado com sucesso! Você já pode fazer login.' });
      } catch (error: any) {
        fastify.log.error(error);
        return reply.status(400).send({ error: safeAuthError(error) });
      }
    },
  });

  /**
   * POST /auth/forgot-password
   * Solicitar reset de senha
   */
  fastify.post('/forgot-password', {
    preHandler: [forgotPasswordLimit],
    schema: {
      description: 'Solicitar email de redefinição de senha',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string', format: 'email' } },
      },
      response: {
        200: { type: 'object', properties: { message: { type: 'string' } } },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { email } = request.body as any;
        await authService.forgotPassword(email);
        // Sempre retorna 200 por segurança
        return reply.send({ message: 'Se o email existir, você receberá um link de redefinição.' });
      } catch (error: any) {
        return reply.send({ message: 'Se o email existir, você receberá um link de redefinição.' });
      }
    },
  });

  /**
   * POST /auth/reset-password
   * Redefinir senha com token
   */
  fastify.post('/reset-password', {
    preHandler: [resetPasswordLimit],
    schema: {
      description: 'Redefinir senha com token',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['token', 'newPassword'],
        properties: {
          token: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 },
        },
      },
      response: {
        200: { type: 'object', properties: { message: { type: 'string' } } },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { token, newPassword } = request.body as any;
        await authService.resetPassword(token, newPassword);
        return reply.send({ message: 'Senha redefinida com sucesso. Faça login com a nova senha.' });
      } catch (error: any) {
        return reply.status(400).send({ error: safeAuthError(error) });
      }
    },
  });

  /**
   * GET /auth/me
   * Obter usuário atual
   */
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
    schema: {
      description: 'Obter usuário atual',
      tags: ['auth'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            tenantId: { type: 'string' },
            companyId: { type: 'string' },
            role: { type: 'string' },
            permissions: { type: 'array', items: { type: 'string' } },
            emailVerified: { type: 'boolean' },
            isActive: { type: 'boolean' },
          },
        },
      },
    },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId } = (request as any).user;
        const user = await authService.getUserById(userId);
        return reply.send(user);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(404).send({ error: 'User not found' });
      }
    },
  });

  // =====================================
  // B4 — OAuth Social Login
  // =====================================

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  function oauthRedirect(reply: FastifyReply, tokens: { token: string; refreshToken: string } | null, error?: string) {
    if (error) {
      return reply.redirect(`${frontendUrl}/login?oauth_error=${encodeURIComponent(error)}`);
    }
    // Pass tokens via URL fragment — frontend reads from a rota /oauth-callback
    return reply.redirect(
      `${frontendUrl}/oauth-callback#token=${tokens!.token}&refreshToken=${tokens!.refreshToken}`,
    );
  }

  /**
   * GET /auth/avilaops
   * Leva a pessoa ao login central da Ávila Ops (ida do fluxo OIDC com PKCE).
   */
  fastify.get('/avilaops', {
    schema: { description: 'Redirect to Avila Ops login (OIDC)', tags: ['auth'] },
    handler: async (_request: FastifyRequest, reply: FastifyReply) => {
      const config = lerConfiguracao();
      const segredo = process.env.JWT_SECRET;
      if (!config || !segredo) return reply.status(501).send({ error: 'Login central não configurado' });

      const verificador = novoVerificador();
      const seguro = config.redirectUri.startsWith('https://');
      reply.header('Set-Cookie', cookieDoFluxo(verificador, seguro));
      // A resposta carrega o cookie do fluxo: não pode ser guardada por proxy.
      reply.header('Cache-Control', 'no-store');
      return reply.redirect(enderecoDeAutorizacao(config, assinarState(verificador, segredo), desafioDe(verificador)));
    },
  });

  /**
   * GET /auth/avilaops/callback
   * Volta do login central: confere o state contra o cookie deste navegador,
   * troca o código e abre a sessão do Arxis.
   */
  fastify.get('/avilaops/callback', {
    schema: { description: 'Avila Ops login callback (OIDC)', tags: ['auth'] },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const config = lerConfiguracao();
      const segredo = process.env.JWT_SECRET;
      if (!config || !segredo) return oauthRedirect(reply, null, 'Login central não configurado');

      const seguro = config.redirectUri.startsWith('https://');
      reply.header('Set-Cookie', cookieDoFluxoVencido(seguro));
      reply.header('Cache-Control', 'no-store');
      try {
        const { code, state, error } = request.query as Record<string, string>;
        if (error || !code) return oauthRedirect(reply, null, error || 'No code received');

        const verificador = lerCookie(request.headers.cookie, COOKIE_DO_FLUXO);
        if (!verificador || !stateConfere(state, verificador, segredo)) {
          return oauthRedirect(reply, null, 'Não foi possível confirmar o login. Tente de novo.');
        }

        const profile = await buscarPerfil(config, code, verificador);
        const ip = request.headers['cf-connecting-ip'] as string | undefined ?? request.ip;
        const result = await oauthService.loginOrCreate(profile, ip, request.headers['user-agent']);
        return oauthRedirect(reply, result);
      } catch (err: any) {
        fastify.log.error(err);
        return oauthRedirect(reply, null, safeAuthError(err));
      }
    },
  });

  /**
   * GET /auth/google
   * Redirect user to Google OAuth consent screen.
   */
  fastify.get('/google', {
    schema: { description: 'Redirect to Google OAuth', tags: ['auth'] },
    handler: async (_request: FastifyRequest, reply: FastifyReply) => {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) return reply.status(501).send({ error: 'Google OAuth not configured' });

      const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/v1/auth/google/callback`;
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'select_account',
      });
      return reply.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
    },
  });

  /**
   * GET /auth/google/callback
   * Google OAuth callback — exchange code for tokens.
   */
  fastify.get('/google/callback', {
    schema: { description: 'Google OAuth callback', tags: ['auth'] },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { code, error } = request.query as Record<string, string>;
        if (error || !code) return oauthRedirect(reply, null, error || 'No code received');

        const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/v1/auth/google/callback`;
        const profile = await oauthService.fetchGoogleProfile(code, redirectUri);
        const ip = request.headers['cf-connecting-ip'] as string | undefined ?? request.ip;
        const result = await oauthService.loginOrCreate(profile, ip, request.headers['user-agent']);
        return oauthRedirect(reply, result);
      } catch (err: any) {
        fastify.log.error(err);
        return oauthRedirect(reply, null, safeAuthError(err));
      }
    },
  });

  /**
   * GET /auth/github
   * Redirect user to GitHub OAuth consent screen.
   */
  fastify.get('/github', {
    schema: { description: 'Redirect to GitHub OAuth', tags: ['auth'] },
    handler: async (_request: FastifyRequest, reply: FastifyReply) => {
      const clientId = process.env.GITHUB_CLIENT_ID;
      if (!clientId) return reply.status(501).send({ error: 'GitHub OAuth not configured' });

      const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/v1/auth/github/callback`;
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'read:user user:email',
        state: cryptoRandomBytes(16).toString('hex'),
      });
      return reply.redirect(`https://github.com/login/oauth/authorize?${params}`);
    },
  });

  /**
   * GET /auth/github/callback
   * GitHub OAuth callback — exchange code for tokens.
   */
  fastify.get('/github/callback', {
    schema: { description: 'GitHub OAuth callback', tags: ['auth'] },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { code, error } = request.query as Record<string, string>;
        if (error || !code) return oauthRedirect(reply, null, error || 'No code received');

        const ip = request.headers['cf-connecting-ip'] as string | undefined ?? request.ip;
        const profile = await oauthService.fetchGitHubProfile(code);
        const result = await oauthService.loginOrCreate(profile, ip, request.headers['user-agent']);
        return oauthRedirect(reply, result);
      } catch (err: any) {
        fastify.log.error(err);
        return oauthRedirect(reply, null, safeAuthError(err));
      }
    },
  });
}

