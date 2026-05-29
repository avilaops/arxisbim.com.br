export default function LoginPage() {
  function handleSignIn() {
    window.location.href = '/';
  }

  return (
    <main className="auth-page animated-gradient">
      <section className="auth-card slide-in">
        <div className="auth-header">
          <div className="auth-brand-mark">BIM</div>
          <h1 className="auth-title">ArxisVR</h1>
          <p className="auth-subtitle">Entre com sua conta para acessar seus projetos BIM</p>
        </div>

        <div className="auth-form">
          <button
            className="auth-button"
            type="button"
            onClick={handleSignIn}
          >
            Entrar
          </button>
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