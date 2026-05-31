import { type BillingCycle, type BillingPlanTier, type BillingStatus } from '../../shared/database/schema/index.js';
import type { BillingWebhookInput, ChangePlanInput, CreateCheckoutInput } from './billing.schemas.js';
export declare class BillingService {
    static canManageBilling(tenantId: string, userId: string): Promise<boolean>;
    static listPlans(): {
        prices: {
            monthly: number;
            yearly: number;
        };
        tier: BillingPlanTier;
        name: string;
        description: string;
        monthlyAmountCents: number;
        yearlyAmountCents: number;
        currency: "BRL";
        features: import("./billing.plans.js").BillingFeature[];
        limits: import("./billing.plans.js").BillingPlanLimits;
    }[];
    static getCurrent(tenantId: string): Promise<{
        tenantId: string;
        tenantName: string;
        subscription: {
            id: string | null;
            plan: BillingPlanTier;
            status: BillingStatus;
            billingCycle: BillingCycle;
            currency: string;
            amountCents: number;
            currentPeriodStart: string | null;
            currentPeriodEnd: string | null;
            trialEndsAt: string | null;
            cancelAtPeriodEnd: boolean;
            provider: string;
            providerCustomerId: string | null;
            providerSubscriptionId: string | null;
            features: import("./billing.plans.js").BillingFeature[];
            limits: import("./billing.plans.js").BillingPlanLimits;
        };
        usage: {
            users: number;
            projects: number;
            storageGB: number;
        };
        overLimit: {
            users: boolean;
            projects: boolean;
            storage: boolean;
        };
    }>;
    static createCheckoutSession(tenantId: string, userId: string, input: CreateCheckoutInput): Promise<{
        session: {
            id: string;
            tenantId: string;
            createdAt: Date;
            updatedAt: Date;
            status: string;
            metadata: Record<string, any> | null;
            plan: BillingPlanTier;
            expiresAt: Date;
            billingCycle: BillingCycle;
            currency: string;
            amountCents: number;
            provider: string;
            requestedByUserId: string | null;
            providerSessionId: string | null;
            checkoutUrl: string | null;
            successUrl: string | null;
            cancelUrl: string | null;
            completedAt: Date | null;
        };
        checkoutUrl: string | null;
        provider: string;
        mode: string;
    }>;
    static changePlan(tenantId: string, input: ChangePlanInput): Promise<{
        id: string;
        tenantId: string;
        plan: BillingPlanTier;
        status: BillingStatus;
        billingCycle: BillingCycle;
        currency: string;
        amountCents: number;
        currentPeriodStart: Date | null;
        currentPeriodEnd: Date | null;
        trialEndsAt: Date | null;
        cancelAtPeriodEnd: boolean;
        provider: string;
        providerCustomerId: string | null;
        providerSubscriptionId: string | null;
        metadata: Record<string, any> | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    static listInvoices(tenantId: string, limit?: number): Promise<{
        id: string;
        tenantId: string;
        subscriptionId: string | null;
        status: string;
        currency: string;
        subtotalCents: number;
        taxCents: number;
        totalCents: number;
        dueAt: Date | null;
        paidAt: Date | null;
        providerInvoiceId: string | null;
        hostedInvoiceUrl: string | null;
        metadata: Record<string, any> | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    static handleWebhook(input: BillingWebhookInput): Promise<{
        session: {
            id: string;
            tenantId: string;
            requestedByUserId: string | null;
            plan: BillingPlanTier;
            billingCycle: BillingCycle;
            status: string;
            provider: string;
            providerSessionId: string | null;
            checkoutUrl: string | null;
            successUrl: string | null;
            cancelUrl: string | null;
            amountCents: number;
            currency: string;
            expiresAt: Date;
            completedAt: Date | null;
            metadata: Record<string, any> | null;
            createdAt: Date;
            updatedAt: Date;
        };
        subscription: {
            id: string;
            tenantId: string;
            plan: BillingPlanTier;
            status: BillingStatus;
            billingCycle: BillingCycle;
            currency: string;
            amountCents: number;
            currentPeriodStart: Date | null;
            currentPeriodEnd: Date | null;
            trialEndsAt: Date | null;
            cancelAtPeriodEnd: boolean;
            provider: string;
            providerCustomerId: string | null;
            providerSubscriptionId: string | null;
            metadata: Record<string, any> | null;
            createdAt: Date;
            updatedAt: Date;
        };
        received?: undefined;
        event?: undefined;
    } | {
        subscription: {
            id: string;
            tenantId: string;
            plan: BillingPlanTier;
            status: BillingStatus;
            billingCycle: BillingCycle;
            currency: string;
            amountCents: number;
            currentPeriodStart: Date | null;
            currentPeriodEnd: Date | null;
            trialEndsAt: Date | null;
            cancelAtPeriodEnd: boolean;
            provider: string;
            providerCustomerId: string | null;
            providerSubscriptionId: string | null;
            metadata: Record<string, any> | null;
            createdAt: Date;
            updatedAt: Date;
        };
        session?: undefined;
        received?: undefined;
        event?: undefined;
    } | {
        received: boolean;
        event: string;
        session?: undefined;
        subscription?: undefined;
    }>;
}
//# sourceMappingURL=billing.service.d.ts.map