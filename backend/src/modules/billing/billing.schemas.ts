import { z } from 'zod';

export const billingPlanSchema = z.enum(['free', 'starter', 'professional', 'enterprise']);
export const billingCycleSchema = z.enum(['monthly', 'yearly']).default('monthly');

export const createCheckoutSchema = z.object({
  plan: billingPlanSchema,
  billingCycle: billingCycleSchema,
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const createPortalSchema = z.object({
  returnUrl: z.string().url().optional(),
});

export const changePlanSchema = z.object({
  plan: billingPlanSchema,
  billingCycle: billingCycleSchema,
  status: z.enum(['trialing', 'active', 'past_due', 'grace_period', 'suspended', 'canceled', 'incomplete', 'unpaid']).default('active'),
  provider: z.string().min(1).max(50).default('internal'),
  providerSubscriptionId: z.string().max(255).optional(),
  providerCustomerId: z.string().max(255).optional(),
  providerPriceId: z.string().max(255).optional(),
  seatCount: z.number().int().min(1).optional(),
  maxSeats: z.number().int().min(1).optional(),
  currentPeriodEnd: z.string().datetime().optional(),
});

export const billingWebhookSchema = z.object({
  event: z.string().min(1),
  eventId: z.string().min(1).max(255).optional(),
  provider: z.string().min(1).default('internal'),
  sessionId: z.string().uuid().optional(),
  providerSessionId: z.string().optional(),
  tenantId: z.string().optional(),
  plan: billingPlanSchema.optional(),
  billingCycle: billingCycleSchema.optional(),
  status: z.enum(['trialing', 'active', 'past_due', 'grace_period', 'suspended', 'canceled', 'incomplete', 'unpaid']).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type CreatePortalInput = z.infer<typeof createPortalSchema>;
export type ChangePlanInput = z.infer<typeof changePlanSchema>;
export type BillingWebhookInput = z.infer<typeof billingWebhookSchema>;
