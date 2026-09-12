import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

export default function JoinPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const workspaceName = searchParams.get('name') || 'Arxis'

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      await new Promise((r) => setTimeout(r, 800))

      // Simular envio de convite
      alert(`Convite enviado para ${email}`)
      navigate('/login')
    } catch {
      alert('Erro ao enviar convite')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #111111 100%)',
        padding: '40px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: '500px', textAlign: 'center' }}>
        <img src="/logo-icon.svg" alt="Arxis" style={{ width: '48px', height: '48px', margin: '0 auto 24px' }} />

        <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--c-text)', marginBottom: '8px', letterSpacing: '-0.5px' }}>
          Junte-se a {workspaceName}
        </h1>

        <p style={{ fontSize: '14px', color: 'var(--c-text2)', marginBottom: '32px' }}>
          Digite seu email para receber um convite e começar a colaborar
        </p>

        <form onSubmit={handleJoin}>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
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
              padding: '12px 16px',
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
            {loading ? 'Enviando convite...' : 'Enviar convite'}
          </button>
        </form>

        <div style={{ marginTop: '24px', fontSize: '12px', color: 'var(--c-text3)' }}>
          Já tem conta?{' '}
          <a href="/login" style={{ color: 'var(--c-blue)', textDecoration: 'none', fontWeight: 600 }}>
            Entrar
          </a>
        </div>
      </div>
    </div>
  )
}
