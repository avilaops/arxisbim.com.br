import { useState, useEffect, ReactNode } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('arxisvr_sidebar_collapsed') === '1'
  })
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    localStorage.setItem('arxisvr_sidebar_collapsed', sidebarCollapsed ? '1' : '0')
  }, [sidebarCollapsed])

  useEffect(() => {
    // Simulate hydration check
    setIsReady(true)
  }, [])

  if (!isReady) {
    return (
      <div id="loading">
        <div className="spin"></div>
        <p>Carregando...</p>
      </div>
    )
  }

  return (
    <div
      id="app"
      className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}
    >
      {/* Mobile backdrop */}
      <div 
        className="sidebar-backdrop" 
        onClick={() => setSidebarCollapsed(true)}
      />

      <Sidebar collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />

      <div className="main-content">
        {/* Temporary safety toggle button */}
        <div style={{ background: '#2563eb', color: '#fff', padding: '6px 12px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Modo de segurança da Sidebar ativo</span>
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{ padding: '4px 8px', background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer' }}
          >
            {sidebarCollapsed ? 'Abrir menu' : 'Recolher menu'}
          </button>
        </div>

        <Topbar />
        <main className="main" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div className="content" style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>{children}</div>
        </main>
      </div>
    </div>
  )
}
