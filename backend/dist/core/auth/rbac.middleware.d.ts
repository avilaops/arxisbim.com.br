import type { FastifyRequest, FastifyReply } from 'fastify';
/**
 * RBAC Middleware - Role-Based Access Control
 * Middleware para verificação de permissões baseadas em roles e permissões granulares
 */
export type UserRole = 'admin' | 'user' | 'viewer' | 'manager';
export declare const PERMISSIONS: {
    readonly 'projects:create': "Criar novos projetos";
    readonly 'projects:read': "Visualizar projetos";
    readonly 'projects:update': "Atualizar projetos";
    readonly 'projects:delete': "Deletar projetos";
    readonly 'models:upload': "Upload de modelos IFC";
    readonly 'models:read': "Visualizar modelos";
    readonly 'models:delete': "Deletar modelos";
    readonly 'vr:access': "Acessar modo VR";
    readonly 'ar:access': "Acessar modo AR";
    readonly 'meetings:create': "Criar reuniões virtuais";
    readonly 'meetings:join': "Participar de reuniões";
    readonly 'meetings:manage': "Gerenciar reuniões";
    readonly 'federation:manage': "Gerenciar federação de empresas";
    readonly 'users:create': "Criar usuários";
    readonly 'users:read': "Visualizar usuários";
    readonly 'users:update': "Atualizar usuários";
    readonly 'users:delete': "Deletar usuários";
    readonly 'settings:update': "Atualizar configurações do tenant";
};
export type Permission = keyof typeof PERMISSIONS;
export declare const ROLE_PERMISSIONS: Record<UserRole, Permission[]>;
/**
 * Verificar se usuário tem uma role específica
 */
export declare function requireRole(...roles: UserRole[]): (request: FastifyRequest, reply: FastifyReply) => Promise<never>;
/**
 * Verificar se usuário tem uma ou mais permissões específicas
 */
export declare function requirePermission(...permissions: Permission[]): (request: FastifyRequest, reply: FastifyReply) => Promise<never>;
/**
 * Verificar se usuário tem TODAS as permissões especificadas
 */
export declare function requireAllPermissions(...permissions: Permission[]): (request: FastifyRequest, reply: FastifyReply) => Promise<never>;
/**
 * Helper para verificar permissões programaticamente (não como middleware)
 */
export declare function hasPermission(user: any, permission: Permission): boolean;
/**
 * Helper para obter todas as permissões de um usuário
 */
export declare function getUserPermissions(user: any): Permission[];
/**
 * Middleware para verificar se usuário é do mesmo tenant
 */
export declare function requireSameTenant(tenantIdParam?: string): (request: FastifyRequest, reply: FastifyReply) => Promise<never>;
/**
 * Verificar se usuário é owner do recurso ou admin
 */
export declare function requireOwnerOrAdmin(userIdField?: string): (request: FastifyRequest, reply: FastifyReply) => Promise<never>;
//# sourceMappingURL=rbac.middleware.d.ts.map