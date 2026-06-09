import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Super-admin gate.
 *
 * Diferente de `requireRole('admin','owner')` — que deixa passar qualquer
 * usuário que seja "owner" do próprio tenant pessoal — este gate libera APENAS
 * os e-mails listados em SUPER_ADMIN_EMAILS (default: nicolas@avila.inc).
 *
 * É aqui que mora o controle total do painel do Nícolas: rastreio, tags,
 * atividade de todos os usuários, billing global, etc.
 */
function superAdminEmails(): string[] {
  const raw = process.env.SUPER_ADMIN_EMAILS || 'nicolas@avila.inc';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return superAdminEmails().includes(email.toLowerCase());
}

export async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user as { email?: string } | undefined;
  if (!user) {
    return reply.code(401).send({ error: 'Não autenticado.' });
  }
  if (!isSuperAdmin(user.email)) {
    return reply.code(403).send({ error: 'Acesso restrito ao administrador da plataforma.' });
  }
}
