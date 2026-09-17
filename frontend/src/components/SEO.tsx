import { resolveCanonicalSiteUrl } from '../config/site.config'

interface SEOProps {
  title: string
  description: string
  keywords?: string
  path?: string
  image?: string
  imageAlt?: string
  type?: 'website' | 'article'
  publishedTime?: string
  structuredData?: Record<string, unknown>
  noindex?: boolean
}

// Canonical e og:url apontam sempre para o domínio próprio, mesmo quando o
// host antigo serve a página.
export const siteUrl = resolveCanonicalSiteUrl()

export default function SEO({ title, description, keywords, path = '', image = '/images/editorial/arquitetura.webp', imageAlt = 'Arxis · clareza para visualizar, analisar e decidir', type = 'website', publishedTime, structuredData, noindex }: SEOProps) {
  const canonicalUrl = `${siteUrl}${path || '/'}`
  const imageUrl = new URL(image, `${siteUrl}/`).href

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {noindex && <meta name="robots" content="noindex,follow" />}
      <meta property="og:site_name" content="Arxis" />
      <meta property="og:locale" content="pt_BR" />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}

      {/* Open Graph / Facebook */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:alt" content={imageAlt} />

      {/* Twitter */}
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content={imageUrl} />

      {/* Canonical Link */}
      <link rel="canonical" href={canonicalUrl} />
      {structuredData && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />}
    </>
  )
}
