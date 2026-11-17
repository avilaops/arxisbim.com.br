import { buildApiV1Url } from '@/config/apiBaseUrl'

export async function bimRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  const token = localStorage.getItem('arxisvr_token')
  if (!token)
    throw new Error('Sua sessão expirou. Entre novamente para continuar.')
  headers.set('Authorization', `Bearer ${token}`)
  if (typeof init.body === 'string')
    headers.set('Content-Type', 'application/json')
  const response = await fetch(buildApiV1Url(path), { ...init, headers })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    const message =
      response.status === 401
        ? 'Sua sessão expirou. Entre novamente.'
        : response.status === 403
          ? 'Sua conta não tem acesso a este recurso.'
          : body?.error ||
            body?.message ||
            `Não foi possível concluir a operação (HTTP ${response.status}).`
    throw Object.assign(new Error(message), { status: response.status })
  }
  if (response.status === 204) return undefined as T
  return response.json()
}
