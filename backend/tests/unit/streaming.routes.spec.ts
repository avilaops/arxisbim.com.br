import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import { createStreamingRoutes } from '../../src/modules/streaming/streaming.routes.js';
import { streamingOrchestrator } from '../../src/modules/streaming/streaming-orchestrator.service.js';

describe('Streaming Routes', () => {
  let server: any;

  beforeEach(async () => {
    server = Fastify();
    
    // Mock fastify.authenticate decorator
    server.decorate('authenticate', async (request: any, reply: any) => {
      request.user = { userId: 'mock-user-123' };
    });

    // Register the routes under test
    await server.register(createStreamingRoutes());
  });

  afterEach(async () => {
    await server.close();
    vi.restoreAllMocks();
  });

  it('POST /streaming/session - should allocate a session and return 201', async () => {
    const mockSession = {
      id: 'stream-mock-123',
      userId: 'mock-user-123',
      projectId: '4c3d2e1a-5b6c-7d8e-9f0a-1b2c3d4e5f6a',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const allocateSpy = vi.spyOn(streamingOrchestrator, 'allocateInstance').mockResolvedValue(mockSession as any);

    const response = await server.inject({
      method: 'POST',
      url: '/streaming/session',
      body: {
        projectId: '4c3d2e1a-5b6c-7d8e-9f0a-1b2c3d4e5f6a',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body.id).toBe(mockSession.id);
    expect(body.status).toBe(mockSession.status);
    expect(allocateSpy).toHaveBeenCalledWith('mock-user-123', '4c3d2e1a-5b6c-7d8e-9f0a-1b2c3d4e5f6a');
  });

  it('GET /streaming/session/:sessionId - should return 200 with session details', async () => {
    const mockSession = {
      id: 'stream-mock-123',
      userId: 'mock-user-123',
      projectId: '4c3d2e1a-5b6c-7d8e-9f0a-1b2c3d4e5f6a',
      status: 'running',
      signalingUrl: 'ws://10.244.1.45:8889/ws',
    };

    const getSpy = vi.spyOn(streamingOrchestrator, 'getSession').mockResolvedValue(mockSession as any);

    const response = await server.inject({
      method: 'GET',
      url: '/streaming/session/stream-mock-123',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.status).toBe('running');
    expect(body.signalingUrl).toBe('ws://10.244.1.45:8889/ws');
    expect(getSpy).toHaveBeenCalledWith('stream-mock-123');
  });

  it('GET /streaming/session/:sessionId - should return 404 if session not found', async () => {
    vi.spyOn(streamingOrchestrator, 'getSession').mockResolvedValue(null);

    const response = await server.inject({
      method: 'GET',
      url: '/streaming/session/unknown-session',
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.payload)).toEqual({ error: 'Session not found' });
  });

  it('DELETE /streaming/session/:sessionId - should terminate session and return 204', async () => {
    const terminateSpy = vi.spyOn(streamingOrchestrator, 'terminateSession').mockResolvedValue(true);

    const response = await server.inject({
      method: 'DELETE',
      url: '/streaming/session/stream-mock-123',
    });

    expect(response.statusCode).toBe(204);
    expect(terminateSpy).toHaveBeenCalledWith('stream-mock-123');
  });

  it('DELETE /streaming/session/:sessionId - should return 404 if terminate fails', async () => {
    vi.spyOn(streamingOrchestrator, 'terminateSession').mockResolvedValue(false);

    const response = await server.inject({
      method: 'DELETE',
      url: '/streaming/session/unknown-session',
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.payload)).toEqual({ error: 'Session not found or failed to delete' });
  });
});
