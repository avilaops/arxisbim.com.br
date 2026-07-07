import { useEffect, useState } from 'react'
import SEO from '../components/SEO'

export default function LandingPage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [signupBtnVisible, setSignupBtnVisible] = useState(false)

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
        title="ArxisVR — Plataforma BIM com IA e Realidade Estendida no Navegador"
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
              fontSize: '20px',
              color: '#000000',
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
              '@media (max-width: 760px)': { display: 'none' },
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
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                display: 'none',
                flexDirection: 'column',
                gap: '5px',
                padding: '8px',
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                '@media (max-width: 760px)': { display: 'flex' },
              }}
            >
              <span style={{ display: 'block', width: '22px', height: '2px', background: '#000', borderRadius: '2px' }}></span>
              <span style={{ display: 'block', width: '22px', height: '2px', background: '#000', borderRadius: '2px' }}></span>
              <span style={{ display: 'block', width: '22px', height: '2px', background: '#000', borderRadius: '2px' }}></span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <nav
          className="mobile-nav"
          style={{
            display: 'flex',
            position: 'fixed',
            inset: 0,
            top: '68px',
            zIndex: 49,
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)',
            padding: '24px',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <a href="#features" onClick={() => setMobileMenuOpen(false)} style={{ padding: '14px 16px', borderRadius: '12px', fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)', border: 'none', background: 'none', textDecoration: 'none', cursor: 'pointer', transition: 'var(--transition)' }}>
            Recursos
          </a>
          <a href="#pricing" onClick={() => setMobileMenuOpen(false)} style={{ padding: '14px 16px', borderRadius: '12px', fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)', border: 'none', background: 'none', textDecoration: 'none', cursor: 'pointer', transition: 'var(--transition)' }}>
            Planos
          </a>
        </nav>
      )}

      <main id="main-content">
        {/* HERO SECTION */}
        <section
          className="hero"
          style={{
            position: 'relative',
            padding: '80px 0 60px',
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
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                marginBottom: '24px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)', boxShadow: '0 0 0 4px rgba(52, 199, 89, 0.15)' }}></span>
              BIM · 4D/5D · Realidade Estendida · IA
            </div>

            <h1
              className="h1"
              style={{
                fontSize: 'clamp(34px, 5.5vw, 58px)',
                fontWeight: 700,
                letterSpacing: '-0.6px',
                lineHeight: 1.1,
                marginBottom: '20px',
                color: '#000000',
              }}
            >
              A plataforma BIM com <span style={{ background: 'linear-gradient(90deg, #007AFF 0%, #C4B5F4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Copilot de IA</span>
              <br />e Realidade Estendida no navegador.
            </h1>

            <p
              className="lead"
              style={{
                fontSize: 'clamp(16px, 1.5vw, 18px)',
                color: 'var(--text-secondary)',
                maxWidth: '680px',
                margin: '0 auto 36px',
                lineHeight: 1.55,
              }}
            >
              Carregue modelos IFC em escala 1:1, coordene disciplinas, simule cronograma 4D, revise clashes e custos 5D, e visite o projeto em VR ou AR — tudo em uma única plataforma, sem instalação.
            </p>

            <div className="hero-cta" style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '32px' }}>
              <a
                href="/register"
                className="btn btn-primary btn-lg"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 26px',
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
                  padding: '14px 26px',
                  borderRadius: '50px',
                  fontWeight: 600,
                  fontSize: '15px',
                  color: 'var(--text-primary)',
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

            <div className="hero-meta" style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
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
                padding: '64px 32px',
                borderRadius: '24px',
                background: 'rgba(255,255,255,0.7)',
                border: '1px solid var(--border-color)',
                textAlign: 'center',
                boxShadow: 'var(--shadow-md)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '12px', color: '#000000' }}>
                Pronto para ver seu projeto em outra dimensão?
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto', fontSize: '15px' }}>
                Crie sua conta gratuita e suba um IFC em menos de 2 minutos. Sem instalação, sem cartão de crédito.
              </p>
              <div className="cta-row" style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a
                  href="/register"
                  className="btn btn-primary btn-lg"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '14px 26px',
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
                    padding: '14px 26px',
                    borderRadius: '50px',
                    fontWeight: 600,
                    fontSize: '15px',
                    color: 'var(--text-primary)',
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
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr repeat(3, 1fr)', gap: '32px', marginBottom: '36px', textAlign: 'left' }}>
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
                  color: '#000000',
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
