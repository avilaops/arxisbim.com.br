import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUpRight, Check, Plus } from 'lucide-react'
import SEO from '../components/SEO'
import PublicLayout from '../components/public/PublicLayout'
import { type BillingPlan, plansService } from '../services/plans.service'
import '../styles/landing.css'

const paidTiers = ['starter', 'professional', 'enterprise'] as const
const paymentMethods = ['PayPal', 'Mercado Pago', 'Éfi'] as const
const planIntroductions: Record<string, string> = {
  starter: 'Para começar com uma equipe menor.',
  professional: 'Mais espaço para a rotina de projetos.',
  enterprise: 'Para uma operação de maior porte.',
}
const planLimits = [
  { key: 'maxUsers', singular: 'usuário', plural: 'usuários', unlimited: 'Usuários ilimitados' },
  { key: 'maxProjects', singular: 'projeto', plural: 'projetos', unlimited: 'Projetos ilimitados' },
  { key: 'maxStorageGB', singular: 'GB de armazenamento', plural: 'GB de armazenamento', unlimited: 'Armazenamento ilimitado' },
  { key: 'maxScenarios', singular: 'cenário por projeto', plural: 'cenários por projeto', unlimited: 'Cenários ilimitados por projeto' },
] as const

function PricingSection() {
  const [plans, setPlans] = useState<BillingPlan[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [payment, setPayment] = useState<string>('Mercado Pago')

  useEffect(() => {
    let active = true
    setPlans(null)
    setLoadError(false)
    void plansService.get().then(({ plans: available }) => {
      const ordered = paidTiers.map(tier => available.find(plan => plan.tier === tier))
      const complete = ordered.every((plan): plan is BillingPlan => Boolean(
        plan && Number.isFinite(plan.monthlyAmountCents) && plan.monthlyAmountCents > 0
        && planLimits.every(limit => Number.isFinite(plan.limits?.[limit.key])),
      ))
      if (!active) return
      if (!complete) { setLoadError(true); return }
      setPlans(ordered)
    }).catch(() => { if (active) setLoadError(true) })
    return () => { active = false }
  }, [attempt])

  const proposalUrl = (plan: BillingPlan) => {
    const subject = `Arxis · proposta ${plan.name} · Mensal · ${payment}`
    const body = `Olá! Gostaria de receber uma proposta comercial da Arxis.\n\nPlano: ${plan.name}\nCiclo: mensal\nPreferência de pagamento: ${payment}\n\nMeu nome:\nEmpresa:\nO que preciso para meu projeto:\n`
    return `mailto:nicolas@avilaops.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <section className="al-pricing al-section" id="pricing" aria-labelledby="al-pricing-title" data-track-section="pricing">
      <div className="arx-container">
        <div className="al-section-heading al-section-heading--split">
          <div><span className="arx-eyebrow">Um plano para cada etapa</span><h2 id="al-pricing-title">Comece pequeno.<br /><span>Cresça com espaço.</span></h2></div>
          <p>Conheça a Arxis pelo plano gratuito. Quando precisar de mais capacidade, escolha o plano que acompanha o seu trabalho.</p>
        </div>
        <div className="al-payment-preference"><div><label htmlFor="al-payment">Preferência de pagamento</label><p id="al-payment-help">Escolha sua preferência para a proposta comercial.</p></div><select id="al-payment" value={payment} aria-describedby="al-payment-help" onChange={event => setPayment(event.target.value)}>{paymentMethods.map(method => <option key={method} value={method}>{method}</option>)}</select></div>
        {loadError ? (
          <div className="al-pricing-message" role="status"><h3>Não foi possível carregar os planos.</h3><p>Consulte novamente para ver os valores e limites disponíveis.</p><button type="button" className="arx-button arx-button--outline" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div>
        ) : plans === null ? (
          <div className="al-plans" role="status" aria-label="Carregando os três planos" aria-busy="true">{paidTiers.map(tier => <div key={tier} className="al-plan al-plan--loading"><span /><span /><span /></div>)}</div>
        ) : (
          <div className="al-plans">{plans.map(plan => {
            const featured = plan.tier === 'professional'
            const price = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: plan.currency, maximumFractionDigits: plan.monthlyAmountCents % 100 === 0 ? 0 : 2 }).format(plan.monthlyAmountCents / 100)
            return <article className={`al-plan${featured ? ' al-plan--featured' : ''}`} key={plan.tier} aria-labelledby={`plan-${plan.tier}`}>
              <div className="al-plan-label"><h3 id={`plan-${plan.tier}`}>{plan.name}</h3>{featured && <span>Recomendado</span>}</div>
              <p className="al-plan-description">{planIntroductions[plan.tier]}</p><p className="al-plan-price">{price}<span>/mês</span></p>
              <ul>{planLimits.map(limit => { const value = plan.limits[limit.key]; return <li key={limit.key}><Check size={17} aria-hidden="true" /><span>{value === -1 ? limit.unlimited : `${new Intl.NumberFormat('pt-BR').format(value)} ${value === 1 ? limit.singular : limit.plural}`}</span></li> })}</ul>
              <a href={proposalUrl(plan)} className={`arx-button${featured ? '' : ' arx-button--outline'}`} aria-label={`Solicitar proposta do plano ${plan.name} por e-mail`}>Solicitar proposta <ArrowUpRight size={17} aria-hidden="true" /></a>
            </article>
          })}</div>
        )}
        <div className="al-plan-footnote"><p>As propostas são solicitadas por e-mail. Para conhecer a plataforma, comece pelo plano gratuito.</p><a href="/register">Começar gratuitamente <ArrowUpRight size={16} aria-hidden="true" /></a></div>
      </div>
    </section>
  )
}

const questions = [
  { question: 'Como começo a usar a Arxis?', answer: 'Crie sua conta, organize um projeto e envie um modelo IFC. A partir dele, você pode explorar o modelo, consultar os elementos e preparar suas vistas de revisão.' },
  { question: 'O que é um modelo IFC?', answer: 'IFC é um formato aberto para compartilhar informações da construção. Além da geometria, ele pode conter identificação, materiais e outras propriedades dos elementos, conforme a preparação do arquivo.' },
  { question: 'O que fica salvo em um cenário?', answer: 'Um cenário guarda a posição da câmera e a visibilidade das categorias do modelo. Você pode retomar essa vista e comparar cenários lado a lado para conversar sobre o projeto com mais contexto.' },
  { question: 'Preciso contratar um plano para conhecer?', answer: 'Você pode começar pelo plano gratuito. Os planos pagos oferecem capacidades diferentes de usuários, projetos, armazenamento e cenários. Confira os limites de cada opção antes de escolher.' },
  { question: 'Onde encontro conteúdos sobre BIM?', answer: 'No blog da Arxis, publicamos conceitos, exemplos ilustrativos e perguntas práticas para quem trabalha com arquitetura, engenharia e construção.' },
]

export default function LandingPage() {
  return <PublicLayout>
    <SEO title="Arxis · Visualize. Analise. Decida." description="BIM e construção digital para entender seus projetos. Explore modelos IFC, salve vistas e compare cenários com a Arxis." image="/images/editorial/arquitetura.webp" />
    <main id="main-content" className="al-page">
      <section className="al-hero" aria-labelledby="al-hero-title" data-track-section="hero">
        <div className="arx-container al-hero-grid"><div className="al-hero-copy"><span className="arx-eyebrow">BIM e construção digital</span><h1 id="al-hero-title">Visualize<span>.</span><br />Analise<span>.</span><br /><em>Decida</em><span>.</span></h1><p>Enxergue o projeto com clareza. Explore modelos IFC, organize suas vistas e compare cenários para apoiar a próxima decisão.</p><div className="al-hero-actions"><a href="/register" className="arx-button">Começar gratuitamente <ArrowUpRight size={19} aria-hidden="true" /></a><a href="#como-funciona" className="al-text-link">Conheça a Arxis <ArrowDown size={17} aria-hidden="true" /></a></div></div><figure className="al-hero-visual"><img src="/images/editorial/arquitetura.webp" alt="Edifício contemporâneo com fachadas claras, grandes planos de vidro e vegetação." width="1536" height="1024" fetchPriority="high" /><figcaption><span aria-hidden="true" />Arquitetura ilustrativa</figcaption></figure></div>
        <div className="arx-container"><div className="al-hero-bottom"><p>Tecnologia para projetos<br /><strong>mais inteligentes.</strong></p><span>Para quem projeta, coordena e constrói.</span><a href="#platform" aria-label="Conhecer a plataforma"><ArrowDown size={21} aria-hidden="true" /></a></div></div>
      </section>

      <section className="al-overview al-section" id="platform" aria-labelledby="al-overview-title" data-track-section="features"><div className="arx-container al-overview-grid"><div className="al-section-heading"><span className="arx-eyebrow">Um projeto. Mais contexto.</span><h2 id="al-overview-title">A informação ganha sentido<br /><span>quando você vê o todo.</span></h2><p>Um modelo reúne muitas perspectivas. A Arxis ajuda a organizar o seu olhar para transformar a revisão em uma conversa mais clara.</p></div><div className="al-benefits"><div><span className="al-number">01</span><div><h3>Veja além da planta.</h3><p>Explore o modelo em 3D e consulte as propriedades dos elementos para entender o que está representado.</p></div></div><div><span className="al-number">02</span><div><h3>Guarde o ponto da conversa.</h3><p>Salve a posição da câmera e a visibilidade das categorias. Retome uma vista sem reconstruir o seu enquadramento.</p></div></div><div><span className="al-number">03</span><div><h3>Coloque vistas lado a lado.</h3><p>Compare cenários salvos e use o contexto visual para orientar a próxima revisão do projeto.</p></div></div></div></div></section>

      <section className="al-workflow al-section" id="como-funciona" aria-labelledby="al-workflow-title" data-track-section="workflow"><div className="arx-container al-workflow-grid"><figure className="al-model-visual"><img src="/images/editorial/modelo-bim.webp" alt="Modelo arquitetônico ilustrativo em corte, com pavimentos, ambientes e elementos estruturais visíveis." width="1254" height="1254" loading="lazy" /><figcaption>Modelo arquitetônico ilustrativo</figcaption></figure><div><div className="al-section-heading"><span className="arx-eyebrow">Como funciona</span><h2 id="al-workflow-title">Do arquivo<br /><span>à próxima revisão.</span></h2></div><ol className="al-steps"><li><span>01</span><div><h3>Traga seu modelo IFC.</h3><p>Crie um projeto e abra o arquivo que será revisado.</p></div></li><li><span>02</span><div><h3>Prepare uma vista.</h3><p>Enquadre a região de interesse e escolha as categorias que deseja visualizar.</p></div></li><li><span>03</span><div><h3>Salve e compare.</h3><p>Registre o cenário e retome a análise com suas vistas organizadas.</p></div></li></ol><a href="/register" className="al-text-link">Abrir minha conta <ArrowUpRight size={19} aria-hidden="true" /></a></div></div></section>

      <section className="al-about al-section" aria-labelledby="al-about-title" data-track-section="about"><div className="arx-container al-about-grid"><div><span className="arx-eyebrow">Prazer, Arxis.</span><h2 id="al-about-title">Construção digital.<br /><span>Conversa humana.</span></h2><p>Por aqui, BIM, projetos e construção digital encontram uma linguagem prática. Falamos de modelos, informações e das dúvidas de quem projeta e constrói.</p><p>O objetivo é simples: ajudar você a entender melhor o projeto e fazer boas perguntas antes da próxima decisão.</p><a href="/blog" className="al-text-link">Entre nessa conversa <ArrowUpRight size={19} aria-hidden="true" /></a></div><div className="al-avatar-wrap"><img src="/images/brand/arxis-avatar.webp" alt="Avatar Arxis com capacete de proteção e tablet." width="1254" height="1254" loading="lazy" /><span className="al-avatar-caption">Visualize. Analise. Decida.</span></div></div></section>

      <section className="al-editorial al-section" aria-labelledby="al-editorial-title" data-track-section="blog"><div className="arx-container"><div className="al-section-heading al-section-heading--split"><div><span className="arx-eyebrow">Caderno Arxis</span><h2 id="al-editorial-title">Ideias que acompanham<br /><span>o seu trabalho.</span></h2></div><a className="al-text-link" href="/blog">Explorar o blog <ArrowUpRight size={19} aria-hidden="true" /></a></div><a href="/blog/bim-alem-do-3d" className="al-editorial-feature"><figure><img src="/images/editorial/modelo-bim.webp" alt="Modelo arquitetônico isométrico usado para ilustrar os conceitos de BIM." width="1254" height="1254" loading="lazy" /></figure><div><span className="arx-eyebrow">Fundamentos de BIM</span><h3>O modelo que você vê.<br />A informação que precisa.</h3><p>BIM vai além da representação em 3D. Entenda como a geometria e as informações se conectam na leitura de um projeto.</p><span className="al-text-link">Ler o artigo <ArrowUpRight size={19} aria-hidden="true" /></span></div></a><div className="al-editorial-more"><a href="/blog/o-que-e-ifc"><span>Interoperabilidade</span><h3>O que é IFC e por que ele importa?</h3><ArrowUpRight size={22} aria-hidden="true" /></a><a href="/blog/checklist-revisao-modelo-bim"><span>Na prática</span><h3>Um checklist para revisar seu modelo BIM.</h3><ArrowUpRight size={22} aria-hidden="true" /></a></div></div></section>

      <PricingSection />

      <section className="al-faq al-section" aria-labelledby="al-faq-title" data-track-section="faq"><div className="arx-container al-faq-grid"><div className="al-section-heading"><span className="arx-eyebrow">Antes de começar</span><h2 id="al-faq-title">Boas perguntas.<br /><span>Respostas claras.</span></h2></div><div className="al-faq-list">{questions.map(item => <details key={item.question}><summary>{item.question}<Plus size={22} aria-hidden="true" /></summary><p>{item.answer}</p></details>)}</div></div></section>
      <section className="al-final" aria-labelledby="al-final-title" data-track-section="bottom_cta"><div className="arx-container al-final-content"><span className="arx-eyebrow">Seu próximo projeto</span><h2 id="al-final-title">Um novo olhar<br />começa <em>aqui.</em></h2><p>Traga seu modelo e comece a explorar.</p><a href="/register" className="arx-button">Criar conta gratuita <ArrowUpRight size={19} aria-hidden="true" /></a></div></section>
    </main>
  </PublicLayout>
}
