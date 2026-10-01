import { FormEvent, useState } from 'react';
import { getAuthService } from '../../../api/v1';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await getAuthService().forgotPassword(email.trim());
      setSent(true);
    } catch {
      setError('Não foi possível enviar o email. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page animated-gradient">
      <section className="auth-card slide-in">
        <div className="auth-header">
          <div className="auth-brand-mark">BIM</div>
          <h1 className="auth-title">Arxis</h1>
          <p className="auth-subtitle">Redefinição de senha</p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
            <p style={{ color: '#374151', marginBottom: 8, fontWeight: 500 }}>
              Email enviado!
            </p>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
              Se <strong>{email}</strong> estiver cadastrado, você receberá
              um link para redefinir sua senha em breve.
              <br />
              Verifique também a pasta de spam.
            </p>
            <a className="auth-link" href="/login">
              Voltar para o login
            </a>
          </div>
        ) : (
          <>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20, textAlign: 'center' }}>
              Informe seu email e enviaremos um link para redefinir sua senha.
            </p>
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

              {error && <div className="auth-error">{error}</div>}

              <button className="auth-button" type="submit" disabled={loading}>
                {loading ? <span className="spinner" aria-label="Carregando" /> : 'Enviar link'}
              </button>
            </form>

            <p className="auth-footer-text">
              Lembrou a senha?{' '}
              <a className="auth-link" href="/login">
                Entrar
              </a>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
