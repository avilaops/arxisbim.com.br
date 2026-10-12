import { describe, it, expect } from 'vitest';
import {
  PRIMARY_APP_URL,
  PRIMARY_SITE_URL,
  defaultCorsOrigins,
  resolveCorsOrigins,
} from '../../src/core/config/domains.js';

describe('domains', () => {
  it('o app tem origem própria, separada do site público', () => {
    expect(PRIMARY_APP_URL).toBe('https://app.arxisbim.com.br');
    expect(PRIMARY_SITE_URL).toBe('https://arxisbim.com.br');
  });

  it('a allowlist padrão libera o app e o site público, e nada do domínio aposentado', () => {
    const origins = defaultCorsOrigins();
    expect(origins).toContain(PRIMARY_APP_URL);
    expect(origins).toContain(PRIMARY_SITE_URL);
    expect(origins.join(' ')).not.toContain('avilaops.com');
  });

  it('sem CORS_ORIGIN vale a allowlist padrão', () => {
    expect(resolveCorsOrigins('')).toEqual(defaultCorsOrigins());
    expect(resolveCorsOrigins('  ')).toEqual(defaultCorsOrigins());
  });

  it('CORS_ORIGIN=* reflete a origem; lista é normalizada', () => {
    expect(resolveCorsOrigins('*')).toBe(true);
    expect(resolveCorsOrigins('https://app.arxisbim.com.br/, https://arxisbim.com.br')).toEqual([
      'https://app.arxisbim.com.br',
      'https://arxisbim.com.br',
    ]);
  });
});
