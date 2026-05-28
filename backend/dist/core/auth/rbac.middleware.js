// Permissões granulares disponíveis
export const PERMISSIONS = {
    // Projects
    'projects:create': 'Criar novos projetos',
    'projects:read': 'Visualizar projetos',
    'projects:update': 'Atualizar projetos',
    'projects:delete': 'Deletar projetos',
    // Models/IFC
    'models:upload': 'Upload de modelos IFC',
    'models:read': 'Visualizar modelos',
    'models:delete': 'Deletar modelos',
    // VR/AR
    'vr:access': 'Acessar modo VR',
    'ar:access': 'Acessar modo AR',
    // Meetings
    'meetings:create': 'Criar reuniões virtuais',
    'meetings:join': 'Participar de reuniões',
    'meetings:manage': 'Gerenciar reuniões',
    // Federation
    'federation:manage': 'Gerenciar federação de empresas',
    // Users (admin only)
    'users:create': 'Criar usuários',
    'users:read': 'Visualizar usuários',
    'users:update': 'Atualizar usuários',
    'users:delete': 'Deletar usuários',
    // Settings
    'settings:update': 'Atualizar configurações do tenant',
};
// Mapeamento de roles para permissões padrão
export const ROLE_PERMISSIONS = {
    admin: Object.keys(PERMISSIONS), // Admin tem todas as permissões
    manager: [
        'projects:create',
        'projects:read',
        'projects:update',
        'projects:delete',
        'models:upload',
        'models:read',
        'models:delete',
        'vr:access',
        'ar:access',
        'meetings:create',
        'meetings:join',
        'meetings:manage',
        'users:read',
    ],
    user: [
        'projects:read',
        'projects:update',
        'models:upload',
        'models:read',
        'vr:access',
        'ar:access',
        'meetings:create',
        'meetings:join',
    ],
    viewer: [
        'projects:read',
        'models:read',
        'vr:access',
        'meetings:join',
    ],
};
/**
 * Verificar se usuário tem uma role específica
 */
export function requireRole(...roles) {
    return async (request, reply) => {
        const user = request.user;
        if (!user || !user.role) {
            return reply.code(401).send({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }
        if (!roles.includes(user.role)) {
            return reply.code(403).send({
                error: 'Forbidden',
                message: `Access denied. Required roles: ${roles.join(', ')}`,
            });
        }
    };
}
/**
 * Verificar se usuário tem uma ou mais permissões específicas
 */
export function requirePermission(...permissions) {
    return async (request, reply) => {
        const user = request.user;
        if (!user || !user.role) {
            return reply.code(401).send({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }
        // Obter permissões do role
        const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
        // Obter permissões customizadas do usuário (se houver)
        const userCustomPermissions = user.permissions || [];
        // Combinar ambas
        const allPermissions = [...rolePermissions, ...userCustomPermissions];
        // Verificar se tem pelo menos uma das permissões requeridas
        const hasPermission = permissions.some(perm => allPermissions.includes(perm));
        if (!hasPermission) {
            return reply.code(403).send({
                error: 'Forbidden',
                message: `Access denied. Required permissions: ${permissions.join(', ')}`,
            });
        }
    };
}
/**
 * Verificar se usuário tem TODAS as permissões especificadas
 */
export function requireAllPermissions(...permissions) {
    return async (request, reply) => {
        const user = request.user;
        if (!user || !user.role) {
            return reply.code(401).send({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }
        // Obter permissões do role
        const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
        // Obter permissões customizadas do usuário
        const userCustomPermissions = user.permissions || [];
        // Combinar ambas
        const allPermissions = [...rolePermissions, ...userCustomPermissions];
        // Verificar se tem TODAS as permissões requeridas
        const hasAllPermissions = permissions.every(perm => allPermissions.includes(perm));
        if (!hasAllPermissions) {
            const missingPermissions = permissions.filter(perm => !allPermissions.includes(perm));
            return reply.code(403).send({
                error: 'Forbidden',
                message: `Access denied. Missing permissions: ${missingPermissions.join(', ')}`,
            });
        }
    };
}
/**
 * Helper para verificar permissões programaticamente (não como middleware)
 */
export function hasPermission(user, permission) {
    if (!user || !user.role)
        return false;
    const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
    const userCustomPermissions = user.permissions || [];
    const allPermissions = [...rolePermissions, ...userCustomPermissions];
    return allPermissions.includes(permission);
}
/**
 * Helper para obter todas as permissões de um usuário
 */
export function getUserPermissions(user) {
    if (!user || !user.role)
        return [];
    const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
    const userCustomPermissions = user.permissions || [];
    // Remover duplicatas
    return [...new Set([...rolePermissions, ...userCustomPermissions])];
}
/**
 * Middleware para verificar se usuário é do mesmo tenant
 */
export function requireSameTenant(tenantIdParam = 'tenantId') {
    return async (request, reply) => {
        const user = request.user;
        const requestedTenantId = request.params[tenantIdParam] ||
            request.body?.tenantId ||
            request.headers['x-tenant-id'];
        if (!user || !user.tenantId) {
            return reply.code(401).send({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }
        if (requestedTenantId && user.tenantId !== requestedTenantId) {
            return reply.code(403).send({
                error: 'Forbidden',
                message: 'Access to this tenant is denied',
            });
        }
    };
}
/**
 * Verificar se usuário é owner do recurso ou admin
 */
export function requireOwnerOrAdmin(userIdField = 'userId') {
    return async (request, reply) => {
        const user = request.user;
        const resourceUserId = request.params[userIdField] ||
            request.body?.[userIdField];
        if (!user) {
            return reply.code(401).send({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }
        // Admin sempre pode acessar
        if (user.role === 'admin') {
            return;
        }
        // Ou precisa ser owner do recurso
        if (user.userId !== resourceUserId) {
            return reply.code(403).send({
                error: 'Forbidden',
                message: 'You can only access your own resources',
            });
        }
    };
}
//# sourceMappingURL=rbac.middleware.js.map