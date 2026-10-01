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

/** Cadastro de cartão iniciado no Mercado Pago e ainda não concluído. */
export interface PendingCheckout {
  id: string;
  plan: BillingPlanTier;
  billingCycle: BillingCycle;
  checkoutUrl: string | null;
  amountCents: number;
  createdAt: string;
  expiresAt: string;
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
    gracePeriodExpiresAt: string | null;
    cancelAtPeriodEnd: boolean;
    provider: string;
    providerCustomerId: string | null;
    providerSubscriptionId: string | null;
    features: string[];
    limits: BillingPlanLimits;
  };
  pendingCheckout: PendingCheckout | null;
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
  reused?: boolean;
}

export interface PortalRequest {
  returnUrl?: string;
}

export interface PortalResponse {
  provider: string;
  portalUrl: string;
  mode: 'internal_portal' | 'no_subscription';
  returnUrl?: string;
  pendingCheckoutUrl?: string | null;
}

export interface BillingHistoryResponse {
  invoices: Array<Record<string, any>>;
}

export interface SyncResponse {
  synced: boolean;
  reason?: string;
  subscriptions: number;
  charges: number;
  billing: CurrentBillingResponse;
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

  /**
   * Relê a assinatura no Mercado Pago. Chamar quando o cliente volta da
   * página do cartão: o plano ativa na hora, sem esperar a notificação.
   */
  async sync(): Promise<SyncResponse> {
    const client = getAPIClient();
    const response = await client.post<SyncResponse>(`${this.endpoint}/sync`, {});
    return response.data;
  }

  async pauseSubscription(): Promise<CurrentBillingResponse> {
    const client = getAPIClient();
    const response = await client.post<CurrentBillingResponse>(`${this.endpoint}/subscription/pause`, {});
    return response.data;
  }

  async resumeSubscription(): Promise<CurrentBillingResponse> {
    const client = getAPIClient();
    const response = await client.post<CurrentBillingResponse>(`${this.endpoint}/subscription/resume`, {});
    return response.data;
  }

  async cancelSubscription(): Promise<CurrentBillingResponse> {
    const client = getAPIClient();
    const response = await client.post<CurrentBillingResponse>(`${this.endpoint}/subscription/cancel`, {});
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
