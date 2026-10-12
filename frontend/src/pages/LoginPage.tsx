import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { buildApiV1Url } from '@/config/apiBaseUrl'
import AuthLayout from '../components/auth/AuthLayout'

/**
 * A entrada do Arxis é o login central da Ávila Ops. Esta tela não pede
 * e-mail nem senha: leva ao backend, que redireciona para o Auth e volta por
 * `/oauth-callback` com a sessão do Arxis. Conta nova nasce lá também.
 */
export const CENTRAL_LOGIN_URL = buildApiV1Url('/auth/avilaops')

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error] = useState(() => searchParams.get('oauth_error') ?? '')

  useEffect(() => {
    const user = localStorage.getItem('arxisvr_user')
    const token = localStorage.getItem('arxisvr_token')
    if (user && token) navigate('/dashboard')
    else if (user || token) {
      localStorage.removeItem('arxisvr_user')
      localStorage.removeItem('arxisvr_token')
    }
  }, [navigate])

  return <AuthLayout title="Entrar" description="Acesse seu espaço de projetos BIM na Arxis." eyebrow="Seu espaço de projeto" heading="Continue de onde parou." intro="Abra seus modelos, retome cenários salvos e mantenha a conversa do projeto no mesmo lugar.">
    <span className="auth-kicker">Bem-vindo de volta</span>
    <h2>Entrar na Arxis</h2>
    <p className="auth-subtitle">O acesso é feito com a sua conta Ávila Ops, a mesma dos outros produtos da casa.</p>
    <div className="auth-form">
      {error && <div className="auth-error" role="alert">Não foi possível entrar: {error}</div>}
      <a className="auth-submit" href={CENTRAL_LOGIN_URL}>Entrar com a conta Ávila Ops <ArrowRight size={16} /></a>
    </div>
    <div className="auth-links"><span>Primeira vez? <Link to="/register">Criar conta</Link></span></div>
  </AuthLayout>
}
