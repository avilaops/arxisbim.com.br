import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { AlertTriangle, Check } from 'lucide-react'
import { buildApiV1Url } from '@/config/apiBaseUrl'
import {consumeReturnTo} from '@/core/auth/session-redirect'
import {clearSession} from '@/core/auth/session'

export default function OAuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const handled = useRef(false)

  const code = searchParams.get('code')
  const error = searchParams.get('error')

  useEffect(() => {
    if(handled.current)return
    handled.current=true
    const handleCallback = async () => {
      try {
        if (error) {
          setStatus('error')
          setMessage(error)
          return
        }

        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        const token = hashParams.get('token') || searchParams.get('token')
        const refreshToken = hashParams.get('refreshToken') || searchParams.get('refreshToken')
        const userParam = hashParams.get('user') || searchParams.get('user')

        if (token) {
          localStorage.setItem('arxisvr_token', token)
          if (refreshToken) {
            localStorage.setItem('arxisvr_refresh_token', refreshToken)
          }
          if (userParam) {
            try {
              localStorage.setItem('arxisvr_user', JSON.stringify(JSON.parse(decodeURIComponent(userParam))))
            } catch {
              localStorage.removeItem('arxisvr_user')
            }
          } else {
            const meResponse = await fetch(buildApiV1Url('/auth/me'), {
              headers: { Authorization: `Bearer ${token}` },
            })
            if(!meResponse.ok)throw new Error('Não foi possível confirmar a sessão. Tente entrar novamente.')
            if (meResponse.ok) {
              const user = await meResponse.json()
              localStorage.setItem('arxisvr_user', JSON.stringify(user))
            }
          }

          setStatus('success')
          setMessage('Sua conta foi reconhecida.')
          const destination=consumeReturnTo()
          setTimeout(() => navigate(destination,{replace:true}), 800)
          return
        }

        if (!code) {
          setStatus('error')
          setMessage('O retorno do login veio sem a sessão. Tente entrar de novo.')
          return
        }

        setStatus('error')
        setMessage('O retorno do login veio incompleto. Tente entrar de novo.')
      } catch (err: any) {
        clearSession()
        setStatus('error')
        setMessage(err.message || 'Não foi possível concluir a entrada. Tente de novo.')
      }
    }

    handleCallback()
  }, [code, error, navigate])

  return (
    <div className="arx-avulsa">
      <title>Entrando · Arxis</title>
      <main className="arx-avulsa__cartao">
        {status === 'loading' && (
          <div role="status">
            <div className="arx-avulsa__icone">
              <div className="arx-carregando__giro" />
            </div>
            <h1>Entrando</h1>
            <p className="arx-avulsa__texto">Confirmando seu acesso.</p>
          </div>
        )}

        {status === 'success' && (
          <div role="status">
            <div className="arx-avulsa__icone">
              <Check size={26} aria-hidden="true" />
            </div>
            <h1>Acesso confirmado</h1>
            <p className="arx-avulsa__texto">{message}</p>
            <p className="arx-avulsa__apoio">Retomando seu acesso.</p>
          </div>
        )}

        {status === 'error' && (
          <div role="alert">
            <div className="arx-avulsa__icone" data-tom="erro">
              <AlertTriangle size={26} aria-hidden="true" />
            </div>
            <h1>Não foi possível entrar</h1>
            <p className="arx-avulsa__texto">{message}</p>
            <a className="arx-avulsa__botao" href="/login">
              Voltar para a entrada
            </a>
          </div>
        )}
      </main>
    </div>
  )
}
