import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

export default function AcceptInvitePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'form' | 'success' | 'error'>('loading')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const token = searchParams.get('token')
  const email = searchParams.get('email')
  const organization = searchParams.get('org')

  useEffect(() => {
    const validateToken = async () => {
      try {
        if (!token || !email) {
          setStatus('error')
          return
        }
        // Simular validação
        await new Promise((r) => setTimeout(r, 500))
        setStatus('form')
      } catch {
        setStatus('error')
      }
    }

    validateToken()
  }, [token, email])

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!name || !password) {
        setError('Preencha todos os campos')
        setLoading(false)
        return
      }

      if (password.length < 8) {
        setError('A senha deve ter pelo menos 8 caracteres')
        setLoading(false)
        return
      }

      // Simular aceitação
      await new Promise((r) => setTimeout(r, 1000))

      const user = {
        id: '1',
        name,
        email,
        role: 'member',
      }

      localStorage.setItem('arxisvr_user', JSON.stringify(user))
      setStatus('success')
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (err: any) {
      setError(err.message || 'Erro ao aceitar convite')
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 16px',
              border: '2px solid rgba(255,255,255,0.06)',
              borderTopColor: 'var(--c-blue)',
              borderRadius: '50%',
              animation: 'spin .7s linear infinite',
            }}
          ></div>
          <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>Validando convite...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
          padding: '20px',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '360px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fca5a5', marginBottom: '8px' }}>
            Convite inválido
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--c-text2)', marginBottom: '20px' }}>
            Este convite expirou ou não é válido
          </p>
          <a
            href="/login"
            style={{
              display: 'inline-block',
              padding: '8px 16px',
              background: 'var(--c-blue)',
              color: '#fff',
              borderRadius: 'var(--r)',
              textDecoration: 'none',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            Ir para login
          </a>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #111111 100%)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--c-green)', marginBottom: '8px' }}>
            Convite aceito!
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
            Redirecionando para dashboard...
          </p>
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
        <img src="/logo-icon.svg" alt="Arxis" style={{ width: '48px', height: '48px', marginBottom: '24px' }} />
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '12px' }}>Arxis</h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', textAlign: 'center', maxWidth: '300px' }}>
          {organization ? `Você foi convidado para ${organization}` : 'Você recebeu um convite'}
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
            Aceitar convite
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--c-text2)', marginBottom: '28px' }}>
            Complete seu perfil para acessar {organization || 'a plataforma'}
          </p>

          <form onSubmit={handleAccept}>
            {error && (
              <div
                style={{
                  padding: '12px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 'var(--r)',
                  color: '#fca5a5',
                  fontSize: '13px',
                  marginBottom: '16px',
                }}
              >
                {error}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--c-text)', marginBottom: '6px' }}>
                Email
              </label>
              <input
                type="email"
                value={email || ''}
                disabled
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--c-surface2)',
                  border: '1px solid var(--c-border)',
                  borderRadius: 'var(--r)',
                  color: 'var(--c-text3)',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  opacity: 0.5,
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--c-text)', marginBottom: '6px' }}>
                Nome
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                placeholder="Seu nome"
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--c-text)', marginBottom: '6px' }}>
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
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
              {loading ? 'Aceitando...' : 'Aceitar convite'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
