import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildApiV1Url } from '@/config/apiBaseUrl'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro(null)

    // Antes isto era `await new Promise(setTimeout)` seguido de sucesso: a tela
    // dizia "Email enviado" sem que nada saisse do servidor. Agora chama a API.
    try {
      const response = await fetch(buildApiV1Url('/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setErro(data?.message || data?.error || 'Não foi possível enviar o e-mail.')
        return
      }
      setSent(true)
    } catch {
      setErro('Falha de conexão. Tente novamente.')
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
          {/* A API nao revela se a conta existe, de proposito: dizer "esse e-mail
              nao esta cadastrado" entrega a lista de clientes para quem estiver
              testando enderecos. Entao a tela NAO pode afirmar que enviou, senao
              mente quando a conta nao existe, que foi o que aconteceu em
              08/09/2026: a tela garantiu o envio de um e-mail que nunca sairia. */}
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: 'var(--c-text)' }}>
            Confira seu e-mail
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--c-text2)', marginBottom: '20px' }}>
            Se existir uma conta com <strong>{email}</strong>, enviamos um link para
            redefinir a senha.
          </p>
          <p style={{ fontSize: '13px', color: 'var(--c-text3)', marginBottom: '24px' }}>
            Não chegou em 5 minutos? Veja a pasta de spam. Se ainda assim não vier,
            provavelmente não existe conta com esse e-mail:{' '}
            <a href="/register" style={{ color: 'var(--c-blue)', textDecoration: 'none', fontWeight: 600 }}>
              criar conta
            </a>
            .
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

          {erro && (
            <div
              role="alert"
              style={{
                marginBottom: '16px',
                padding: '12px 14px',
                borderRadius: 'var(--r)',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#fca5a5',
                fontSize: '13px',
              }}
            >
              {erro}
            </div>
          )}

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
