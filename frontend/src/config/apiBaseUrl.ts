import { normalizeOrigin, resolveApiUrl } from './site.config';

export function resolveApiBaseUrl(): string {
  // Endereços públicos vivem em site.config.ts; aqui só se monta caminho.
  return resolveApiUrl();
}

export function normalizeApiOrigin(value: string): string {
  return normalizeOrigin(value);
}

export function buildApiV1Url(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const versionedPath = normalizedPath.startsWith('/api/v1/')
    ? normalizedPath
    : `/api/v1${normalizedPath}`;

  return `${resolveApiBaseUrl()}${versionedPath}`;
}
