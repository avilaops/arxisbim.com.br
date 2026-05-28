import { describe, expect, it } from 'vitest';
import { BILLING_PLANS, getPlanAmountCents, normalizePlan, toTenantSubscription } from './billing.plans.js';
import { BillingService } from './billing.service.js';

describe('Billing plans', () => {
  it('exposes the expected commercial plan catalog', () => {
    const plans = BillingService.listPlans();

    expect(plans.map((plan) => plan.tier)).toEqual([
      'free',
      'starter',
      'professional',
      'enterprise',
    ]);
    expect(plans.every((plan) => plan.currency === 'BRL')).toBe(true);
    expect(plans.find((plan) => plan.tier === 'professional')?.features).toContain('federation');
  });

  it('keeps legacy pro subscriptions compatible with professional billing', () => {
    expect(normalizePlan('pro')).toBe('professional');
    expect(normalizePlan('unknown')).toBe('free');
  });

  it('uses yearly and monthly price tables consistently', () => {
    expect(getPlanAmountCents('free', 'monthly')).toBe(0);
    expect(getPlanAmountCents('starter', 'monthly')).toBe(BILLING_PLANS.starter.monthlyAmountCents);
    expect(getPlanAmountCents('starter', 'yearly')).toBe(BILLING_PLANS.starter.yearlyAmountCents);
  });

  it('maps billing plans back to tenant subscription feature flags', () => {
    const professional = toTenantSubscription('professional');
    const starter = toTenantSubscription('starter');

    expect(professional.plan).toBe('professional');
    expect(professional.arEnabled).toBe(true);
    expect(professional.federationEnabled).toBe(true);
    expect(starter.arEnabled).toBe(false);
  });
});
