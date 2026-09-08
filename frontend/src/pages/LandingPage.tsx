import { useEffect, useState } from 'react'
import { Box, Building2, Check, Clock3, Cloud, HardHat, House, Ruler, ScanSearch, Users } from 'lucide-react'
import SEO from '../components/SEO'
import { BillingPlan, plansService } from '../services/plans.service'

const featureLabels: Record<string, string> = {
  ifc_viewer: 'Visualizador IFC',
  cloud_storage: 'Armazenamento em nuvem',
  measurement_tools: 'Ferramentas de medição',
  annotations: 'Comentários e anotações',
  vr_mode: 'Modo VR',
  ar_mode: 'Modo AR',
  federation: 'Federação de modelos',
  collaboration: 'Colaboração em tempo real',
  api_access: 'Acesso à API',
  webhooks: 'Webhooks',
  advanced_analytics: 'Analytics avançados',
  sso: 'SSO',
  custom_branding: 'Marca própria',
  dedicated_support: 'Suporte dedicado',
}

const limitLabels: Record<string, { label: string; suffix?: string }> = {
  maxUsers: { label: 'usuários' },
  maxProjects: { label: 'projetos' },
  maxStorageGB: { label: 'de armazenamento', suffix: ' GB' },
  maxFileSizeMB: { label: 'por arquivo', suffix: ' MB' },
  collaboratorsPerSession: { label: 'participantes por sessão' },
  apiCallsPerMonth: { label: 'chamadas de API por mês' },
  maxScenarios: { label: 'cenários por projeto' },
}

function PricingSection() {
  const [plans, setPlans] = useState<BillingPlan[] | null>(null)
  const [error, setError] = useState(false)

  const loadPlans = async () => {
    setError(false)
    setPlans(null)
    try {
      const response = await plansService.get()
      setPlans(response.plans)
    } catch {
      setError(true)
    }
  }

  useEffect(() => { void loadPlans() }, [])

  const formatPrice = (plan: BillingPlan) => plan.monthlyAmountCents === 0
    ? 'Grátis'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: plan.currency, maximumFractionDigits: 0 }).format(plan.monthlyAmountCents / 100)

  return (
    <section id="pricing" data-track-section="pricing" aria-labelledby="pricing-title" className="lp-section">
      <div className="container">
        <div className="lp-section-head">
          <span className="lp-kicker">Planos</span>
          <h2 id="pricing-title">Comece grátis. Escale quando precisar.</h2>
          <p>Valores e limites vêm diretamente da plataforma. Sem cartão de crédito para começar.</p>
        </div>

        {error ? (
          <div className="lp-pricing-message" role="alert">
            <p>Não foi possível carregar os planos agora.</p>
            <button type="button" onClick={() => void loadPlans()}>Tentar de novo</button>
          </div>
        ) : plans === null ? (
          <div className="lp-pricing-grid" aria-label="Carregando planos" aria-busy="true">
            {Array.from({ length: 4 }, (_, index) => <div className="lp-plan lp-plan--skeleton" key={index} />)}
          </div>
        ) : plans.length === 0 ? (
          <div className="lp-pricing-message"><p>Nenhum plano disponível no momento.</p></div>
        ) : (
          <div className="lp-pricing-grid">
            {plans.map((plan) => {
              const knownFeatures = plan.features.filter((feature) => {
                if (featureLabels[feature]) return true
                console.warn(`[ArxisVR] Recurso sem rótulo na landing: ${feature}`)
                return false
              })
              return (
                <article className={`lp-plan ${plan.tier === 'professional' ? 'lp-plan--featured' : ''}`} key={plan.tier}>
                  {plan.tier === 'professional' && <span className="lp-plan-badge">Recomendado</span>}
                  <h3>{plan.name}</h3>
                  <p className="lp-plan-description">{plan.description}</p>
                  <p className="lp-plan-price">{formatPrice(plan)}{plan.monthlyAmountCents > 0 && <small>/mês</small>}</p>
                  <ul>
                    {Object.entries(plan.limits).map(([key, value]) => limitLabels[key] && (
                      <li key={key}><Check size={16} aria-hidden="true" /><span><strong>{value === -1 ? 'Ilimitado' : `${value}${limitLabels[key].suffix ?? ''}`}</strong> {limitLabels[key].label}</span></li>
                    ))}
                    {knownFeatures.map((feature) => <li key={feature}><Check size={16} aria-hidden="true" /><span>{featureLabels[feature]}</span></li>)}
                  </ul>
                  <a href="/register" className="lp-plan-cta">Começar agora</a>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

export default function LandingPage() {
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

        <section id="features" data-track-section="features" aria-labelledby="features-title" className="lp-section">
          <div className="container">
            <div className="lp-section-head">
              <span className="lp-kicker">Recursos</span>
              <h2 id="features-title">Diferenciais Tecnológicos</h2>
              <p>A plataforma mais completa de AR para arquitetura, engenharia e construção.</p>
            </div>
            <img className="lp-section-image" src="/images/landing/bim-digital-twin.jpg" alt="Modelo BIM de um edifício com sistemas técnicos coordenados" loading="lazy" />
            <div className="lp-feature-grid">
              {[
                [Ruler, 'Visualização em Escala Humana', 'Veja cada detalhe do projeto em tamanho real, identifique problemas antes da execução.'],
                [ScanSearch, 'Detecção de Clash', 'Identifique interferências entre disciplinas automaticamente no canteiro.'],
                [Clock3, 'Modelos 4D', 'Visualize a sequência construtiva com simulação temporal da obra.'],
                [Box, 'Compatível com IFC', 'Suporte total para Industry Foundation Classes, padrão internacional BIM.'],
                [Users, 'Reunião AR Remota', 'Reúna equipes em sessões colaborativas de AR.'],
                [Cloud, 'Armazenamento em Nuvem', 'Seus projetos sempre disponíveis, sincronizados em todos os dispositivos.'],
              ].map(([Icon, title, description]) => (
                <article className="lp-card" key={String(title)}><Icon className="lp-card-icon" aria-hidden="true" /><h3>{String(title)}</h3><p>{String(description)}</p></article>
              ))}
            </div>
          </div>
        </section>

        <section id="selo" data-track-section="selo" aria-labelledby="selo-title" className="lp-section lp-seal-section">
          <div className="container lp-split">
            <div>
              <span className="lp-kicker">Selo de Qualidade ArxisVR</span>
              <h2 id="selo-title">Quem compra na planta não enxerga uma planta 2D. Enxerga a <span>casa onde vai morar.</span></h2>
              <p>Dê ao comprador uma experiência imersiva do imóvel, em 3D, VR ou AR, direto do navegador. O projeto deixa de ser um desenho técnico abstrato e vira um espaço real que ele percorre, mede e sente. Isso valoriza o empreendimento, reduz dúvida e acelera a decisão de compra.</p>
              <div className="lp-seal-list">
                {[
                  ['Vê antes de existir', 'Caminha pelos cômodos em escala 1:1, abre janelas, olha a vista, em vez de imaginar a partir de uma planta baixa.'],
                  ['Valoriza o projeto', 'Um empreendimento com tour imersivo transmite transparência e qualidade, e justifica o preço.'],
                  ['Confiança na compra', 'O comprador entende exatamente o que está adquirindo. Menos surpresa na entrega, menos distrato.'],
                  ['Sem instalar nada', 'Um link abre no celular, no notebook ou no headset VR do estande de vendas.'],
                ].map(([title, text]) => <div className="lp-seal-item" key={title}><Check aria-hidden="true" /><div><h3>{title}</h3><p>{text}</p></div></div>)}
              </div>
              <div className="lp-inline-cta"><a href="/register">Dar o selo ao meu projeto →</a><a href="#usecases">Ver exemplos</a></div>
            </div>
            <img className="lp-section-image lp-section-image--tall" src="/images/landing/comprador-imersivo.jpg" alt="Comprador visitando em realidade virtual o apartamento antes da construção" loading="lazy" />
          </div>
        </section>

        <section id="usecases" data-track-section="usecases" aria-labelledby="usecases-title" className="lp-section">
          <div className="container">
            <div className="lp-section-head"><span className="lp-kicker">Exemplos de uso</span><h2 id="usecases-title">Do estande de vendas ao canteiro de obras.</h2><p>Os usos mais populares da plataforma, para quem vende, quem projeta, quem constrói e quem compra.</p></div>
            <div className="lp-usecase-grid">
              {[
                ['🥽', 'Vendas na planta', 'Estande de vendas imersivo', 'O corretor coloca o headset no cliente e ele caminha pelo apartamento decorado em escala real. Fecha venda na emoção, não na imaginação.'],
                ['🏠', 'Comprador', 'Selo de qualidade do imóvel', 'O comprador recebe um link e visita a futura casa pelo celular. Valoriza o projeto e dá segurança na maior compra da vida dele.'],
                ['📐', 'Arquitetura', 'Aprovação de projeto com o cliente', 'Apresente a proposta dentro do espaço, em 1:1. O cliente entende volumes e luz, aprova mais rápido, pede menos revisão.'],
                ['🏗️', 'Construção', 'Coordenação 4D antes da obra', 'Simule o cronograma vinculado ao IFC, antecipe conflitos entre disciplinas e reduza retrabalho no canteiro.'],
                ['⚙️', 'Engenharia MEP', 'Revisão de clashes em equipe', 'Hidráulica × elétrica × estrutura no mesmo modelo, com cortes dinâmicos e inspeção de propriedades, em reunião XR ao vivo.'],
                ['🧰', 'Facilities', 'Operação e manutenção', 'Depois de pronto, o modelo vira gêmeo digital: consulte propriedades, localize equipamentos e planeje manutenção.'],
              ].map(([emoji, tag, title, description]) => <article className="lp-card lp-usecase" key={title}><span className="lp-usecase-emoji" aria-hidden="true">{emoji}</span><span className="lp-usecase-tag">{tag}</span><h3>{title}</h3><p>{description}</p></article>)}
            </div>
          </div>
        </section>

        <section id="cases" data-track-section="cases" aria-labelledby="cases-title" className="lp-section">
          <div className="container">
            <div className="lp-section-head"><span className="lp-kicker">Casos de uso</span><h2 id="cases-title">Feito para times AEC que entregam projetos complexos.</h2></div>
            <img className="lp-section-image" src="/images/landing/time-aec-bim.jpg" alt="Equipe multidisciplinar coordenando um modelo BIM no canteiro de obras" loading="lazy" />
            <div className="lp-cases-grid">
              {([
                [Building2, 'Construtoras & Incorporadoras', 'Reduza retrabalho com coordenação BIM e simulação 4D antes da obra.', ['Federação de disciplinas EST × HID × ELE × ARQ', 'Cronograma 4D com vínculo IFC ↔ tarefa', 'Revisão de clashes priorizada']],
                [House, 'Escritórios de Arquitetura', 'Apresente o projeto ao cliente em 1:1, dentro do espaço, antes da obra começar.', ['Visita guiada em VR/AR', 'Cenários salvos por reunião', 'Comentários e anotações no modelo']],
                [Users, 'Engenharia & MEP', 'Valide interferências e roteamentos com colaboração em tempo real.', ['Cortes e clipping dinâmicos', 'Inspeção de propriedades IFC', 'Filtros avançados por tipo/disciplina']],
                [HardHat, 'Gerenciadoras de Obra', 'Acompanhe progresso físico-financeiro com 4D + 5D integrados.', ['Quantitativos automáticos do IFC', 'Custos por elemento e fase', 'Relatórios exportáveis']],
              ] as const).map(([Icon, title, description, items]) => <article className="lp-card lp-case" key={title}><Icon className="lp-card-icon" aria-hidden="true" /><h3>{title}</h3><p>{description}</p><ul>{items.map((item) => <li key={item}><Check size={15} aria-hidden="true" />{item}</li>)}</ul></article>)}
            </div>
          </div>
        </section>

        <PricingSection />

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
