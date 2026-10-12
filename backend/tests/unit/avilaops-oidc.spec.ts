import { describe, it, expect } from 'vitest';
import {
  CAMINHO_DO_FLUXO,
  COOKIE_DO_FLUXO,
  assinarState,
  buscarPerfil,
  cookieDoFluxo,
  cookieDoFluxoVencido,
  desafioDe,
  enderecoDeAutorizacao,
  lerConfiguracao,
  lerCookie,
  novoVerificador,
  somenteLoginCentral,
  stateConfere,
} from '../../src/core/auth/avilaops-oidc.js';

const SEGREDO = 'segredo-de-teste-com-tamanho-suficiente';
const CONFIG = {
  issuer: 'https://auth.exemplo',
  clientId: 'arxis',
  clientSecret: 's3gr3d0',
  redirectUri: 'https://api.exemplo/api/v1/auth/avilaops/callback',
};

function resposta(status: number, corpo: unknown): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('configuração do login central', () => {
  it('sem identificador ou segredo, não há login central', () => {
    expect(lerConfiguracao({})).toBeNull();
    expect(lerConfiguracao({ AVILAOPS_OIDC_CLIENT_ID: 'arxis' })).toBeNull();
  });

  it('monta o retorno a partir do endereço público da API e usa o emissor padrão', () => {
    const config = lerConfiguracao({
      AVILAOPS_OIDC_CLIENT_ID: 'arxis',
      AVILAOPS_OIDC_CLIENT_SECRET: 'x',
      BACKEND_URL: 'https://api.arxisbim.com.br/',
    });
    expect(config).toEqual({
      issuer: 'https://auth.avilaops.com',
      clientId: 'arxis',
      clientSecret: 'x',
      redirectUri: `https://api.arxisbim.com.br${CAMINHO_DO_FLUXO}/callback`,
    });
  });

  it('só fecha o login próprio com a variável escrita por extenso', () => {
    expect(somenteLoginCentral({})).toBe(false);
    expect(somenteLoginCentral({ AUTH_SSO_ONLY: '1' })).toBe(false);
    expect(somenteLoginCentral({ AUTH_SSO_ONLY: 'true' })).toBe(true);
  });
});

describe('ida ao login central', () => {
  it('manda o desafio S256 do verificador, e não o verificador', () => {
    const verificador = novoVerificador();
    const state = assinarState(verificador, SEGREDO);
    const url = new URL(enderecoDeAutorizacao(CONFIG, state, desafioDe(verificador)));

    expect(url.origin + url.pathname).toBe('https://auth.exemplo/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('arxis');
    expect(url.searchParams.get('redirect_uri')).toBe(CONFIG.redirectUri);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toBe(desafioDe(verificador));
    expect(url.toString()).not.toContain(verificador);
  });

  it('o cookie do fluxo é HttpOnly, restrito às rotas do fluxo e Secure em https', () => {
    const cookie = cookieDoFluxo('abc', true);
    expect(cookie).toContain(`${COOKIE_DO_FLUXO}=abc`);
    expect(cookie).toContain(`Path=${CAMINHO_DO_FLUXO}`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Secure');
    expect(cookieDoFluxo('abc', false)).not.toContain('Secure');
    expect(cookieDoFluxoVencido(true)).toContain('Max-Age=0');
  });
});

describe('volta do login central', () => {
  it('aceita o state quando o cookie é o verificador que o gerou', () => {
    const verificador = novoVerificador();
    expect(stateConfere(assinarState(verificador, SEGREDO), verificador, SEGREDO)).toBe(true);
  });

  it('recusa cookie de outro navegador, state forjado e falta de qualquer um dos dois', () => {
    const verificador = novoVerificador();
    const state = assinarState(verificador, SEGREDO);

    expect(stateConfere(state, novoVerificador(), SEGREDO)).toBe(false);
    expect(stateConfere(assinarState(verificador, 'outro-segredo'), verificador, SEGREDO)).toBe(false);
    expect(stateConfere(undefined, verificador, SEGREDO)).toBe(false);
    expect(stateConfere(state, undefined, SEGREDO)).toBe(false);
    expect(stateConfere('lixo', verificador, SEGREDO)).toBe(false);
  });

  it('lê o cookie pelo nome exato, entre outros cookies', () => {
    expect(lerCookie(`a=1; ${COOKIE_DO_FLUXO}=xyz; b=2`, COOKIE_DO_FLUXO)).toBe('xyz');
    expect(lerCookie(`x${COOKIE_DO_FLUXO}=nao`, COOKIE_DO_FLUXO)).toBeUndefined();
    expect(lerCookie(undefined, COOKIE_DO_FLUXO)).toBeUndefined();
  });
});

describe('troca do código pelo perfil', () => {
  it('manda segredo e verificador ao token e devolve o perfil com e-mail normalizado', async () => {
    const chamadas: Array<{ url: string; init?: RequestInit }> = [];
    const buscar = (async (url: string, init?: RequestInit) => {
      chamadas.push({ url, init });
      if (url.endsWith('/oauth/token')) return resposta(200, { access_token: 'tok' });
      return resposta(200, { sub: 'conta-1', email: ' Pessoa@Exemplo.com ', name: 'Pessoa' });
    }) as unknown as typeof fetch;

    const perfil = await buscarPerfil(CONFIG, 'codigo', 'verificador', buscar);

    expect(perfil).toEqual({ id: 'conta-1', email: 'pessoa@exemplo.com', name: 'Pessoa', provider: 'avilaops' });
    const corpo = new URLSearchParams(String(chamadas[0].init?.body));
    expect(corpo.get('code')).toBe('codigo');
    expect(corpo.get('code_verifier')).toBe('verificador');
    expect(corpo.get('client_secret')).toBe('s3gr3d0');
    expect(corpo.get('redirect_uri')).toBe(CONFIG.redirectUri);
    expect((chamadas[1].init?.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('falha quando o Auth recusa o código', async () => {
    const buscar = (async () => resposta(400, { error: 'invalid_grant' })) as unknown as typeof fetch;
    await expect(buscarPerfil(CONFIG, 'c', 'v', buscar)).rejects.toThrow(/invalid_grant/);
  });

  it('falha quando o perfil vem sem identificador ou sem e-mail', async () => {
    const buscar = (async (url: string) =>
      url.endsWith('/oauth/token') ? resposta(200, { access_token: 'tok' }) : resposta(200, { sub: 'conta-1' })
    ) as unknown as typeof fetch;
    await expect(buscarPerfil(CONFIG, 'c', 'v', buscar)).rejects.toThrow(/perfil/);
  });
});
