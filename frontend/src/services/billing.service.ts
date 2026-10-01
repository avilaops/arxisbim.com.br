import { buildApiV1Url } from '@/config/apiBaseUrl';

export type BillingTier = 'free' | 'starter' | 'professional' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';

export interface BillingLimits {
  maxUsers: number;
  maxProjects: number;
  maxStorageGB: number;
  maxFileSizeMB: number;
  collaboratorsPerSession: number;
  apiCallsPerMonth: number;
  maxScenarios: number;
}

export interface BillingPlan {
  tier: BillingTier;
  name: string;
  description: string;
  monthlyAmountCents: number;
  yearlyAmountCents: number;
  currency: string;
  features: string[];
  limits: BillingLimits;
}

export interface BillingSubscription {
  id: string | null;
  plan: BillingTier;
  status: string;
  billingCycle: BillingCycle;
  currency: string;
  amountCents: number;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  trialEndsAt: string | null;
  gracePeriodExpiresAt: string | null;
  cancelAtPeriodEnd: boolean;
  provider: string;
  features: string[];
  limits: BillingLimits;
}

/** Cadastro de cartão iniciado e ainda não confirmado pelo provedor. */
export interface PendingCheckout {
  id: string;
  plan: BillingTier;
  billingCycle: BillingCycle;
  checkoutUrl: string | null;
}

export interface BillingCurrent {
  tenantId: string;
  tenantName: string;
  subscription: BillingSubscription;
  pendingCheckout: PendingCheckout | null;
  usage: { users: number; projects: number; storageGB: number };
  overLimit: { users: boolean; projects: boolean; storage: boolean };
}

export interface BillingInvoice {
  id: string;
  status: string;
  currency: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  dueAt: string | null;
  paidAt: string | null;
  hostedInvoiceUrl: string | null;
  createdAt: string;
}

function authHeaders(json = false): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${localStorage.getItem('arxisvr_token')}`,
  };
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

/**
 * Lê a mensagem que a API mandou em vez de jogar um "Failed to fetch" genérico.
 * O billing recusa por motivo concreto (permissão, assinatura inexistente, erro
 * do provedor) e esse motivo é o que o cliente precisa ler na tela.
 */
async function readError(response: Response, fallback: string): Promise<never> {
  let detail = '';
  try {
    const body = await response.json();
    detail = body?.message || body?.error || '';
  } catch {
    /* resposta sem corpo JSON */
  }
  throw new Error(detail || fallback);
}

export const billingService = {
  async listPlans(): Promise<{ plans: BillingPlan[]; provider: string }> {
    const response = await fetch(buildApiV1Url('/billing/plans'));
    if (!response.ok) await readError(response, 'Não foi possível carregar os planos');
    return response.json();
  },

  async getCurrent(): Promise<BillingCurrent> {
    const response = await fetch(buildApiV1Url('/billing/current'), { headers: authHeaders() });
    if (!response.ok) await readError(response, 'Não foi possível carregar sua assinatura');
    return response.json();
  },

  async listInvoices(): Promise<BillingInvoice[]> {
    const response = await fetch(buildApiV1Url('/billing/invoices'), { headers: authHeaders() });
    if (!response.ok) await readError(response, 'Não foi possível carregar as cobranças');
    const body = await response.json();
    return body.invoices ?? [];
  },

  /**
   * Abre a assinatura no provedor e devolve o link onde o cliente cadastra o
   * cartão. Nenhum dado de cartão passa pelo ArxisVR.
   */
  async createCheckout(plan: BillingTier, billingCycle: BillingCycle): Promise<{ checkoutUrl: string | null }> {
    const response = await fetch(buildApiV1Url('/billing/checkout'), {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ plan, billingCycle }),
    });
    if (!response.ok) await readError(response, 'Não foi possível iniciar a assinatura');
    const body = await response.json();
    return { checkoutUrl: body.checkoutUrl ?? body.session?.checkoutUrl ?? null };
  },

  /**
   * Relê no provedor o estado real da assinatura. A notificação do Mercado Pago
   * não é garantida, então o retorno da página do cartão chama isto para o
   * plano ativar na hora.
   */
  async sync(): Promise<BillingCurrent> {
    const response = await fetch(buildApiV1Url('/billing/sync'), {
      method: 'POST',
      headers: authHeaders(true),
      body: '{}',
    });
    if (!response.ok) await readError(response, 'Não foi possível sincronizar com o provedor');
    const body = await response.json();
    return body.billing;
  },

  async subscriptionAction(action: 'pause' | 'resume' | 'cancel'): Promise<BillingCurrent> {
    const response = await fetch(buildApiV1Url(`/billing/subscription/${action}`), {
      method: 'POST',
      headers: authHeaders(true),
      body: '{}',
    });
    if (!response.ok) await readError(response, `Não foi possível ${action === 'pause' ? 'pausar' : action === 'resume' ? 'retomar' : 'cancelar'} a assinatura`);
    return response.json();
  },
};

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** -1 no contrato da API significa ilimitado. */
export function formatLimit(value: number, suffix = ''): string {
  return value === -1 ? 'Ilimitado' : `${value}${suffix}`;
}

const STATUS_LABELS: Record<string, string> = {
  trialing: 'Em teste',
  active: 'Ativo',
  past_due: 'Pagamento atrasado',
  grace_period: 'Em tolerância',
  suspended: 'Suspenso',
  canceled: 'Cancelado',
  incomplete: 'Cadastro incompleto',
  unpaid: 'Não pago',
  paused: 'Pausado',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function statusColor(status: string): string {
  if (status === 'active' || status === 'trialing') return 'var(--c-green)';
  if (status === 'canceled' || status === 'suspended' || status === 'unpaid') return 'var(--c-red)';
  // Não há token de aviso no tema; o texto ao lado diz o que está acontecendo.
  return 'var(--c-text)';
}
