const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verify a Turnstile token.
 * @param required - if true, throws even in dev/non-prod when token is missing and Turnstile is configured
 */
export async function verifyTurnstileToken(token: string, ip?: string, required = false): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // Skip verification in development or if secret is not configured
  if (!secret || (process.env.NODE_ENV !== 'production' && !required)) return;
  if (!token && required && secret) throw new Error('Verificação de segurança obrigatória. Complete o CAPTCHA.');

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);

  const res = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    body,
  });

  const data = (await res.json()) as { success: boolean; 'error-codes'?: string[] };

  if (!data.success) {
    const codes = data['error-codes']?.join(', ') ?? 'unknown';
    throw new Error(`Verificação de segurança falhou (${codes}). Tente novamente.`);
  }
}
