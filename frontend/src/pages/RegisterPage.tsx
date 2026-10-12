import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import AuthLayout from '../components/auth/AuthLayout'
import { CENTRAL_LOGIN_URL } from './LoginPage'

/**
 * Conta nova nasce no login central da Ávila Ops: a tela de lá tem "Criar
 * conta", confirma o e-mail e devolve a pessoa já dentro do Arxis, com o
 * espaço de trabalho gratuito criado no primeiro acesso.
 */
export default function RegisterPage() {
  const navigate = useNavigate()

  useEffect(() => {
    if (localStorage.getItem('arxisvr_user') && localStorage.getItem('arxisvr_token')) navigate('/dashboard')
  }, [navigate])

  return <AuthLayout title="Criar conta" description="Crie uma conta gratuita para explorar seus modelos IFC na Arxis." eyebrow="Primeiro passo" heading="Seu próximo projeto começa com clareza." intro="Crie sua conta, organize um projeto e envie um modelo IFC para começar a explorar.">
    <span className="auth-kicker">Comece gratuitamente</span>
    <h2>Criar sua conta</h2>
    <p className="auth-subtitle">A conta é criada no login da Ávila Ops. Na tela seguinte, escolha “Criar conta”, confirme seu e-mail e você volta direto para o Arxis.</p>
    <div className="auth-form">
      <a className="auth-submit" href={CENTRAL_LOGIN_URL}>Criar conta com a Ávila Ops <ArrowRight size={16} /></a>
      <p className="auth-check">Ao criar a conta, você concorda com os <Link to="/terms">Termos de Serviço</Link> e com a <Link to="/privacy">Política de Privacidade</Link>.</p>
    </div>
    <div className="auth-links"><span>Já tem conta? <Link to="/login">Entrar</Link></span></div>
  </AuthLayout>
}
