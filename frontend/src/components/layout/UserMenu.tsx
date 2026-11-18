import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ArxisIcon from '@/components/ui/ArxisIcon'
import { getAuthService } from '@/api/v1/services/auth.service'
import { clearSession, REFRESH_TOKEN_KEY } from '@/core/auth/session'

interface User {
  name?: string
  email?: string
  role?: 'admin' | 'owner' | 'member' | 'viewer'
}

interface UserMenuProps {
  user: User | null
}

export default function UserMenu({ user }: UserMenuProps) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const isAdmin = user?.role === 'admin' || user?.role === 'owner'
  const initials = (user?.name || user?.email || 'U').charAt(0).toUpperCase()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) && !avatarRef.current?.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  async function handleLogout() {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    let refreshToken: string | null = null
    try {
      refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    } catch {
      // Continua até o encerramento central, mesmo se o storage estiver bloqueado.
    }

    try {
      if (refreshToken) await getAuthService().logout(refreshToken)
    } catch {
      // A limpeza local e o encerramento do Auth continuam mesmo sem API.
    } finally {
      clearSession()
      try {
        sessionStorage.removeItem('arxisvr_return_to')
        localStorage.removeItem('arxisvr_project_id')
        localStorage.removeItem('arxisvr_sidebar_collapsed')
        localStorage.removeItem('arxisvr_manage_open')
      } catch {
        // O redirecionamento não depende da disponibilidade do storage.
      }
      const logoutUrl = new URL('/api/auth/logout', 'https://auth.avilaops.com')
      logoutUrl.searchParams.set('client_id', 'arxisvr-frontend')
      logoutUrl.searchParams.set('post_logout_redirect_uri', `${window.location.origin}/login`)
      window.location.assign(logoutUrl.toString())
    }
  }

  return (
    <div className="topbar__avatar-wrap" style={{ position: 'relative' }}>
      <div
        ref={avatarRef}
        className="topbar__avatar"
        role="button"
        tabIndex={0}
        aria-label="Menu da conta"
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: '#0e6b8f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: 700,
          color: '#fff',
          cursor: 'pointer',
          userSelect: 'none',
          position: 'relative',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        {initials}
      </div>

      <div
        ref={dropdownRef}
        className={`dropdown ${isOpen ? 'open' : ''}`}
        style={{
          display: isOpen ? 'block' : 'none',
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: '200px',
          background: '#1e1e1e',
          border: '1px solid var(--c-border2)',
          borderRadius: 'var(--r)',
          boxShadow: '0 8px 24px rgba(28,25,23,0.12)',
          zIndex: 9999,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--c-border)' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--c-text)' }}>
            {user?.name || user?.email || '—'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--c-text3)', marginTop: '1px' }}>
            {user?.email || ''}
          </div>
        </div>

        {isAdmin && (
          <>
            <button
              onClick={() => { setIsOpen(false); navigate('/admin') }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                fontSize: '12.5px',
                color: 'var(--c-text2)',
                cursor: 'pointer',
                border: 'none',
                background: 'none',
                width: '100%',
                textAlign: 'left',
                fontFamily: 'inherit',
                transition: 'background .1s, color .1s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                e.currentTarget.style.color = 'var(--c-text)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none'
                e.currentTarget.style.color = 'var(--c-text2)'
              }}
            >
              <ArxisIcon name="admin" size={16} /> Painel Admin
            </button>
            <div style={{ height: '1px', background: 'var(--c-border)', margin: '4px 0' }}></div>
          </>
        )}

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            fontSize: '12.5px',
            color: '#f87171',
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            width: '100%',
            textAlign: 'left',
            fontFamily: 'inherit',
            transition: 'background .1s, color .1s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.08)'
            e.currentTarget.style.color = '#fca5a5'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none'
            e.currentTarget.style.color = '#f87171'
          }}
        >
          <ArxisIcon name="logout" size={16} /> {isLoggingOut ? 'Saindo…' : 'Sair'}
        </button>
      </div>
    </div>
  )
}
