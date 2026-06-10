import { FormEvent, useEffect, useRef, useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { authManager } from '../AuthManager';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const turnstileToken = useRef<string>('');

  useEffect(() => {
    try {
      (window as any).arxis?.track('register_started');
    } catch (e) {}
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!companyName.trim()) {
      setError('Informe o nome da sua empresa ou workspace.');
      return;
    }

    if (SITE_KEY && !turnstileToken.current) {
      setError('Complete a verificação de segurança.');
      return;
    }

    setLoading(true);
    try {
      const result: any = await authManager.register({
        name: name.trim(),
        email: email.trim(),
        password,
        companyName: companyName.trim(),
        turnstileToken: turnstileToken.current,
      } as any);

      try {
        (window as any).arxis?.track('register_completed');
        (window as any).arxis?.flush();
      } catch (e) {}

      // Se o servidor retornou requiresEmailVerification, mostrar mensagem
      if (result?.requiresEmailVerification) {
        setError(''); // limpar erros
        window.location.href = `/verify-email.html?email=${encodeURIComponent(email.trim())}`;
        return;
      }

      // Fallback: se por algum motivo já tiver token, vai para app
      window.location.href = '/app.html';
    } catch (err: any) {
      setError(err?.message || 'Não foi possível criar a conta.');
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
          <p className="auth-subtitle">Crie sua conta para começar</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-field">
            <span className="auth-label">Nome completo</span>
            <input
              className="auth-input"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
              required
              minLength={2}
            />
          </label>

          <label className="auth-field">
            <span className="auth-label">Empresa / Workspace</span>
            <input
              className="auth-input"
              type="text"
              autoComplete="organization"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nome da sua empresa ou projeto"
              required
              minLength={2}
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo de 8 caracteres"
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
            {loading ? <span className="spinner" aria-label="Carregando" /> : 'Criar conta'}
          </button>
        </form>

        <p className="auth-footer-text">
          Já tem conta?{' '}
          <a className="auth-link" href="/">
            Entrar
          </a>
        </p>
      </section>
    </main>
  );
}
