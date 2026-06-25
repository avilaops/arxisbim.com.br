// Shim para react-router-dom
// Fornece as funcionalidades básicas para o dev

export const BrowserRouter = ({ children }: any) => children
export const Routes = ({ children }: any) => children
export const Route = ({ element }: any) => element || null
export const Navigate = ({ to, replace }: any) => {
  if (typeof window !== 'undefined') {
    const target = typeof to === 'string' ? to : to?.pathname || '/'
    if (window.location.pathname !== target) {
      if (replace) {
        window.location.replace(target)
      } else {
        window.location.href = target
      }
    }
  }
  return null
}

export const useNavigate = () => {
  return (path: string, opts?: { replace?: boolean }) => {
    if (typeof window !== 'undefined') {
      const target = typeof path === 'string' ? path : '/'
      if (window.location.pathname !== target) {
        if (opts?.replace) {
          window.location.replace(target)
        } else {
          window.location.href = target
        }
      }
    }
  }
}

export const useSearchParams = () => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    return [params, () => {}] as const
  }
  return [new URLSearchParams(), () => {}] as const
}

export const useLocation = () => {
  if (typeof window !== 'undefined') {
    return {
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
    }
  }
  return {
    pathname: '',
    search: '',
    hash: '',
  }
}
