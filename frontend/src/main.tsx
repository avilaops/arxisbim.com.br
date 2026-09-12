import './instrument'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import { Sentry } from './instrument'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

// Public routes are readable without JavaScript. React takes over the page and
// owns its metadata after startup, including navigation between blog articles.
document.querySelectorAll('[data-arxis-ssr]').forEach(element => element.remove())
if (!['/', '/blog'].includes(window.location.pathname) && !window.location.pathname.startsWith('/blog/')) {
  document.documentElement.classList.remove('arxis-public')
}

function SentryFallback() {
  return (
    <main style={{ padding: 32, fontFamily: 'Inter, sans-serif' }}>
      <h1>Algo deu errado</h1>
      <p>Erro registrado. Recarregue página para tentar novamente.</p>
      <button type="button" onClick={() => window.location.reload()}>
        Recarregar
      </button>
    </main>
  )
}

ReactDOM.createRoot(root, {
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
}).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<SentryFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)
