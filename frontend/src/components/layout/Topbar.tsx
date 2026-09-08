import { useState, useEffect } from 'react'
import { HelpCircle, Menu } from 'lucide-react'
import UserMenu from './UserMenu'

interface User {
  name?: string
  email?: string
  role?: 'admin' | 'owner' | 'member' | 'viewer'
}

interface TopbarProps {
  mobileNavOpen?: boolean
  onOpenMobileNav?: () => void
}

export default function Topbar({ mobileNavOpen = false, onOpenMobileNav }: TopbarProps) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    try {
      const userData = localStorage.getItem('arxisvr_user')
      if (userData) {
        setUser(JSON.parse(userData))
      }
    } catch {}
  }, [])

  return (
    <header
      className="topbar"
      style={{
        background: 'var(--c-surface)',
        borderBottom: '1px solid var(--c-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '0',
        zIndex: 100,
      }}
    >
      {/* So no mobile (CSS). Sem isto, fechado o drawer nao havia como reabrir:
          o unico controle era o "Recolher menu" DENTRO da sidebar. */}
      <button
        type="button"
        className="topbar__menu"
        onClick={onOpenMobileNav}
        aria-label="Abrir menu"
        aria-expanded={mobileNavOpen}
        aria-controls="app-sidebar"
      >
        <Menu size={22} strokeWidth={1.75} aria-hidden="true" />
      </button>

      {/* No mobile a marca vem para ca, porque a da sidebar fica escondida com
          o drawer fechado e o topo ficava so com o nome do usuario. */}
      <a href="/dashboard" className="topbar__brand" aria-label="ArxisVR, página inicial">
        <img src="/logo-icon.svg" alt="" width={22} height={22} />
        <span>ArxisVR</span>
      </a>

      <div className="topbar__mid" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
        <div
          className="topbar__breadcrumb"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: 'var(--c-text2)',
            minWidth: 0,
          }}
        >
          <span id="tb-account" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || user?.email || ''}</span>
        </div>
      </div>

      <div className="topbar__end" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
        <a
          className="topbar__link"
          href="https://docs.arxisvr.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Suporte"
          title="Suporte"
        >
          <span style={{ display: 'inline-flex', alignItems: 'center' }}><HelpCircle size={16} strokeWidth={1.5} aria-hidden="true" /></span>
          <span className="topbar__link-text">Suporte</span>
        </a>
        <UserMenu user={user} />
      </div>
    </header>
  )
}
