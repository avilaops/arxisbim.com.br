import { describe, expect, it } from 'vitest';
import {
  MercadoPagoBillingProvider,
  mapAuthorizedPayment,
  mapChargeStatus,
  mapPreapproval,
  parseMercadoPagoNotification,
  signMercadoPagoManifest,
  verifyMercadoPagoSignature,
} from '../../src/modules/billing/providers/mercadopago-billing.provider.js';

const SECRET = 'segredo-de-teste';

describe('Mercado Pago — assinatura do webhook', () => {
  it('aceita manifesto assinado com o segredo dentro da janela de tempo', () => {
    const ts = 1_700_000_000;
    const xSignature = signMercadoPagoManifest({ dataId: '123', xRequestId: 'req-1', ts }, SECRET);

    const ok = verifyMercadoPagoSignature(
      { xSignature, xRequestId: 'req-1', dataId: '123' },
      SECRET,
      () => ts * 1000 + 5_000,
    );
    expect(ok).toBe(true);
  });

  it('recusa assinatura com segredo errado, sem segredo e com replay antigo', () => {
    const ts = 1_700_000_000;
    const xSignature = signMercadoPagoManifest({ dataId: '123', xRequestId: 'req-1', ts }, SECRET);
    const now = () => ts * 1000 + 5_000;

    expect(verifyMercadoPagoSignature({ xSignature, xRequestId: 'req-1', dataId: '123' }, 'outro', now)).toBe(false);
    expect(verifyMercadoPagoSignature({ xSignature, xRequestId: 'req-1', dataId: '123' }, '', now)).toBe(false);
    // data.id adulterado
    expect(verifyMercadoPagoSignature({ xSignature, xRequestId: 'req-1', dataId: '999' }, SECRET, now)).toBe(false);
    // mais de 10 minutos depois: replay
    expect(verifyMercadoPagoSignature({ xSignature, xRequestId: 'req-1', dataId: '123' }, SECRET, () => ts * 1000 + 11 * 60_000)).toBe(false);
    // cabeçalho malformado
    expect(verifyMercadoPagoSignature({ xSignature: 'lixo', xRequestId: 'req-1', dataId: '123' }, SECRET, now)).toBe(false);
  });

  it('o provider delega a verificação com o segredo configurado', () => {
    const ts = 1_700_000_000;
    const provider = new MercadoPagoBillingProvider('TEST-token', SECRET, { now: () => ts * 1000 });
    const xSignature = signMercadoPagoManifest({ dataId: 'abc', xRequestId: 'r', ts }, SECRET);
    expect(provider.verifyNotification({ xSignature, xRequestId: 'r', dataId: 'abc' })).toBe(true);
  });
});

describe('Mercado Pago — notificação', () => {
  it('lê tópico e id da query (prioridade) ou do corpo', () => {
    const fromQuery = parseMercadoPagoNotification({ type: 'ignorado', data: { id: 'corpo' } }, { type: 'subscription_preapproval', 'data.id': 'query' });
    expect(fromQuery).toMatchObject({ topic: 'subscription_preapproval', dataId: 'query' });

    const fromBody = parseMercadoPagoNotification({ id: 42, type: 'subscription_authorized_payment', action: 'created', data: { id: 777 } }, {});
    expect(fromBody).toMatchObject({ id: 'mp:42', topic: 'subscription_authorized_payment', dataId: '777', action: 'created' });
  });

  it('sem id de notificação cai numa chave composta; sem tópico/id devolve null', () => {
    const composed = parseMercadoPagoNotification({ type: 'subscription_preapproval', action: 'updated', date_created: '2026-08-27T10:00:00Z', data: { id: 'pre_1' } }, {});
    expect(composed?.id).toBe('mp:subscription_preapproval:pre_1:updated:2026-08-27T10:00:00Z');

    expect(parseMercadoPagoNotification({ event: 'checkout.completed' }, {})).toBeNull();
    expect(parseMercadoPagoNotification({ type: 'payment' }, {})).toBeNull();
  });
});

describe('Mercado Pago — mapeamento de estado', () => {
  it('preapproval vira assinatura do provider, com link só enquanto pendente', () => {
    const pending = mapPreapproval({
      id: 'pre_1',
      status: 'pending',
      init_point: 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=pre_1',
      external_reference: 'arxisvr:t1:starter:monthly',
      payer_email: 'a@b.c',
      auto_recurring: { transaction_amount: 87, currency_id: 'BRL' },
    });
    expect(pending.checkoutUrl).toContain('preapproval_id=pre_1');
    expect(pending.amountCents).toBe(8700);

    const authorized = mapPreapproval({ id: 'pre_1', status: 'authorized', init_point: 'x', payer_id: 123, next_payment_date: '2026-09-27T10:00:00Z' });
    expect(authorized.checkoutUrl).toBeNull();
    expect(authorized.payerId).toBe('123');
    expect(authorized.nextPaymentDate).toBe('2026-09-27T10:00:00Z');
  });

  it('cobrança: processed+approved aprova, recycling recusa, scheduled é futuro', () => {
    expect(mapChargeStatus({ status: 'processed', payment: { status: 'approved' } })).toBe('approved');
    expect(mapChargeStatus({ status: 'processed', payment: { status: 'rejected' } })).toBe('rejected');
    expect(mapChargeStatus({ status: 'processed', payment: { status: 'in_process' } })).toBe('pending');
    expect(mapChargeStatus({ status: 'recycling' })).toBe('rejected');
    expect(mapChargeStatus({ status: 'scheduled' })).toBe('scheduled');
    expect(mapChargeStatus({ status: 'cancelled' })).toBe('cancelled');

    const charge = mapAuthorizedPayment({
      id: 555, preapproval_id: 'pre_1', status: 'processed',
      payment: { id: 999, status: 'approved', status_detail: 'accredited' },
      transaction_amount: 237, currency_id: 'BRL', debit_date: '2026-08-27T00:00:00Z',
    });
    expect(charge).toMatchObject({ id: '555', subscriptionId: 'pre_1', status: 'approved', amountCents: 23700, paymentId: '999', statusDetail: 'accredited' });
  });
});

describe('Mercado Pago — chamadas HTTP', () => {
  it('cria assinatura sem token de cartão, com recorrência anual em 12 meses', async () => {
    const calls: Array<{ url: string; init: any }> = [];
    const fetchImpl = (async (url: any, init: any) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ id: 'pre_9', status: 'pending', init_point: 'https://mp/init' }), { status: 201 });
    }) as typeof fetch;

    const provider = new MercadoPagoBillingProvider('TEST-token', SECRET, { fetchImpl });
    const sub = await provider.createSubscription({
      tenantId: 't1', userId: 'u1', plan: 'professional', billingCycle: 'yearly',
      amountCents: 237000, currency: 'BRL', reason: 'ArxisVR', payerEmail: 'a@b.c',
      externalReference: 'arxisvr:t1:professional:yearly', backUrl: 'https://app/volta',
    });

    expect(sub.id).toBe('pre_9');
    expect(sub.checkoutUrl).toBe('https://mp/init');
    expect(calls[0].url).toBe('https://api.mercadopago.com/preapproval');
    expect(calls[0].init.headers.Authorization).toBe('Bearer TEST-token');
    const body = JSON.parse(calls[0].init.body);
    expect(body.card_token_id).toBeUndefined();
    expect(body.status).toBeUndefined();
    expect(body.auto_recurring).toEqual({ frequency: 12, frequency_type: 'months', transaction_amount: 2370, currency_id: 'BRL' });
    expect(body.external_reference).toBe('arxisvr:t1:professional:yearly');
  });

  it('busca cobranças com limit<=12 e sort=campo:direcao; erro do MP vira MercadoPagoError', async () => {
    const fetchImpl = (async (url: any) => {
      const u = String(url);
      if (u.includes('/authorized_payments/search')) {
        expect(u).toContain('limit=12');
        expect(u).toContain('sort=date_created:desc');
        return new Response(JSON.stringify({ results: [{ id: 1, preapproval_id: 'pre_1', status: 'processed', payment: { status: 'approved' }, transaction_amount: 87 }] }), { status: 200 });
      }
      return new Response(JSON.stringify({ message: 'preapproval not found' }), { status: 404 });
    }) as typeof fetch;

    const provider = new MercadoPagoBillingProvider('TEST-token', SECRET, { fetchImpl });
    const charges = await provider.listCharges('pre_1');
    expect(charges).toHaveLength(1);
    expect(charges[0].status).toBe('approved');

    await expect(provider.getSubscription('nope')).rejects.toMatchObject({ name: 'MercadoPagoError', statusCode: 404, message: 'preapproval not found' });
  });
});
