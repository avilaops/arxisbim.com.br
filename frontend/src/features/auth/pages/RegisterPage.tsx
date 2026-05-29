import { FormEvent, useState } from 'react';
import { authManager } from '../AuthManager';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !password) {
      setError('Preencha nome, email e senha.');
      return;
    }

    setLoading(true);
    try {
      await authManager.register({ name: name.trim(), email: email.trim(), password });
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
            <span className="auth-label">Nome</span>
            <input
              className="auth-input"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Seu nome completo"
            />
          </label>

          <label className="auth-field">
            <span className="auth-label">Email</span>
            <input
              className="auth-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
            />
          </label>

          <label className="auth-field">
            <span className="auth-label">Senha</span>
            <input
              className="auth-input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo de 8 caracteres"
            />
          </label>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button
            className="auth-button"
            type="submit"
            disabled={loading}
          >
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