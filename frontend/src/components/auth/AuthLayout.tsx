import type { ReactNode } from 'react'
import { ArrowUpRight, ShieldCheck } from 'lucide-react'
import SEO from '../SEO'
import BrandLogo from '../public/BrandLogo'
import '../../styles/auth.css'
import '../../styles/public.css'

interface AuthLayoutProps {
  title: string
  description: string
  eyebrow: string
  heading: string
  intro: string
  children: ReactNode
}

export default function AuthLayout({ title, description, eyebrow, heading, intro, children }: AuthLayoutProps) {
  return <div className="auth-page"><SEO title={`${title} · Arxis`} description={description} path={window.location.pathname} />
    <header className="auth-header"><a href="/" aria-label="Arxis, página inicial"><BrandLogo /></a><a className="auth-back" href="/"><span>Voltar ao site</span><ArrowUpRight size={16} /></a></header>
    <main className="auth-main"><section className="auth-context" aria-label="Sobre a Arxis"><div className="auth-context-inner"><span className="auth-eyebrow">{eyebrow}</span><h1>{heading}</h1><p>{intro}</p><div className="auth-model"><img src="/images/editorial/modelo-bim.webp" alt="Modelo BIM arquitetônico em corte." /><div className="auth-model-tag"><i /> MODELO IFC <strong>3D</strong></div></div><div className="auth-trust"><ShieldCheck size={17} /><span>Dados protegidos. Acesso seguro ao seu espaço de projeto.</span></div></div></section><section className="auth-panel"><div className="auth-panel-inner">{children}</div></section></main>
  </div>
}

export function AuthField({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="auth-field"><span>{label}</span><input {...props} /></label>
}
