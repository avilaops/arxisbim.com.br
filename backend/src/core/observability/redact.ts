/**
 * Redact (S06) — remove campos sensíveis ANTES de chegar ao log.
 *
 * Spec S06: Authorization, Cookie, senha, tokens (access/refresh/JWT), token do
 * Mercado Pago, Database URL, storage keys / presigned URLs nunca podem aparecer em log.
 *
 * Duas camadas:
 *  1. Por NOME de chave (case-insensitive, deep) — pega `authorization`, `password`,
 *     `accessToken`, `apiKey`, `mpAccessToken`, etc.
 *  2. Por VALOR de string — pega presigned URLs (assinatura S3/R2) e connection
 *     strings de banco mesmo quando a chave não é óbvia (ex.: `url`, `endpoint`).
 */

export const REDACTED = '[REDACTED]';

// Nome de chave sensível → match por substring, case-insensitive.
const SENSITIVE_KEY_PATTERNS = [
  'authorization',
  'cookie',
  'password',
  'passwd',
  'secret',
  'token', // accessToken, refreshToken, challengeToken, csrfToken...
  'jwt',
  'apikey',
  'api_key',
  'x-api-key',
  'credential',
  'private_key',
  'privatekey',
  'databaseurl',
  'database_url',
  'connectionstring',
  'connection_string',
];

// Valor de string que parece sensível mesmo sob chave inócua.
const SENSITIVE_VALUE_PATTERNS: RegExp[] = [
  /[?&]x-amz-signature=/i, // presigned S3/R2
  /[?&]signature=/i,
  /x-amz-credential=/i,
  /\bpostgres(?:ql)?:\/\/[^\s]*:[^\s]*@/i, // postgres://user:pass@host
  /\bredis:\/\/[^\s]*:[^\s]*@/i,
  /^Bearer\s+[A-Za-z0-9._-]+$/i,
  /\b(?:APP_USR|TEST)-\d{6,}-[A-Za-z0-9-]+/, // access token do Mercado Pago
];

function isSensitiveKey(key: string): boolean {
  const k = key.toLowerCase();
  return SENSITIVE_KEY_PATTERNS.some((p) => k.includes(p));
}

function isSensitiveValue(value: string): boolean {
  return SENSITIVE_VALUE_PATTERNS.some((re) => re.test(value));
}

/**
 * Retorna uma cópia profunda de `input` com campos sensíveis mascarados.
 * Não muta a entrada. Trata ciclos. Limita profundidade p/ não estourar em log.
 */
export function redactSensitive<T>(input: T, _depth = 0, _seen = new WeakSet<object>()): T {
  if (_depth > 8) return REDACTED as unknown as T;

  if (typeof input === 'string') {
    return (isSensitiveValue(input) ? REDACTED : input) as unknown as T;
  }

  if (input === null || typeof input !== 'object') {
    return input;
  }

  if (_seen.has(input as object)) return REDACTED as unknown as T;
  _seen.add(input as object);

  if (Array.isArray(input)) {
    return input.map((item) => redactSensitive(item, _depth + 1, _seen)) as unknown as T;
  }

  // Erros: preservar mensagem/stack (stack é permitido em debug pelo spec).
  if (input instanceof Error) {
    return input;
  }

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (isSensitiveKey(key)) {
      out[key] = REDACTED;
    } else {
      out[key] = redactSensitive(value, _depth + 1, _seen);
    }
  }
  return out as unknown as T;
}

/** Paths de redact no formato do pino (`redact` option) para o logger do Fastify. */
export const PINO_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'res.headers["set-cookie"]',
  '*.authorization',
  '*.password',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.secret',
  '*.apiKey',
];
