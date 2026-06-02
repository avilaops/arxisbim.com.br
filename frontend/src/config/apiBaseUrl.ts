export function resolveApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // In a real browser context outside localhost, always use same-origin.
    // This prevents stale VITE_API_URL build-time values (e.g. arxisvr.onrender.com)
    // from breaking requests when the site is served under a custom domain.
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return window.location.origin;
    }
  }
  // Dev: respect VITE_API_URL or fall back to local backend
  const fromEnv = (import.meta as any).env?.VITE_API_URL as string | undefined;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv;
  return 'http://localhost:3001';
}
