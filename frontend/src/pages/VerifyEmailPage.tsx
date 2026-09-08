import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { buildApiV1Url } from '@/config/apiBaseUrl'

/**
 * Esta tela atende DOIS caminhos, e confundi-los era o defeito:
 *
 *   1. Logo apos o cadastro, o RegisterPage manda para `/verify-email?email=...`
 *      SEM token, porque o token so existe dentro do e-mail. Aqui a tela deve
 *      dizer "confira sua caixa de entrada", nao acusar erro.
 *   2. Pelo link do e-mail, que traz `?token=...&tenant=...`. Ai sim verifica.
 *
 * Antes, a ausencia de token virava "Erro na verificacao / Token de verificacao
 * nao encontrado" na cara de quem tinha acabado de se cadastrar, sugerindo que
 * o cadastro falhou quando ele deu certo.
 *
 * A verificacao tambem era SIMULADA (`await new Promise` seguido de sucesso):
 * qualquer token, ate invalido, dava "Email verificado!" sem nada acontecer no
 * servidor. Agora chama POST /auth/verify-email de verdade.
 *
 * Nao ha botao de reenviar porque o backend ainda nao expoe rota para isso: as
 * unicas rotas de verificacao sao GET e POST /auth/verify-email. Botao que
 * chama endpoint inexistente e pior que botao ausente.
 */
export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'aguardando' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  const token = searchParams.get('token')
  const email = searchParams.get('email')

  useEffect(() => {
    const verify = async () => {
      // Caminho 1: veio do cadastro, o e-mail ainda esta a caminho.
      if (!token) {
        setStatus('aguardando')
        return
      }

      try {
        const response = await fetch(buildApiV1Url('/auth/verify-email'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // O backend espera `verificationToken`, nao `token`.
          body: JSON.stringify({ verificationToken: token }),
        })
        const data = await response.json().catch(() => null)

        if (!response.ok) {
          setStatus('error')
          setMessage(data?.message || data?.error || 'Não foi possível verificar este link.')
          return
        }

        setStatus('success')
        setMessage(data?.message || 'Email verificado com sucesso!')
        setTimeout(() => navigate('/login'), 2000)
      } catch {
        setStatus('error')
        setMessage('Falha de conexão ao verificar o email.')
      }
    }

    void verify()
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

        {status === 'aguardando' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📬</div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--c-text)', marginBottom: '8px' }}>
              Confira seu e-mail
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--c-text2)', marginBottom: '24px' }}>
              {message
                ? message
                : email
                  ? `Enviamos um link de confirmação para ${email}. Abra o e-mail e clique no botão para ativar sua conta.`
                  : 'Enviamos um link de confirmação. Abra o e-mail e clique no botão para ativar sua conta.'}
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
              Ir para o login
            </a>
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
