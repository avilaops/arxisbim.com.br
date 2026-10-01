import { ArrowRight, Search, X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import PublicLayout from '../components/public/PublicLayout'
import SEO from '../components/SEO'
import { articles, formatArticleDate } from '../content/articles'
import '../styles/blog.css'

const categories = ['Todos', ...new Set(articles.map((article) => article.category))]

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
}

export default function BlogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('busca') ?? ''
  const rawCategory = searchParams.get('categoria') ?? 'Todos'
  const category = categories.includes(rawCategory) ? rawCategory : 'Todos'
  const filtered = articles.filter((article) => (
    (category === 'Todos' || article.category === category) &&
    normalize(`${article.title} ${article.description} ${article.category}`).includes(normalize(query.trim()))
  ))
  const isFiltered = query.trim().length > 0 || category !== 'Todos'
  const featured = !isFiltered ? filtered[0] : undefined
  const remaining = featured ? filtered.slice(1) : filtered

  function updateFilter(key: 'busca' | 'categoria', value: string) {
    const next = new URLSearchParams(searchParams)
    if (!value || value === 'Todos') next.delete(key)
    else next.set(key, value)
    setSearchParams(next, { replace: true, preventScrollReset: true })
  }

  return (
    <PublicLayout>
      <SEO
        title="Blog Arxis · BIM e construção digital na prática"
        description="Guias para entender BIM, trocar arquivos IFC e revisar modelos com mais clareza. Informação prática para arquitetos, engenheiros e equipes de projetos."
        path="/blog"
        image="/images/editorial/modelo-bim.webp"
        imageAlt="Modelo arquitetônico em corte com seus pavimentos e elementos visíveis"
      />
      <main id="main-content" className="arx-blog">
        <section className="arx-blog-heading arx-container" aria-labelledby="blog-title">
          <div>
            <span className="arx-eyebrow">Conhecimento para construir</span>
            <h1 id="blog-title">Uma visão mais clara.<br /><em>Decisões melhores.</em></h1>
          </div>
          <p>BIM, projetos e construção digital em linguagem prática. Para entender o modelo e o que ele pode dizer sobre o seu projeto.</p>
        </section>

        <section className="arx-container" aria-label="Artigos do blog">
          <div className="arx-blog-tools">
            <div className="arx-blog-categories" role="group" aria-label="Filtrar por tema">
              {categories.map((item) => (
                <button key={item} type="button" aria-pressed={category === item} onClick={() => updateFilter('categoria', item)}>{item}</button>
              ))}
            </div>
            <div className="arx-blog-search">
              <label htmlFor="blog-search" className="arx-blog-sr-only">Buscar artigos</label>
              <Search size={19} aria-hidden="true" />
              <input id="blog-search" type="search" placeholder="Buscar no blog" value={query} onChange={(event) => updateFilter('busca', event.target.value)} />
              {query && <button type="button" onClick={() => updateFilter('busca', '')} aria-label="Limpar busca"><X size={17} aria-hidden="true" /></button>}
            </div>
          </div>

          <p className={isFiltered ? 'arx-blog-result-count' : 'arx-blog-sr-only'} role="status" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? 'artigo encontrado' : 'artigos encontrados'}{query.trim() ? ` para “${query.trim()}”` : ''}.
          </p>

          {featured && (
            <article className="arx-blog-featured">
              <Link className="arx-blog-featured-image" to={`/blog/${featured.slug}`} tabIndex={-1} aria-hidden="true">
                <img src={featured.image} alt="" width="1200" height="900" fetchPriority="high" />
              </Link>
              <div className="arx-blog-featured-copy">
                <span className="arx-eyebrow">Comece por aqui · {featured.category}</span>
                <h2><Link to={`/blog/${featured.slug}`}>{featured.title}</Link></h2>
                <p>{featured.description}</p>
                <div className="arx-blog-meta"><time dateTime={featured.date}>{formatArticleDate(featured.date, true)}</time><span>{featured.readMinutes} min de leitura</span></div>
                <Link className="arx-blog-text-link" to={`/blog/${featured.slug}`}>Ler o guia <ArrowRight size={19} aria-hidden="true" /></Link>
              </div>
            </article>
          )}

          {remaining.length > 0 && (
            <div className="arx-blog-collection">
              {featured && <h2 className="arx-blog-collection-title">Continue explorando</h2>}
              {remaining.map((article) => (
                <article key={article.slug} className="arx-blog-row">
                  <Link className="arx-blog-row-image" to={`/blog/${article.slug}`} tabIndex={-1} aria-hidden="true">
                    <img src={article.image} alt="" width="1200" height="900" loading="lazy" />
                  </Link>
                  <div className="arx-blog-row-copy">
                    <span className="arx-eyebrow">{article.category}</span>
                    <h2><Link to={`/blog/${article.slug}`}>{article.title}</Link></h2>
                    <p>{article.description}</p>
                    <div className="arx-blog-meta"><time dateTime={article.date}>{formatArticleDate(article.date, true)}</time><span>{article.readMinutes} min de leitura</span></div>
                  </div>
                  <Link className="arx-blog-row-link" to={`/blog/${article.slug}`} aria-label={`Ler: ${article.title}`}><ArrowRight size={26} aria-hidden="true" /></Link>
                </article>
              ))}
            </div>
          )}

          {filtered.length === 0 && (
            <div className="arx-blog-empty">
              <Search size={30} strokeWidth={1.5} aria-hidden="true" />
              <h2>Nenhum artigo por aqui ainda.</h2>
              <p>Tente outra palavra ou explore todos os temas. Você pode buscar por BIM, IFC ou revisão.</p>
              <button className="arx-button arx-button--outline" type="button" onClick={() => setSearchParams({}, { replace: true, preventScrollReset: true })}>Ver todos os artigos</button>
            </div>
          )}
        </section>

        <aside className="arx-blog-bottom arx-container">
          <span className="arx-eyebrow">Visualize. Analise. Decida.</span>
          <h2>Conhecimento que acompanha<br />a sua próxima decisão.</h2>
          <p>Acompanhe a Arxis para continuar a conversa sobre BIM e construção digital.</p>
          <a className="arx-blog-text-link" href="https://www.instagram.com/arxis.bim/" target="_blank" rel="noopener noreferrer">Encontre a Arxis no Instagram <ArrowRight size={19} aria-hidden="true" /></a>
        </aside>
      </main>
    </PublicLayout>
  )
}
