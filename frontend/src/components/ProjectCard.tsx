/**
 * ProjectCard (S05) — card de projeto no dashboard.
 *
 * Presentational: recebe tudo via props, não busca dados (regra do Shell).
 * Cobre o estado mais comum entre S07 e S11: uploading / processing / ready /
 * failed (+ empty = projeto sem modelo ainda).
 */
import React from 'react';

export type ProjectStatus = 'empty' | 'uploading' | 'processing' | 'ready' | 'failed';

const STATUS_META: Record<ProjectStatus, { label: string; color: string; bg: string }> = {
  empty:      { label: 'Sem modelo',  color: 'var(--color-text-secondary, #6b7280)', bg: 'var(--color-surface-2, #f3f4f6)' },
  uploading:  { label: 'Enviando',    color: 'var(--color-primary, #2563EB)',        bg: 'var(--color-primary-soft, #dbeafe)' },
  processing: { label: 'Processando', color: 'var(--color-warning, #b45309)',        bg: 'var(--color-warning-soft, #fef3c7)' },
  ready:      { label: 'Pronto',      color: 'var(--color-success, #15803d)',        bg: 'var(--color-success-soft, #dcfce7)' },
  failed:     { label: 'Falhou',      color: 'var(--color-danger, #dc2626)',         bg: 'var(--color-danger-soft, #fee2e2)' },
};

export interface ProjectCardProps {
  name: string;
  status: ProjectStatus;
  /** 0–100; só usado em uploading/processing. */
  progress?: number;
  description?: string;
  updatedAt?: string;
  onOpen?: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ name, status, progress, description, updatedAt, onOpen }) => {
  const meta = STATUS_META[status] ?? STATUS_META.empty;
  const showBar = (status === 'uploading' || status === 'processing') && typeof progress === 'number';

  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid="project-card"
      data-status={status}
      style={{
        textAlign: 'left',
        width: '100%',
        border: '1px solid var(--color-border, #e5e7eb)',
        borderRadius: 12,
        padding: 16,
        background: 'var(--color-surface, #fff)',
        cursor: onOpen ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <strong style={{ fontSize: 15, color: 'var(--color-text, #111)', wordBreak: 'break-word' }}>{name}</strong>
        <span
          data-testid="project-status-badge"
          style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 999, color: meta.color, background: meta.bg }}
        >
          {meta.label}
        </span>
      </div>

      {description && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary, #6b7280)' }}>{description}</p>
      )}

      {showBar && (
        <div style={{ height: 6, borderRadius: 3, background: 'var(--color-surface-2, #f3f4f6)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, progress!))}%`, background: meta.color, transition: 'width .3s' }} />
        </div>
      )}

      {updatedAt && (
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary, #9ca3af)' }}>
          {new Date(updatedAt).toLocaleDateString('pt-BR')}
        </span>
      )}
    </button>
  );
};
