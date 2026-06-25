import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as Sentry from '@sentry/react'

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'owner' | 'member' | 'viewer'
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const userData = localStorage.getItem('arxisvr_user')
      if (userData) {
        const parsed = JSON.parse(userData) as User
        setUser(parsed)
        Sentry.setUser({ id: parsed.id })
        Sentry.setTag('user_role', parsed.role)
      } else {
        Sentry.setUser(null)
      }
    } catch {
      Sentry.setUser(null)
    }
    setLoading(false)
  }, [])

  return { user, loading }
}

export function useProtectedRoute() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, loading, navigate])

  return { user, loading }
}

export function useAdmin() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && (!user || (user.role !== 'admin' && user.role !== 'owner'))) {
      navigate('/dashboard')
    }
  }, [user, loading, navigate])

  return { user, loading }
}

export function logout() {
  Sentry.setUser(null)
  localStorage.removeItem('arxisvr_user')
  localStorage.removeItem('arxisvr_sidebar_collapsed')
  localStorage.removeItem('arxisvr_manage_open')
  window.location.href = '/login'
}
