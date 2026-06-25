import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Home,
  Clock3,
  Box,
  CalendarDays,
  Users,
  CircleDollarSign,
  Search,
  ShieldCheck,
  Settings,
  PanelLeftOpen,
  PanelLeftClose,
} from 'lucide-react'

interface SidebarProps {
  collapsed: boolean
  onToggle: (collapsed: boolean) => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
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
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem('arxisvr_manage_open', manageOpen ? '1' : '0')
  }, [manageOpen])

  const isAdmin = user?.role === 'admin' || user?.role === 'owner'
  const isDashboard = location.pathname === '/dashboard'

  const NavItem = ({ href, icon: Icon, label, active = false }: { href: string; icon: any; label: string; active?: boolean }) => (
    <a
      href={href}
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
    >
      <span style={{ width: '15px', height: '15px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={17} strokeWidth={1.45} />
      </span>
      <span className="sidebar-label" style={{ whiteSpace: 'nowrap' }}>{label}</span>
    </a>
  )

  return (
    <nav
      className="sidebar"
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', height: '48px', borderBottom: '1px solid var(--c-border)', flexShrink: 0 }}>
        <a
          className="sidebar-brand"
          href="/dashboard"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: 600,
            letterSpacing: '-0.2px',
          }}
        >
          <img src="/logo-icon.svg" alt="" style={{ width: '22px', height: '22px' }} />
          <span className="brand-name">ArxisVR</span>
        </a>
      </div>

      {/* Search */}
      <div
        className="sidebar-search"
        style={{
          margin: '10px 10px 4px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--c-surface2)',
          border: '1px solid var(--c-border)',
          borderRadius: 'var(--r)',
          padding: '0 10px',
          height: '30px',
          color: 'var(--c-text3)',
          fontSize: '12px',
          cursor: 'text',
          flexShrink: 0,
          transition: 'border-color .12s',
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center' }}><Search size={14} strokeWidth={1.5} /></span>
        <span style={{ flex: 1, whiteSpace: 'nowrap' }}>Pesquisa...</span>
        <kbd style={{ fontSize: '10px', padding: '1px 4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--c-border)', borderRadius: '3px', color: 'var(--c-text3)' }}>
          Ctrl K
        </kbd>
      </div>

      {/* Main nav */}
      <div style={{ padding: '12px 0 4px' }}>
        <NavItem href="/dashboard" icon={Home} label="Página inicial" active={isDashboard} />
        <NavItem href="/dashboard#recentes" icon={Clock3} label="Recentes" />
      </div>

      <div style={{ padding: '12px 0 4px', borderTop: '1px solid var(--c-border)', marginTop: '4px' }}>
        <div className="sidebar-section-title" style={{ padding: '0 14px 4px', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--c-text3)', whiteSpace: 'nowrap' }}>
          Workspace
        </div>
        <NavItem href="/app" icon={Box} label="Viewer 3D" />
        <NavItem href="/app#bim4d" icon={CalendarDays} label="Planejamento 4D" />
        <NavItem href="/app#meetings" icon={Users} label="Reuniões XR" />
      </div>

      <div style={{ padding: '12px 0 4px', borderTop: '1px solid var(--c-border)', marginTop: '4px' }}>
        <div className="sidebar-section-title" style={{ padding: '0 14px 4px', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--c-text3)', whiteSpace: 'nowrap' }}>
          Ferramentas
        </div>
        <NavItem href="/app#cost" icon={CircleDollarSign} label="Orçamento 5D" />
        <NavItem href="/app#query" icon={Search} label="Consulta BIM" />
        {isAdmin && <NavItem href="/admin" icon={ShieldCheck} label="Admin" />}
      </div>

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
            <Settings size={17} strokeWidth={1.45} />
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
            <a
              href="/account#members"
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
            </a>
            <a
              href="/account#billing"
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
            </a>
            <a
              href="/account#tokens"
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
            </a>
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
          <PanelLeftOpen size={17} strokeWidth={1.5} />
        ) : (
          <PanelLeftClose size={17} strokeWidth={1.5} />
        )}
      </button>
    </nav>
  )
}
