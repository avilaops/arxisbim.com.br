/**
 * Contrato do provedor de cobrança recorrente.
 *
 * Modelado em cima de assinatura (preapproval) do Mercado Pago: o cliente
 * cadastra o cartão na página do provedor, o provedor cobra todo período e
 * nos avisa por notificação — e, como a notificação não é garantida, também
 * conseguimos LER o estado atual (assinatura e cobranças) a qualquer momento.
 *
 * Nenhum dado de cartão passa por aqui. O que entra é o link de cadastro
 * (`checkoutUrl`) e o que volta é o estado da assinatura.
 */

export type ProviderSubscriptionStatus = 'pending' | 'authorized' | 'paused' | 'cancelled';

export interface ProviderSubscriptionInput {
  tenantId: string;
  userId: string;
  plan: string;
  billingCycle: 'monthly' | 'yearly';
  amountCents: number;
  currency: string;
  /** Aparece na fatura do cartão do cliente. */
  reason: string;
  payerEmail: string;
  /** Referência nossa que o provedor devolve em toda leitura da assinatura. */
  externalReference: string;
  /** Para onde o provedor devolve o cliente depois de cadastrar o cartão. */
  backUrl: string;
}

export interface ProviderSubscription {
  id: string;
  status: ProviderSubscriptionStatus;
  /** Página do provedor onde o cliente cadastra o cartão (só enquanto `pending`). */
  checkoutUrl: string | null;
  externalReference: string | null;
  payerEmail: string | null;
  payerId: string | null;
  amountCents: number;
  currency: string;
  nextPaymentDate: string | null;
  raw: Record<string, any>;
}

export type ProviderChargeStatus = 'approved' | 'pending' | 'rejected' | 'cancelled' | 'scheduled';

export interface ProviderCharge {
  id: string;
  subscriptionId: string;
  status: ProviderChargeStatus;
  statusDetail: string | null;
  amountCents: number;
  currency: string;
  paymentId: string | null;
  debitDate: string | null;
  raw: Record<string, any>;
}

/** Notificação recebida no webhook, já normalizada. */
export interface ProviderNotification {
  /** Identidade da notificação — chave de idempotência do jornal de eventos. */
  id: string;
  topic: string;
  action: string | null;
  /** Id do recurso notificado (assinatura ou cobrança). */
  dataId: string;
  raw: Record<string, any>;
}

export interface ProviderNotificationSignature {
  xSignature: string;
  xRequestId: string;
  dataId: string;
}

export interface BillingProvider {
  readonly providerName: string;
  createSubscription(input: ProviderSubscriptionInput): Promise<ProviderSubscription>;
  getSubscription(subscriptionId: string): Promise<ProviderSubscription>;
  setSubscriptionStatus(subscriptionId: string, status: 'paused' | 'authorized' | 'cancelled'): Promise<ProviderSubscription>;
  updateSubscriptionAmount(subscriptionId: string, amountCents: number): Promise<ProviderSubscription>;
  getCharge(chargeId: string): Promise<ProviderCharge>;
  listCharges(subscriptionId: string): Promise<ProviderCharge[]>;
  verifyNotification(input: ProviderNotificationSignature): boolean;
}
