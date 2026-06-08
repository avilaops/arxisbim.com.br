/**
 * session.ts — FONTE ÚNICA DE VERDADE para o estado de autenticação no cliente.
 *
 * Regra de ouro: "logado" = token JWT presente E não expirado.
 * Nunca confiar apenas na presença do token (pode estar expirado/forjado).
 * A autorização real é SEMPRE feita no backend (validação de assinatura + role).
 * Aqui é só estado de UI consistente.
 */

export const TOKEN_KEY = 'arxisvr_token';
export const REFRESH_TOKEN_KEY = 'arxisvr_refresh_token';
export const USER_KEY = 'arxisvr_user';

export interface SessionUser {
  userId?: string;
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  tenantId?: string;
  permissions?: string[];
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Decodifica o payload do JWT (sem validar assinatura — só para exibição/expiração). */
export function decodeToken(token: string | null = getToken()): Record<string, any> | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(b64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Token presente E com exp no futuro. Esta é a definição canônica de "autenticado". */
export function isTokenValid(token: string | null = getToken()): boolean {
  const payload = decodeToken(token);
  if (!payload) return false;
  if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
    return false; // expirado
  }
  return true;
}

export function isAuthenticated(): boolean {
  return isTokenValid();
}

/**
 * Usuário atual: prefere o objeto persistido (arxisvr_user); se ausente,
 * deriva dos claims do token. Garante consistência mesmo no fluxo OAuth,
 * que historicamente só gravava o token.
 */
export function getUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) return JSON.parse(raw) as SessionUser;
  } catch {
    /* ignora user corrompido */
  }
  const payload = decodeToken();
  if (!payload) return null;
  return {
    userId: payload.userId || payload.sub,
    id: payload.userId || payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    tenantId: payload.tenantId,
    permissions: payload.permissions,
  };
}

/** Primeiro nome para saudação — só retorna se o token for válido. */
export function getDisplayName(): string | null {
  if (!isTokenValid()) return null;
  const u = getUser();
  const raw = u?.name || u?.email?.split('@')[0] || '';
  const first = raw.split(' ')[0]?.trim();
  return first || null;
}

/** Persiste o usuário derivado do token (usado após OAuth, que só traz o token). */
export function hydrateUserFromToken(): void {
  try {
    if (localStorage.getItem(USER_KEY)) return; // já existe
    const u = getUser();
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
  } catch {
    /* storage indisponível */
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* noop */
  }
}
