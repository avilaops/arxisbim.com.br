import { createHash } from 'crypto';

/**
 * Derivação de tenant a partir do email.
 *
 * REGRA DE SEGURANÇA (isolamento multi-tenant):
 * - Domínios de email PÚBLICOS (gmail, hotmail, outlook, …) NUNCA formam um
 *   tenant compartilhado. Cada usuário de email pessoal recebe um tenant
 *   próprio e único. Sem isso, dois desconhecidos com @gmail.com cairiam no
 *   mesmo tenant "gmail" e veriam os projetos um do outro (vazamento de dados).
 * - Domínios CORPORATIVOS (ex.: @avilaops.com) continuam agrupando os usuários
 *   no mesmo tenant — isso é intencional (workspace da empresa).
 *
 * Para entrar explicitamente num workspace, use o nome da empresa/workspace no
 * cadastro (slug) — tratado fora desta função.
 */

// Provedores de email pessoal/gratuito — nunca agrupam usuários.
const PUBLIC_EMAIL_DOMAINS = new Set<string>([
  'gmail.com', 'googlemail.com',
  'hotmail.com', 'hotmail.com.br', 'outlook.com', 'outlook.com.br', 'live.com', 'msn.com',
  'yahoo.com', 'yahoo.com.br', 'ymail.com',
  'icloud.com', 'me.com', 'mac.com',
  'proton.me', 'protonmail.com', 'pm.me',
  'aol.com', 'gmx.com', 'gmx.net', 'zoho.com', 'mail.com', 'tutanota.com',
  'yandex.com', 'yandex.ru',
  'bol.com.br', 'uol.com.br', 'terra.com.br', 'ig.com.br', 'globo.com', 'r7.com',
]);

function emailDomain(email: string): string {
  return (email.split('@')[1] || '').toLowerCase().trim();
}

export function isPublicEmailDomain(email: string): boolean {
  return PUBLIC_EMAIL_DOMAINS.has(emailDomain(email));
}

/** Tenant pessoal único e estável por email (para domínios públicos). */
export function personalTenant(email: string): string {
  const local = (email.split('@')[0] || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'user';
  const hash = createHash('sha256').update(email.toLowerCase().trim()).digest('hex').slice(0, 8);
  return `u-${local}-${hash}`;
}

/**
 * Tenant derivado do email:
 * - domínio público  → tenant pessoal único (sem agrupamento)
 * - domínio corporativo → slug do domínio (agrupa a empresa)
 */
export function tenantFromEmail(email: string): string {
  if (isPublicEmailDomain(email)) return personalTenant(email);
  const domain = emailDomain(email) || 'public';
  const base = domain.split('.')[0] || 'public';
  return base.toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'public';
}
