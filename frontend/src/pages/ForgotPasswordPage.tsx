import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      await new Promise((r) => setTimeout(r, 800))
      setSent(true)
    } catch {
      alert('Erro ao enviar email')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #111111 100%)',
          padding: '20px',
        }}
      >
        <div style={{ width: '100%', maxWidth: '360px', textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✉️</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: 'var(--c-text)' }}>
            Email enviado
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--c-text2)', marginBottom: '20px' }}>
            Enviamos um link para resetar sua senha para <strong>{email}</strong>
          </p>
          <p style={{ fontSize: '13px', color: 'var(--c-text3)', marginBottom: '24px' }}>
            Verifique seu email e clique no link para continuar. Se não receber em 5 minutos, verifique a pasta de spam.
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '10px 16px',
              background: 'var(--c-blue)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--r)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              width: '100%',
            }}
          >
            Voltar para login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #111111 100%)',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          color: '#fff',
          backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(59,130,246,0.1) 0%, transparent 50%)',
        }}
      >
        <img src="/logo-icon.svg" alt="ArxisVR" style={{ width: '48px', height: '48px', marginBottom: '24px' }} />
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '12px' }}>ArxisVR</h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
          Recuperar acesso à sua conta
        </p>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          background: '#0a0a0a',
        }}
      >
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--c-text)', marginBottom: '8px' }}>
            Recuperar senha
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--c-text2)', marginBottom: '28px' }}>
            Digite seu email e enviaremos um link para resetar sua senha
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--c-text)',
                  marginBottom: '6px',
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--c-surface2)',
                  border: '1px solid var(--c-border)',
                  borderRadius: 'var(--r)',
                  color: 'var(--c-text)',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                }}
                placeholder="seu@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--c-blue)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--r)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                fontFamily: 'inherit',
              }}
            >
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--c-text2)' }}>
            Lembrou a senha?{' '}
            <a href="/login" style={{ color: 'var(--c-blue)', textDecoration: 'none', fontWeight: 600 }}>
              Entrar
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
