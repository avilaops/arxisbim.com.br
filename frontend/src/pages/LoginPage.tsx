import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const user = localStorage.getItem('arxisvr_user')
    if (user) {
      navigate('/dashboard')
    }
  }, [navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Mock login — em produção, chamar API
      if (!email || !password) {
        setError('Email e senha são obrigatórios')
        setLoading(false)
        return
      }

      // Simular login
      await new Promise((r) => setTimeout(r, 800))

      const mockUser = {
        id: '1',
        name: email.split('@')[0],
        email,
        role: 'member',
      }

      localStorage.setItem('arxisvr_user', JSON.stringify(mockUser))
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login')
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #111111 100%)',
      }}
    >
      {/* Left side - Branding */}
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
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '12px', textAlign: 'center' }}>
          ArxisVR
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', textAlign: 'center', maxWidth: '300px' }}>
          Plataforma BIM com Copilot de IA e Realidade Estendida
        </p>
      </div>

      {/* Right side - Login Form */}
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
            Entrar
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--c-text2)', marginBottom: '28px' }}>
            Acesse sua conta ArxisVR
          </p>

          <form onSubmit={handleSubmit}>
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
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--c-surface2)',
                  border: '1px solid var(--c-border)',
                  borderRadius: 'var(--r)',
                  color: 'var(--c-text)',
                  fontSize: '13px',
                  transition: 'border-color .12s',
                  fontFamily: 'inherit',
                }}
                placeholder="seu@email.com"
              />
            </div>

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
                  transition: 'border-color .12s',
                  fontFamily: 'inherit',
                }}
                placeholder="••••••••"
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
                transition: 'opacity .12s',
                fontFamily: 'inherit',
              }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--c-text2)' }}>
            Sem conta?{' '}
            <a href="/register" style={{ color: 'var(--c-blue)', textDecoration: 'none', fontWeight: 600 }}>
              Criar conta
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
