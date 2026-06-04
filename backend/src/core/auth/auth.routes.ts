import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { AuthService } from './auth.service.js';
import { verifyTurnstileToken } from './turnstile.js';

// Middleware de rate limit por rota — cria um preHandler que conta por IP
function createRateLimit(max: number, windowMs: number) {
  const store = new Map<string, { count: number; resetAt: number }>();

  return async function rateLimitMiddleware(request: FastifyRequest, reply: FastifyReply) {
    const ip = (request.headers['cf-connecting-ip'] as string) ?? request.ip ?? 'unknown';
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      return;
    }

    entry.count++;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      reply.header('Retry-After', retryAfter);
      return reply.status(429).send({
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${retryAfter}s.`,
      });
    }
  };
}

// Limites específicos para cada rota de autenticação
const loginRateLimit        = createRateLimit(10, 60_000);
const registerRateLimit     = createRateLimit(5,  60_000);
const forgotPasswordLimit   = createRateLimit(5,  60_000);
const resetPasswordLimit    = createRateLimit(10, 60_000);
const verifyEmailLimit      = createRateLimit(10, 60_000);
const refreshLimit          = createRateLimit(20, 60_000);

const authService = new AuthService();

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
  /**
   * POST /auth/login
   * Login com email e senha
   */
  fastify.post('/login', {
    preHandler: [loginRateLimit],
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
        await verifyTurnstileToken(body.turnstileToken ?? '', ip);
        const result = await authService.login(body);
        return reply.send(result);
      } catch (error: any) {
        fastify.log.error(error);
        if (error?.code === 'EMAIL_NOT_VERIFIED') {
          return reply.status(403).send({ error: 'EMAIL_NOT_VERIFIED', message: error.message });
        }
        return reply.status(401).send({ error: error instanceof Error ? error.message : 'Login failed' });
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
        return reply.status(201).send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(400).send({ error: error instanceof Error ? error.message : 'Registration failed' });
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
        const result = await authService.refreshToken(body.refreshToken);
        return reply.send(result);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(401).send({ error: 'Invalid refresh token' });
      }
    },
  });

  /**
   * POST /auth/verify-email
   * Verificar email com token
   */
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
        return reply.status(400).send({ error: error.message || 'Verificação falhou' });
      }
    },
  });

  /**
   * POST /auth/change-password
   * Alterar senha (autenticado)
   */
  fastify.post('/change-password', {
    schema: {
      description: 'Alterar senha do usuário autenticado',
      tags: ['auth'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', minLength: 8 },
          newPassword: { type: 'string', minLength: 8 },
        },
      },
      response: {
        200: { type: 'object', properties: { message: { type: 'string' } } },
      },
    },
    preHandler: [fastify.authenticate],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId } = (request as any).user;
        const { currentPassword, newPassword } = request.body as any;
        await authService.changePassword(userId, currentPassword, newPassword);
        return reply.send({ message: 'Senha alterada com sucesso' });
      } catch (error: any) {
        return reply.status(400).send({ error: error.message || 'Falha ao alterar senha' });
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
        return reply.status(400).send({ error: error.message || 'Falha ao redefinir senha' });
      }
    },
  });

  /**
   * GET /auth/me
   * Obter usuário atual
   */
  fastify.get('/me', {
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
}
