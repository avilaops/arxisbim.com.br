import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { observabilityService } from '../../core/observability/service.js';
import { BillingService } from './billing.service.js';
import { billingWebhookSchema, changePlanSchema, createCheckoutSchema, createPortalSchema } from './billing.schemas.js';

export async function billingRoutes(fastify: FastifyInstance) {
  const ensureBillingManager = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user!;
    const allowed = await BillingService.canManageBilling(user.tenantId, user.userId);

    if (!allowed) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Billing management permission required',
      });
    }
  };

  fastify.get('/plans', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send({ plans: BillingService.listPlans() });
  });

  const getCurrentSubscriptionHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user!;

    try {
      const billing = await BillingService.getCurrent(user.tenantId);
      return reply.code(200).send(billing);
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Error loading current billing');
      return reply.code(500).send({
        error: 'Internal server error',
        message: 'Failed to load billing information',
      });
    }
  };

  fastify.get('/current', {
    preHandler: authenticateRequest,
  }, getCurrentSubscriptionHandler);

  fastify.get('/current-subscription', {
    preHandler: authenticateRequest,
  }, getCurrentSubscriptionHandler);

  const getHistoryHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user!;

    try {
      const invoices = await BillingService.listInvoices(user.tenantId);
      return reply.code(200).send({ invoices });
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Error listing invoices');
      return reply.code(500).send({
        error: 'Internal server error',
        message: 'Failed to list invoices',
      });
    }
  };

  fastify.get('/invoices', {
    preHandler: authenticateRequest,
  }, getHistoryHandler);

  fastify.get('/history', {
    preHandler: authenticateRequest,
  }, getHistoryHandler);

  const createCheckoutHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user!;
    const validation = createCheckoutSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.code(400).send({
        error: 'Validation error',
        details: validation.error.issues,
      });
    }

    try {
      const checkout = await BillingService.createCheckoutSession(user.tenantId, user.userId, validation.data);

      await observabilityService.logAudit({
        tenantId: user.tenantId,
        userId: user.userId,
        action: 'billing.checkout.created',
        resource: 'billing.checkout',
        metadata: {
          plan: validation.data.plan,
          billingCycle: validation.data.billingCycle,
          provider: checkout.provider,
        },
      });

      return reply.code(201).send(checkout);
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Error creating checkout session');
      return reply.code(500).send({
        error: 'Internal server error',
        message: 'Failed to create checkout session',
      });
    }
  };

  fastify.post('/checkout', {
    preHandler: authenticateRequest,
  }, createCheckoutHandler);

  fastify.post('/create-checkout', {
    preHandler: authenticateRequest,
  }, createCheckoutHandler);

  fastify.post('/create-portal', {
    preHandler: authenticateRequest,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user!;
    const validation = createPortalSchema.safeParse(request.body ?? {});

    if (!validation.success) {
      return reply.code(400).send({
        error: 'Validation error',
        details: validation.error.issues,
      });
    }

    try {
      const portal = await BillingService.createPortalSession(user.tenantId, user.userId, validation.data);

      await observabilityService.logAudit({
        tenantId: user.tenantId,
        userId: user.userId,
        action: 'billing.portal.created',
        resource: 'billing.portal',
        metadata: {
          provider: portal.provider,
          mode: portal.mode,
        },
      });

      return reply.code(201).send(portal);
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Error creating billing portal session');
      return reply.code(500).send({
        error: 'Internal server error',
        message: 'Failed to create billing portal session',
      });
    }
  });

  fastify.post('/change-plan', {
    preHandler: authenticateRequest,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user!;
    const validation = changePlanSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.code(400).send({
        error: 'Validation error',
        details: validation.error.issues,
      });
    }

    try {
      const canManageBilling = await BillingService.canManageBilling(user.tenantId, user.userId);

      if (!canManageBilling) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Only tenant owners/admins can change billing plans directly',
        });
      }

      const subscription = await BillingService.changePlan(user.tenantId, validation.data);

      await observabilityService.logAudit({
        tenantId: user.tenantId,
        userId: user.userId,
        action: 'billing.subscription.changed',
        resource: 'billing.subscription',
        metadata: {
          plan: validation.data.plan,
          billingCycle: validation.data.billingCycle,
          status: validation.data.status,
        },
      });

      return reply.code(200).send({ subscription });
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Error changing billing plan');
      return reply.code(500).send({
        error: 'Internal server error',
        message: 'Failed to change billing plan',
      });
    }
  });

  const getWebhookStatusHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user!;
    const status = await BillingService.getWebhookOpsStatus(user.tenantId);
    return reply.code(200).send(status);
  };

  const parseLimit = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(1, Math.min(100, parsed)) : 20;
  };

  const getFailedEventsHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user!;
    const limit = parseLimit((request.query as any)?.limit);
    const events = await BillingService.listFailedStripeEvents(user.tenantId, limit);
    return reply.code(200).send({ events });
  };

  const reprocessEventHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user!;
    const eventId = (request.params as any)?.eventId;

    if (!eventId) {
      return reply.code(400).send({
        error: 'Validation error',
        message: 'eventId is required',
      });
    }

    try {
      const result = await BillingService.reprocessStripeEvent(eventId, user.tenantId);
      return reply.code(200).send(result);
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Reprocess failed',
        message: error?.message || 'Unknown error while reprocessing event',
      });
    }
  };

  const retryDueHandler = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user!;
    const limit = parseLimit((request.query as any)?.limit);
    const result = await BillingService.processDueStripeRetries(user.tenantId, limit);
    return reply.code(200).send(result);
  };

  fastify.get('/ops/webhook-status', {
    preHandler: [authenticateRequest, ensureBillingManager],
  }, getWebhookStatusHandler);

  fastify.get('/reconciliation/status', {
    preHandler: [authenticateRequest, ensureBillingManager],
  }, getWebhookStatusHandler);

  fastify.get('/ops/failed-events', {
    preHandler: [authenticateRequest, ensureBillingManager],
  }, getFailedEventsHandler);

  fastify.get('/webhook/failed-events', {
    preHandler: [authenticateRequest, ensureBillingManager],
  }, getFailedEventsHandler);

  fastify.post('/ops/reprocess/:eventId', {
    preHandler: [authenticateRequest, ensureBillingManager],
  }, reprocessEventHandler);

  fastify.post('/webhook/reprocess/:eventId', {
    preHandler: [authenticateRequest, ensureBillingManager],
  }, reprocessEventHandler);

  fastify.post('/ops/retry-due', {
    preHandler: [authenticateRequest, ensureBillingManager],
  }, retryDueHandler);

  fastify.post('/webhook/retry-due', {
    preHandler: [authenticateRequest, ensureBillingManager],
  }, retryDueHandler);

  fastify.post('/webhook', {
    config: {
      rawBody: true,
    },
  } as any, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stripeSignature = request.headers['stripe-signature'];

      if (stripeSignature && typeof stripeSignature === 'string') {
        const rawBody = (request as any).rawBody as string | undefined;
        if (!rawBody) {
          return reply.code(400).send({
            error: 'Webhook error',
            message: 'Raw body is required for Stripe signature verification',
          });
        }

        const result = await BillingService.handleStripeWebhook(rawBody, stripeSignature);
        return reply.code(200).send(result);
      }

      const validation = billingWebhookSchema.safeParse(request.body);

      if (!validation.success) {
        return reply.code(400).send({
          error: 'Validation error',
          details: validation.error.issues,
        });
      }

      const result = await BillingService.handleWebhook(validation.data);
      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error({ err: error }, 'Error processing billing webhook');
      return reply.code(400).send({
        error: 'Webhook error',
        message: error.message,
      });
    }
  });
}
