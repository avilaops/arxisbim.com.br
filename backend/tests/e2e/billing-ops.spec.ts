import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';

const mockUser = {
  tenantId: 'tenant-test-ops',
  userId: 'user-test-ops',
};

const canManageBilling = vi.fn();
const getWebhookOpsStatus = vi.fn();
const listFailedStripeEvents = vi.fn();
const reprocessStripeEvent = vi.fn();
const processDueStripeRetries = vi.fn();

vi.mock('../../src/core/auth/middleware.js', () => ({
  authenticateRequest: async (request: any) => {
    request.user = mockUser;
  },
}));

vi.mock('../../src/core/observability/service.js', () => ({
  observabilityService: {
    logAudit: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../src/modules/billing/billing.service.js', () => ({
  BillingService: {
    listPlans: vi.fn(() => []),
    canManageBilling,
    getWebhookOpsStatus,
    listFailedStripeEvents,
    reprocessStripeEvent,
    processDueStripeRetries,
  },
}));

describe('Billing Ops endpoints', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    const { billingRoutes } = await import('../../src/modules/billing/billing.routes.js');

    server = Fastify();
    await server.register(billingRoutes, { prefix: '/api/v1/billing' });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    canManageBilling.mockResolvedValue(true);
  });

  afterAll(async () => {
    await server.close();
  });

  it('GET /api/v1/billing/reconciliation/status should return webhook summary', async () => {
    getWebhookOpsStatus.mockResolvedValue({
      total: 10,
      processed: 8,
      failed: 1,
      received: 1,
      maxRetryAttempts: 8,
      retryBaseMinutes: 5,
    });

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/billing/reconciliation/status',
    });

    expect(response.statusCode).toBe(200);
    expect(canManageBilling).toHaveBeenCalledWith(mockUser.tenantId, mockUser.userId);
    expect(getWebhookOpsStatus).toHaveBeenCalledWith(mockUser.tenantId);

    const body = response.json();
    expect(body.total).toBe(10);
    expect(body.failed).toBe(1);
  });

  it('GET /api/v1/billing/webhook/failed-events should clamp limit and return events', async () => {
    listFailedStripeEvents.mockResolvedValue([
      { eventId: 'evt_1', retryCount: 2, status: 'failed' },
    ]);

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/billing/webhook/failed-events?limit=999',
    });

    expect(response.statusCode).toBe(200);
    expect(listFailedStripeEvents).toHaveBeenCalledWith(mockUser.tenantId, 100);

    const body = response.json();
    expect(Array.isArray(body.events)).toBe(true);
    expect(body.events[0].eventId).toBe('evt_1');
  });

  it('POST /api/v1/billing/webhook/reprocess/:eventId should reprocess one event', async () => {
    reprocessStripeEvent.mockResolvedValue({ reprocessed: true, eventId: 'evt_42' });

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/billing/webhook/reprocess/evt_42',
    });

    expect(response.statusCode).toBe(200);
    expect(reprocessStripeEvent).toHaveBeenCalledWith('evt_42', mockUser.tenantId);

    const body = response.json();
    expect(body.reprocessed).toBe(true);
    expect(body.eventId).toBe('evt_42');
  });

  it('POST /api/v1/billing/webhook/retry-due should process batch with normalized limit', async () => {
    processDueStripeRetries.mockResolvedValue({
      processed: 2,
      succeeded: 2,
      failed: 0,
      results: [
        { eventId: 'evt_a', success: true },
        { eventId: 'evt_b', success: true },
      ],
    });

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/billing/webhook/retry-due?limit=0',
    });

    expect(response.statusCode).toBe(200);
    expect(processDueStripeRetries).toHaveBeenCalledWith(mockUser.tenantId, 1);

    const body = response.json();
    expect(body.processed).toBe(2);
    expect(body.failed).toBe(0);
  });

  it('should return 403 when user has no billing management permission', async () => {
    canManageBilling.mockResolvedValue(false);

    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/billing/reconciliation/status',
    });

    expect(response.statusCode).toBe(403);
    expect(getWebhookOpsStatus).not.toHaveBeenCalled();
  });
});
