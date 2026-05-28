import type { FastifyRequest } from 'fastify';
export interface TenantContext {
    tenantId: string;
    tenantName: string;
    plan: 'free' | 'pro' | 'enterprise';
    features: {
        vrEnabled: boolean;
        arEnabled: boolean;
        federationEnabled: boolean;
        maxUsers?: number;
        maxProjects?: number;
        maxStorageGB?: number;
    };
}
export interface UserContext {
    userId: string;
    email: string;
    name: string;
    role: 'owner' | 'admin' | 'user' | 'viewer';
    permissions: string[];
    tenantId: string;
    companyId?: string;
}
export interface AuthenticatedRequest extends FastifyRequest {
    tenant: TenantContext;
    user: UserContext;
}
export declare function extractTenantContext(request: FastifyRequest): Promise<TenantContext | null>;
export declare function validateTenantAccess(tenant: TenantContext, feature: string): boolean;
export declare function checkTenantLimits(tenant: TenantContext, resource: 'users' | 'projects' | 'storage', current: number): boolean;
//# sourceMappingURL=context.d.ts.map