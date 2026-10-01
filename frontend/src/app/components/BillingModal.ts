import { getBillingService, type BillingCycle, type BillingPlan, type CurrentBillingResponse } from '../../api/v1/services/billing.service';

interface BillingState {
  cycle: BillingCycle;
  plans: BillingPlan[];
  current: CurrentBillingResponse | null;
  history: Array<Record<string, any>>;
  loading: boolean;
  notice: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  trialing: 'Em teste',
  active: 'Ativa',
  past_due: 'Pagamento pendente',
  grace_period: 'Pagamento recusado — em tolerância',
  suspended: 'Pausada',
  canceled: 'Cancelada',
  incomplete: 'Aguardando cartão',
  unpaid: 'Não paga',
};

const INVOICE_STATUS_LABEL: Record<string, string> = {
  paid: 'Paga',
  open: 'Em aberto',
  uncollectible: 'Recusada',
  void: 'Cancelada',
  draft: 'Rascunho',
};

function formatCurrencyBRL(amountCents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amountCents / 100);
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('pt-BR');
}

const BUTTON = 'padding:8px 12px;border-radius:999px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;cursor:pointer;';
const BUTTON_DANGER = 'padding:8px 12px;border-radius:999px;border:1px solid #fecaca;background:#fff;color:#991b1b;cursor:pointer;';
const BUTTON_PRIMARY = 'padding:8px 12px;border-radius:999px;border:1px solid #0f172a;background:#0f172a;color:#fff;cursor:pointer;';

export class BillingModal {
  private modalEl: HTMLDivElement;
  private contentEl: HTMLDivElement;
  private state: BillingState = {
    cycle: 'monthly',
    plans: [],
    current: null,
    history: [],
    loading: false,
    notice: null,
  };

  constructor() {
    this.modalEl = document.createElement('div');
    this.modalEl.style.cssText = [
      'position: fixed',
      'inset: 0',
      'background: rgba(15,23,42,0.5)',
      'display: none',
      'align-items: center',
      'justify-content: center',
      'z-index: 10000',
      'padding: 20px',
    ].join(';');

    this.contentEl = document.createElement('div');
    this.contentEl.style.cssText = [
      'width: min(960px, 100%)',
      'max-height: 90vh',
      'overflow: auto',
      'background: #fff',
      'border-radius: 16px',
      'border: 1px solid #e2e8f0',
      'box-shadow: 0 20px 50px rgba(0,0,0,0.18)',
      'padding: 18px',
      'font-family: "DM Sans", sans-serif',
    ].join(';');

    this.modalEl.appendChild(this.contentEl);
    document.body.appendChild(this.modalEl);

    this.modalEl.addEventListener('click', (event) => {
      if (event.target === this.modalEl) {
        this.close();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.modalEl.style.display === 'flex') {
        this.close();
      }
    });

    this.render();

    // Voltou da página do cartão do Mercado Pago: sincroniza e abre o modal
    // para o cliente ver o plano ativo — sem depender da notificação chegar.
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') === 'success') {
      params.delete('billing');
      const query = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
      this.state.notice = 'Confirmando seu cadastro no Mercado Pago…';
      void this.open({ sync: true });
    }
  }

  async open(options: { sync?: boolean } = {}) {
    this.modalEl.style.display = 'flex';
    await this.refresh(options);
  }

  close() {
    this.modalEl.style.display = 'none';
  }

  async refresh(options: { sync?: boolean } = {}) {
    const token = localStorage.getItem('arxisvr_token');
    if (!token) {
      this.state.current = null;
      this.state.history = [];
      this.state.plans = [];
      this.render('Faça login para acessar Billing.');
      return;
    }

    this.state.loading = true;
    this.render();

    try {
      const service = getBillingService();

      if (options.sync) {
        try {
          const synced = await service.sync();
          this.state.notice = synced.billing.subscription.status === 'active'
            ? 'Assinatura confirmada no Mercado Pago.'
            : synced.billing.pendingCheckout
              ? 'Ainda não recebemos a confirmação do cartão. Se você concluiu o cadastro, aguarde alguns instantes e sincronize de novo.'
              : null;
        } catch (error: any) {
          this.state.notice = error?.message || 'Não foi possível sincronizar com o Mercado Pago agora.';
        }
      }

      const [plans, current, history] = await Promise.all([
        service.getPlans(),
        service.getCurrent(),
        service.getHistory(),
      ]);

      this.state.plans = plans;
      this.state.current = current;
      this.state.history = history.invoices || [];
      this.state.cycle = (current?.subscription?.billingCycle || 'monthly') as BillingCycle;
      this.state.loading = false;
      this.render();
    } catch (error: any) {
      this.state.loading = false;
      this.render(error?.message || 'Falha ao carregar dados de billing.');
    }
  }

  private async subscribe(plan: string) {
    try {
      const service = getBillingService();
      const checkout = await service.createCheckout({
        plan: plan as any,
        billingCycle: this.state.cycle,
      });

      if (checkout.checkoutUrl) {
        try {
          (window as any).arxis?.track('subscription_started', {
            plan: plan,
            cycle: this.state.cycle,
            provider: checkout.provider,
          });
          (window as any).arxis?.flush();
        } catch (e) { /* ignora: falha aqui não impede o fluxo */ }
        window.location.href = checkout.checkoutUrl;
        return;
      }

      alert('Checkout criado. Aguarde processamento interno do plano.');
      await this.refresh();
    } catch (error: any) {
      alert(error?.message || 'Não foi possível iniciar checkout.');
    }
  }

  private async runSubscriptionAction(action: 'pause' | 'resume' | 'cancel') {
    const service = getBillingService();
    const confirmations: Record<typeof action, string | null> = {
      pause: 'Pausar a assinatura? O Mercado Pago para de cobrar e o workspace fica somente leitura até você retomar.',
      resume: null,
      cancel: 'Cancelar a assinatura? A cobrança para no Mercado Pago. Seus dados ficam preservados, mas o workspace deixa de criar novos recursos.',
    };
    const message = confirmations[action];
    if (message && !window.confirm(message)) return;

    try {
      this.state.loading = true;
      this.render();
      const current = action === 'pause'
        ? await service.pauseSubscription()
        : action === 'resume'
          ? await service.resumeSubscription()
          : await service.cancelSubscription();
      this.state.current = current;
      this.state.notice = action === 'pause'
        ? 'Assinatura pausada.'
        : action === 'resume'
          ? 'Assinatura retomada.'
          : 'Assinatura cancelada.';
      await this.refresh();
    } catch (error: any) {
      this.state.loading = false;
      this.render(error?.message || 'Não foi possível alterar a assinatura.');
    }
  }

  private async openPortal() {
    try {
      const service = getBillingService();
      const portal = await service.createPortal();
      if (portal.pendingCheckoutUrl) {
        window.location.href = portal.pendingCheckoutUrl;
        return;
      }
      if (portal.portalUrl) {
        window.open(portal.portalUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error: any) {
      alert(error?.message || 'Não foi possível abrir a gestão da assinatura.');
    }
  }

  private renderSubscriptionActions(): string {
    const subscription = this.state.current?.subscription;
    const pending = this.state.current?.pendingCheckout;

    if (pending?.checkoutUrl) {
      return `
        <a id="billing-finish-card" href="${pending.checkoutUrl}" style="${BUTTON_PRIMARY}text-decoration:none;">Concluir cadastro do cartão</a>
        <button id="billing-sync" style="${BUTTON}">Já cadastrei — sincronizar</button>
      `;
    }

    if (subscription?.provider === 'mercadopago' && subscription.providerSubscriptionId) {
      if (subscription.status === 'suspended') {
        return `<button id="billing-resume" style="${BUTTON_PRIMARY}">Retomar assinatura</button>
                <button id="billing-cancel" style="${BUTTON_DANGER}">Cancelar assinatura</button>`;
      }
      if (subscription.status !== 'canceled') {
        return `<button id="billing-pause" style="${BUTTON}">Pausar</button>
                <button id="billing-cancel" style="${BUTTON_DANGER}">Cancelar assinatura</button>
                <button id="billing-sync" style="${BUTTON}">Sincronizar</button>`;
      }
      return '';
    }

    return `<button id="billing-open-portal" style="${BUTTON}">Gerenciar assinatura</button>`;
  }

  private render(errorMessage?: string) {
    const subscription = this.state.current?.subscription;
    const currentPlan = subscription?.plan;
    const nextBilling = subscription?.currentPeriodEnd;
    const loading = this.state.loading;
    const statusLabel = subscription ? (STATUS_LABEL[subscription.status] || subscription.status) : '—';
    const isProvider = subscription?.provider === 'mercadopago';

    this.contentEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;">
        <div>
          <h2 style="margin:0;font-size:22px;color:#0f172a;">Billing</h2>
          <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Plano atual, assinatura e histórico de pagamentos</p>
        </div>
        <button id="billing-close-btn" style="border:none;background:#f1f5f9;color:#0f172a;border-radius:999px;padding:8px 12px;cursor:pointer;">Fechar</button>
      </div>

      ${errorMessage ? `<div style="padding:10px 12px;background:#fee2e2;border:1px solid #fecaca;color:#991b1b;border-radius:10px;margin-bottom:12px;">${errorMessage}</div>` : ''}
      ${this.state.notice ? `<div style="padding:10px 12px;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;border-radius:10px;margin-bottom:12px;">${this.state.notice}</div>` : ''}

      <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:14px;">
        <div style="display:flex;gap:8px;align-items:center;">
          <button id="billing-cycle-monthly" style="padding:8px 12px;border-radius:999px;border:1px solid ${this.state.cycle === 'monthly' ? '#0f172a' : '#cbd5e1'};background:${this.state.cycle === 'monthly' ? '#0f172a' : '#fff'};color:${this.state.cycle === 'monthly' ? '#fff' : '#0f172a'};cursor:pointer;">Mensal</button>
          <button id="billing-cycle-yearly" style="padding:8px 12px;border-radius:999px;border:1px solid ${this.state.cycle === 'yearly' ? '#0f172a' : '#cbd5e1'};background:${this.state.cycle === 'yearly' ? '#0f172a' : '#fff'};color:${this.state.cycle === 'yearly' ? '#fff' : '#0f172a'};cursor:pointer;">Anual</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">${this.renderSubscriptionActions()}</div>
      </div>

      <div style="padding:12px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;margin-bottom:14px;">
        <div style="font-size:12px;color:#64748b;">Plano atual</div>
        <div style="font-size:18px;font-weight:700;color:#0f172a;text-transform:capitalize;">${currentPlan || 'free'}</div>
        <div style="font-size:12px;color:#64748b;">Situação: ${statusLabel} · Próxima cobrança: ${formatDate(nextBilling)}</div>
        ${isProvider ? '<div style="font-size:12px;color:#64748b;">Cobrança recorrente via Mercado Pago — cartão cadastrado na página deles, nada fica no Arxis.</div>' : ''}
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:14px;">
        ${loading ? '<div style="padding:16px;border:1px solid #e2e8f0;border-radius:12px;">Carregando planos...</div>' : this.state.plans.map((plan) => {
          const price = this.state.cycle === 'yearly' ? plan.prices.yearly : plan.prices.monthly;
          const isCurrent = currentPlan === plan.tier;

          return `
            <div style="padding:14px;border:1px solid ${isCurrent ? '#0f172a' : '#e2e8f0'};border-radius:12px;background:${isCurrent ? '#f8fafc' : '#fff'};">
              <div style="font-size:12px;color:#64748b;text-transform:uppercase;">${plan.tier}</div>
              <div style="font-size:16px;font-weight:700;color:#0f172a;margin:4px 0;">${plan.name}</div>
              <div style="font-size:20px;font-weight:800;color:#0f172a;">${formatCurrencyBRL(price)}</div>
              <div style="font-size:12px;color:#64748b;">${this.state.cycle === 'yearly' ? 'ao ano' : 'ao mês'}</div>
              <button class="billing-subscribe-btn" data-plan="${plan.tier}" style="margin-top:10px;width:100%;padding:8px 10px;border-radius:999px;border:1px solid #0f172a;background:${isCurrent ? '#e2e8f0' : '#0f172a'};color:${isCurrent ? '#0f172a' : '#fff'};cursor:${isCurrent ? 'default' : 'pointer'};" ${isCurrent ? 'disabled' : ''}>
                ${isCurrent ? 'Plano atual' : 'Assinar'}
              </button>
            </div>
          `;
        }).join('')}
      </div>

      <div style="padding:12px;border:1px solid #e2e8f0;border-radius:12px;">
        <div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:8px;">Histórico de pagamentos</div>
        <div style="display:grid;gap:6px;max-height:200px;overflow:auto;">
          ${this.state.history.length === 0 ? '<div style="font-size:12px;color:#64748b;">Nenhum pagamento encontrado.</div>' : this.state.history.map((invoice) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff;">
              <div style="font-size:12px;color:#0f172a;">${formatDate(invoice.paidAt || invoice.dueAt || invoice.createdAt)} · ${invoice.providerInvoiceId ? `cobrança ${invoice.providerInvoiceId}` : invoice.id}</div>
              <div style="font-size:12px;color:#64748b;">${formatCurrencyBRL(invoice.totalCents || 0)}</div>
              <div style="font-size:12px;color:${invoice.status === 'paid' ? '#15803d' : '#b45309'};">${INVOICE_STATUS_LABEL[invoice.status] || invoice.status || 'Em aberto'}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const closeBtn = this.contentEl.querySelector('#billing-close-btn') as HTMLButtonElement | null;
    closeBtn?.addEventListener('click', () => this.close());

    const monthlyBtn = this.contentEl.querySelector('#billing-cycle-monthly') as HTMLButtonElement | null;
    const yearlyBtn = this.contentEl.querySelector('#billing-cycle-yearly') as HTMLButtonElement | null;
    monthlyBtn?.addEventListener('click', () => {
      this.state.cycle = 'monthly';
      this.render(errorMessage);
    });
    yearlyBtn?.addEventListener('click', () => {
      this.state.cycle = 'yearly';
      this.render(errorMessage);
    });

    const portalBtn = this.contentEl.querySelector('#billing-open-portal') as HTMLButtonElement | null;
    portalBtn?.addEventListener('click', () => this.openPortal());

    const syncBtn = this.contentEl.querySelector('#billing-sync') as HTMLButtonElement | null;
    syncBtn?.addEventListener('click', () => {
      this.state.notice = null;
      void this.refresh({ sync: true });
    });

    const pauseBtn = this.contentEl.querySelector('#billing-pause') as HTMLButtonElement | null;
    pauseBtn?.addEventListener('click', () => this.runSubscriptionAction('pause'));

    const resumeBtn = this.contentEl.querySelector('#billing-resume') as HTMLButtonElement | null;
    resumeBtn?.addEventListener('click', () => this.runSubscriptionAction('resume'));

    const cancelBtn = this.contentEl.querySelector('#billing-cancel') as HTMLButtonElement | null;
    cancelBtn?.addEventListener('click', () => this.runSubscriptionAction('cancel'));

    const subscribeButtons = this.contentEl.querySelectorAll('.billing-subscribe-btn');
    subscribeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const plan = (button as HTMLElement).getAttribute('data-plan');
        if (!plan) return;
        this.subscribe(plan);
      });
    });
  }
}
