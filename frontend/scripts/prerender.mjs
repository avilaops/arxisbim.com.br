import fs from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const dist = path.join(root, 'dist')
// Domínio canônico do produto. Sitemap, robots e feed só anunciam o canônico.
const siteUrl = (process.env.VITE_SITE_URL || 'https://arxisbim.com.br').replace(/\/$/, '')
const routes = ['/', '/blog', '/blog/bim-alem-do-3d', '/blog/o-que-e-ifc', '/blog/checklist-revisao-modelo-bim']
const template = await fs.readFile(path.join(dist, 'index.html'), 'utf8')
for (const route of routes.slice(1)) {
  const destination = path.join(dist, route.slice(1), 'index.html')
  await fs.mkdir(path.dirname(destination), { recursive: true })
  await fs.writeFile(destination, template)
}
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
await fs.writeFile(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map(route => `<url><loc>${escape(siteUrl + route)}</loc></url>`).join('')}</urlset>`)
await fs.writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /account\nDisallow: /admin\nDisallow: /dashboard\nSitemap: ${siteUrl}/sitemap.xml\n`)
await fs.writeFile(path.join(dist, 'feed.xml'), `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Blog Arxis</title><link>${siteUrl}/blog</link><description>BIM, dados e decisões para projetos mais claros.</description><language>pt-BR</language>${routes.slice(2).map(route => `<item><title>${escape(route.split('/').at(-1).replaceAll('-', ' '))}</title><link>${siteUrl}${route}</link><guid>${siteUrl}${route}</guid></item>`).join('')}</channel></rss>`)
console.log(`Prepared ${routes.length} public routes, sitemap and RSS.`)
