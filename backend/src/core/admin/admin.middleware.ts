import type { FastifyRequest, FastifyReply } from 'fastify';

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as any).user;
  if (!user) {
    return reply.status(401).send({ error: 'Não autenticado.' });
  }
  if (user.role !== 'admin' && !user.permissions?.includes('admin')) {
    return reply.status(403).send({ error: 'Acesso restrito a administradores.' });
  }
}
