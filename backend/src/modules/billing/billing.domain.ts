import type { BillingStatus } from '../../shared/database/schema/billing.js';

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

export const STRIPE_WEBHOOK_EVENTS = {
  checkoutCompleted: 'checkout.session.completed',
  subscriptionCreated: 'customer.subscription.created',
  subscriptionUpdated: 'customer.subscription.updated',
  subscriptionDeleted: 'customer.subscription.deleted',
  invoicePaid: 'invoice.paid',
  invoicePaymentFailed: 'invoice.payment_failed',
} as const;

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
