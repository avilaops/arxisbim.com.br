interface SEOProps {
  title: string
  description: string
  keywords?: string
  path?: string
  image?: string
}

export default function SEO({ title, description, keywords, path = '', image = '/images/landing/arxisvr-og.jpg' }: SEOProps) {
  const canonicalUrl = `https://arxisvr.avilaops.com${path}`
  const imageUrl = `https://arxisvr.avilaops.com${image}`

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}

      {/* Open Graph / Facebook */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="ArxisVR, BIM, IA e Realidade Estendida" />

      {/* Twitter */}
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content={imageUrl} />

      {/* Canonical Link */}
      <link rel="canonical" href={canonicalUrl} />
    </>
  )
}
