import { useCallback, useEffect, useState } from 'react'
import {
  billingService,
  formatBRL,
  formatLimit,
  statusColor,
  statusLabel,
  type BillingCurrent,
  type BillingCycle,
  type BillingInvoice,
  type BillingPlan,
  type BillingTier,
} from '@/services/billing.service'

const card: React.CSSProperties = {
  background: 'var(--c-surface2)',
  border: '1px solid var(--c-border)',
  borderRadius: 'var(--r)',
  padding: '20px',
}

const label: React.CSSProperties = { fontSize: '12px', color: 'var(--c-text2)', marginBottom: '4px' }
const value: React.CSSProperties = { fontSize: '16px', fontWeight: 700, color: 'var(--c-text)' }

function button(kind: 'primary' | 'ghost' | 'danger', disabled = false): React.CSSProperties {
  return {
    padding: '10px 16px',
    background: kind === 'primary' ? 'var(--c-blue)' : 'transparent',
    color: kind === 'primary' ? '#fff' : kind === 'danger' ? 'var(--c-red)' : 'var(--c-text2)',
    border: kind === 'primary' ? 'none' : `1px solid ${kind === 'danger' ? 'var(--c-red)' : 'var(--c-border)'}`,
    borderRadius: 'var(--r)',
    fontSize: '12px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    fontFamily: 'inherit',
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

/** Barra de uso. Sem limite (-1) não há barra: não existe fração de infinito. */
function Usage({ title, used, limit, suffix = '' }: { title: string; used: number; limit: number; suffix?: string }) {
  const unlimited = limit === -1
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100))
  const over = !unlimited && used > limit

  return (
    <div>
      <div style={label}>{title}</div>
      <div style={{ ...value, color: over ? 'var(--c-red)' : 'var(--c-text)' }}>
        {used}{suffix} / {formatLimit(limit, suffix)}
      </div>
      {!unlimited && (
        <div style={{ marginTop: '6px', height: '4px', background: 'var(--c-surface3)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: over ? 'var(--c-red)' : 'var(--c-blue)' }} />
        </div>
      )}
    </div>
  )
}

export default function BillingPage() {
  const [current, setCurrent] = useState<BillingCurrent | null>(null)
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [invoices, setInvoices] = useState<BillingInvoice[]>([])
  const [cycle, setCycle] = useState<BillingCycle>('monthly')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [currentData, plansData, invoicesData] = await Promise.all([
        billingService.getCurrent(),
        billingService.listPlans(),
        billingService.listInvoices().catch(() => [] as BillingInvoice[]),
      ])
      setCurrent(currentData)
      setPlans(plansData.plans)
      setInvoices(invoicesData)
      setCycle(currentData.subscription.billingCycle)
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar a cobrança')
    } finally {
      setLoading(false)
    }
  }, [])

  // Voltou da página do cartão do Mercado Pago: sincroniza antes de desenhar.
  // A notificação do provedor não é garantida, então sem isto o cliente pagaria
  // e continuaria vendo o plano antigo até o worker de 6h rodar.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const returned = params.get('billing')

    if (returned === 'success') {
      params.delete('billing')
      const query = params.toString()
      window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
      setNotice('Confirmando seu cadastro no Mercado Pago...')
      billingService
        .sync()
        .then((billing) => {
          setCurrent(billing)
          setNotice('Assinatura confirmada.')
        })
        .catch((err: any) => setError(err?.message || 'Não conseguimos confirmar agora. Tente "Verificar agora".'))
        .finally(() => void load())
      return
    }

    if (returned === 'cancel') {
      params.delete('billing')
      const query = params.toString()
      window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
      setNotice('Cadastro do cartão não foi concluído. Seu plano não mudou.')
    }

    void load()
  }, [load])

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key)
    setError(null)
    setNotice(null)
    try {
      await action()
    } catch (err: any) {
      setError(err?.message || 'A operação falhou')
    } finally {
      setBusy(null)
    }
  }

  function subscribe(tier: BillingTier) {
    return run(`checkout:${tier}`, async () => {
      const { checkoutUrl } = await billingService.createCheckout(tier, cycle)
      if (checkoutUrl) {
        // O cartão é cadastrado no domínio do Mercado Pago, nunca aqui.
        window.location.href = checkoutUrl
        return
      }
      // Plano gratuito não gera link: o backend já trocou o plano.
      await load()
      setNotice('Plano atualizado.')
    })
  }

  if (loading) {
    return <div style={{ ...card, color: 'var(--c-text2)', fontSize: '12px' }}>Carregando cobrança...</div>
  }

  if (!current) {
    return (
      <div style={card}>
        <div style={{ fontSize: '12px', color: 'var(--c-red)', marginBottom: '12px' }}>{error}</div>
        <button style={button('ghost')} onClick={() => void load()}>Tentar de novo</button>
      </div>
    )
  }

  const { subscription, usage, pendingCheckout } = current
  const isPaid = subscription.amountCents > 0 && subscription.provider !== 'internal'

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {notice && (
        <div style={{ ...card, padding: '12px 14px', fontSize: '12px', color: 'var(--c-text)' }}>{notice}</div>
      )}
      {error && (
        <div style={{ ...card, padding: '12px 14px', fontSize: '12px', color: 'var(--c-red)', borderColor: 'var(--c-red)' }}>{error}</div>
      )}

      {pendingCheckout?.checkoutUrl && (
        <div style={{ ...card, borderColor: 'var(--c-blue)' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--c-text)', marginBottom: '6px' }}>
            Cadastro de cartão pendente
          </div>
          <div style={{ fontSize: '12px', color: 'var(--c-text2)', marginBottom: '12px' }}>
            Você começou a assinar o plano {plans.find((p) => p.tier === pendingCheckout.plan)?.name ?? pendingCheckout.plan} e o cartão ainda não foi cadastrado no Mercado Pago.
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <a href={pendingCheckout.checkoutUrl} style={{ ...button('primary'), textDecoration: 'none', display: 'inline-block' }}>
              Concluir cadastro do cartão
            </a>
            <button
              style={button('ghost', busy === 'sync')}
              disabled={busy === 'sync'}
              onClick={() => run('sync', async () => { setCurrent(await billingService.sync()); setNotice('Situação atualizada.') })}
            >
              {busy === 'sync' ? 'Verificando...' : 'Já paguei, verificar agora'}
            </button>
          </div>
        </div>
      )}

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--c-text)' }}>Plano atual</h3>
          <button
            style={button('ghost', busy === 'sync')}
            disabled={busy === 'sync'}
            onClick={() => run('sync', async () => { setCurrent(await billingService.sync()); setNotice('Situação atualizada.') })}
          >
            {busy === 'sync' ? 'Verificando...' : 'Verificar agora'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
          <div>
            <div style={label}>Plano</div>
            <div style={value}>{plans.find((p) => p.tier === subscription.plan)?.name ?? subscription.plan}</div>
          </div>
          <div>
            <div style={label}>Situação</div>
            <div style={{ ...value, color: statusColor(subscription.status) }}>{statusLabel(subscription.status)}</div>
          </div>
          <div>
            <div style={label}>Valor</div>
            <div style={value}>
              {subscription.amountCents === 0 ? 'Grátis' : `${formatBRL(subscription.amountCents)}/${subscription.billingCycle === 'yearly' ? 'ano' : 'mês'}`}
            </div>
          </div>
          <div>
            <div style={label}>{subscription.cancelAtPeriodEnd ? 'Encerra em' : 'Renova em'}</div>
            <div style={value}>{formatDate(subscription.currentPeriodEnd)}</div>
          </div>
          <Usage title="Usuários" used={usage.users} limit={subscription.limits.maxUsers} />
          <Usage title="Projetos" used={usage.projects} limit={subscription.limits.maxProjects} />
          <Usage title="Armazenamento" used={usage.storageGB} limit={subscription.limits.maxStorageGB} suffix=" GB" />
        </div>

        {isPaid && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
            {subscription.status === 'paused' ? (
              <button
                style={button('ghost', busy === 'resume')}
                disabled={busy === 'resume'}
                onClick={() => run('resume', async () => { setCurrent(await billingService.subscriptionAction('resume')); setNotice('Assinatura retomada.') })}
              >
                Retomar assinatura
              </button>
            ) : (
              <button
                style={button('ghost', busy === 'pause')}
                disabled={busy === 'pause'}
                onClick={() => run('pause', async () => { setCurrent(await billingService.subscriptionAction('pause')); setNotice('Assinatura pausada.') })}
              >
                Pausar assinatura
              </button>
            )}
            <button
              style={button('danger', busy === 'cancel')}
              disabled={busy === 'cancel'}
              onClick={() => {
                if (!window.confirm('Cancelar a assinatura? O plano volta para o Free ao fim do período pago.')) return
                void run('cancel', async () => { setCurrent(await billingService.subscriptionAction('cancel')); setNotice('Assinatura cancelada.') })
              }}
            >
              Cancelar assinatura
            </button>
          </div>
        )}
      </div>

      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--c-text)' }}>Planos</h3>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['monthly', 'yearly'] as BillingCycle[]).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                style={{
                  ...button(cycle === c ? 'primary' : 'ghost'),
                  padding: '6px 12px',
                }}
              >
                {c === 'monthly' ? 'Mensal' : 'Anual'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
          {plans.map((plan) => {
            const isCurrent = plan.tier === subscription.plan
            const cents = cycle === 'yearly' ? plan.yearlyAmountCents : plan.monthlyAmountCents
            return (
              <div
                key={plan.tier}
                style={{
                  border: `1px solid ${isCurrent ? 'var(--c-blue)' : 'var(--c-border)'}`,
                  borderRadius: 'var(--r)',
                  padding: '14px',
                  background: 'var(--c-surface)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--c-text)' }}>{plan.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--c-text3)', marginTop: '2px' }}>{plan.description}</div>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--c-text)' }}>
                  {cents === 0 ? 'Grátis' : formatBRL(cents)}
                  {cents > 0 && (
                    <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--c-text3)' }}>
                      {cycle === 'yearly' ? '/ano' : '/mês'}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--c-text2)', lineHeight: 1.7 }}>
                  {formatLimit(plan.limits.maxUsers)} usuários<br />
                  {formatLimit(plan.limits.maxProjects)} projetos<br />
                  {formatLimit(plan.limits.maxStorageGB, ' GB')} de armazenamento<br />
                  Arquivo de até {formatLimit(plan.limits.maxFileSizeMB, ' MB')}
                </div>
                <button
                  style={{ ...button(isCurrent ? 'ghost' : 'primary', isCurrent || busy === `checkout:${plan.tier}`), marginTop: 'auto' }}
                  disabled={isCurrent || busy === `checkout:${plan.tier}`}
                  onClick={() => void subscribe(plan.tier)}
                >
                  {isCurrent ? 'Plano atual' : busy === `checkout:${plan.tier}` ? 'Abrindo...' : 'Assinar'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--c-border)' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--c-text)' }}>Cobranças</h3>
        </div>
        {invoices.length === 0 ? (
          <div style={{ padding: '14px', fontSize: '12px', color: 'var(--c-text3)' }}>Nenhuma cobrança ainda.</div>
        ) : (
          invoices.map((invoice, idx) => (
            <div
              key={invoice.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                padding: '10px 14px',
                borderBottom: idx < invoices.length - 1 ? '1px solid var(--c-border)' : 'none',
              }}
            >
              <div>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--c-text)' }}>
                  {formatBRL(invoice.totalCents)}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--c-text3)' }}>
                  {invoice.paidAt ? `Pago em ${formatDate(invoice.paidAt)}` : `Vence em ${formatDate(invoice.dueAt)}`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: statusColor(invoice.status) }}>
                  {statusLabel(invoice.status)}
                </span>
                {invoice.hostedInvoiceUrl && (
                  <a
                    href={invoice.hostedInvoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '11px', color: 'var(--c-blue)', textDecoration: 'none' }}
                  >
                    Ver
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
