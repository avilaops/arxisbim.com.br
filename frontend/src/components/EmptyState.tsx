/**
 * EmptyState (S05) — dashboard vazio.
 *
 * Vende VALOR (IFC → decisão de prazo/custo), não a ação de upload. É a primeira
 * coisa que um cliente enterprise vê numa demo — comunica a tese do produto.
 * Presentational: copy default da S05, override via props.
 */
import React from 'react';

export interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Transforme seu modelo BIM em cenários de prazo e custo.',
  subtitle = 'Faça upload do seu primeiro IFC para começar.',
  ctaLabel = 'Fazer upload de modelo IFC',
  onCta,
  icon,
}) => {
  return (
    <div
      data-testid="empty-state"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 12,
        padding: '48px 24px',
        maxWidth: 480,
        margin: '0 auto',
      }}
    >
      <div style={{ fontSize: 40, lineHeight: 1 }} aria-hidden="true">{icon ?? '🏗️'}</div>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--color-text, #111)' }}>{title}</h2>
      <p style={{ margin: 0, fontSize: 15, color: 'var(--color-text-secondary, #6b7280)' }}>{subtitle}</p>
      {onCta && (
        <button
          type="button"
          data-testid="empty-state-cta"
          onClick={onCta}
          style={{
            marginTop: 8,
            padding: '12px 24px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--color-primary, #2563EB)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
};
