import { useState } from 'react';
import { X, ChevronDown, ChevronRight, Shield, Zap } from 'lucide-react';
import { apiTokensService } from '@/services/apiTokens.service';
import type { CreatedApiToken } from '@/types/apiToken';

interface CreateApiTokenModalProps {
  onClose: () => void;
  onSuccess: (token: CreatedApiToken) => void;
}

interface ModulePermissions {
  name: string;
  description: string;
  icon: string;
  canRead: boolean;
  canWrite: boolean;
  expanded: boolean;
}

const MODULES: ModulePermissions[] = [
  {
    name: 'Projetos',
    description: 'Consulte ou atualize dados dos projetos.',
    icon: '📁',
    canRead: false,
    canWrite: false,
    expanded: false,
  },
  {
    name: 'Modelos 3D',
    description: 'Visualize modelos e informações BIM.',
    icon: '🧊',
    canRead: false,
    canWrite: false,
    expanded: false,
  },
  {
    name: 'Planejamento 4D',
    description: 'Consulte etapas e cronogramas de obra.',
    icon: '📅',
    canRead: false,
    canWrite: false,
    expanded: false,
  },
  {
    name: 'Orçamentos 5D',
    description: 'Consulte custos, quantitativos e orçamentos.',
    icon: '💰',
    canRead: false,
    canWrite: false,
    expanded: false,
  },
  {
    name: 'Cenários e simulações',
    description: 'Acesse comparações e versões de estudo.',
    icon: '🔀',
    canRead: false,
    canWrite: false,
    expanded: false,
  },
];

/* ── color tokens ──────────────────────────────────────────── */
const C = {
  bg:        '#151515',
  card:      '#1a1a1a',
  border:    '#2a2a2a',
  borderLit: '#333',
  text:      '#f5f5f5',
  muted:     '#999',
  mutedSoft: '#666',
  accent:    '#0066ff',
  accentDim: '#004dcc',
  accentBg:  'rgba(0,102,255,0.08)',
  danger:    '#ff6b6b',
  dangerBg:  'rgba(255,60,60,0.08)',
} as const;

export default function CreateApiTokenModal({
  onClose,
  onSuccess,
}: CreateApiTokenModalProps) {
  const [name, setName] = useState('');
  const [environment, setEnvironment] = useState<'live' | 'test'>('live');
  const [modules, setModules] = useState<ModulePermissions[]>(
    MODULES.map((m) => ({ ...m })),
  );
  const [useExpiration, setUseExpiration] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── helpers ──────────────────────────────────────────────── */
  const isModuleActive = (i: number) => modules[i].canRead || modules[i].canWrite;

  const toggleExpanded = (index: number) => {
    setModules((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], expanded: !next[index].expanded };
      return next;
    });
  };

  const toggleModulePermission = (index: number) => {
    setModules((prev) => {
      const next = [...prev];
      const mod = { ...next[index] };
      if (mod.canRead || mod.canWrite) {
        mod.canRead = false;
        mod.canWrite = false;
        mod.expanded = false;
      } else {
        mod.canRead = true;
        mod.expanded = true;
      }
      next[index] = mod;
      return next;
    });
  };

  const togglePermission = (index: number, type: 'read' | 'write') => {
    setModules((prev) => {
      const next = [...prev];
      const mod = { ...next[index] };
      if (type === 'read') {
        mod.canRead = !mod.canRead;
        if (!mod.canRead) mod.canWrite = false;
      } else {
        mod.canWrite = !mod.canWrite;
        if (mod.canWrite) mod.canRead = true;
      }
      next[index] = mod;
      return next;
    });
  };

  const getScopes = () => {
    const scopes: string[] = [];
    const keys = ['projects', 'models', 'planning', 'budgets', 'scenarios'];
    modules.forEach((m, i) => {
      if (m.canRead) scopes.push(`${keys[i]}:read`);
      if (m.canWrite) scopes.push(`${keys[i]}:write`);
    });
    return scopes;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!name.trim()) throw new Error('Nome da integração é obrigatório');
      const scopes = getScopes();
      if (scopes.length === 0) throw new Error('Escolha pelo menos uma permissão');
      const result = await apiTokensService.create({
        name: name.trim(),
        scopes: scopes as any,
        environment,
        expiresAt: useExpiration && expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar acesso');
    } finally {
      setLoading(false);
    }
  };

  const hasAnyPermission = modules.some((m) => m.canRead || m.canWrite);
  const isValid = name.trim() && hasAnyPermission;

  /* ── reusable micro-components ───────────────────────────── */
  const Checkbox = ({ checked, size = 18 }: { checked: boolean; size?: number }) => (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 4,
        border: `2px solid ${checked ? C.accent : C.mutedSoft}`,
        background: checked ? C.accent : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s ease',
        flexShrink: 0,
      }}
    >
      {checked && (
        <svg width={size - 6} height={size - 6} viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );

  const Radio = ({ checked }: { checked: boolean }) => (
    <div
      style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        border: `2px solid ${checked ? C.accent : C.mutedSoft}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s ease',
        flexShrink: 0,
      }}
    >
      {checked && (
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: C.accent,
          }}
        />
      )}
    </div>
  );

  /* ── render ───────────────────────────────────────────────── */
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 16,
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: C.bg,
          border: `1px solid ${C.border}`,
          color: C.text,
          borderRadius: 16,
          width: '100%',
          maxWidth: 680,
          maxHeight: '82vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ──────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '28px 28px 20px',
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
              Criar acesso de integração
            </h2>
            <p style={{ color: C.muted, fontSize: 14, marginTop: 6, lineHeight: 1.5 }}>
              Conecte o ArxisVR a uma ferramenta externa.<br />
              Escolha somente os acessos necessários.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: C.mutedSoft,
              cursor: 'pointer',
              padding: 4,
              borderRadius: 8,
              display: 'flex',
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
            onMouseLeave={(e) => (e.currentTarget.style.color = C.mutedSoft)}
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Scrollable Content ──────────────────────────── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 28,
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
          }}
        >
          {/* Error */}
          {error && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: C.dangerBg,
                border: `1px solid rgba(255,60,60,0.2)`,
                color: C.danger,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {/* ── Nome ──────────────────────────────────────── */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: C.text }}>
              Nome da integração
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Power BI — Relatório de obras"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 10,
                background: C.card,
                border: `1px solid ${C.border}`,
                color: C.text,
                fontSize: 14,
                outline: 'none',
                transition: 'border-color 0.15s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
              onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
            />
          </div>

          {/* ── Environment Cards ─────────────────────────── */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 10, color: C.text }}>
              Onde este acesso será usado?
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {([
                { value: 'live' as const, label: 'Produção', desc: 'Dados reais da empresa', Icon: Zap },
                { value: 'test' as const, label: 'Teste', desc: 'Ambiente seguro para desenvolvimento', Icon: Shield },
              ]).map(({ value, label, desc, Icon }) => {
                const selected = environment === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setEnvironment(value)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '16px',
                      borderRadius: 12,
                      border: `1.5px solid ${selected ? C.accent : C.border}`,
                      background: selected ? C.accentBg : C.card,
                      color: C.text,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!selected) e.currentTarget.style.borderColor = C.borderLit;
                    }}
                    onMouseLeave={(e) => {
                      if (!selected) e.currentTarget.style.borderColor = C.border;
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: selected ? C.accent : '#252525',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'background 0.15s',
                      }}
                    >
                      <Icon size={18} color={selected ? '#fff' : C.muted} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                        {selected && <span style={{ color: C.accent }}>✓ </span>}{label}
                      </div>
                      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4 }}>{desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Modules Accordion ─────────────────────────── */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 10, color: C.text }}>
              O que essa integração poderá acessar?
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {modules.map((mod, i) => {
                const active = isModuleActive(i);
                return (
                  <div
                    key={mod.name}
                    style={{
                      borderRadius: 12,
                      border: `1.5px solid ${active ? C.accent : C.border}`,
                      background: active ? C.accentBg : C.card,
                      overflow: 'hidden',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Module card header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '14px 16px',
                        cursor: 'pointer',
                        userSelect: 'none',
                      }}
                      onClick={() => toggleModulePermission(i)}
                    >
                      <Checkbox checked={active} />
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{mod.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{mod.name}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>{mod.description}</div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (active) toggleExpanded(i);
                          else toggleModulePermission(i);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: C.mutedSoft,
                          cursor: 'pointer',
                          padding: 4,
                          display: 'flex',
                          transition: 'color 0.15s',
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = C.text)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = C.mutedSoft)}
                      >
                        {mod.expanded && active ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </button>
                    </div>

                    {/* Expanded detail permissions */}
                    {mod.expanded && active && (
                      <div
                        style={{
                          padding: '0 16px 14px 52px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          borderTop: `1px solid ${C.border}`,
                          paddingTop: 12,
                        }}
                      >
                        <label
                          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                          onClick={() => togglePermission(i, 'read')}
                        >
                          <Checkbox checked={mod.canRead} size={16} />
                          <span style={{ fontSize: 13 }}>Pode consultar informações</span>
                        </label>
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            cursor: 'pointer',
                            opacity: mod.canRead ? 1 : 0.4,
                          }}
                          onClick={() => { if (mod.canRead) togglePermission(i, 'write'); }}
                        >
                          <Checkbox checked={mod.canWrite} size={16} />
                          <span style={{ fontSize: 13 }}>Pode criar ou alterar informações</span>
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Encerramento ──────────────────────────────── */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 10, color: C.text }}>
              Encerramento do acesso
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                onClick={() => setUseExpiration(false)}
              >
                <Radio checked={!useExpiration} />
                <span style={{ fontSize: 14 }}>Sem data de encerramento</span>
              </label>
              <label
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                onClick={() => setUseExpiration(true)}
              >
                <Radio checked={useExpiration} />
                <span style={{ fontSize: 14 }}>Definir uma data</span>
              </label>

              {useExpiration && (
                <div style={{ marginLeft: 32, marginTop: 4 }}>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: C.card,
                      border: `1px solid ${C.border}`,
                      color: C.text,
                      fontSize: 14,
                      outline: 'none',
                      transition: 'border-color 0.15s',
                      boxSizing: 'border-box',
                      colorScheme: 'dark',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = C.accent)}
                    onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: '20px 28px',
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: 10,
              background: C.card,
              border: `1px solid ${C.border}`,
              color: C.text,
              fontSize: 14,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.borderColor = C.borderLit;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = C.border;
            }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !isValid}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: 10,
              background: isValid ? C.accent : '#1a2a40',
              border: `1px solid ${isValid ? C.accent : '#1a2a40'}`,
              color: isValid ? '#fff' : '#4a6080',
              fontSize: 14,
              fontWeight: 600,
              cursor: !isValid || loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s',
              boxShadow: isValid ? '0 4px 16px rgba(0,102,255,0.3)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (isValid && !loading) {
                e.currentTarget.style.background = '#1a75ff';
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,102,255,0.45)';
              }
            }}
            onMouseLeave={(e) => {
              if (isValid) {
                e.currentTarget.style.background = C.accent;
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,102,255,0.3)';
              }
            }}
          >
            {loading ? 'Gerando acesso...' : 'Gerar acesso seguro'}
          </button>
        </div>
      </div>
    </div>
  );
}
