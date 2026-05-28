import { z } from 'zod';

export const billingPlanSchema = z.enum(['free', 'starter', 'professional', 'enterprise']);
export const billingCycleSchema = z.enum(['monthly', 'yearly']).default('monthly');

export const createCheckoutSchema = z.object({
  plan: billingPlanSchema,
  billingCycle: billingCycleSchema,
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const changePlanSchema = z.object({
  plan: billingPlanSchema,
  billingCycle: billingCycleSchema,
  status: z.enum(['trialing', 'active', 'past_due', 'canceled', 'incomplete']).default('active'),
  provider: z.string().min(1).max(50).default('internal'),
  providerSubscriptionId: z.string().max(255).optional(),
  providerCustomerId: z.string().max(255).optional(),
  currentPeriodEnd: z.string().datetime().optional(),
});

export const billingWebhookSchema = z.object({
  event: z.string().min(1),
  provider: z.string().min(1).default('internal'),
  sessionId: z.string().uuid().optional(),
  providerSessionId: z.string().optional(),
  tenantId: z.string().optional(),
  plan: billingPlanSchema.optional(),
  billingCycle: billingCycleSchema.optional(),
  status: z.enum(['trialing', 'active', 'past_due', 'canceled', 'incomplete']).optional(),
  metadata: z.record(z.any()).optional(),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type ChangePlanInput = z.infer<typeof changePlanSchema>;
export type BillingWebhookInput = z.infer<typeof billingWebhookSchema>;
