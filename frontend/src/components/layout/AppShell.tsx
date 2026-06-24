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
      className={`app ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
      style={{
        display: 'grid',
        height: '100vh',
        gridTemplateColumns: sidebarCollapsed ? '48px 1fr' : '220px 1fr',
        gridTemplateRows: '48px 1fr',
        transition: 'grid-template-columns .2s ease',
      }}
    >
      <Topbar />
      <Sidebar collapsed={sidebarCollapsed} onToggle={setSidebarCollapsed} />
      <main className="main" style={{ overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div className="content">{children}</div>
      </main>
    </div>
  )
}
