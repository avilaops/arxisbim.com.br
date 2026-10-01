import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  BillingProvider,
  ProviderCharge,
  ProviderChargeStatus,
  ProviderNotification,
  ProviderNotificationSignature,
  ProviderSubscription,
  ProviderSubscriptionInput,
  ProviderSubscriptionStatus,
} from './billing-provider.js';

/**
 * Assinaturas (preapproval) do Mercado Pago — conta da Avila Ops.
 *
 * Escrito à mão, sem SDK: são seis chamadas HTTP e uma validação HMAC. Mesmo
 * contrato que o mail.avilaops.com e o lojas.avilaops.com já usam em produção.
 *
 * A assinatura é criada SEM `card_token_id`: o MP devolve `init_point` e o
 * cliente cadastra o cartão na página dele. Nenhum dado de cartão passa pelo
 * nosso servidor.
 *
 * Aviso operacional: em preapproval o MP ignora `notification_url` e notifica
 * a URL cadastrada na APLICAÇÃO (uma só para a conta inteira). Por isso o
 * BillingService também sincroniza o estado direto na API — o webhook é
 * atalho, não fonte única.
 */

const BASE_URL = 'https://api.mercadopago.com';
const REQUEST_TIMEOUT_MS = 20_000;
/** Notificação mais velha que isto é replay. */
const NOTIFICATION_MAX_AGE_MS = 10 * 60_000;

export const MERCADOPAGO_TOPICS = {
  subscription: 'subscription_preapproval',
  charge: 'subscription_authorized_payment',
} as const;

export class MercadoPagoError extends Error {
  constructor(message: string, readonly statusCode: number, readonly body?: unknown) {
    super(message);
    this.name = 'MercadoPagoError';
  }
}

interface RawPreapproval {
  id: string;
  status: ProviderSubscriptionStatus;
  init_point?: string | null;
  external_reference?: string | null;
  payer_email?: string | null;
  payer_id?: number | string | null;
  next_payment_date?: string | null;
  auto_recurring?: {
    frequency?: number;
    frequency_type?: string;
    transaction_amount?: number;
    currency_id?: string;
  };
  [key: string]: unknown;
}

interface RawAuthorizedPayment {
  id: number | string;
  preapproval_id: string;
  /** scheduled | processed | recycling | cancelled */
  status?: string;
  payment?: { id?: number | string; status?: string; status_detail?: string };
  transaction_amount?: number;
  currency_id?: string;
  debit_date?: string | null;
  [key: string]: unknown;
}

export function mapPreapproval(raw: RawPreapproval): ProviderSubscription {
  return {
    id: String(raw.id),
    status: raw.status,
    checkoutUrl: raw.status === 'pending' ? raw.init_point ?? null : null,
    externalReference: raw.external_reference ?? null,
    payerEmail: raw.payer_email ?? null,
    payerId: raw.payer_id != null ? String(raw.payer_id) : null,
    amountCents: Math.round((raw.auto_recurring?.transaction_amount ?? 0) * 100),
    currency: raw.auto_recurring?.currency_id ?? 'BRL',
    nextPaymentDate: raw.next_payment_date ?? null,
    raw: raw as Record<string, any>,
  };
}

export function mapChargeStatus(raw: Pick<RawAuthorizedPayment, 'status' | 'payment'>): ProviderChargeStatus {
  const paymentStatus = raw.payment?.status;
  if (raw.status === 'processed') {
    if (paymentStatus === 'approved' || paymentStatus === undefined) return 'approved';
    if (paymentStatus === 'pending' || paymentStatus === 'in_process' || paymentStatus === 'authorized') return 'pending';
    return 'rejected';
  }
  // `recycling` é o MP tentando de novo depois de uma recusa.
  if (raw.status === 'recycling') return 'rejected';
  if (raw.status === 'cancelled') return 'cancelled';
  if (raw.status === 'scheduled') return 'scheduled';
  if (paymentStatus === 'approved') return 'approved';
  if (paymentStatus === 'rejected' || paymentStatus === 'cancelled') return 'rejected';
  return 'pending';
}

export function mapAuthorizedPayment(raw: RawAuthorizedPayment): ProviderCharge {
  return {
    id: String(raw.id),
    subscriptionId: String(raw.preapproval_id),
    status: mapChargeStatus(raw),
    statusDetail: raw.payment?.status_detail ?? null,
    amountCents: Math.round((raw.transaction_amount ?? 0) * 100),
    currency: raw.currency_id ?? 'BRL',
    paymentId: raw.payment?.id != null ? String(raw.payment.id) : null,
    debitDate: raw.debit_date ?? null,
    raw: raw as Record<string, any>,
  };
}

/**
 * Normaliza a notificação do Mercado Pago. O MP manda tópico e id tanto na
 * query (`?type=...&data.id=...`) quanto no corpo; a query manda quando existe,
 * porque é o valor dela que entra no manifesto assinado.
 */
export function parseMercadoPagoNotification(
  body: Record<string, any> | null | undefined,
  query: Record<string, string | undefined> | null | undefined,
): ProviderNotification | null {
  const corpo = body ?? {};
  const q = query ?? {};
  const topic = q.type ?? q.topic ?? corpo.type ?? corpo.topic ?? '';
  const dataId = q['data.id'] ?? q.id ?? (corpo.data?.id != null ? String(corpo.data.id) : '');

  if (!topic || !dataId) return null;

  const action = typeof corpo.action === 'string' ? corpo.action : null;
  // O `id` do corpo é o id da notificação — único por envio, e repetido quando
  // o MP reenvia a mesma. Sem ele, caímos numa chave composta.
  const notificationId = corpo.id != null
    ? `mp:${corpo.id}`
    : `mp:${topic}:${dataId}:${action ?? ''}:${corpo.date_created ?? ''}`;

  return { id: notificationId, topic, action, dataId: String(dataId), raw: corpo };
}

/**
 * Confere a assinatura `x-signature` do webhook.
 *
 * Manifesto: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` em HMAC-SHA256
 * com o segredo da integração. Sem isso o endpoint é público e qualquer um
 * postaria "pagamento aprovado" para reativar um inadimplente.
 */
export function verifyMercadoPagoSignature(
  input: ProviderNotificationSignature,
  secret: string,
  now: () => number = Date.now,
): boolean {
  if (!secret) return false;

  const parts = new Map(
    input.xSignature
      .split(',')
      .map((part) => part.split('=').map((value) => value.trim()))
      .filter((pair): pair is [string, string] => pair.length === 2),
  );

  const ts = parts.get('ts');
  const received = parts.get('v1');
  if (!ts || !received) return false;

  const age = Math.abs(now() - Number(ts) * 1000);
  if (!Number.isFinite(age) || age > NOTIFICATION_MAX_AGE_MS) return false;

  const manifest = `id:${input.dataId};request-id:${input.xRequestId};ts:${ts};`;
  const expected = createHmac('sha256', secret).update(manifest).digest('hex');

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  if (expectedBuffer.length !== receivedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

/** Assina um manifesto — usado nos testes para forjar notificações válidas. */
export function signMercadoPagoManifest(input: ProviderNotificationSignature & { ts: number }, secret: string): string {
  const manifest = `id:${input.dataId};request-id:${input.xRequestId};ts:${input.ts};`;
  const v1 = createHmac('sha256', secret).update(manifest).digest('hex');
  return `ts=${input.ts},v1=${v1}`;
}

export interface MercadoPagoProviderOptions {
  fetchImpl?: typeof fetch;
  now?: () => number;
}

export class MercadoPagoBillingProvider implements BillingProvider {
  readonly providerName = 'mercadopago';
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;

  constructor(
    private readonly accessToken: string,
    private readonly webhookSecret: string,
    options: MercadoPagoProviderOptions = {},
  ) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
  }

  private async call<T>(path: string, init: { method: string; body?: unknown }): Promise<T> {
    if (!this.accessToken) {
      throw new MercadoPagoError('MP_ACCESS_TOKEN não configurado', 500);
    }

    const response = await this.fetchImpl(`${BASE_URL}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const text = await response.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    if (!response.ok) {
      const message = body && typeof body === 'object' && 'message' in body
        ? String((body as { message?: unknown }).message)
        : `Mercado Pago respondeu ${response.status}`;
      throw new MercadoPagoError(message, response.status, body);
    }

    return body as T;
  }

  async createSubscription(input: ProviderSubscriptionInput): Promise<ProviderSubscription> {
    const raw = await this.call<RawPreapproval>('/preapproval', {
      method: 'POST',
      body: {
        reason: input.reason,
        external_reference: input.externalReference,
        payer_email: input.payerEmail,
        back_url: input.backUrl,
        // Sem `status: authorized` e sem card_token_id: o MP devolve init_point
        // e o cartão é cadastrado na página dele.
        auto_recurring: {
          frequency: input.billingCycle === 'yearly' ? 12 : 1,
          frequency_type: 'months',
          transaction_amount: input.amountCents / 100,
          currency_id: input.currency,
        },
      },
    });

    return mapPreapproval(raw);
  }

  async getSubscription(subscriptionId: string): Promise<ProviderSubscription> {
    const raw = await this.call<RawPreapproval>(`/preapproval/${encodeURIComponent(subscriptionId)}`, { method: 'GET' });
    return mapPreapproval(raw);
  }

  async setSubscriptionStatus(subscriptionId: string, status: 'paused' | 'authorized' | 'cancelled'): Promise<ProviderSubscription> {
    const raw = await this.call<RawPreapproval>(`/preapproval/${encodeURIComponent(subscriptionId)}`, {
      method: 'PUT',
      body: { status },
    });
    return mapPreapproval(raw);
  }

  async updateSubscriptionAmount(subscriptionId: string, amountCents: number): Promise<ProviderSubscription> {
    const raw = await this.call<RawPreapproval>(`/preapproval/${encodeURIComponent(subscriptionId)}`, {
      method: 'PUT',
      body: { auto_recurring: { transaction_amount: amountCents / 100, currency_id: 'BRL' } },
    });
    return mapPreapproval(raw);
  }

  async getCharge(chargeId: string): Promise<ProviderCharge> {
    const raw = await this.call<RawAuthorizedPayment>(`/authorized_payments/${encodeURIComponent(chargeId)}`, { method: 'GET' });
    return mapAuthorizedPayment(raw);
  }

  /**
   * Cobranças de uma assinatura, da mais recente para a mais antiga.
   *
   * Este endpoint recusa `limit` acima de 12 e quer `sort=campo:direcao`
   * (o par `sort=campo&criteria=desc` do resto da API devolve 400).
   */
  async listCharges(subscriptionId: string): Promise<ProviderCharge[]> {
    const raw = await this.call<{ results?: RawAuthorizedPayment[] }>(
      `/authorized_payments/search?preapproval_id=${encodeURIComponent(subscriptionId)}&limit=12&sort=date_created:desc`,
      { method: 'GET' },
    );
    return (raw.results ?? []).map(mapAuthorizedPayment);
  }

  verifyNotification(input: ProviderNotificationSignature): boolean {
    return verifyMercadoPagoSignature(input, this.webhookSecret, this.now);
  }
}
