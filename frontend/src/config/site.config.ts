/**
 * site.config.ts — único lugar do frontend que sabe os endereços públicos do
 * Arxis.
 *
 * O domínio próprio `arxisbim.com.br` foi comprado em 17/09/2026 e passa a ser
 * o canônico do produto. O anterior (`arxisvr.avilaops.com`) continua
 * respondendo durante a transição: existem links indexados, e-mails já
 * enviados e instalações do plugin do Revit apontando para ele.
 *
 * Regra: nenhum outro arquivo escreve um domínio literal. Quem precisa de URL
 * pública importa daqui (ou de `apiBaseUrl.ts`, que deriva daqui).
 */

/** Domínio canônico do site público (landing, blog, páginas legais). */
export const PRIMARY_SITE_URL = 'https://arxisbim.com.br';

/**
 * Domínio canônico do app. O site público sai deste repositório e passa a ser
 * servido por um CMS em `PRIMARY_SITE_URL`; a SPA fica neste host. Enquanto a
 * virada não acontece, o mesmo bundle ainda atende os dois.
 */
export const PRIMARY_APP_URL = 'https://app.arxisbim.com.br';

/** Tela inicial do app: para onde login, cadastro e OAuth levam o usuário. */
export const APP_HOME_PATH = '/dashboard';

/** Domínio canônico da API (o WebSocket é servido pelo mesmo serviço). */
export const PRIMARY_API_URL = 'https://api.arxisbim.com.br';

/**
 * Hosts do domínio anterior, com a API correspondente.
 *
 * Enquanto os dois domínios respondem, o mesmo bundle atende os dois: quem
 * entrar pelo host antigo continua falando com a API antiga, e o par
 * site+API permanece no mesmo domínio de falha. É o que permite publicar um
 * build só, sem depender de rebuild na hora do corte.
 */
export const LEGACY_API_BY_HOST: Record<string, string> = {
  'arxisvr.avilaops.com': 'https://api.arxisvr.avilaops.com',
  'www.arxisvr.avilaops.com': 'https://api.arxisvr.avilaops.com',
};

const DEV_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Variáveis de build que mandam na resolução. Recebidas como argumento para
 * que os testes exercitem as combinações sem depender de `import.meta.env`,
 * que o Vite congela no bundle.
 */
export interface SiteEnv {
  VITE_SITE_URL?: string;
  VITE_API_URL?: string;
  VITE_WS_SERVER?: string;
}

function readEnv(): SiteEnv {
  return ((import.meta as any).env ?? {}) as SiteEnv;
}

function pick(env: SiteEnv, name: keyof SiteEnv): string | undefined {
  const value = env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

function currentHost(): string | undefined {
  return typeof window !== 'undefined' ? window.location.hostname : undefined;
}

/** Remove barra final e o sufixo `/api/v1`, para poder concatenar caminhos. */
export function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '').replace(/\/api\/v1$/i, '');
}

/**
 * Origem canônica para SEO (`<link rel="canonical">`, `og:url`, sitemap).
 *
 * Sempre o domínio próprio, mesmo quando a página é servida pelo host antigo:
 * é isso que consolida os dois endereços num só resultado de busca enquanto o
 * redirecionamento 308 não pega todo o tráfego indexado.
 *
 * A exceção é o host do app: lá a página sai com `noindex` e o canônico é o
 * próprio app, porque o mesmo caminho no site público é outra página, de outro
 * sistema. Vem antes do `VITE_SITE_URL`, que o build fixa no site público.
 */
export function resolveCanonicalSiteUrl(env: SiteEnv = readEnv(), host = currentHost()): string {
  if (isAppHost(host)) return PRIMARY_APP_URL;

  const fromEnv = pick(env, 'VITE_SITE_URL');
  return fromEnv ? normalizeOrigin(fromEnv) : PRIMARY_SITE_URL;
}

/** Origem do site que está de fato servindo a página (links relativos/absolutos). */
export function resolveSiteUrl(env: SiteEnv = readEnv(), host = currentHost()): string {
  const fromEnv = pick(env, 'VITE_SITE_URL');
  if (fromEnv) return normalizeOrigin(fromEnv);

  if (host && LEGACY_API_BY_HOST[host]) return `https://${host}`;

  return PRIMARY_SITE_URL;
}

/**
 * Origem da API.
 *
 * Ordem: `VITE_API_URL` (injetado no build) → host legado servindo a página →
 * localhost em dev → domínio canônico.
 */
export function resolveApiUrl(env: SiteEnv = readEnv(), host = currentHost()): string {
  const fromEnv = pick(env, 'VITE_API_URL');
  if (fromEnv) return normalizeOrigin(fromEnv);

  if (host && LEGACY_API_BY_HOST[host]) return LEGACY_API_BY_HOST[host];
  if (host && DEV_HOSTS.has(host)) return 'http://localhost:3001';

  return PRIMARY_API_URL;
}

/**
 * URL do WebSocket. Não há serviço de signaling separado em produção: o WS sai
 * do mesmo host da API, então o default é derivado dela em vez de repetir o
 * domínio.
 */
export function resolveWsUrl(env: SiteEnv = readEnv(), host = currentHost()): string {
  const fromEnv = pick(env, 'VITE_WS_SERVER');
  if (fromEnv) return fromEnv.trim().replace(/\/+$/, '');

  const api = resolveApiUrl(env, host);
  if (api.startsWith('http://localhost') || api.startsWith('http://127.0.0.1')) {
    return 'ws://localhost:3002';
  }

  return api.replace(/^http/, 'ws');
}

/** True quando a página está sendo servida pelo domínio anterior. */
export function isLegacyHost(host = currentHost()): boolean {
  return Boolean(host && LEGACY_API_BY_HOST[host]);
}

/** True quando a página está sendo servida pelo host do app. */
export function isAppHost(host = currentHost()): boolean {
  return host === new URL(PRIMARY_APP_URL).hostname;
}

/**
 * Para onde a rota `/` leva, ou `null` quando ela mostra a landing.
 *
 * No host do app não existe landing: quem tem sessão vai para a tela inicial
 * do app, quem não tem vai para o login. Nos outros hosts (site público até a
 * virada, domínio anterior, localhost) `/` continua sendo a landing.
 */
export function resolveRootRedirect(hasSession: boolean, host = currentHost()): string | null {
  if (!isAppHost(host)) return null;

  return hasSession ? APP_HOME_PATH : '/login';
}
