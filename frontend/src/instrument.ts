import React from 'react'
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom'
import * as Sentry from '@sentry/react'

import { resolveApiUrl } from './config/site.config'

const dsn = import.meta.env.VITE_SENTRY_DSN
const apiUrl = resolveApiUrl()

function stripUrlQuery(value?: string): string | undefined {
  if (!value) return value
  try {
    const url = new URL(value, window.location.origin)
    url.search = ''
    url.hash = ''
    return value.startsWith('http') ? url.toString() : url.pathname
  } catch {
    return value.split('?')[0].split('#')[0]
  }
}

function syncStoredUser(): void {
  try {
    const stored = JSON.parse(localStorage.getItem('arxisvr_user') || 'null')
    if (!stored?.id) {
      Sentry.setUser(null)
      return
    }
    Sentry.setUser({ id: String(stored.id) })
    if (stored.role) Sentry.setTag('user_role', String(stored.role))
    if (stored.tenantId) Sentry.setTag('tenant_id', String(stored.tenantId))
  } catch {
    Sentry.setUser(null)
  }
}

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    sendDefaultPii: false,
    attachStacktrace: true,
    integrations: [
      Sentry.reactRouterV7BrowserTracingIntegration({
        useEffect: React.useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.extraErrorDataIntegration({ depth: 5 }),
    ],
    tracesSampleRate: Number(
      import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE
      || (import.meta.env.PROD ? 0.2 : 1),
    ),
    tracePropagationTargets: [
      /^\//,
      new RegExp(`^${apiUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
    ],
    replaysSessionSampleRate: Number(import.meta.env.VITE_SENTRY_REPLAY_SESSION_RATE || 0.05),
    replaysOnErrorSampleRate: Number(import.meta.env.VITE_SENTRY_REPLAY_ERROR_RATE || 1),
    beforeSend(event) {
      if (event.request) {
        delete event.request.data
        delete event.request.cookies
        event.request.url = stripUrlQuery(event.request.url)
        event.request.query_string = undefined
        if (event.request.headers) {
          for (const key of Object.keys(event.request.headers)) {
            if (/authorization|cookie|token|secret|api[-_]?key/i.test(key)) {
              event.request.headers[key] = '[Filtered]'
            }
          }
        }
      }
      event.breadcrumbs = event.breadcrumbs?.map((breadcrumb) => ({
        ...breadcrumb,
        data: breadcrumb.data
          ? {
              ...breadcrumb.data,
              url: stripUrlQuery(breadcrumb.data.url),
              body: undefined,
              requestBody: undefined,
              responseBody: undefined,
            }
          : undefined,
      }))
      return event
    },
  })

  syncStoredUser()
  window.addEventListener('storage', syncStoredUser)
}

export { Sentry }
