import { AuthService } from './auth.service.js';
import { extractTenantContext } from '../tenancy/context.js';
const authService = new AuthService();
// =====================================
// AUTHENTICATION MIDDLEWARE
// =====================================
export async function authenticateRequest(request, reply) {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return reply.code(401).send({
            error: 'Unauthorized',
            message: 'Missing or invalid authorization header',
        });
    }
    const token = authHeader.substring(7);
    try {
        const decoded = authService.verifyToken(token);
        const validRoles = ['owner', 'admin', 'user', 'viewer'];
        const role = validRoles.includes(decoded.role)
            ? decoded.role
            : 'user';
        const permissions = Array.isArray(decoded.permissions) ? decoded.permissions : [];
        const user = {
            userId: decoded.userId,
            email: decoded.email,
            name: '', // Will be populated from database if needed
            role,
            permissions,
            tenantId: decoded.tenantId,
        };
        request.user = user;
    }
    catch (error) {
        return reply.code(401).send({
            error: 'Unauthorized',
            message: 'Invalid or expired token',
        });
    }
}
// =====================================
// TENANCY MIDDLEWARE
// =====================================
export async function tenancyMiddleware(request, reply) {
    const tenant = await extractTenantContext(request);
    if (!tenant) {
        return reply.code(400).send({
            error: 'BadRequest',
            message: 'Tenant identification required. Provide X-Tenant-ID header or use tenant subdomain.',
        });
    }
    request.tenant = tenant;
}
// =====================================
// OPTIONAL AUTH (for public endpoints)
// =====================================
export async function optionalAuth(request) {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        try {
            await authenticateRequest(request, {});
        }
        catch {
            // Ignore auth errors for optional auth
        }
    }
}
// =====================================
// PERMISSION CHECK
// =====================================
export function requirePermission(...permissions) {
    return async (request, reply) => {
        const user = request.user;
        if (!user) {
            return reply.code(401).send({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }
        // Admin has all permissions
        if (user.role === 'owner' || user.role === 'admin' || user.permissions.includes('*')) {
            return;
        }
        const hasPermission = permissions.some(perm => user.permissions.includes(perm));
        if (!hasPermission) {
            return reply.code(403).send({
                error: 'Forbidden',
                message: `Required permissions: ${permissions.join(', ')}`,
            });
        }
    };
}
// =====================================
// ROLE CHECK
// =====================================
export function requireRole(...roles) {
    return async (request, reply) => {
        const user = request.user;
        if (!user) {
            return reply.code(401).send({
                error: 'Unauthorized',
                message: 'Authentication required',
            });
        }
        if (!roles.includes(user.role)) {
            return reply.code(403).send({
                error: 'Forbidden',
                message: `Required role: ${roles.join(' or ')}`,
            });
        }
    };
}
//# sourceMappingURL=middleware.js.map