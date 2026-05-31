import type { FastifyRequest, FastifyReply } from 'fastify';
import { type UserContext } from '../tenancy/context.js';
export declare function authenticateRequest(request: FastifyRequest, reply: FastifyReply): Promise<void>;
export declare function tenancyMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void>;
export declare function optionalAuth(request: FastifyRequest): Promise<void>;
export declare function requirePermission(...permissions: string[]): (request: FastifyRequest, reply: FastifyReply) => Promise<undefined>;
export declare function requireRole(...roles: Array<UserContext['role']>): (request: FastifyRequest, reply: FastifyReply) => Promise<undefined>;
//# sourceMappingURL=middleware.d.ts.map