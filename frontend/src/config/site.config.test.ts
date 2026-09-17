import { describe, expect, it } from 'vitest';

import {
  PRIMARY_API_URL,
  PRIMARY_SITE_URL,
  isLegacyHost,
  normalizeOrigin,
  resolveApiUrl,
  resolveCanonicalSiteUrl,
  resolveSiteUrl,
  resolveWsUrl,
} from './site.config';

// Os resolvers recebem env e host como argumento justamente para o teste poder
// exercitar cada combinação; `import.meta.env` fica congelado no bundle.
const SEM_ENV = {};

describe('normalizeOrigin', () => {
  it('remove barra final e sufixo /api/v1', () => {
    expect(normalizeOrigin('https://api.arxisbim.com.br/')).toBe('https://api.arxisbim.com.br');
    expect(normalizeOrigin(' https://api.arxisbim.com.br/api/v1 ')).toBe('https://api.arxisbim.com.br');
  });
});

describe('resolveApiUrl', () => {
  it('usa VITE_API_URL quando o build injeta', () => {
    expect(resolveApiUrl({ VITE_API_URL: 'https://api.exemplo.test/api/v1/' }, 'arxisbim.com.br')).toBe(
      'https://api.exemplo.test',
    );
  });

  it('em localhost cai para o backend de desenvolvimento', () => {
    expect(resolveApiUrl(SEM_ENV, 'localhost')).toBe('http://localhost:3001');
  });

  it('servido pelo domínio novo, fala com a API nova', () => {
    expect(resolveApiUrl(SEM_ENV, 'arxisbim.com.br')).toBe(PRIMARY_API_URL);
  });

  it('servido pelo domínio antigo, continua na API antiga (um bundle só serve os dois)', () => {
    expect(resolveApiUrl(SEM_ENV, 'arxisvr.avilaops.com')).toBe('https://api.arxisvr.avilaops.com');
    expect(resolveApiUrl(SEM_ENV, 'www.arxisvr.avilaops.com')).toBe('https://api.arxisvr.avilaops.com');
  });

  it('host desconhecido cai no domínio canônico', () => {
    expect(resolveApiUrl(SEM_ENV, 'preview.pages.dev')).toBe(PRIMARY_API_URL);
  });
});

describe('resolveSiteUrl e resolveCanonicalSiteUrl', () => {
  it('o canônico é sempre o domínio próprio, mesmo no host antigo', () => {
    expect(resolveCanonicalSiteUrl(SEM_ENV)).toBe(PRIMARY_SITE_URL);
    expect(resolveSiteUrl(SEM_ENV, 'arxisvr.avilaops.com')).toBe('https://arxisvr.avilaops.com');
  });

  it('VITE_SITE_URL manda nos dois', () => {
    const env = { VITE_SITE_URL: 'https://preview.exemplo.test/' };
    expect(resolveCanonicalSiteUrl(env)).toBe('https://preview.exemplo.test');
    expect(resolveSiteUrl(env, 'arxisvr.avilaops.com')).toBe('https://preview.exemplo.test');
  });
});

describe('resolveWsUrl', () => {
  it('deriva do host da API em produção (não há signaling separado)', () => {
    expect(resolveWsUrl(SEM_ENV, 'arxisbim.com.br')).toBe('wss://api.arxisbim.com.br');
    expect(resolveWsUrl(SEM_ENV, 'arxisvr.avilaops.com')).toBe('wss://api.arxisvr.avilaops.com');
  });

  it('em dev aponta para o signaling local', () => {
    expect(resolveWsUrl(SEM_ENV, 'localhost')).toBe('ws://localhost:3002');
  });

  it('VITE_WS_SERVER manda', () => {
    expect(resolveWsUrl({ VITE_WS_SERVER: 'wss://ws.exemplo.test/' }, 'arxisbim.com.br')).toBe(
      'wss://ws.exemplo.test',
    );
  });
});

describe('isLegacyHost', () => {
  it('reconhece os hosts do domínio anterior', () => {
    expect(isLegacyHost('arxisvr.avilaops.com')).toBe(true);
    expect(isLegacyHost('www.arxisvr.avilaops.com')).toBe(true);
    expect(isLegacyHost('arxisbim.com.br')).toBe(false);
  });
});
