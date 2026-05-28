import type { FastifyRequest, FastifyReply } from 'fastify';
export declare function authenticateApiKey(request: FastifyRequest, reply: FastifyReply): Promise<void>;
/**
 * Middleware que aceita tanto JWT quanto API Key
 */
export declare function authenticateJwtOrApiKey(request: FastifyRequest, reply: FastifyReply): Promise<void>;
//# sourceMappingURL=api-key.middleware.d.ts.map