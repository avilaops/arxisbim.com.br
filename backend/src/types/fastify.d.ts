import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string;
      tenantId: string;
      email: string;
      permissions?: string[];
    };
    apiKey?: {
      id: string;
      name: string;
      scopes: string[];
      tenantId: string;
      userId: string;
    };
    startTime?: number;
    rawBody?: string;
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    adminOnly: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifySchema {
    summary?: string;
    description?: string;
    tags?: string[];
  }
}
