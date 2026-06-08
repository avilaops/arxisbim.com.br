import { createHash } from 'crypto';

/**
 * Derivação de tenant para um NOVO usuário.
 *
 * MODELO CORRETO (isolamento multi-tenant):
 * - Todo novo usuário nasce no SEU PRÓPRIO tenant, único e isolado.
 * - Domínio de email NUNCA define tenant — nem público (gmail) nem corporativo
 *   (@empresa.com). Dois usuários nunca compartilham tenant por acaso.
 * - Para entrar no tenant de outra pessoa, é preciso CONVITE explícito
 *   (alguém cria um workspace e convida; o convidado ACEITA). Esse fluxo é
 *   tratado pelo sistema de convites — não por dedução no cadastro.
 */

/** Tenant pessoal único e estável por email. */
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
 * Tenant de um novo usuário = sempre o seu tenant pessoal único.
 * (Mantido com este nome por compatibilidade de imports.)
 */
export function tenantFromEmail(email: string): string {
  return personalTenant(email);
}
