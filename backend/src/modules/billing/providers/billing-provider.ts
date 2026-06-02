export interface ProviderCheckoutInput {
  tenantId: string;
  userId: string;
  plan: string;
  billingCycle: 'monthly' | 'yearly';
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string | null;
  metadata?: Record<string, string>;
}

export interface ProviderCheckoutResult {
  sessionId: string;
  checkoutUrl: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
  priceId?: string | null;
}

export interface ProviderPortalInput {
  customerId: string;
  returnUrl: string;
}

export interface ProviderPortalResult {
  portalUrl: string;
}

export interface ProviderWebhookEvent {
  id: string;
  type: string;
  raw: Record<string, any>;
}

export interface BillingProvider {
  readonly providerName: string;
  createCheckoutSession(input: ProviderCheckoutInput): Promise<ProviderCheckoutResult>;
  createPortalSession(input: ProviderPortalInput): Promise<ProviderPortalResult>;
  parseWebhookEvent(rawBody: string, signature: string): ProviderWebhookEvent;
}
