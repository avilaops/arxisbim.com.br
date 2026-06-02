import { getAPIClient } from '../client';

export type BillingPlanTier = 'free' | 'starter' | 'professional' | 'enterprise';
export type BillingStatus = 'trialing' | 'active' | 'past_due' | 'grace_period' | 'suspended' | 'canceled' | 'incomplete' | 'unpaid';
export type BillingCycle = 'monthly' | 'yearly';

export interface BillingPlanLimits {
  maxUsers: number;
  maxProjects: number;
  maxStorageGB: number;
  maxFileSizeMB: number;
  collaboratorsPerSession: number;
  apiCallsPerMonth: number;
}

export interface BillingPlan {
  tier: BillingPlanTier;
  name: string;
  description: string;
  monthlyAmountCents: number;
  yearlyAmountCents: number;
  currency: 'BRL';
  features: string[];
  limits: BillingPlanLimits;
  prices: {
    monthly: number;
    yearly: number;
  };
}

export interface CurrentBillingResponse {
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
    features: string[];
    limits: BillingPlanLimits;
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
}

export interface CheckoutRequest {
  plan: BillingPlanTier;
  billingCycle?: BillingCycle;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutResponse {
  session: Record<string, any>;
  checkoutUrl: string | null;
  provider: string;
  mode: 'internal_manual' | 'external_provider';
}

export interface PortalRequest {
  returnUrl?: string;
}

export interface PortalResponse {
  provider: string;
  portalUrl: string;
  mode: 'internal_portal' | 'external_provider_portal' | 'no_subscription';
  returnUrl?: string;
}

export interface BillingHistoryResponse {
  invoices: Array<Record<string, any>>;
}

export class BillingService {
  private readonly endpoint = '/api/v1/billing';

  async getPlans(): Promise<BillingPlan[]> {
    const client = getAPIClient();
    const response = await client.get<{ plans: BillingPlan[] }>(`${this.endpoint}/plans`);
    return response.data.plans;
  }

  async getCurrent(): Promise<CurrentBillingResponse> {
    const client = getAPIClient();
    const response = await client.get<CurrentBillingResponse>(`${this.endpoint}/current-subscription`);
    return response.data;
  }

  async createCheckout(input: CheckoutRequest): Promise<CheckoutResponse> {
    const client = getAPIClient();
    const response = await client.post<CheckoutResponse>(`${this.endpoint}/create-checkout`, {
      billingCycle: 'monthly',
      ...input,
    });
    return response.data;
  }

  async createPortal(input: PortalRequest = {}): Promise<PortalResponse> {
    const client = getAPIClient();
    const response = await client.post<PortalResponse>(`${this.endpoint}/create-portal`, input);
    return response.data;
  }

  async getHistory(): Promise<BillingHistoryResponse> {
    const client = getAPIClient();
    const response = await client.get<BillingHistoryResponse>(`${this.endpoint}/history`);
    return response.data;
  }
}

let billingServiceInstance: BillingService | null = null;

export function getBillingService(): BillingService {
  if (!billingServiceInstance) {
    billingServiceInstance = new BillingService();
  }
  return billingServiceInstance;
}
