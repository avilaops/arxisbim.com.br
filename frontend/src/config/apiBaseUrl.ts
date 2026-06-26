export function resolveApiBaseUrl(): string {
  // Always use VITE_API_URL when set (build-time injection via Cloudflare Pages / Render env)
  const fromEnv = (import.meta as any).env?.VITE_API_URL as string | undefined;
  if (fromEnv && fromEnv.trim().length > 0) return normalizeApiOrigin(fromEnv);

  // Dev fallback
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:3001';
  }

  // Production fallback (should never reach here if VITE_API_URL is set in CF Pages)
  return 'https://api.arxisvr.avilaops.com';
}

export function normalizeApiOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '').replace(/\/api\/v1$/i, '');
}

export function buildApiV1Url(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const versionedPath = normalizedPath.startsWith('/api/v1/')
    ? normalizedPath
    : `/api/v1${normalizedPath}`;

  return `${resolveApiBaseUrl()}${versionedPath}`;
}
