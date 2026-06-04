/**
 * OAuth callback — reads #token=...&refreshToken=... from URL hash,
 * stores tokens and redirects to app.
 */
const hash = new URLSearchParams(window.location.hash.slice(1));
const token = hash.get('token');
const refreshToken = hash.get('refreshToken');

if (token && refreshToken) {
  localStorage.setItem('arxisvr_token', token);
  localStorage.setItem('arxisvr_refresh_token', refreshToken);
  window.location.replace('/app.html');
} else {
  // No tokens — redirect to login with error
  const params = new URLSearchParams(window.location.search);
  const err = params.get('oauth_error') ?? 'Login social falhou';
  window.location.replace(`/login.html?oauth_error=${encodeURIComponent(err)}`);
}
