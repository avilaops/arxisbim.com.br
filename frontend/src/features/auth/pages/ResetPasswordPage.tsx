import { FormEvent, useState } from 'react';
import { getAuthService } from '../../../api/v1';

export default function ResetPasswordPage() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Link inválido ou expirado. Solicite um novo.');
      return;
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await getAuthService().resetPassword(token, password);
      setDone(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Link inválido ou expirado. Solicite um novo.');
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
          <p className="auth-subtitle">Nova senha</p>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <p style={{ color: '#374151', marginBottom: 8, fontWeight: 500 }}>
              Senha redefinida com sucesso!
            </p>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
              Você já pode entrar com a nova senha.
            </p>
            <a className="auth-button" href="/login.html" style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}>
              Ir para o login
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-field">
              <span className="auth-label">Nova senha</span>
              <div style={{ position: 'relative' }}>
                <input
                  className="auth-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo de 8 caracteres"
                  required
                  minLength={8}
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9ca3af' }}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </label>

            <label className="auth-field">
              <span className="auth-label">Confirmar nova senha</span>
              <input
                className="auth-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repita a nova senha"
                required
                minLength={8}
              />
            </label>

            {error && <div className="auth-error">{error}</div>}

            <button className="auth-button" type="submit" disabled={loading || !token}>
              {loading ? <span className="spinner" aria-label="Carregando" /> : 'Redefinir senha'}
            </button>
          </form>
        )}

        {!done && (
          <p className="auth-footer-text">
            <a className="auth-link" href="/forgot-password.html">
              Solicitar novo link
            </a>
          </p>
        )}
      </section>
    </main>
  );
}
