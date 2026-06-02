import Stripe from 'stripe';
import type {
  BillingProvider,
  ProviderCheckoutInput,
  ProviderCheckoutResult,
  ProviderPortalInput,
  ProviderPortalResult,
  ProviderWebhookEvent,
} from './billing-provider.js';

export class StripeBillingProvider implements BillingProvider {
  readonly providerName = 'stripe';
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(secretKey: string, webhookSecret: string) {
    this.stripe = new Stripe(secretKey);
    this.webhookSecret = webhookSecret;
  }

  async createCheckoutSession(input: ProviderCheckoutInput): Promise<ProviderCheckoutResult> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{
        price: input.priceId,
        quantity: 1,
      }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      customer: input.customerId || undefined,
      allow_promotion_codes: true,
      metadata: {
        tenantId: input.tenantId,
        userId: input.userId,
        plan: input.plan,
        billingCycle: input.billingCycle,
        ...(input.metadata || {}),
      },
      subscription_data: {
        metadata: {
          tenantId: input.tenantId,
          userId: input.userId,
          plan: input.plan,
          billingCycle: input.billingCycle,
          ...(input.metadata || {}),
        },
      },
    });

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
      customerId: typeof session.customer === 'string' ? session.customer : null,
      subscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
      priceId: input.priceId,
    };
  }

  async createPortalSession(input: ProviderPortalInput): Promise<ProviderPortalResult> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: input.customerId,
      return_url: input.returnUrl,
    });

    return { portalUrl: session.url };
  }

  parseWebhookEvent(rawBody: string, signature: string): ProviderWebhookEvent {
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);

    return {
      id: event.id,
      type: event.type,
      raw: event as unknown as Record<string, any>,
    };
  }
}
