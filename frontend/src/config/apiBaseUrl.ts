export function resolveApiBaseUrl(): string {
  // Always use VITE_API_URL when set (build-time injection via Cloudflare Pages / Render env)
  const fromEnv = (import.meta as any).env?.VITE_API_URL as string | undefined;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();

  // Dev fallback
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:3001';
  }

  // Production fallback (should never reach here if VITE_API_URL is set in CF Pages)
  return 'https://api.arxisvr.avilaops.com';
}
