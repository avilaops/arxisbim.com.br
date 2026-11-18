import 'fastify';
import type { UserContext } from '../core/tenancy/context.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string;
      tenantId: string;
      email: string;
      role?: UserContext['role'];
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
    adminOnly: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifySchema {
    summary?: string;
    description?: string;
    tags?: string[];
  }
}
