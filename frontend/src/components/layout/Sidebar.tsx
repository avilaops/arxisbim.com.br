import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

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

  const NavItem = ({ href, icon, label, active = false }: { href: string; icon: string; label: string; active?: boolean }) => (
    <a
      href={href}
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
      <span style={{ width: '15px', height: '15px', display: 'inline-block', flexShrink: 0 }}>
        {icon}
      </span>
      {!collapsed && <span>{label}</span>}
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
      {/* Toggle button */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', gap: '6px' }}>
        <button
          onClick={() => onToggle(!collapsed)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: 'var(--r)',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: 'var(--c-text3)',
            flexShrink: 0,
            transition: 'background .12s, color .12s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--c-surface3)'
            e.currentTarget.style.color = 'var(--c-text)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none'
            e.currentTarget.style.color = 'var(--c-text3)'
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div
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
          <span style={{ fontSize: '13px' }}>🔍</span>
          <span style={{ flex: 1 }}>Pesquisa...</span>
          <kbd style={{ fontSize: '10px', padding: '1px 4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--c-border)', borderRadius: '3px', color: 'var(--c-text3)' }}>
            Ctrl K
          </kbd>
        </div>
      )}

      {/* Main nav */}
      <div style={{ padding: '12px 0 4px' }}>
        <NavItem href="/dashboard" icon="🏠" label="Página inicial" active={isDashboard} />
        <NavItem href="/dashboard#recentes" icon="🕐" label="Recentes" />
      </div>

      <div style={{ padding: '12px 0 4px', borderTop: '1px solid var(--c-border)', marginTop: '4px' }}>
        <div style={{ padding: '0 14px 4px', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--c-text3)' }}>
          Workspace
        </div>
        <NavItem href="/app" icon="📦" label="Viewer 3D" />
        <NavItem href="/app#bim4d" icon="📅" label="Planejamento 4D" />
        <NavItem href="/app#meetings" icon="👥" label="Reuniões XR" />
      </div>

      <div style={{ padding: '12px 0 4px', borderTop: '1px solid var(--c-border)', marginTop: '4px' }}>
        <div style={{ padding: '0 14px 4px', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--c-text3)' }}>
          Ferramentas
        </div>
        <NavItem href="/app#cost" icon="💰" label="Orçamento 5D" />
        <NavItem href="/app#query" icon="🔎" label="Consulta BIM" />
        {isAdmin && <NavItem href="/admin" icon="🛡️" label="Admin" />}
      </div>

      <div style={{ borderBottom: '1px solid var(--c-border)', margin: '4px 0' }}></div>

      {/* Manage account accordion */}
      <div style={{ padding: '12px 0 4px' }}>
        <button
          onClick={() => setManageOpen(!manageOpen)}
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
          <span style={{ width: '15px', height: '15px', display: 'inline-block', flexShrink: 0 }}>⚙️</span>
          {!collapsed && (
            <>
              <span style={{ flex: 1 }}>Gerenciar conta</span>
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
            </>
          )}
        </button>

        {manageOpen && !collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--c-surface)', borderTop: '1px solid var(--c-border)', borderBottom: '1px solid var(--c-border)', padding: '4px 0' }}>
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

      {/* Logout */}
      <div style={{ padding: '12px 0 4px', marginTop: 'auto' }}>
        <a
          href="#logout"
          onClick={(e) => {
            e.preventDefault()
            localStorage.removeItem('arxisvr_user')
            localStorage.removeItem('arxisvr_sidebar_collapsed')
            localStorage.removeItem('arxisvr_manage_open')
            window.location.href = '/login'
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '9px',
            padding: '6px 14px',
            fontSize: '13px',
            fontWeight: 400,
            color: 'var(--c-text2)',
            cursor: 'pointer',
            borderLeft: '2px solid transparent',
            transition: 'color .12s, background .12s',
            textDecoration: 'none',
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
          <span style={{ width: '15px', height: '15px', display: 'inline-block', flexShrink: 0 }}>🚪</span>
          {!collapsed && <span>Sair</span>}
        </a>
      </div>
    </nav>
  )
}
