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
  }

  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
