/**
 * Shell (S05) — layout de navegação: sidebar + header + área de conteúdo.
 *
 * REGRA DURA (spec S05): SÓ layout. Não importa projects/models/billing/scenarios.
 * Todo dado entra via props/children — nunca buscado aqui. Reutilizado por todos os
 * sprints de frontend até S32; mudar depois custa caro.
 *
 * Responsivo: sidebar colapsa em < 768px (drawer controlado por `navOpen`/`onToggleNav`).
 * Testado em 360px.
 */
import React from 'react';

export interface ShellNavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}

export interface ShellProps {
  brand?: React.ReactNode;
  nav?: ShellNavItem[];
  /** Conteúdo do canto direito do header (avatar, plano, etc) — injetado, não buscado. */
  headerRight?: React.ReactNode;
  /** Slot lateral abaixo da nav (ex.: UsageCard injetado pela página). */
  sidebarFooter?: React.ReactNode;
  navOpen?: boolean;
  onToggleNav?: () => void;
  children?: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({
  brand = 'Arxis',
  nav = [],
  headerRight,
  sidebarFooter,
  navOpen = false,
  onToggleNav,
  children,
}) => {
  return (
    <div
      data-testid="shell"
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--color-bg, #f9fafb)',
        color: 'var(--color-text, #111)',
      }}
    >
      {/* Sidebar */}
      <aside
        data-testid="shell-sidebar"
        data-open={navOpen ? 'true' : 'false'}
        style={{
          position: 'fixed',
          insetBlock: 0,
          insetInlineStart: 0,
          width: 240,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: 16,
          background: 'var(--color-surface, #fff)',
          borderInlineEnd: '1px solid var(--color-border, #e5e7eb)',
          transform: navOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.2s ease',
          zIndex: 30,
        }}
        // desktop: sempre visível (overridden via CSS var media; inline fallback below)
        className="shell-sidebar"
      >
        <div style={{ fontWeight: 800, fontSize: 18, padding: '4px 8px 12px' }}>{brand}</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
          {nav.map((item) => (
            <button
              key={item.id}
              type="button"
              data-testid={`shell-nav-${item.id}`}
              data-active={item.active ? 'true' : 'false'}
              onClick={item.onClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                border: 'none',
                textAlign: 'start',
                fontSize: 14,
                fontWeight: item.active ? 600 : 500,
                cursor: 'pointer',
                background: item.active ? 'var(--color-primary-soft, #eff6ff)' : 'transparent',
                color: item.active ? 'var(--color-primary, #2563EB)' : 'var(--color-text, #111)',
              }}
            >
              {item.icon && <span aria-hidden="true">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </nav>
        {sidebarFooter && <div style={{ marginTop: 'auto' }}>{sidebarFooter}</div>}
      </aside>

      {/* Backdrop mobile */}
      {navOpen && (
        <div
          data-testid="shell-backdrop"
          onClick={onToggleNav}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 20,
          }}
        />
      )}

      {/* Coluna principal */}
      <div
        className="shell-main"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}
      >
        <header
          data-testid="shell-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            height: 56,
            padding: '0 16px',
            background: 'var(--color-surface, #fff)',
            borderBlockEnd: '1px solid var(--color-border, #e5e7eb)',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <button
            type="button"
            data-testid="shell-nav-toggle"
            aria-label="Alternar menu"
            onClick={onToggleNav}
            className="shell-nav-toggle"
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: 20,
              cursor: 'pointer',
              padding: 4,
            }}
          >
            ☰
          </button>
          <div style={{ flex: 1 }} />
          {headerRight}
        </header>
        <main style={{ flex: 1, padding: 24, minWidth: 0 }}>{children}</main>
      </div>

      {/* Regras responsivas: desktop fixa sidebar e some toggle/backdrop */}
      <style>{`
        @media (min-width: 768px) {
          .shell-sidebar { transform: translateX(0) !important; }
          .shell-main { margin-inline-start: 240px; }
          .shell-nav-toggle { display: none; }
        }
      `}</style>
    </div>
  );
};
