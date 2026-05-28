import { z } from 'zod';
export declare const billingPlanSchema: z.ZodEnum<{
    free: "free";
    enterprise: "enterprise";
    starter: "starter";
    professional: "professional";
}>;
export declare const billingCycleSchema: z.ZodDefault<z.ZodEnum<{
    monthly: "monthly";
    yearly: "yearly";
}>>;
export declare const createCheckoutSchema: z.ZodObject<{
    plan: z.ZodEnum<{
        free: "free";
        enterprise: "enterprise";
        starter: "starter";
        professional: "professional";
    }>;
    billingCycle: z.ZodDefault<z.ZodEnum<{
        monthly: "monthly";
        yearly: "yearly";
    }>>;
    successUrl: z.ZodOptional<z.ZodString>;
    cancelUrl: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const changePlanSchema: z.ZodObject<{
    plan: z.ZodEnum<{
        free: "free";
        enterprise: "enterprise";
        starter: "starter";
        professional: "professional";
    }>;
    billingCycle: z.ZodDefault<z.ZodEnum<{
        monthly: "monthly";
        yearly: "yearly";
    }>>;
    status: z.ZodDefault<z.ZodEnum<{
        trialing: "trialing";
        active: "active";
        past_due: "past_due";
        canceled: "canceled";
        incomplete: "incomplete";
    }>>;
    provider: z.ZodDefault<z.ZodString>;
    providerSubscriptionId: z.ZodOptional<z.ZodString>;
    providerCustomerId: z.ZodOptional<z.ZodString>;
    currentPeriodEnd: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const billingWebhookSchema: z.ZodObject<{
    event: z.ZodString;
    provider: z.ZodDefault<z.ZodString>;
    sessionId: z.ZodOptional<z.ZodString>;
    providerSessionId: z.ZodOptional<z.ZodString>;
    tenantId: z.ZodOptional<z.ZodString>;
    plan: z.ZodOptional<z.ZodEnum<{
        free: "free";
        enterprise: "enterprise";
        starter: "starter";
        professional: "professional";
    }>>;
    billingCycle: z.ZodOptional<z.ZodDefault<z.ZodEnum<{
        monthly: "monthly";
        yearly: "yearly";
    }>>>;
    status: z.ZodOptional<z.ZodEnum<{
        trialing: "trialing";
        active: "active";
        past_due: "past_due";
        canceled: "canceled";
        incomplete: "incomplete";
    }>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, z.core.$strip>;
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type ChangePlanInput = z.infer<typeof changePlanSchema>;
export type BillingWebhookInput = z.infer<typeof billingWebhookSchema>;
//# sourceMappingURL=billing.schemas.d.ts.map