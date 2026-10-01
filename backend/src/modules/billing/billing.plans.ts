import type { BillingCycle, BillingPlanTier } from '../../shared/database/schema/billing.js';
import { BILLING_ENTITLEMENT_KEYS } from './billing.domain.js';

export type BillingFeature =
  | 'ifc_viewer'
  | 'cloud_storage'
  | 'measurement_tools'
  | 'annotations'
  | 'vr_mode'
  | 'ar_mode'
  | 'federation'
  | 'collaboration'
  | 'api_access'
  | 'webhooks'
  | 'advanced_analytics'
  | 'sso'
  | 'custom_branding'
  | 'dedicated_support';

export interface BillingPlanLimits {
  maxUsers: number;
  maxProjects: number;
  maxStorageGB: number;
  maxFileSizeMB: number;
  collaboratorsPerSession: number;
  apiCallsPerMonth: number;
  maxScenarios: number;
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

/**
 * Planos do ArxisVR. O valor vai direto para a assinatura no provedor
 * (Mercado Pago cobra o `transaction_amount` informado) — não existe
 * catálogo de preços externo para manter em sincronia.
 */
export const BILLING_PLANS: Record<BillingPlanTier, BillingPlanDefinition> = {
  free: {
    tier: 'free',
    name: 'Free Trial',
    description: 'Teste gratuito para validar modelos IFC e navegação básica.',
    monthlyAmountCents: 0,
    yearlyAmountCents: 0,
    currency: 'BRL',
    features: ['ifc_viewer', 'cloud_storage', 'measurement_tools'],
    limits: {
      maxUsers: 2,
      maxProjects: 3,
      maxStorageGB: 5,
      maxFileSizeMB: 50,
      collaboratorsPerSession: 2,
      apiCallsPerMonth: 0,
      maxScenarios: 2,
    },
  },
  starter: {
    tier: 'starter',
    name: 'Starter',
    description: 'Para pequenas equipes iniciando colaboração BIM imersiva.',
    monthlyAmountCents: 8700,
    yearlyAmountCents: 87000,
    currency: 'BRL',
    features: ['ifc_viewer', 'cloud_storage', 'measurement_tools', 'annotations', 'vr_mode', 'collaboration'],
    limits: {
      maxUsers: 5,
      maxProjects: 10,
      maxStorageGB: 50,
      maxFileSizeMB: 200,
      collaboratorsPerSession: 5,
      apiCallsPerMonth: 1000,
      maxScenarios: 2,
    },
  },
  professional: {
    tier: 'professional',
    name: 'Professional',
    description: 'Para empresas com AR, federação, API e analytics avançados.',
    monthlyAmountCents: 23700,
    yearlyAmountCents: 237000,
    currency: 'BRL',
    features: [
      'ifc_viewer',
      'cloud_storage',
      'measurement_tools',
      'annotations',
      'vr_mode',
      'ar_mode',
      'federation',
      'collaboration',
      'api_access',
      'webhooks',
      'advanced_analytics',
    ],
    limits: {
      maxUsers: -1,
      maxProjects: -1,
      maxStorageGB: 500,
      maxFileSizeMB: 1000,
      collaboratorsPerSession: 20,
      apiCallsPerMonth: 50000,
      maxScenarios: 10,
    },
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Enterprise',
    description: 'Plano corporativo com SSO, branding e suporte dedicado.',
    monthlyAmountCents: 59700,
    yearlyAmountCents: 597000,
    currency: 'BRL',
    features: [
      'ifc_viewer',
      'cloud_storage',
      'measurement_tools',
      'annotations',
      'vr_mode',
      'ar_mode',
      'federation',
      'collaboration',
      'api_access',
      'webhooks',
      'advanced_analytics',
      'sso',
      'custom_branding',
      'dedicated_support',
    ],
    limits: {
      maxUsers: -1,
      maxProjects: -1,
      maxStorageGB: -1,
      maxFileSizeMB: -1,
      collaboratorsPerSession: -1,
      apiCallsPerMonth: -1,
      maxScenarios: -1,
    },
  },
};

export function normalizePlan(plan: string | undefined | null): BillingPlanTier {
  if (plan === 'pro') return 'professional';
  if (plan === 'starter' || plan === 'professional' || plan === 'enterprise' || plan === 'free') {
    return plan;
  }
  return 'free';
}

export function getPlanAmountCents(plan: BillingPlanTier, billingCycle: BillingCycle): number {
  const definition = BILLING_PLANS[plan];
  return billingCycle === 'yearly' ? definition.yearlyAmountCents : definition.monthlyAmountCents;
}

export function toTenantSubscription(plan: BillingPlanTier) {
  const definition = BILLING_PLANS[plan];
  return {
    plan,
    maxUsers: definition.limits.maxUsers,
    maxProjects: definition.limits.maxProjects,
    maxStorageGB: definition.limits.maxStorageGB,
    vrEnabled: definition.features.includes('vr_mode'),
    arEnabled: definition.features.includes('ar_mode'),
    federationEnabled: definition.features.includes('federation'),
  };
}

export function getPlanEntitlements(plan: BillingPlanTier): Record<string, { isEnabled: boolean; numericValue?: number }> {
  const definition = BILLING_PLANS[plan];
  const canUseAnalytics = definition.features.includes('advanced_analytics');
  const canUseApi = definition.features.includes('api_access');
  const canUseIntegrations = definition.features.includes('webhooks') || definition.features.includes('federation') || canUseApi;
  const canUseAutomation = plan === 'professional' || plan === 'enterprise';
  const canUseAi = plan === 'enterprise';

  return {
    [BILLING_ENTITLEMENT_KEYS.maxUsers]: {
      isEnabled: true,
      numericValue: definition.limits.maxUsers,
    },
    [BILLING_ENTITLEMENT_KEYS.maxProjects]: {
      isEnabled: true,
      numericValue: definition.limits.maxProjects,
    },
    [BILLING_ENTITLEMENT_KEYS.canUseAnalytics]: {
      isEnabled: canUseAnalytics,
    },
    [BILLING_ENTITLEMENT_KEYS.canUseApi]: {
      isEnabled: canUseApi,
    },
    [BILLING_ENTITLEMENT_KEYS.canUseIntegrations]: {
      isEnabled: canUseIntegrations,
    },
    [BILLING_ENTITLEMENT_KEYS.canUseAutomation]: {
      isEnabled: canUseAutomation,
    },
    [BILLING_ENTITLEMENT_KEYS.canUseAi]: {
      isEnabled: canUseAi,
    },
  };
}
