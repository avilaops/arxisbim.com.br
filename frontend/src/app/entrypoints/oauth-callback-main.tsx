/**
 * OAuth callback — reads #token=...&refreshToken=... from URL hash,
 * stores tokens + derives the user object, then redirects to app.
 */
import { TOKEN_KEY, REFRESH_TOKEN_KEY, hydrateUserFromToken } from '../../core/auth/session';

const hash = new URLSearchParams(window.location.hash.slice(1));
const token = hash.get('token');
const refreshToken = hash.get('refreshToken');

if (token && refreshToken) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  // CRÍTICO: deriva e grava arxisvr_user a partir do token.
  // Sem isso, greeting (lê token) e header (exigia user) divergiam → "Olá, Nicolas" + "Entrar".
  hydrateUserFromToken();
  window.location.replace('/dashboard');
} else {
  // No tokens — redirect to login with error
  const params = new URLSearchParams(window.location.search);
  const err = params.get('oauth_error') ?? 'Login social falhou';
  window.location.replace(`/login?oauth_error=${encodeURIComponent(err)}`);
}
