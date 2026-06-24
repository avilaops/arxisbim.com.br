import { useState, useEffect } from 'react'
import UserMenu from './UserMenu'

interface User {
  name?: string
  email?: string
  role?: 'admin' | 'owner' | 'member' | 'viewer'
}

export default function Topbar() {
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
        gridColumn: '1 / -1',
        background: 'var(--c-surface)',
        borderBottom: '1px solid var(--c-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px 0 0',
        gap: '0',
        zIndex: 100,
      }}
    >
      <a
        className="topbar__brand"
        href="/dashboard"
        style={{
          width: 'var(--sidebar-w)',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '0 16px',
          borderRight: '1px solid var(--c-border)',
          flexShrink: 0,
          fontSize: '14px',
          fontWeight: 600,
          letterSpacing: '-0.2px',
        }}
      >
        <img src="/logo-icon.svg" alt="" style={{ width: '22px', height: '22px' }} />
        ArxisVR
      </a>

      <div className="topbar__mid" style={{ flex: 1, display: 'flex', alignItems: 'center', paddingLeft: '20px', gap: '16px' }}>
        <div
          className="topbar__breadcrumb"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: 'var(--c-text2)',
          }}
        >
          <span id="tb-account">{user?.name || user?.email || '—'}</span>
        </div>
      </div>

      <div className="topbar__end" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
        <a
          className="topbar__link"
          href="https://docs.arxisvr.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 10px',
            height: '32px',
            borderRadius: 'var(--r)',
            fontSize: '12px',
            color: 'var(--c-text2)',
            transition: 'background .12s, color .12s',
          }}
        >
          <span style={{ width: '14px', height: '14px' }}>⊕</span>
          Suporte
        </a>
        <UserMenu user={user} />
      </div>
    </header>
  )
}
