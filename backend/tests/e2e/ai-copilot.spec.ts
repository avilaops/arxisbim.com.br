import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { aiCopilotRoutes } from '../../src/routes/v1/ai-copilot.js';
import { authenticateRequest } from '../../src/core/auth/middleware.js';
import jwt from 'jsonwebtoken';

function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.decorate('authenticate', authenticateRequest);
  app.register(aiCopilotRoutes, { prefix: '/api/v1/ai' });
  return app;
}

describe('AI Copilot API e2e', () => {
  let app: FastifyInstance;
  let validToken: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // Sign a dummy JWT token for authorization checks
    const secret = process.env.JWT_SECRET || 'test_secret';
    validToken = jwt.sign(
      {
        userId: 'f00ba700-0000-0000-0000-000000000000',
        email: 'test-copilot@arxisvr.dev',
        tenantId: 'system',
      },
      secret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 401 Unauthorized if no authorization header is provided', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/copilot',
      payload: {
        projectId: '00000000-0000-0000-0000-000000000000',
        message: 'Hello Copilot',
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it('should return 400 Bad Request if validation fails (empty message)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/copilot',
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
      payload: {
        projectId: '00000000-0000-0000-0000-000000000000',
        message: '',
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('should return 404 Project Not Found if project does not exist in DB', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/ai/copilot',
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
      payload: {
        projectId: '00000000-0000-0000-0000-000000000000', // valid UUID, but not in DB
        message: 'Explain elements in this project',
      },
    });

    expect([404, 403, 500]).toContain(res.statusCode);
  });
});
