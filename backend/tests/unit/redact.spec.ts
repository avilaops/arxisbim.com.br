import { describe, it, expect } from 'vitest';
import { redactSensitive, REDACTED } from '../../src/core/observability/redact.js';

describe('redactSensitive', () => {
  it('masks sensitive keys (case-insensitive, nested)', () => {
    const out = redactSensitive({
      Authorization: 'Bearer abc',
      user: { password: 'hunter2', accessToken: 'x', name: 'Ana' },
      cookie: 'sid=1',
      apiKey: 'k',
      mpAccessToken: 'APP_USR-123',
      note: 'token APP_USR-1234567890123456-082612-abcdef0123456789-2944732714 no log',
    });
    expect(out.Authorization).toBe(REDACTED);
    expect(out.user.password).toBe(REDACTED);
    expect(out.user.accessToken).toBe(REDACTED);
    expect(out.user.name).toBe('Ana'); // não-sensível preservado
    expect(out.cookie).toBe(REDACTED);
    expect(out.apiKey).toBe(REDACTED);
    expect(out.mpAccessToken).toBe(REDACTED);
    expect(out.note).toBe(REDACTED); // valor com cara de token do Mercado Pago, sob chave inócua
  });

  it('masks sensitive VALUES under innocuous keys (presigned URL, db url, bearer)', () => {
    const out = redactSensitive({
      url: 'https://b.r2.dev/x.ifc?X-Amz-Signature=deadbeef&X-Amz-Credential=ak',
      db: 'postgres://user:pass@host:5432/db',
      auth: 'Bearer eyJhbGciOi',
      plain: 'https://example.com/public.png',
    });
    expect(out.url).toBe(REDACTED);
    expect(out.db).toBe(REDACTED);
    expect(out.auth).toBe(REDACTED);
    expect(out.plain).toBe('https://example.com/public.png');
  });

  it('does not mutate input and handles arrays + cycles + undefined', () => {
    const input: any = { tokens: ['a', 'b'], list: [{ secret: 's' }] };
    input.self = input;
    const out = redactSensitive(input);
    expect(input.tokens).toEqual(['a', 'b']); // original intacto
    expect(out.tokens).toBe(REDACTED); // chave 'tokens' sensível
    expect(out.list[0].secret).toBe(REDACTED);
    expect(redactSensitive(undefined)).toBeUndefined();
  });
});
