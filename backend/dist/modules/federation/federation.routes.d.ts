import type { FastifyInstance } from 'fastify';
/**
 * Federation routes - /api/v1/federation
 *
 * Manages federated models (multiple IFC files combined into one virtual model)
 * All routes require authentication and use tenant isolation from .env PostgreSQL database
 */
export declare function federationRoutes(fastify: FastifyInstance): Promise<void>;
//# sourceMappingURL=federation.routes.d.ts.map