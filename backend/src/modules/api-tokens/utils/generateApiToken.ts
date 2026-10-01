import crypto from 'node:crypto';

/**
 * Gera um token API no formato: arx_live_xxxxxxxxxx ou arx_test_xxxxxxxxxx
 * Comprimento total: ~60 chars (arx_[live|test]_[43 chars base64url])
 */
export function generateApiToken(environment: 'live' | 'test'): string {
  const secret = crypto.randomBytes(32).toString('base64url');
  return `arx_${environment}_${secret}`;
}

/**
 * Retorna o prefixo público do token (não expõe o secret)
 * Exemplo: arx_live_abc12345••••••••••••Z9K8
 * Mostra: primeiros 8 chars do secret + últimos 4 chars
 */
export function getTokenPrefix(token: string): string {
  const parts = token.split('_');
  if (parts.length !== 3) return '••••••••••••••••••';
  
  const secret = parts[2];
  const visible = secret.length > 12 
    ? `${secret.substring(0, 8)}••••••••••${secret.substring(secret.length - 4)}`
    : '••••••••••••••••••';
  
  return `${parts[0]}_${parts[1]}_${visible}`;
}

/**
 * Hash seguro do token com HMAC-SHA-256
 * O pepper é a chave secreta do servidor. Mesmo que o banco vaze,
 * sem o pepper exato, o atacante não consegue recriar o hash.
 */
export function hashApiToken(token: string): string {
  const pepper = process.env.API_TOKEN_PEPPER;

  if (!pepper) {
    throw new Error('API_TOKEN_PEPPER não configurado.');
  }

  return crypto
    .createHmac('sha256', pepper)
    .update(token)
    .digest('hex');
}

/**
 * Valida o formato do token
 */
export function isValidApiTokenFormat(token: string): boolean {
  // arx_[live|test]_[base64url com 43 chars]
  return /^arx_(live|test)_[A-Za-z0-9_-]{43}$/.test(token);
}

/**
 * Máscara do token para logs (nunca expor o token cheio)
 * Exemplo: arx_live_••••••••••••••••••••••••••••••••••••••K
 */
export function maskApiToken(token: string): string {
  const parts = token.split('_');
  if (parts.length !== 3) return '••••••••••••••••••';
  
  const secret = parts[2];
  const masked = '•'.repeat(Math.max(0, secret.length - 4)) + secret.substring(secret.length - 4);
  
  return `${parts[0]}_${parts[1]}_${masked}`;
}
