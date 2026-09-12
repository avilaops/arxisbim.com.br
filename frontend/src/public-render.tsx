import { renderToString } from 'react-dom/server'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import BlogPage from './pages/BlogPage'
import BlogArticlePage from './pages/BlogArticlePage'
import { articles } from './content/articles'
export { articles }
export function render(url: string) {
  return renderToString(<MemoryRouter initialEntries={[url]}><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/blog" element={<BlogPage />} />
    <Route path="/blog/:slug" element={<BlogArticlePage />} />
  </Routes></MemoryRouter>)
}
