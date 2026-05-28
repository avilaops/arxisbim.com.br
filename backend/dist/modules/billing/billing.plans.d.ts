import type { BillingCycle, BillingPlanTier } from '../../shared/database/schema/billing.js';
export type BillingFeature = 'ifc_viewer' | 'cloud_storage' | 'measurement_tools' | 'annotations' | 'vr_mode' | 'ar_mode' | 'federation' | 'collaboration' | 'api_access' | 'webhooks' | 'advanced_analytics' | 'sso' | 'custom_branding' | 'dedicated_support';
export interface BillingPlanLimits {
    maxUsers: number;
    maxProjects: number;
    maxStorageGB: number;
    maxFileSizeMB: number;
    collaboratorsPerSession: number;
    apiCallsPerMonth: number;
}
export interface BillingPlanDefinition {
    tier: BillingPlanTier;
    name: string;
    description: string;
    monthlyAmountCents: number;
    yearlyAmountCents: number;
    currency: 'BRL';
    features: BillingFeature[];
    limits: BillingPlanLimits;
}
export declare const BILLING_PLANS: Record<BillingPlanTier, BillingPlanDefinition>;
export declare function normalizePlan(plan: string | undefined | null): BillingPlanTier;
export declare function getPlanAmountCents(plan: BillingPlanTier, billingCycle: BillingCycle): number;
export declare function toTenantSubscription(plan: BillingPlanTier): {
    plan: BillingPlanTier;
    maxUsers: number;
    maxProjects: number;
    maxStorageGB: number;
    vrEnabled: boolean;
    arEnabled: boolean;
    federationEnabled: boolean;
};
//# sourceMappingURL=billing.plans.d.ts.map