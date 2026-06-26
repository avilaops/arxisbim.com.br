import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buildApiV1Url } from '@/config/apiBaseUrl'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
      if (!name || !email || !password || !confirmPassword) {
        setError('Todos os campos são obrigatórios')
        setLoading(false)
        return
      }

      if (password !== confirmPassword) {
        setError('As senhas não correspondem')
        setLoading(false)
        return
      }

      if (password.length < 8) {
        setError('A senha deve ter pelo menos 8 caracteres')
        setLoading(false)
        return
      }

      const response = await fetch(buildApiV1Url('/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(result.error || result.message || 'Erro ao criar conta')
        setLoading(false)
        return
      }

      if (result.token) {
        localStorage.setItem('arxisvr_token', result.token)
      }
      if (result.refreshToken) {
        localStorage.setItem('arxisvr_refresh_token', result.refreshToken)
      }
      if (result.user && result.token) {
        localStorage.setItem('arxisvr_user', JSON.stringify(result.user))
      }

      if (result.requiresEmailVerification && !result.token) {
        navigate(`/verify-email?email=${encodeURIComponent(email)}`)
        return
      }

      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta')
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

        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: '300px' }}>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
            Comece grátis. Sem cartão de crédito.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
            <div>✓ 3 projetos</div>
            <div>✓ 2 usuários</div>
            <div>✓ 5 GB de armazenamento</div>
            <div>✓ Suporte por email</div>
          </div>
        </div>
      </div>

      {/* Right side - Register Form */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          background: '#0a0a0a',
          overflowY: 'auto',
        }}
      >
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--c-text)', marginBottom: '8px' }}>
            Criar conta
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--c-text2)', marginBottom: '28px' }}>
            Comece com o plano gratuito
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
                  transition: 'border-color .12s',
                  fontFamily: 'inherit',
                }}
                placeholder="Seu nome"
              />
            </div>

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
                placeholder="Mínimo 8 caracteres"
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
                Confirmar senha
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                placeholder="Confirme a senha"
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
              {loading ? 'Criando conta...' : 'Criar conta grátis'}
            </button>

            <div style={{ marginTop: '20px', fontSize: '11px', color: 'var(--c-text3)', textAlign: 'center' }}>
              Ao criar uma conta, você concorda com nossos{' '}
              <a href="/terms" style={{ color: 'var(--c-blue)', textDecoration: 'none' }}>
                Termos
              </a>{' '}
              e{' '}
              <a href="/privacy" style={{ color: 'var(--c-blue)', textDecoration: 'none' }}>
                Política de Privacidade
              </a>
            </div>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--c-text2)' }}>
            Já tem conta?{' '}
            <a href="/login" style={{ color: 'var(--c-blue)', textDecoration: 'none', fontWeight: 600 }}>
              Entrar
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
