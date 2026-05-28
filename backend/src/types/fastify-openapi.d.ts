import 'fastify';

declare module 'fastify' {
  interface FastifySchema {
    description?: string;
    tags?: string[];
    security?: unknown;
    consumes?: string[];
  }
}
