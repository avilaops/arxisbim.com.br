import { FormEvent, useEffect, useRef, useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { authManager } from '../AuthManager';
import { resolveApiBaseUrl } from '../../../config/apiBaseUrl';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';

const API_BASE = resolveApiBaseUrl();

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const turnstileToken = useRef<string>('');

  // Handle oauth_error param (redirected back from backend on OAuth failure)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('oauth_error');
    if (oauthError) setError(`Login social falhou: ${oauthError}`);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (SITE_KEY && !turnstileToken.current) {
      setError('Complete a verificação de segurança.');
      return;
    }

    setLoading(true);
    try {
      await authManager.login({
        email: email.trim(),
        password,
        turnstileToken: turnstileToken.current,
      } as any);
      // Destino pós-login: respeita ?next interno (ex.: convite de reunião);
      // só aceita caminhos internos para evitar open-redirect.
      const nextParam = new URLSearchParams(window.location.search).get('next');
      const next = nextParam && nextParam.charAt(0) === '/' && nextParam.charAt(1) !== '/'
        ? nextParam
        : '/app.html';
      window.location.href = next;
    } catch (err: any) {
      setError(err?.message || 'Email ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page animated-gradient">
      <section className="auth-card slide-in">
        <div className="auth-header">
          <div className="auth-brand-mark">BIM</div>
          <h1 className="auth-title">ArxisVR</h1>
          <p className="auth-subtitle">Entre com sua conta para acessar seus projetos BIM</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-field">
            <span className="auth-label">Email</span>
            <input
              className="auth-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </label>

          <label className="auth-field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="auth-label">Senha</span>
              <a className="auth-link" href="/forgot-password.html" style={{ fontSize: 13 }}>
                Esqueci minha senha
              </a>
            </div>
            <input
              className="auth-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              required
              minLength={8}
            />
          </label>

          {SITE_KEY && (
            <div style={{ margin: '12px 0' }}>
              <Turnstile
                siteKey={SITE_KEY}
                onSuccess={(token) => { turnstileToken.current = token; }}
                onExpire={() => { turnstileToken.current = ''; }}
                options={{ theme: 'light', language: 'pt-BR' }}
              />
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? <span className="spinner" aria-label="Carregando" /> : 'Entrar'}
          </button>
        </form>

        <div className="auth-divider">
          <span>ou continue com</span>
        </div>

        <div className="auth-oauth-buttons">
          <a
            href={`${API_BASE}/api/v1/auth/google`}
            className="auth-oauth-btn auth-oauth-btn--google"
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Google
          </a>
          <a
            href={`${API_BASE}/api/v1/auth/github`}
            className="auth-oauth-btn auth-oauth-btn--github"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            GitHub
          </a>
        </div>

        <p className="auth-footer-text">
          Não tem conta?{' '}
          <a className="auth-link" href="/register.html">
            Criar conta
          </a>
        </p>
      </section>
    </main>
  );
}
