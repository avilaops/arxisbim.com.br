import { FormEvent, useRef, useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { authManager } from '../AuthManager';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const turnstileToken = useRef<string>('');

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
        tenantId: tenantId.trim(),
        turnstileToken: turnstileToken.current,
      } as any);
      window.location.href = '/app.html';
    } catch (err: any) {
      setError(err?.message || 'Email, senha ou tenant incorretos.');
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
            <span className="auth-label">Tenant ID</span>
            <input
              className="auth-input"
              type="text"
              autoComplete="organization"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="ex: acme-corp"
              required
            />
          </label>

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
            <span className="auth-label">Senha</span>
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
