import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  const token = searchParams.get('token')
  const email = searchParams.get('email')

  useEffect(() => {
    const verify = async () => {
      try {
        if (!token) {
          setStatus('error')
          setMessage('Token de verificação não encontrado')
          return
        }

        // Simular verificação
        await new Promise((r) => setTimeout(r, 1500))
        setStatus('success')
        setMessage('Email verificado com sucesso!')
        setTimeout(() => navigate('/login'), 2000)
      } catch (err: any) {
        setStatus('error')
        setMessage(err.message || 'Erro ao verificar email')
      }
    }

    verify()
  }, [token, navigate])

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
      <div style={{ width: '100%', maxWidth: '360px', textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <div
              style={{
                width: '48px',
                height: '48px',
                margin: '0 auto 24px',
                border: '2px solid rgba(255,255,255,0.06)',
                borderTopColor: 'var(--c-blue)',
                borderRadius: '50%',
                animation: 'spin .7s linear infinite',
              }}
            ></div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--c-text)', marginBottom: '8px' }}>
              Verificando email
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--c-text2)' }}>
              {email ? `Verificando ${email}...` : 'Aguarde...'}
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--c-green)', marginBottom: '8px' }}>
              Email verificado!
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--c-text2)', marginBottom: '24px' }}>
              {message}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--c-text3)' }}>
              Redirecionando para login...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fca5a5', marginBottom: '8px' }}>
              Erro na verificação
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--c-text2)', marginBottom: '24px' }}>
              {message}
            </p>
            <a
              href="/register"
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
              Tentar novamente
            </a>
          </>
        )}
      </div>
    </div>
  )
}
