import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import ArxisIcon, { type ArxisIconName } from '@/components/ui/ArxisIcon'

interface SidebarProps {
  collapsed: boolean
  onToggle: (collapsed: boolean) => void
  /** Drawer mobile aberto (estado separado do "recolhida" do desktop). */
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export default function Sidebar({ collapsed, onToggle, mobileOpen = false, onMobileClose }: SidebarProps) {
  const [manageOpen, setManageOpen] = useState(() => {
    return localStorage.getItem('arxisvr_manage_open') === '1'
  })
  const location = useLocation()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    try {
      const userData = localStorage.getItem('arxisvr_user')
      if (userData) {
        setUser(JSON.parse(userData))
      }
    } catch { /* ignora: falha aqui não impede o fluxo */ }
  }, [])

  useEffect(() => {
    localStorage.setItem('arxisvr_manage_open', manageOpen ? '1' : '0')
  }, [manageOpen])

  const isAdmin = user?.role === 'admin' || user?.role === 'owner'
  const isDashboard = location.pathname === '/dashboard' && location.hash !== '#recentes'

  const NavItem = ({ href, icon, label, active = false }: { href: string; icon: ArxisIconName; label: string; active?: boolean }) => (
    <Link
      to={href}
      className="sidebar-item"
      title={collapsed ? label : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '9px',
        padding: '6px 14px',
        fontSize: '13px',
        fontWeight: active ? 500 : 400,
        color: active ? 'var(--c-text)' : 'var(--c-text2)',
        cursor: 'pointer',
        borderLeft: `2px solid ${active ? 'var(--c-blue)' : 'transparent'}`,
        transition: 'color .12s, background .12s',
        background: active ? 'var(--c-blue-dim)' : 'transparent',
      }}
      onMouseEnter={(e) => !active && (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
      onMouseLeave={(e) => !active && (e.currentTarget.style.background = 'transparent')}
      onClick={onMobileClose}
      aria-current={active ? 'page' : undefined}
    >
      <span style={{ width: '15px', height: '15px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <ArxisIcon name={icon} size={18} />
      </span>
      <span className="sidebar-label" style={{ whiteSpace: 'nowrap' }}>{label}</span>
    </Link>
  )

  return (
    <nav
      id="app-sidebar"
      className="sidebar"
      aria-label="Menu principal"
      data-mobile-open={mobileOpen}
      style={{
        background: 'var(--c-surface)',
        borderRight: '1px solid var(--c-border)',
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Brand */}
      <div className="sidebar-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', height: '48px', borderBottom: '1px solid var(--c-border)', flexShrink: 0 }}>
        <Link
          className="sidebar-brand"
          to="/dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: 600,
            letterSpacing: '-0.2px',
          }}
        >
          <img src="/images/brand/arxis-icon-192.png" alt="" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
          <span className="brand-name arx-wordmark">Arxis</span>
        </Link>
        {/* So no mobile (CSS): o "Recolher menu" do rodape e semantica de
            desktop e ficava a 1.500px de distancia do polegar. */}
        <button
          type="button"
          className="sidebar-close-mobile"
          onClick={onMobileClose}
          aria-label="Fechar menu"
        >
        <ArxisIcon name="close" size={20} />
        </button>
      </div>

      {/* A "busca" que ficava aqui era um <div> com "Ctrl K" sem input nem
          handler. Saiu em 08/09/2026; command palette e feature futura. */}

      {/* Main nav */}
      <div style={{ padding: '12px 0 4px' }}>
        <NavItem href="/dashboard" icon="home" label="Página inicial" active={isDashboard} />
        <NavItem href="/dashboard#recentes" icon="recent" label="Recentes" active={location.pathname === '/dashboard' && location.hash === '#recentes'} />
      </div>

      <div style={{ padding: '12px 0 4px', borderTop: '1px solid var(--c-border)', marginTop: '4px' }}>
        <div className="sidebar-section-title" style={{ padding: '0 14px 4px', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--c-text3)', whiteSpace: 'nowrap' }}>
          Workspace
        </div>
        <NavItem href="/app" icon="viewer" label="Viewer 3D" active={location.pathname === '/app'} />
        <NavItem href="/app/compare" icon="compare" label="Comparar cenários" active={location.pathname === '/app/compare'} />
        {/* Planejamento 4D, Reunioes XR, Orcamento 5D e Consulta BIM sairam em
            08/09/2026: apontavam para /app#... e nada lia o hash. Voltam quando
            cada tela existir (S24/S26/S15/S31). */}
      </div>

      {isAdmin && (
        <div style={{ padding: '12px 0 4px', borderTop: '1px solid var(--c-border)', marginTop: '4px' }}>
          <div className="sidebar-section-title" style={{ padding: '0 14px 4px', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--c-text3)', whiteSpace: 'nowrap' }}>
            Ferramentas
          </div>
          <NavItem href="/admin" icon="admin" label="Admin" active={location.pathname === '/admin'} />
        </div>
      )}

      <div style={{ borderBottom: '1px solid var(--c-border)', margin: '4px 0' }}></div>

      {/* Manage account accordion */}
      <div style={{ padding: '12px 0 4px' }}>
        <button
          onClick={() => setManageOpen(!manageOpen)}
          className="sidebar-item"
          title={collapsed ? "Gerenciar conta" : undefined}
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            fontFamily: 'inherit',
            fontSize: '13px',
            fontWeight: 400,
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            padding: '6px 14px',
            color: 'var(--c-text2)',
            transition: 'color .12s, background .12s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
            e.currentTarget.style.color = 'var(--c-text)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--c-text2)'
          }}
        >
          <span style={{ width: '15px', height: '15px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ArxisIcon name="account" size={18} />
          </span>
          <div className="sidebar-label" style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
            <span style={{ flex: 1, whiteSpace: 'nowrap' }}>Gerenciar conta</span>
            <span
              style={{
                marginLeft: 'auto',
                color: 'var(--c-text3)',
                opacity: 0.5,
                transition: 'transform .2s ease',
                transform: manageOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                width: '12px',
                height: '12px',
                display: 'inline-block',
              }}
            >
              ›
            </span>
          </div>
        </button>

        {manageOpen && (
          <div className="sidebar-submenu" style={{ display: 'flex', flexDirection: 'column', background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)', borderBottom: '1px solid var(--c-border)', padding: '4px 0' }}>
            <Link
              to="/account?tab=members"
              onClick={onMobileClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 14px 7px 32px',
                fontSize: '12.5px',
                color: 'var(--c-text2)',
                transition: 'background .1s, color .1s',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.color = 'var(--c-text)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--c-text2)'
              }}
            >
              Membros
            </Link>
            <Link
              to="/account?tab=billing"
              onClick={onMobileClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 14px 7px 32px',
                fontSize: '12.5px',
                color: 'var(--c-text2)',
                transition: 'background .1s, color .1s',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.color = 'var(--c-text)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--c-text2)'
              }}
            >
              Plano & Cobrança
            </Link>
            <Link
              to="/account?tab=tokens"
              onClick={onMobileClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 14px 7px 32px',
                fontSize: '12.5px',
                color: 'var(--c-text2)',
                transition: 'background .1s, color .1s',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.color = 'var(--c-text)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--c-text2)'
              }}
            >
              Tokens de API
            </Link>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onToggle(!collapsed)}
        className="sidebar-toggle"
        aria-label={collapsed ? "Abrir menu" : "Recolher menu"}
        title={collapsed ? "Abrir menu" : "Recolher menu"}
      >
        {collapsed ? (
          <ArxisIcon name="menu" size={18} />
        ) : (
          <ArxisIcon name="menu" size={18} />
        )}
      </button>
    </nav>
  )
}
