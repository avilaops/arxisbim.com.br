import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ChevronDown, Link as LinkIcon } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import PublicLayout from '../components/public/PublicLayout'
import SEO from '../components/SEO'
import { articles, formatArticleDate, getArticle } from '../content/articles'
import '../styles/blog.css'

export default function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>()
  const article = getArticle(slug)
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'manual'>('idle')
  const [shareUrl, setShareUrl] = useState('')
  const manualCopyRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setShareStatus('idle')
    setShareUrl('')
  }, [slug])

  useEffect(() => {
    if (shareStatus === 'manual') {
      manualCopyRef.current?.focus()
      manualCopyRef.current?.select()
    }
    if (shareStatus !== 'copied') return
    const timer = window.setTimeout(() => setShareStatus('idle'), 4000)
    return () => window.clearTimeout(timer)
  }, [shareStatus])

  async function copyArticleLink() {
    const url = `${window.location.origin}/blog/${article?.slug ?? ''}`
    setShareUrl(url)
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(url)
      setShareStatus('copied')
    } catch {
      setShareStatus('manual')
    }
  }

  if (!article) {
    return (
      <PublicLayout>
        <SEO title="Artigo não encontrado | Arxis" description="Este artigo não está disponível. Explore os guias da Arxis sobre BIM e construção digital." path={`/blog/${slug ?? ''}`} noindex />
        <main id="main-content" className="arx-blog arx-container arx-blog-not-found">
          <span className="arx-eyebrow">404 · Artigo não encontrado</span>
          <h1>Este caminho ainda<br />não tem uma história.</h1>
          <p>O endereço pode ter mudado ou estar incompleto. Encontre nossos artigos sobre BIM, IFC e revisão de modelos no blog.</p>
          <Link className="arx-button" to="/blog"><ArrowLeft size={18} aria-hidden="true" /> Explorar o blog</Link>
        </main>
      </PublicLayout>
    )
  }

  const related = articles.filter((item) => item.slug !== article.slug)
  return (
    <PublicLayout>
      <SEO
        title={`${article.title} | Arxis`}
        description={article.description}
        path={`/blog/${article.slug}`}
        image={article.image}
        imageAlt={article.imageAlt}
        type="article"
        publishedTime={`${article.date}T12:00:00-03:00`}
      />
      <main id="main-content" className="arx-blog arx-article">
        <header className="arx-article-heading arx-container">
          <Link className="arx-blog-back" to="/blog"><ArrowLeft size={17} aria-hidden="true" /> Todos os artigos</Link>
          <span className="arx-eyebrow">{article.category}</span>
          <h1>{article.title}</h1>
          <p className="arx-article-deck">{article.description}</p>
          <div className="arx-article-byline">
            <div className="arx-blog-meta"><span>{article.author}</span><time dateTime={article.date}>{formatArticleDate(article.date)}</time><span>{article.readMinutes} min de leitura</span></div>
            <button className="arx-blog-share" type="button" onClick={() => { void copyArticleLink() }}><LinkIcon size={17} aria-hidden="true" />{shareStatus === 'copied' ? 'Link copiado' : 'Copiar link'}</button>
          </div>
          <p className="arx-blog-sr-only" role="status" aria-live="polite">{shareStatus === 'copied' ? 'Link do artigo copiado.' : shareStatus === 'manual' ? 'Selecione e copie o link no campo abaixo.' : ''}</p>
          {shareStatus === 'manual' && <div className="arx-blog-manual-copy"><label htmlFor="article-link">Copie este endereço para compartilhar:</label><input ref={manualCopyRef} id="article-link" value={shareUrl} readOnly onFocus={(event) => event.target.select()} /></div>}
        </header>

        <figure className="arx-article-cover arx-container">
          <img src={article.image} alt={article.imageAlt} width="1200" height="900" fetchPriority="high" />
          <figcaption>Ilustração editorial Arxis.</figcaption>
        </figure>

        <div className="arx-article-layout arx-container">
          <aside className="arx-article-sidebar">
            <nav aria-label="Neste artigo">
              <details open>
                <summary>Neste artigo <ChevronDown size={17} aria-hidden="true" /></summary>
                <ol>{article.sections.map((section) => <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>)}</ol>
              </details>
            </nav>
          </aside>
          <article className="arx-article-body" aria-label={article.title}>
            <div className="arx-article-intro">{article.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
            {article.sections.map((section) => {
              const sectionSources = article.sources.filter((source) => section.sourceIds?.includes(source.id))
              return (
                <section key={section.id} id={section.id} className="arx-article-section" aria-labelledby={`${section.id}-heading`}>
                  <h2 id={`${section.id}-heading`}>{section.title}</h2>
                  {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.list && (section.ordered ? <ol>{section.list.map((item) => <li key={item}>{item}</li>)}</ol> : <ul>{section.list.map((item) => <li key={item}>{item}</li>)}</ul>)}
                  {sectionSources.length > 0 && <p className="arx-article-reference">Referência: {sectionSources.map((source, index) => <span key={source.id}>{index > 0 && ' · '}<a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></span>)}</p>}
                </section>
              )
            })}
            <aside className="arx-article-takeaway" aria-label="Para levar à sua rotina"><span className="arx-eyebrow">Para levar à sua rotina</span><p>{article.takeaway}</p></aside>
            <section className="arx-article-sources" aria-labelledby="sources-title">
              <h2 id="sources-title">Fontes e referências</h2>
              <p>Conceitos técnicos consultados em fontes oficiais. Os exemplos e roteiros práticos são propostas editoriais da Arxis.</p>
              <ul>{article.sources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}<ArrowRight size={15} aria-hidden="true" /></a></li>)}</ul>
            </section>
          </article>
        </div>

        <section className="arx-article-related arx-container" aria-labelledby="related-title">
          <div className="arx-article-related-head"><div><span className="arx-eyebrow">O próximo passo</span><h2 id="related-title">Continue a leitura.</h2></div><Link className="arx-blog-text-link" to="/blog">Ver o blog <ArrowRight size={18} aria-hidden="true" /></Link></div>
          <div className="arx-article-related-list">{related.map((item) => <article key={item.slug}><Link className="arx-article-related-image" to={`/blog/${item.slug}`} tabIndex={-1} aria-hidden="true"><img src={item.image} alt="" width="1200" height="900" loading="lazy" /></Link><span className="arx-eyebrow">{item.category}</span><h3><Link to={`/blog/${item.slug}`}>{item.title}</Link></h3><p>{item.readMinutes} min de leitura</p></article>)}</div>
        </section>
      </main>
    </PublicLayout>
  )
}
