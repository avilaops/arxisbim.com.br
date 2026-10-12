/**
 * avilaops-oidc.ts — login do Arxis pelo login central da Ávila Ops
 * (`auth.avilaops.com`), que é um provedor OIDC.
 *
 * Desde 12/10/2026 é a única porta de entrada do produto: a tela de login e a
 * de cadastro levam para cá, e o cadastro de conta nova acontece no Auth. O
 * Arxis continua dono da própria sessão (JWT + refresh) e dos próprios
 * usuários; o Auth só responde "quem é esta pessoa".
 *
 * O fluxo é código de autorização com PKCE. O Fastify deste backend não tem
 * plugin de cookie, então o único cookie do fluxo é escrito e lido à mão:
 *
 *   ida    gera um verificador aleatório, guarda no cookie (HttpOnly, só no
 *          caminho destas rotas, 10 minutos) e manda ao Auth o desafio S256
 *          dele mais um `state` assinado que carrega o hash do verificador.
 *   volta  confere a assinatura e a validade do `state`, confere que o cookie
 *          deste navegador é o verificador daquele `state`, e só então troca o
 *          código, mandando o verificador como `code_verifier`.
 *
 * O cookie amarra a volta ao navegador que começou a ida: sem ele, um link de
 * retorno com o código de outra pessoa abriria a sessão dela no navegador da
 * vítima (login CSRF).
 */

import { createHash, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';

/** Emissor do login central. Fica em variável só para teste e staging. */
export const AVILAOPS_ISSUER_PADRAO = 'https://auth.avilaops.com';

/** Nome do cookie que guarda o verificador do PKCE durante a ida e a volta. */
export const COOKIE_DO_FLUXO = 'arx_oidc';

/** Caminho das duas rotas: o cookie não viaja para o resto da API. */
export const CAMINHO_DO_FLUXO = '/api/v1/auth/avilaops';

/** Tempo para a pessoa concluir o login no Auth e voltar. */
const VALIDADE_DO_FLUXO_SEGUNDOS = 10 * 60;

export interface ConfiguracaoAvilaOps {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface PerfilAvilaOps {
  id: string;
  email: string;
  name: string;
  provider: 'avilaops';
}

/**
 * Lê a configuração do ambiente. Devolve `null` quando o login central não
 * está configurado, para a rota responder 501 em vez de quebrar.
 */
export function lerConfiguracao(env: NodeJS.ProcessEnv = process.env): ConfiguracaoAvilaOps | null {
  const clientId = env.AVILAOPS_OIDC_CLIENT_ID?.trim();
  const clientSecret = env.AVILAOPS_OIDC_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  const issuer = (env.AVILAOPS_OIDC_ISSUER?.trim() || AVILAOPS_ISSUER_PADRAO).replace(/\/+$/, '');
  const backend = (env.BACKEND_URL?.trim() || 'http://localhost:3001').replace(/\/+$/, '');

  return { issuer, clientId, clientSecret, redirectUri: `${backend}${CAMINHO_DO_FLUXO}/callback` };
}

/** True quando o produto só aceita entrada pelo login central. */
export function somenteLoginCentral(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.AUTH_SSO_ONLY === 'true';
}

function base64url(dados: Buffer): string {
  return dados.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sha256(texto: string): Buffer {
  return createHash('sha256').update(texto).digest();
}

export function novoVerificador(): string {
  return base64url(randomBytes(32));
}

export function desafioDe(verificador: string): string {
  return base64url(sha256(verificador));
}

/** `state` assinado: prova que a ida saiu deste backend e de qual verificador. */
export function assinarState(verificador: string, segredo: string): string {
  return jwt.sign({ v: sha256(verificador).toString('hex'), t: 'avilaops_oidc' }, segredo, {
    expiresIn: VALIDADE_DO_FLUXO_SEGUNDOS,
  });
}

/**
 * Confere o `state` da volta contra o verificador que veio no cookie.
 * Falso para assinatura inválida, prazo vencido, tipo errado ou cookie de
 * outro fluxo.
 */
export function stateConfere(state: string | undefined, verificador: string | undefined, segredo: string): boolean {
  if (!state || !verificador) return false;
  try {
    const dados = jwt.verify(state, segredo) as { v?: unknown; t?: unknown };
    return dados.t === 'avilaops_oidc' && dados.v === sha256(verificador).toString('hex');
  } catch {
    return false;
  }
}

/** Endereço do Auth para onde a ida redireciona. */
export function enderecoDeAutorizacao(config: ConfiguracaoAvilaOps, state: string, desafio: string): string {
  const parametros = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: 'openid profile email',
    state,
    code_challenge: desafio,
    code_challenge_method: 'S256',
  });
  return `${config.issuer}/oauth/authorize?${parametros}`;
}

/** Cabeçalho `Set-Cookie` que guarda o verificador durante o fluxo. */
export function cookieDoFluxo(verificador: string, seguro: boolean): string {
  const partes = [
    `${COOKIE_DO_FLUXO}=${verificador}`,
    `Path=${CAMINHO_DO_FLUXO}`,
    `Max-Age=${VALIDADE_DO_FLUXO_SEGUNDOS}`,
    'HttpOnly',
    // Lax: a volta do Auth é uma navegação de topo vinda de outro site, e é
    // exatamente nela que o cookie precisa viajar.
    'SameSite=Lax',
  ];
  if (seguro) partes.push('Secure');
  return partes.join('; ');
}

/** Cabeçalho `Set-Cookie` que apaga o verificador depois da volta. */
export function cookieDoFluxoVencido(seguro: boolean): string {
  const partes = [`${COOKIE_DO_FLUXO}=`, `Path=${CAMINHO_DO_FLUXO}`, 'Max-Age=0', 'HttpOnly', 'SameSite=Lax'];
  if (seguro) partes.push('Secure');
  return partes.join('; ');
}

/** Lê um cookie pelo nome do cabeçalho `Cookie` cru. */
export function lerCookie(cabecalho: string | undefined, nome: string): string | undefined {
  if (!cabecalho) return undefined;
  for (const par of cabecalho.split(';')) {
    const corte = par.indexOf('=');
    if (corte > 0 && par.slice(0, corte).trim() === nome) {
      return par.slice(corte + 1).trim() || undefined;
    }
  }
  return undefined;
}

/**
 * Troca o código pelo token de acesso e busca o perfil no `userinfo`.
 *
 * O Auth só emite código para conta com e-mail confirmado e devolve sempre
 * `sub`, `email` e `name`; perfil sem `sub` ou sem e-mail é recusado.
 */
export async function buscarPerfil(
  config: ConfiguracaoAvilaOps,
  codigo: string,
  verificador: string,
  buscar: typeof fetch = fetch,
): Promise<PerfilAvilaOps> {
  const respostaDoToken = await buscar(`${config.issuer}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: codigo,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code_verifier: verificador,
    }),
  });
  const token = (await respostaDoToken.json().catch(() => ({}))) as { access_token?: string; error?: string };
  if (!respostaDoToken.ok || !token.access_token) {
    throw new Error(`Login central recusou a troca do código: ${token.error ?? respostaDoToken.status}`);
  }

  const respostaDoPerfil = await buscar(`${config.issuer}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${token.access_token}`, Accept: 'application/json' },
  });
  const perfil = (await respostaDoPerfil.json().catch(() => ({}))) as { sub?: string; email?: string; name?: string };
  if (!respostaDoPerfil.ok || !perfil.sub || !perfil.email) {
    throw new Error('Login central não devolveu o perfil da conta');
  }

  const email = perfil.email.trim().toLowerCase();
  return { id: perfil.sub, email, name: perfil.name?.trim() || email.split('@')[0], provider: 'avilaops' };
}
