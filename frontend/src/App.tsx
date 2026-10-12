import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isAppHost, PRIMARY_SITE_URL, resolveRootRedirect } from './config/site.config'

// Cada tela é um pedaço próprio do build: quem abre o login não baixa o
// visualizador 3D nem o esquema IFC.
const LandingPage = lazy(() => import('./pages/LandingPage'))
const BlogPage = lazy(() => import('./pages/BlogPage'))
const BlogArticlePage = lazy(() => import('./pages/BlogArticlePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'))
const ValidadorPage = lazy(() => import('./pages/ValidadorPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const Viewer3DPage = lazy(() => import('./pages/Viewer3DPage'))
const ComparePage = lazy(() => import('./pages/ComparePage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const OAuthCallbackPage = lazy(() => import('./pages/OAuthCallbackPage'))

// No host do app a raiz não é a landing: leva para o app ou para o login. A
// sessão é lida do mesmo jeito que a LoginPage lê antes de pular o formulário.
function RootRoute() {
  const hasSession = Boolean(localStorage.getItem('arxisvr_user') && localStorage.getItem('arxisvr_token'))
  const redirect = resolveRootRedirect(hasSession)

  return redirect ? <Navigate to={redirect} replace /> : <LandingPage />
}

function CarregandoTela() {
  return (
    <div className="arx-carregando" role="status" aria-label="Carregando">
      <div className="arx-carregando__giro" />
    </div>
  )
}

// As páginas legais moram no site público (CMS). Os endereços antigos do app
// levam para lá, em vez de manter uma segunda cópia do texto aqui.
function ParaOSite({ caminho }: { caminho: string }) {
  useEffect(() => {
    window.location.replace(`${PRIMARY_SITE_URL}${caminho}`)
  }, [caminho])

  return <CarregandoTela />
}

export default function App() {
  return (
    <BrowserRouter>
      {/* O host do app não entra em busca; o site público é outro sistema. */}
      {isAppHost() && <meta name="robots" content="noindex,follow" />}
      <Suspense fallback={<CarregandoTela />}>
        <Routes>
          {/* Public Pages */}
          <Route path="/" element={<RootRoute />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:slug" element={<BlogArticlePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* A senha é do login central: os links antigos de recuperação caem na entrada. */}
          <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
          <Route path="/reset-password" element={<Navigate to="/login" replace />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/validador" element={<ValidadorPage />} />

          {/* Legal Pages */}
          <Route path="/privacy" element={<ParaOSite caminho="/privacy" />} />
          <Route path="/terms" element={<ParaOSite caminho="/terms" />} />
          <Route path="/cookies" element={<ParaOSite caminho="/cookies" />} />
          <Route path="/lgpd" element={<ParaOSite caminho="/lgpd" />} />

          {/* /join, /shared, /accept-invite e /ar-calibration saíram em
              12/10/2026: eram telas de demonstração que simulavam o resultado
              (convite "enviado", modelo "compartilhado", sessão criada só no
              navegador) sem falar com a API. Voltam quando existirem de verdade. */}

          {/* OAuth & Auth Flow */}
          <Route path="/oauth-callback" element={<OAuthCallbackPage />} />

          {/* Protected Pages */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/app" element={<Viewer3DPage />} />
          <Route path="/app/compare" element={<ComparePage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/admin" element={<AdminPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
