import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import BlogPage from './pages/BlogPage'
import BlogArticlePage from './pages/BlogArticlePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ValidadorPage from './pages/ValidadorPage'
import DashboardPage from './pages/DashboardPage'
import Viewer3DPage from './pages/Viewer3DPage'
import ComparePage from './pages/ComparePage'
import AccountPage from './pages/AccountPage'
import AdminPage from './pages/AdminPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import CookiesPage from './pages/CookiesPage'
import LgpdPage from './pages/LgpdPage'
import AcceptInvitePage from './pages/AcceptInvitePage'
import JoinPage from './pages/JoinPage'
import SharedPage from './pages/SharedPage'
import OAuthCallbackPage from './pages/OAuthCallbackPage'
import ArCalibrationPage from './pages/ArCalibrationPage'
import { isAppHost, resolveRootRedirect } from './config/site.config'

// No host do app a raiz não é a landing: leva para o app ou para o login. A
// sessão é lida do mesmo jeito que a LoginPage lê antes de pular o formulário.
function RootRoute() {
  const hasSession = Boolean(localStorage.getItem('arxisvr_user') && localStorage.getItem('arxisvr_token'))
  const redirect = resolveRootRedirect(hasSession)

  return redirect ? <Navigate to={redirect} replace /> : <LandingPage />
}

export default function App() {
  return (
    <BrowserRouter>
      {/* O host do app não entra em busca; o site público é outro sistema. */}
      {isAppHost() && <meta name="robots" content="noindex,follow" />}
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
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/cookies" element={<CookiesPage />} />
        <Route path="/lgpd" element={<LgpdPage />} />

        {/* Shared & Collaboration */}
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/shared" element={<SharedPage />} />

        {/* OAuth & Auth Flow */}
        <Route path="/oauth-callback" element={<OAuthCallbackPage />} />

        {/* AR Calibration */}
        <Route path="/ar-calibration" element={<ArCalibrationPage />} />

        {/* Protected Pages */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/app" element={<Viewer3DPage />} />
        <Route path="/app/compare" element={<ComparePage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/admin" element={<AdminPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
