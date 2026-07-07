interface SEOProps {
  title: string
  description: string
  keywords?: string
  path?: string
}

export default function SEO({ title, description, keywords, path = '' }: SEOProps) {
  const canonicalUrl = `https://arxisvr.avilaops.com${path}`

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}

      {/* Open Graph / Facebook */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />

      {/* Twitter */}
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />

      {/* Canonical Link */}
      <link rel="canonical" href={canonicalUrl} />
    </>
  )
}
