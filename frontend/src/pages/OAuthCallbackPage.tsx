import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

export default function OAuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        if (error) {
          setStatus('error')
          setMessage(error)
          return
        }

        if (!code) {
          setStatus('error')
          setMessage('Código de autorização não encontrado')
          return
        }

        // Simular troca de código por token
        await new Promise((r) => setTimeout(r, 1500))

        // Simular login via OAuth
        const mockUser = {
          id: '1',
          name: 'Usuário OAuth',
          email: 'user@oauth.com',
          role: 'member',
        }

        localStorage.setItem('arxisvr_user', JSON.stringify(mockUser))
        setStatus('success')
        setMessage('Login realizado com sucesso!')
        setTimeout(() => navigate('/dashboard'), 2000)
      } catch (err: any) {
        setStatus('error')
        setMessage(err.message || 'Erro ao processar callback OAuth')
      }
    }

    handleCallback()
  }, [code, error, navigate])

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #111111 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
              Autenticando
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)' }}>
              Processando sua autenticação...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--c-green)', marginBottom: '8px' }}>
              Autenticação realizada
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)', marginBottom: '20px' }}>
              {message}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--c-text3)' }}>
              Redirecionando para dashboard...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fca5a5', marginBottom: '8px' }}>
              Erro na autenticação
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--c-text2)', marginBottom: '24px' }}>
              {message}
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
              Voltar para login
            </a>
          </>
        )}
      </div>
    </div>
  )
}
