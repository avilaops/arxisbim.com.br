import type { BillingStatus } from '../../shared/database/schema/billing.js';
import type { ProviderSubscriptionStatus } from './providers/billing-provider.js';

export const BILLING_STATUS_TRANSITIONS: Record<BillingStatus, BillingStatus[]> = {
  trialing: ['active', 'past_due', 'grace_period', 'canceled', 'incomplete', 'unpaid'],
  active: ['past_due', 'grace_period', 'suspended', 'canceled', 'unpaid'],
  past_due: ['grace_period', 'active', 'suspended', 'canceled', 'unpaid'],
  grace_period: ['active', 'suspended', 'canceled', 'unpaid'],
  suspended: ['active', 'canceled', 'unpaid'],
  canceled: [],
  incomplete: ['active', 'canceled', 'unpaid'],
  unpaid: ['active', 'canceled', 'suspended'],
};

/**
 * Tópicos de notificação do provedor de cobrança (Mercado Pago):
 * - assinatura: estado do preapproval mudou (autorizada, pausada, cancelada)
 * - cobrança: uma parcela recorrente foi processada (aprovada ou recusada)
 */
export const PROVIDER_WEBHOOK_TOPICS = {
  subscription: 'subscription_preapproval',
  charge: 'subscription_authorized_payment',
} as const;

/** Estado da assinatura no provedor → estado da assinatura no ArxisVR. */
export const PROVIDER_STATUS_MAP: Record<ProviderSubscriptionStatus, BillingStatus> = {
  pending: 'incomplete',
  authorized: 'active',
  paused: 'suspended',
  cancelled: 'canceled',
};

export const BILLING_ENTITLEMENT_KEYS = {
  maxUsers: 'max_users',
  maxProjects: 'max_projects',
  canUseAutomation: 'can_use_automation',
  canUseIntegrations: 'can_use_integrations',
  canUseAnalytics: 'can_use_analytics',
  canUseApi: 'can_use_api',
  canUseAi: 'can_use_ai',
} as const;

export function canTransitionStatus(current: BillingStatus, next: BillingStatus): boolean {
  return BILLING_STATUS_TRANSITIONS[current].includes(next);
}
