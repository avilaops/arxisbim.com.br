import { useState, useRef, useEffect } from 'react'
import { ShieldCheck, LogOut } from 'lucide-react'

interface User {
  name?: string
  email?: string
  role?: 'admin' | 'owner' | 'member' | 'viewer'
}

interface UserMenuProps {
  user: User | null
}

export default function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
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

  function handleLogout() {
    localStorage.removeItem('arxisvr_user')
    localStorage.removeItem('arxisvr_token')
    localStorage.removeItem('arxisvr_refresh_token')
    localStorage.removeItem('arxisvr_project_id')
    localStorage.removeItem('arxisvr_sidebar_collapsed')
    localStorage.removeItem('arxisvr_manage_open')
    window.location.href = '/login'
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={avatarRef}
        className="topbar__avatar"
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
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
          boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
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
              onClick={() => (window.location.href = '/admin')}
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
              <ShieldCheck size={14} strokeWidth={1.5} /> Painel Admin
            </button>
            <div style={{ height: '1px', background: 'var(--c-border)', margin: '4px 0' }}></div>
          </>
        )}

        <button
          onClick={handleLogout}
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
          <LogOut size={14} strokeWidth={1.5} /> Sair
        </button>
      </div>
    </div>
  )
}
