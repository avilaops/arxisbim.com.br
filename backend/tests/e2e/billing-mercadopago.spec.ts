/**
 * Cobrança via Mercado Pago (assinatura / preapproval), de ponta a ponta:
 *  - checkout cria a assinatura no provedor e devolve o link do cartão
 *  - notificação assinada (x-signature) autoriza → plano ativa
 *  - cobrança aprovada vira fatura paga; recusada abre a tolerância
 *  - sincronização relê o provedor sem depender do webhook
 *  - cancelar pela nossa tela desliga no provedor
 *
 * O provedor é um dublê em memória; o formato das notificações e a
 * assinatura HMAC são os reais.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { billingRoutes } from '../../src/modules/billing/billing.routes.js';
import { BillingService } from '../../src/modules/billing/billing.service.js';
import { authenticateRequest } from '../../src/core/auth/middleware.js';
import { db } from '../../src/shared/database/db.js';
import { tenants, users } from '../../src/shared/database/schema/tenants.js';
import { billingCheckoutSessions, billingInvoices, billingPayments, billingProviderEvents, billingSubscriptions } from '../../src/shared/database/schema/billing.js';
import { and, eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type {
  BillingProvider,
  ProviderCharge,
  ProviderNotificationSignature,
  ProviderSubscription,
  ProviderSubscriptionInput,
} from '../../src/modules/billing/providers/billing-provider.js';
import { signMercadoPagoManifest, verifyMercadoPagoSignature } from '../../src/modules/billing/providers/mercadopago-billing.provider.js';

const SECRET = process.env.MP_WEBHOOK_SECRET!;

class FakeMercadoPago implements BillingProvider {
  readonly providerName = 'mercadopago';
  subscriptions = new Map<string, ProviderSubscription>();
  charges = new Map<string, ProviderCharge>();
  statusChanges: Array<{ id: string; status: string }> = [];
  private seq = 0;

  async createSubscription(input: ProviderSubscriptionInput): Promise<ProviderSubscription> {
    const id = `pre_${++this.seq}_${randomUUID().slice(0, 8)}`;
    const sub: ProviderSubscription = {
      id,
      status: 'pending',
      checkoutUrl: `https://www.mercadopago.com.br/subscriptions/checkout?preapproval_id=${id}`,
      externalReference: input.externalReference,
      payerEmail: input.payerEmail,
      payerId: null,
      amountCents: input.amountCents,
      currency: input.currency,
      nextPaymentDate: null,
      raw: {},
    };
    this.subscriptions.set(id, sub);
    return sub;
  }

  async getSubscription(id: string): Promise<ProviderSubscription> {
    const sub = this.subscriptions.get(id);
    if (!sub) throw new Error(`preapproval not found: ${id}`);
    return { ...sub };
  }

  async setSubscriptionStatus(id: string, status: 'paused' | 'authorized' | 'cancelled'): Promise<ProviderSubscription> {
    this.statusChanges.push({ id, status });
    const sub = await this.getSubscription(id);
    const updated = { ...sub, status, checkoutUrl: null };
    this.subscriptions.set(id, updated);
    return updated;
  }

  async updateSubscriptionAmount(id: string, amountCents: number): Promise<ProviderSubscription> {
    const sub = await this.getSubscription(id);
    const updated = { ...sub, amountCents };
    this.subscriptions.set(id, updated);
    return updated;
  }

  async getCharge(id: string): Promise<ProviderCharge> {
    const charge = this.charges.get(id);
    if (!charge) throw new Error(`authorized payment not found: ${id}`);
    return { ...charge };
  }

  async listCharges(subscriptionId: string): Promise<ProviderCharge[]> {
    return [...this.charges.values()].filter((c) => c.subscriptionId === subscriptionId);
  }

  verifyNotification(input: ProviderNotificationSignature): boolean {
    return verifyMercadoPagoSignature(input, SECRET);
  }

  // helpers do teste
  authorize(id: string, nextPaymentDate = '2026-09-27T10:00:00.000Z') {
    const sub = this.subscriptions.get(id)!;
    this.subscriptions.set(id, { ...sub, status: 'authorized', checkoutUrl: null, payerId: '2944732714', nextPaymentDate });
  }

  addCharge(subscriptionId: string, status: ProviderCharge['status'], amountCents: number): ProviderCharge {
    const id = `chg_${++this.seq}_${randomUUID().slice(0, 8)}`;
    const charge: ProviderCharge = {
      id,
      subscriptionId,
      status,
      statusDetail: status === 'approved' ? 'accredited' : status === 'rejected' ? 'cc_rejected_insufficient_amount' : null,
      amountCents,
      currency: 'BRL',
      paymentId: `pay_${id}`,
      debitDate: new Date().toISOString(),
      raw: {},
    };
    this.charges.set(id, charge);
    return charge;
  }
}

function buildApp() {
  const app = Fastify({ logger: false });
  app.decorate('authenticate', authenticateRequest);
  app.register(billingRoutes, { prefix: '/api/v1/billing' });
  return app;
}

function makeToken(userId: string, tenantId: string): string {
  return jwt.sign(
    { userId, tenantId, email: `${userId}@test.com`, role: 'owner', permissions: ['*'] },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
  );
}

function signedHeaders(dataId: string) {
  const requestId = randomUUID();
  const ts = Math.floor(Date.now() / 1000);
  return {
    'x-signature': signMercadoPagoManifest({ dataId, xRequestId: requestId, ts }, SECRET),
    'x-request-id': requestId,
  };
}

describe('Billing — Mercado Pago (assinatura)', () => {
  let app: ReturnType<typeof buildApp>;
  let fake: FakeMercadoPago;
  let tenantId: string;
  let userId: string;
  let token: string;
  let notificationSeq = 0;

  beforeAll(async () => {
    fake = new FakeMercadoPago();
    BillingService.useProvider(fake);

    app = buildApp();
    await app.ready();

    tenantId = `mp-${Date.now()}`;
    userId = randomUUID();
    await db.insert(tenants).values({ tenantId, name: 'Mercado Pago Test', isActive: true });
    await db.insert(users).values({
      id: userId, email: `mp-${Date.now()}@test.com`, name: 'MP User',
      passwordHash: 'x', tenantId, role: 'owner', permissions: ['*'],
      emailVerified: true, isActive: true,
    });
    await db.insert(billingSubscriptions).values({ tenantId, plan: 'free', status: 'active' } as any);

    token = makeToken(userId, tenantId);
  });

  afterAll(async () => {
    BillingService.useProvider(undefined);
    await app.close();
  });

  beforeEach(() => {
    notificationSeq += 1;
  });

  const notify = (topic: string, dataId: string, id = `${Date.now()}-${notificationSeq}-${randomUUID().slice(0, 6)}`) => app.inject({
    method: 'POST',
    url: '/api/v1/billing/webhook',
    headers: signedHeaders(dataId),
    payload: { id, live_mode: true, type: topic, action: 'updated', date_created: new Date().toISOString(), data: { id: dataId } },
  });

  let preapprovalId: string;
  let sessionId: string;

  it('checkout de plano pago cria assinatura no provedor e devolve o link do cartão sem mudar o plano', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/checkout',
      headers: { authorization: `Bearer ${token}` },
      payload: { plan: 'starter', billingCycle: 'monthly' },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.provider).toBe('mercadopago');
    expect(body.mode).toBe('external_provider');
    expect(body.checkoutUrl).toContain('preapproval_id=');
    expect(body.session.status).toBe('pending');
    expect(body.session.providerSessionId).toBeTruthy();

    preapprovalId = body.session.providerSessionId;
    sessionId = body.session.id;

    const remote = fake.subscriptions.get(preapprovalId)!;
    expect(remote.externalReference).toBe(`arxisvr:${tenantId}:starter:monthly`);
    expect(remote.amountCents).toBe(8700);

    const [sub] = await db.select().from(billingSubscriptions).where(eq(billingSubscriptions.tenantId, tenantId));
    expect(sub.plan).toBe('free');

    // /current expõe o cadastro pendente para a tela oferecer "concluir"
    const current = await app.inject({ method: 'GET', url: '/api/v1/billing/current', headers: { authorization: `Bearer ${token}` } });
    expect(JSON.parse(current.body).pendingCheckout?.checkoutUrl).toBe(body.checkoutUrl);
  });

  it('clicar de novo no mesmo plano reaproveita o link pendente em vez de criar outra assinatura', async () => {
    const before = fake.subscriptions.size;
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/checkout',
      headers: { authorization: `Bearer ${token}` },
      payload: { plan: 'starter', billingCycle: 'monthly' },
    });
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.body).reused).toBe(true);
    expect(fake.subscriptions.size).toBe(before);
  });

  it('notificação sem assinatura válida é recusada com 401 e não entra no jornal', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/webhook',
      headers: { 'x-signature': 'ts=1,v1=deadbeef', 'x-request-id': 'r' },
      payload: { id: 1, type: 'subscription_preapproval', data: { id: preapprovalId } },
    });
    expect(res.statusCode).toBe(401);

    const events = await db.select().from(billingProviderEvents).where(eq(billingProviderEvents.eventId, 'mp:1'));
    expect(events.length).toBe(0);
  });

  it('notificação de assinatura autorizada ativa o plano; a mesma notificação de novo é duplicada', async () => {
    fake.authorize(preapprovalId);

    const notificationId = `auth-${randomUUID()}`;
    const res = await notify('subscription_preapproval', preapprovalId, notificationId);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toMatchObject({ received: true, processed: true, reason: 'subscription_authorized' });

    const [sub] = await db.select().from(billingSubscriptions).where(eq(billingSubscriptions.tenantId, tenantId));
    expect(sub.plan).toBe('starter');
    expect(sub.status).toBe('active');
    expect(sub.provider).toBe('mercadopago');
    expect(sub.providerSubscriptionId).toBe(preapprovalId);
    expect(sub.currentPeriodEnd?.toISOString()).toBe('2026-09-27T10:00:00.000Z');

    const [session] = await db.select().from(billingCheckoutSessions).where(eq(billingCheckoutSessions.id, sessionId));
    expect(session.status).toBe('completed');

    // Sem fatura "em aberto" inventada: a fatura real vem como cobrança do provedor.
    const invoices = await db.select().from(billingInvoices).where(eq(billingInvoices.tenantId, tenantId));
    expect(invoices.length).toBe(0);

    const again = await notify('subscription_preapproval', preapprovalId, notificationId);
    expect(JSON.parse(again.body).duplicate).toBe(true);

    const events = await db.select().from(billingProviderEvents).where(eq(billingProviderEvents.eventId, `mp:${notificationId}`));
    expect(events.length).toBe(1);
    expect(events[0].status).toBe('processed');
    expect(events[0].tenantId).toBe(tenantId);
  });

  it('cobrança aprovada vira fatura paga (uma só, mesmo relida) e renova o período', async () => {
    const charge = fake.addCharge(preapprovalId, 'approved', 8700);

    const res = await notify('subscription_authorized_payment', charge.id);
    expect(JSON.parse(res.body)).toMatchObject({ processed: true, reason: 'charge_approved' });

    const invoices = await db.select().from(billingInvoices).where(and(eq(billingInvoices.tenantId, tenantId), eq(billingInvoices.providerInvoiceId, charge.id)));
    expect(invoices.length).toBe(1);
    expect(invoices[0].status).toBe('paid');
    expect(invoices[0].totalCents).toBe(8700);
    expect(invoices[0].paidAt).toBeTruthy();

    const payments = await db.select().from(billingPayments).where(eq(billingPayments.providerInvoiceId, charge.id));
    expect(payments.length).toBe(1);
    expect(payments[0].status).toBe('succeeded');

    // Relida pela sincronização: nada duplica
    const sync = await app.inject({ method: 'POST', url: '/api/v1/billing/sync', headers: { authorization: `Bearer ${token}` } });
    expect(sync.statusCode).toBe(200);
    expect(JSON.parse(sync.body)).toMatchObject({ synced: true, charges: 0 });

    const invoicesAfter = await db.select().from(billingInvoices).where(and(eq(billingInvoices.tenantId, tenantId), eq(billingInvoices.providerInvoiceId, charge.id)));
    expect(invoicesAfter.length).toBe(1);
  });

  it('cobrança recusada abre a tolerância (grace_period) sem derrubar o plano', async () => {
    const charge = fake.addCharge(preapprovalId, 'rejected', 8700);

    const res = await notify('subscription_authorized_payment', charge.id);
    expect(JSON.parse(res.body)).toMatchObject({ processed: true, reason: 'charge_rejected' });

    const [sub] = await db.select().from(billingSubscriptions).where(eq(billingSubscriptions.tenantId, tenantId));
    expect(sub.plan).toBe('starter');
    expect(sub.status).toBe('grace_period');
    expect(sub.gracePeriodExpiresAt).toBeTruthy();

    const [invoice] = await db.select().from(billingInvoices).where(eq(billingInvoices.providerInvoiceId, charge.id));
    expect(invoice.status).toBe('uncollectible');
  });

  it('a sincronização (sem webhook) enxerga a nova cobrança aprovada e reativa', async () => {
    fake.addCharge(preapprovalId, 'approved', 8700);

    const sync = await app.inject({ method: 'POST', url: '/api/v1/billing/sync', headers: { authorization: `Bearer ${token}` } });
    expect(sync.statusCode).toBe(200);
    const body = JSON.parse(sync.body);
    expect(body.charges).toBe(1);
    expect(body.billing.subscription.status).toBe('active');

    const [sub] = await db.select().from(billingSubscriptions).where(eq(billingSubscriptions.tenantId, tenantId));
    expect(sub.status).toBe('active');
    expect(sub.gracePeriodExpiresAt).toBeNull();
  });

  it('troca de plano: nova assinatura autorizada cancela a anterior no provedor', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/billing/checkout',
      headers: { authorization: `Bearer ${token}` },
      payload: { plan: 'professional', billingCycle: 'yearly' },
    });
    expect(res.statusCode).toBe(201);
    const newId = JSON.parse(res.body).session.providerSessionId as string;
    expect(newId).not.toBe(preapprovalId);

    fake.authorize(newId, '2027-08-27T10:00:00.000Z');
    const notified = await notify('subscription_preapproval', newId);
    expect(JSON.parse(notified.body).processed).toBe(true);

    const [sub] = await db.select().from(billingSubscriptions).where(eq(billingSubscriptions.tenantId, tenantId));
    expect(sub.plan).toBe('professional');
    expect(sub.billingCycle).toBe('yearly');
    expect(sub.providerSubscriptionId).toBe(newId);
    expect(fake.statusChanges).toContainEqual({ id: preapprovalId, status: 'cancelled' });

    preapprovalId = newId;
  });

  it('pausar, retomar e cancelar pela nossa tela refletem no provedor e no banco', async () => {
    const pause = await app.inject({ method: 'POST', url: '/api/v1/billing/subscription/pause', headers: { authorization: `Bearer ${token}` } });
    expect(pause.statusCode).toBe(200);
    expect(JSON.parse(pause.body).subscription.status).toBe('suspended');

    const resume = await app.inject({ method: 'POST', url: '/api/v1/billing/subscription/resume', headers: { authorization: `Bearer ${token}` } });
    expect(JSON.parse(resume.body).subscription.status).toBe('active');

    const cancel = await app.inject({ method: 'POST', url: '/api/v1/billing/subscription/cancel', headers: { authorization: `Bearer ${token}` } });
    expect(cancel.statusCode).toBe(200);
    expect(JSON.parse(cancel.body).subscription.status).toBe('canceled');
    expect(fake.subscriptions.get(preapprovalId)!.status).toBe('cancelled');

    const [sub] = await db.select().from(billingSubscriptions).where(eq(billingSubscriptions.tenantId, tenantId));
    expect(sub.status).toBe('canceled');
    expect(sub.plan).toBe('professional'); // dados preservados; o gate de status bloqueia criação
  });

  it('evento que falhou fica no jornal e é reprocessado com sucesso quando o provedor volta', async () => {
    // Notificação de cobrança que o provedor ainda não conhece → falha, entra em retry
    const ghostId = `chg_ghost_${randomUUID().slice(0, 8)}`;
    const res = await notify('subscription_authorized_payment', ghostId);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).processed).toBe(false);

    const [failed] = await db.select().from(billingProviderEvents).where(eq(billingProviderEvents.eventType, 'subscription_authorized_payment')).then((rows) => rows.filter((r) => r.status === 'failed'));
    expect(failed).toBeTruthy();
    expect(failed.retryCount).toBe(1);
    expect(failed.nextRetryAt).toBeTruthy();

    // Provedor passa a conhecer a cobrança; reprocessar aplica.
    fake.charges.set(ghostId, { ...fake.addCharge(preapprovalId, 'approved', 23700), id: ghostId });
    const result = await BillingService.reprocessProviderEvent(failed.eventId);
    expect(result.reprocessed).toBe(true);

    const [event] = await db.select().from(billingProviderEvents).where(eq(billingProviderEvents.eventId, failed.eventId));
    expect(event.status).toBe('processed');
  });
});
