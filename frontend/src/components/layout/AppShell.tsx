import { useState, useEffect, ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  // Desktop: recolhida ou expandida, persistida. E SO isso. Antes este mesmo
  // estado tambem decidia se o drawer mobile estava aberto: como "expandida" e
  // o padrao, o menu abria sozinho em toda visita nova pelo celular e, uma vez
  // fechado, persistia "recolhida" e encolhia a sidebar do desktop.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('arxisvr_sidebar_collapsed') === '1'
  })
  // Mobile: aberto ou fechado, nunca persistido, sempre nasce fechado.
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const location = useLocation()

  useEffect(() => {
    localStorage.setItem('arxisvr_sidebar_collapsed', sidebarCollapsed ? '1' : '0')
  }, [sidebarCollapsed])

  useEffect(() => {
    setIsReady(true)
  }, [])

  // Troca de rota fecha o drawer (os itens sao <a href>, mas o SPA pode navegar
  // por outros caminhos tambem).
  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  // Drawer aberto: trava o scroll no <html> (o body do app ja e hidden) e
  // fecha no ESC.
  useEffect(() => {
    const root = document.documentElement
    if (mobileNavOpen) root.classList.add('app-nav-open')
    else root.classList.remove('app-nav-open')
    if (!mobileNavOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileNavOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      root.classList.remove('app-nav-open')
    }
  }, [mobileNavOpen])

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
      className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'} ${mobileNavOpen ? 'mobile-nav-open' : ''}`}
    >
      {/* Backdrop do drawer mobile */}
      <div
        className="sidebar-backdrop"
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={setSidebarCollapsed}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <div className="main-content">
        <Topbar
          mobileNavOpen={mobileNavOpen}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main className="main" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div className="content" style={{ display: 'flex', flex: 1, flexDirection: 'column' }}>{children}</div>
        </main>
      </div>
    </div>
  )
}
