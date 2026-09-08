import { useEffect, useState } from 'react'
import SEO from '../components/SEO'

export default function LandingPage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [signupBtnVisible, setSignupBtnVisible] = useState(false)

  // A landing precisa rolar, e o CSS global do app trava o body (layout SPA
  // com container interno). `lp-page` no <html> devolve o fluxo normal do
  // documento so enquanto esta pagina esta montada. Sem isto, nada abaixo da
  // dobra era alcancavel por gesto: medido em producao em 08/09/2026.
  useEffect(() => {
    document.documentElement.classList.add('lp-page')
    return () => document.documentElement.classList.remove('lp-page')
  }, [])

  // Drawer: trava o scroll da pagina e fecha no ESC. A classe vai no <html>
  // (nao so no body) porque o Safari iOS ignora overflow:hidden do body quando
  // ha position:fixed na tela.
  useEffect(() => {
    const root = document.documentElement
    if (mobileMenuOpen) root.classList.add('lp-menu-open')
    else root.classList.remove('lp-menu-open')
    if (!mobileMenuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      root.classList.remove('lp-menu-open')
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    const handleScroll = () => {
      setSignupBtnVisible(window.scrollY > 200)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <SEO
        title="ArxisVR - Plataforma BIM com IA e Realidade Estendida no Navegador"
        description="Visualize modelos IFC em escala 1:1, simule cronogramas 4D, estime custos 5D e revise clashes com inteligência artificial e realidade virtual/aumentada (WebXR) direto no navegador."
        keywords="plataforma BIM, visualizador IFC online, simulação 4D de obras, estimativa de custos 5D, orçamento BIM, realidade virtual construção civil, realidade aumentada engenharia, WebXR VR AR, compatibilização de projetos BIM, Copilot de IA engenharia, AEC software, PropTech"
        path="/"
      />
      {/* Navigation */}
      <header
        className="nav"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backdropFilter: 'blur(20px)',
          background: 'rgba(255, 255, 255, 0.8)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div className="container nav-inner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '68px' }}>
          <a
            className="brand"
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontWeight: 700,
              color: 'var(--c-text)',
              letterSpacing: '-0.5px',
            }}
          >
            <img src="/logo-icon.svg" alt="" style={{ width: '26px', height: '26px' }} />
            ArxisVR
          </a>

          <nav
            className="nav-links"
            style={{
              display: 'flex',
              gap: '28px',
              alignItems: 'center',
            }}
          >
            <a href="#features" style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
              Recursos
            </a>
            <a href="#selo" style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
              Para compradores
            </a>
            <a href="#usecases" style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
              Exemplos
            </a>
            <a href="#cases" style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
              Casos de uso
            </a>
            <a href="#pricing" style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
              Planos
            </a>
          </nav>

          <div className="nav-cta" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <a href="/login" className="btn btn-ghost" style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500, padding: '10px 20px', borderRadius: '50px', border: '1px solid var(--border-color)', background: '#ffffff', cursor: 'pointer', textDecoration: 'none' }}>
              Entrar
            </a>
            <a
              href="/register"
              className={`btn btn-primary nav-btn-hidden ${signupBtnVisible ? 'nav-btn-visible' : ''}`}
              style={{
                color: 'white',
                background: '#000000',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                padding: '10px 20px',
                borderRadius: '50px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
                cursor: 'pointer',
                textDecoration: 'none',
                opacity: signupBtnVisible ? 1 : 0,
                pointerEvents: signupBtnVisible ? 'auto' : 'none',
                transition: 'opacity 0.25s',
              }}
            >
              Criar conta grátis
            </a>
            <button
              id="hamburger-btn"
              className="nav-hamburger"
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="lp-drawer"
              style={{
                // display:none aqui e o que ESCONDE no desktop; no mobile a
                // regra .nav-hamburger { display:flex !important } do CSS vence.
                display: 'none',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                color: 'var(--c-text)',
              }}
            >
              {mobileMenuOpen ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Drawer mobile. Sempre no DOM (data-open anima); fecha pelo X, pelo
          backdrop, pelo ESC (efeito acima) e ao escolher um item. */}
      <div
        id="lp-drawer"
        className="lp-drawer"
        data-open={mobileMenuOpen}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!mobileMenuOpen}
      >
        <div className="lp-drawer__backdrop" onClick={() => setMobileMenuOpen(false)} />
        <nav className="lp-drawer__panel" aria-label="Navegação">
          <div className="lp-drawer__head">
            <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--c-text)', letterSpacing: '-0.3px' }}>Menu</span>
            <button type="button" className="lp-drawer__close" onClick={() => setMobileMenuOpen(false)} aria-label="Fechar menu">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>

          <div className="lp-drawer__list">
            {[
              ['#features', 'Recursos'],
              ['#selo', 'Para compradores'],
              ['#usecases', 'Exemplos'],
              ['#cases', 'Casos de uso'],
              ['#pricing', 'Planos'],
            ].map(([href, label]) => (
              <a key={href} href={href} className="lp-drawer__link" onClick={() => setMobileMenuOpen(false)}>
                {label}
              </a>
            ))}
          </div>

          <div className="lp-drawer__cta">
            <a href="/register" className="lp-drawer__btn lp-drawer__btn--primary" onClick={() => setMobileMenuOpen(false)}>
              Criar conta grátis →
            </a>
            <a href="/login" className="lp-drawer__btn lp-drawer__btn--ghost" onClick={() => setMobileMenuOpen(false)}>
              Entrar
            </a>
          </div>
        </nav>
      </div>

      <main id="main-content">
        {/* HERO SECTION */}
        <section
          className="hero"
          style={{
            position: 'relative',
            // overflow:hidden aqui NAO esconde erro de layout: contem o bleed
            // decorativo dos radial-gradients absolutos logo abaixo.
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(800px 400px at 80% -10%, rgba(196, 181, 244, 0.3), transparent 60%), 
                           radial-gradient(700px 380px at 10% 10%, rgba(124, 150, 255, 0.2), transparent 60%)`,
              pointerEvents: 'none',
            }}
          ></div>

          <div className="container hero-inner" style={{ position: 'relative', textAlign: 'center', maxWidth: '840px', margin: '0 auto' }}>
            <div
              className="eyebrow"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                borderRadius: '999px',
                border: '1px solid var(--border-color)',
                background: 'rgba(255,255,255,0.6)',
                fontWeight: 500,
                color: 'var(--c-text)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 0 4px rgba(52, 199, 89, 0.15)', flexShrink: 0 }}></span>
              <span className="eyebrow-full">BIM · 4D/5D · Realidade Estendida · IA</span>
              <span className="eyebrow-short">BIM · 4D/5D · XR · IA</span>
            </div>

            <h1
              className="h1"
              style={{
                fontWeight: 700,
                color: 'var(--c-text)',
              }}
            >
              A plataforma BIM com <span style={{ background: 'linear-gradient(90deg, #007AFF 0%, #C4B5F4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Copilot de IA</span>
              <span className="h1-br"><br /></span> e Realidade Estendida<span className="h1-nav"> no navegador</span>.
            </h1>

            <p
              className="lead"
            >
              Carregue modelos IFC em escala 1:1, coordene disciplinas, simule cronograma 4D, revise clashes e custos 5D, e visite o projeto em VR ou AR, tudo em uma única plataforma, sem instalação.
            </p>

            <div className="hero-cta">
              <a
                href="/register"
                className="btn btn-primary btn-lg"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '50px',
                  fontWeight: 600,
                  fontSize: '15px',
                  color: 'white',
                  background: '#000000',
                  border: 'none',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'var(--transition)',
                }}
              >
                Criar conta grátis →
              </a>
              <a
                href="/login"
                className="btn btn-outline btn-lg"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '50px',
                  fontWeight: 600,
                  fontSize: '15px',
                  // Fundo branco: aqui o texto PRECISA ser escuro. A troca em
                  // massa de #000000 por var(--c-text) pegou este botao junto e
                  // deixou branco no branco.
                  color: '#0a0a0a',
                  background: '#ffffff',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'var(--transition)',
                }}
              >
                Entrar
              </a>
            </div>

            <div className="hero-meta">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: '16px' }}>✓</span> IFC 2x3, IFC4, IFC4.3
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: '16px' }}>✓</span> WebXR (VR/AR)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: '16px' }}>✓</span> Multi-empresa
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--accent-green)', fontWeight: 700, fontSize: '16px' }}>✓</span> API REST v1
              </span>
            </div>
          </div>
        </section>

        {/* SIMPLE CTA SECTION */}
        <section data-track-section="bottom_cta" style={{ padding: '80px 0' }}>
          <div className="container">
            <div
              className="cta-band"
              style={{
                borderRadius: '24px',
                background: 'rgba(255,255,255,0.7)',
                border: '1px solid var(--border-color)',
                textAlign: 'center',
                boxShadow: 'var(--shadow-md)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '12px', color: '#0a0a0a' /* card claro: texto escuro */ }}>
                Pronto para ver seu projeto em outra dimensão?
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto', fontSize: '15px' }}>
                Crie sua conta gratuita e suba um IFC em menos de 2 minutos. Sem instalação, sem cartão de crédito.
              </p>
              <div className="cta-row">
                <a
                  href="/register"
                  className="btn btn-primary btn-lg"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '50px',
                    fontWeight: 600,
                    fontSize: '15px',
                    color: 'white',
                    background: '#000000',
                    border: 'none',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    transition: 'var(--transition)',
                  }}
                >
                  Criar conta grátis →
                </a>
                <a
                  href="/login"
                  className="btn btn-outline btn-lg"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '50px',
                    fontWeight: 600,
                    fontSize: '15px',
                    // Fundo branco: texto escuro (mesmo caso do botao do hero).
                    color: '#0a0a0a',
                    background: '#ffffff',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    transition: 'var(--transition)',
                  }}
                >
                  Entrar
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={{ padding: '56px 0 32px', borderTop: '1px solid var(--border-color)', marginTop: '80px' }}>
        <div className="container">
          <div className="foot-grid">
            <div className="foot-brand">
              <a
                className="brand"
                href="/"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontWeight: 700,
                  fontSize: '20px',
                  color: 'var(--c-text)',
                  letterSpacing: '-0.5px',
                  textDecoration: 'none',
                  marginBottom: '14px',
                }}
              >
                <img src="/logo-icon.svg" alt="" style={{ width: '26px', height: '26px' }} />
                ArxisVR
              </a>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '14px', maxWidth: '300px' }}>
                Plataforma BIM com Copilot de IA e Realidade Estendida. Feito por AvilaOps no Brasil.
              </p>
            </div>
            <div>
              <h5 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '14px', fontWeight: 700 }}>
                Produto
              </h5>
              <ul style={{ listStyle: 'none' }}>
                <li style={{ marginBottom: '8px' }}>
                  <a href="#features" style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none' }}>
                    Recursos
                  </a>
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <a href="#pricing" style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none' }}>
                    Planos
                  </a>
                </li>
                <li style={{ marginBottom: '8px' }}>
                  <a href="/validador" style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none', fontWeight: 500 }}>
                    Validador IFC (Grátis)
                  </a>
                </li>
                <li>
                  <a href="/login" style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none' }}>
                    Entrar
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h5 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '14px', fontWeight: 700 }}>
                Empresa
              </h5>
              <ul style={{ listStyle: 'none' }}>
                <li style={{ marginBottom: '8px' }}>
                  <a href="mailto:nicolas@avilaops.com" style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none' }}>
                    Vendas
                  </a>
                </li>
                <li>
                  <a href="https://github.com/avilaops" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none' }}>
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h5 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '14px', fontWeight: 700 }}>
                Conta
              </h5>
              <ul style={{ listStyle: 'none' }}>
                <li style={{ marginBottom: '8px' }}>
                  <a href="/login" style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none' }}>
                    Entrar
                  </a>
                </li>
                <li>
                  <a href="/register" style={{ color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none' }}>
                    Criar conta
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--text-muted)', paddingTop: '24px', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '12px' }}>
            <span>© 2026 ArxisVR by AvilaOps. Todos os direitos reservados.</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>v1.1</span>
          </div>
        </div>
      </footer>
    </>
  )
}
