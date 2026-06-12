/**
 * UsageCard (S05) — card lateral de uso do plano.
 *
 * Mostra plano, storage, projetos e usuários consumidos vs limite, lendo de
 * GET /billing/current (que serializa `tenant_usage` do S04). Reduz suporte:
 * o usuário vê quanto do plano já usou. Estados obrigatórios: loading / empty /
 * error / success.
 */
import React from 'react';
import { getBillingService, type CurrentBillingResponse } from '../api/v1/services/billing.service';

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: CurrentBillingResponse };

function pct(used: number, limit: number): number | null {
  if (limit < 0) return null; // -1 = ilimitado
  if (limit === 0) return used > 0 ? 100 : 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function Bar({ label, used, limit, unit }: { label: string; used: number; limit: number; unit?: string }) {
  const p = pct(used, limit);
  const over = limit >= 0 && used > limit;
  const limitLabel = limit < 0 ? '∞' : `${limit}${unit ?? ''}`;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: 'var(--color-text-secondary, #555)' }}>{label}</span>
        <span style={{ color: over ? 'var(--color-danger, #dc2626)' : 'var(--color-text, #111)', fontWeight: 600 }}>
          {used}{unit ?? ''} / {limitLabel}
        </span>
      </div>
      {p !== null && (
        <div style={{ height: 6, borderRadius: 3, background: 'var(--color-surface-2, #eee)', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${p}%`,
              background: over ? 'var(--color-danger, #dc2626)' : 'var(--color-primary, #2563EB)',
              transition: 'width .3s',
            }}
          />
        </div>
      )}
    </div>
  );
}

export interface UsageCardProps {
  /** Injetável para teste; default usa o serviço real. */
  fetchCurrent?: () => Promise<CurrentBillingResponse>;
}

export const UsageCard: React.FC<UsageCardProps> = ({ fetchCurrent }) => {
  const [state, setState] = React.useState<State>({ status: 'loading' });

  React.useEffect(() => {
    let alive = true;
    const load = fetchCurrent ?? (() => getBillingService().getCurrent());
    load()
      .then((data) => alive && setState({ status: 'success', data }))
      .catch((err) => alive && setState({ status: 'error', message: err?.message || 'Falha ao carregar uso' }));
    return () => {
      alive = false;
    };
  }, [fetchCurrent]);

  const shell: React.CSSProperties = {
    border: '1px solid var(--color-border, #e5e7eb)',
    borderRadius: 12,
    padding: 16,
    background: 'var(--color-surface, #fff)',
    maxWidth: 320,
  };

  if (state.status === 'loading') {
    return <div style={shell} data-testid="usage-card-loading" aria-busy="true">Carregando uso…</div>;
  }
  if (state.status === 'error') {
    return (
      <div data-testid="usage-card-error" role="alert" style={{ ...shell, color: 'var(--color-danger, #dc2626)' }}>
        {state.message}
      </div>
    );
  }

  const { subscription, usage } = state.data;
  const { limits } = subscription;

  return (
    <div style={shell} data-testid="usage-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <strong style={{ fontSize: 15 }}>Uso do plano</strong>
        <span
          style={{
            fontSize: 12,
            textTransform: 'capitalize',
            padding: '2px 10px',
            borderRadius: 999,
            background: 'var(--color-primary-soft, #dbeafe)',
            color: 'var(--color-primary, #2563EB)',
            fontWeight: 600,
          }}
        >
          {subscription.plan}
        </span>
      </div>
      <Bar label="Projetos" used={usage.projects} limit={limits.maxProjects} />
      <Bar label="Armazenamento" used={Math.round(usage.storageGB * 10) / 10} limit={limits.maxStorageGB} unit="GB" />
      <Bar label="Usuários" used={usage.users} limit={limits.maxUsers} />
    </div>
  );
};
