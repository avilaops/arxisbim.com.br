/**
 * domains.ts — único lugar do backend que sabe os endereços públicos do Arxis.
 *
 * O domínio próprio `arxisbim.com.br` foi comprado em 17/09/2026 e passa a ser
 * o canônico. O anterior (`arxisvr.avilaops.com`) continua respondendo durante
 * a transição: há links em e-mails já enviados, sessões abertas e instalações
 * do plugin do Revit apontando para ele.
 *
 * Regra: nenhum módulo escreve um domínio literal. Quem monta link para o
 * usuário usa `frontendUrl()`; quem precisa liberar origem usa
 * `resolveCorsOrigins()`.
 *
 * Runbook da migração: documentation/MIGRACAO-2026-09-17-dominio-arxisbim.md
 */

/** Domínio canônico do site público e do app. */
export const PRIMARY_SITE_URL = 'https://arxisbim.com.br';

/** Domínio canônico da API (o WebSocket sai do mesmo serviço). */
export const PRIMARY_API_URL = 'https://api.arxisbim.com.br';

/** Domínio anterior, ainda no ar durante a transição. */
export const LEGACY_SITE_URL = 'https://arxisvr.avilaops.com';
export const LEGACY_API_URL = 'https://api.arxisvr.avilaops.com';

/** Origens de desenvolvimento (Vite, preview do Vite, app legado). */
const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

function normalize(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

/**
 * Origem do frontend. `FRONTEND_URL` continua mandando (é o que o `.env` do
 * servidor injeta); o default é o domínio canônico.
 */
export const FRONTEND_URL = normalize(process.env.FRONTEND_URL || PRIMARY_SITE_URL);

/** Origem pública da própria API, usada em health check e links de callback. */
export const API_URL = normalize(process.env.API_URL || PRIMARY_API_URL);

/** Monta link absoluto para o frontend a partir de um caminho. */
export function frontendUrl(path = '/'): string {
  return `${FRONTEND_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Endereço de privacidade/LGPD anunciado nos e-mails (List-Unsubscribe e
 * rodapé). Sai do domínio próprio; a caixa precisa existir antes do corte —
 * ver o runbook.
 */
export const PRIVACY_EMAIL = process.env.PRIVACY_EMAIL || 'privacidade@arxisbim.com.br';

/**
 * Origens liberadas no CORS quando `CORS_ORIGIN` não está definido.
 *
 * Os dois domínios entram: durante a transição o app pode ser servido pelo
 * host antigo e falar com a API nova (e vice-versa), e um preflight recusado
 * aparece para o usuário como "erro de rede" sem nada no log.
 */
export function defaultCorsOrigins(): string[] {
  const origins = [
    PRIMARY_SITE_URL,
    'https://www.arxisbim.com.br',
    LEGACY_SITE_URL,
    'https://www.arxisvr.avilaops.com',
  ];

  if (process.env.NODE_ENV !== 'production') origins.push(...DEV_ORIGINS);

  return origins;
}

/**
 * Resolve o valor de `origin` do @fastify/cors.
 *
 * - `CORS_ORIGIN=*` → `true` (reflete a origem; escape explícito, para debug).
 * - `CORS_ORIGIN=a,b` → lista.
 * - vazio → allowlist dos domínios do produto.
 *
 * Antes o default era `'*'` com `credentials: true`, combinação que o browser
 * recusa quando a requisição leva cookie. A allowlist é o comportamento que já
 * valia em produção (o `.env` do servidor define `CORS_ORIGIN`), agora também
 * quando a variável falta.
 */
export function resolveCorsOrigins(raw = process.env.CORS_ORIGIN): string[] | true {
  const value = raw?.trim();
  if (!value) return defaultCorsOrigins();
  if (value === '*') return true;

  const list = value
    .split(',')
    .map((origin) => normalize(origin))
    .filter((origin) => origin.length > 0);

  return list.length > 0 ? list : defaultCorsOrigins();
}
