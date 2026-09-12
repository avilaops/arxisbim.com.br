import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowUpRight, Camera, Menu, X } from 'lucide-react'
import BrandLogo from './BrandLogo'
import '../../styles/public.css'

export default function PublicLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const menuButton = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLElement>(null)
  useEffect(() => {
    document.documentElement.classList.add('arxis-public')
    return () => { document.documentElement.classList.remove('arxis-public', 'arxis-menu-open') }
  }, [])
  useEffect(() => {
    setOpen(false)
    if (location.hash) {
      const id = window.requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView())
      return () => window.cancelAnimationFrame(id)
    }
    window.scrollTo(0, 0)
  }, [location.pathname, location.hash])
  useEffect(() => {
    document.documentElement.classList.toggle('arxis-menu-open', open)
    if (!open) return
    const links = () => Array.from(menu.current?.querySelectorAll<HTMLAnchorElement>('a') ?? [])
    links()[0]?.focus()
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); menuButton.current?.focus() }
      if (event.key === 'Tab') {
        const elements: HTMLElement[] = [menuButton.current!, ...links()]
        const current = elements.indexOf(document.activeElement as HTMLElement)
        if (event.shiftKey && current === 0) { event.preventDefault(); elements.at(-1)?.focus() }
        if (!event.shiftKey && current === elements.length - 1) { event.preventDefault(); elements[0]?.focus() }
      }
    }
    const resize = () => { if (window.innerWidth > 900) setOpen(false) }
    window.addEventListener('keydown', key)
    window.addEventListener('resize', resize)
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('resize', resize); document.documentElement.classList.remove('arxis-menu-open') }
  }, [open])
  return <div className="arx-site">
    <a className="arx-skip" href="#main-content">Pular para o conteúdo</a>
    <header className="arx-header">
      <div className="arx-container arx-header-inner">
        <Link to="/" className="arx-home" aria-label="Arxis · página inicial"><BrandLogo /></Link>
        <button ref={menuButton} type="button" className="arx-menu-toggle" aria-label={open ? 'Fechar menu' : 'Abrir menu'} aria-controls="public-menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        <nav id="public-menu" ref={menu} aria-label="Navegação principal" className={`arx-nav${open ? ' is-open' : ''}`}>
          <Link to="/#platform" onClick={() => setOpen(false)}>Plataforma</Link>
          <Link to="/#pricing" onClick={() => setOpen(false)}>Planos</Link>
          <NavLink to="/blog" onClick={() => setOpen(false)}>Blog</NavLink>
          <span className="arx-nav-divider" />
          <Link to="/login">Entrar</Link>
          <Link to="/register" className="arx-button arx-nav-cta">Começar grátis <ArrowUpRight size={17} /></Link>
        </nav>
      </div>
    </header>
    {children}
    <footer className="arx-footer">
      <div className="arx-container">
        <div className="arx-footer-top">
          <div><Link to="/" aria-label="Arxis · página inicial"><BrandLogo /></Link><p>Mais clareza para construir<br />o próximo passo.</p></div>
          <div className="arx-footer-links"><span>Explore</span><Link to="/#platform">Plataforma</Link><Link to="/#pricing">Planos</Link><Link to="/blog">Conteúdo e ideias</Link><Link to="/validador">Validador IFC</Link></div>
          <div className="arx-footer-links"><span>Vamos conversar</span><a href="https://www.instagram.com/arxis.bim" target="_blank" rel="noopener noreferrer"><Camera size={17} /> @arxis.bim <ArrowUpRight size={14} /></a><Link to="/register">Crie sua conta</Link><a href="/feed.xml">Acompanhe pelo RSS</a></div>
        </div>
        <div className="arx-footer-bottom"><span>© {new Date().getFullYear()} Arxis. BIM · Dados · Pessoas · Possibilidades.</span><div><Link to="/privacy">Privacidade</Link><Link to="/terms">Termos</Link><Link to="/cookies">Cookies</Link></div></div>
      </div>
    </footer>
  </div>
}
