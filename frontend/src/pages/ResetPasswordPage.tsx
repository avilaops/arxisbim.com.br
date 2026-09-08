import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { buildApiV1Url } from '@/config/apiBaseUrl'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const token = searchParams.get('token')

  if (!token) {
    return (
      <div className="auth-split"
        style={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0a',
        }}
      >
        <div style={{ textAlign: 'center', color: 'var(--c-text3)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
            Link inválido
          </h2>
          <p style={{ fontSize: '13px', marginBottom: '20px' }}>
            Este link expirou ou é inválido.
          </p>
          <a
            href="/forgot-password"
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
            Solicitar novo link
          </a>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!password || !confirmPassword) {
        setError('Preencha todos os campos')
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

      // Antes isto era `await new Promise(setTimeout)` seguido de sucesso: a
      // senha NUNCA era trocada no servidor, e o usuario voltava para o login
      // com a senha antiga achando que tinha redefinido.
      const response = await fetch(buildApiV1Url('/auth/reset-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // O backend espera `newPassword`, nao `password`.
        body: JSON.stringify({ token, newPassword: password }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setError(data?.message || data?.error || 'Não foi possível redefinir a senha. O link pode ter expirado.')
        setLoading(false)
        return
      }

      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err: any) {
      setError(err.message || 'Erro ao resetar senha')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-split"
        style={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #111111 100%)',
        }}
      >
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: 'var(--c-green)' }}>
            Senha resetada com sucesso!
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--c-text2)' }}>
            Redirecionando para login...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-split"
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #111111 100%)',
      }}
    >
      <div className="auth-brand"
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
          Criar nova senha
        </p>
      </div>

      <div className="auth-form"
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
            Criar nova senha
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--c-text2)', marginBottom: '28px' }}>
            Digite sua nova senha abaixo
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
                Nova senha
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
                fontFamily: 'inherit',
              }}
            >
              {loading ? 'Resetando...' : 'Resetar senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
