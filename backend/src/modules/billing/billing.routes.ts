import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { authenticateRequest } from '../../core/auth/middleware.js';
import { observabilityService } from '../../core/observability/service.js';
import { BillingService } from './billing.service.js';
import { billingWebhookSchema, changePlanSchema, createCheckoutSchema } from './billing.schemas.js';

export async function billingRoutes(fastify: FastifyInstance) {
  fastify.get('/plans', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send({ plans: BillingService.listPlans() });
  });

  fastify.get('/current', {
    preHandler: authenticateRequest,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
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
  });

  fastify.get('/invoices', {
    preHandler: authenticateRequest,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
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
  });

  fastify.post('/checkout', {
    preHandler: authenticateRequest,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
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

  fastify.post('/webhook', async (request: FastifyRequest, reply: FastifyReply) => {
    const validation = billingWebhookSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.code(400).send({
        error: 'Validation error',
        details: validation.error.issues,
      });
    }

    try {
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
