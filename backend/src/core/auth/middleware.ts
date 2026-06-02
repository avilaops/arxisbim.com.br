import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service.js';
import { extractTenantContext, type UserContext } from '../tenancy/context.js';
import { and, eq, gt, or } from 'drizzle-orm';
import { db } from '../../shared/database/index.js';
import { tenantEntitlements } from '../../shared/database/schema/index.js';

const authService = new AuthService();

// =====================================
// AUTHENTICATION MIDDLEWARE
// =====================================

export async function authenticateRequest(request: FastifyRequest, reply: FastifyReply): Promise<void> {
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

    const validRoles: Array<UserContext['role']> = ['owner', 'admin', 'user', 'viewer'];
    const role: UserContext['role'] = validRoles.includes(decoded.role as UserContext['role'])
      ? (decoded.role as UserContext['role'])
      : 'user';
    const permissions = Array.isArray(decoded.permissions) ? decoded.permissions : [];

    const user: UserContext = {
      userId: decoded.userId,
      email: decoded.email,
      name: '', // Will be populated from database if needed
      role,
      permissions,
      tenantId: decoded.tenantId,
    };

    (request as any).user = user;
  } catch (error) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }
}

// =====================================
// TENANCY MIDDLEWARE
// =====================================

export async function tenancyMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const tenant = await extractTenantContext(request);
  
  if (!tenant) {
    return reply.code(400).send({
      error: 'BadRequest',
      message: 'Tenant identification required. Provide X-Tenant-ID header or use tenant subdomain.',
    });
  }
  
  (request as any).tenant = tenant;
}

// =====================================
// OPTIONAL AUTH (for public endpoints)
// =====================================

export async function optionalAuth(request: FastifyRequest): Promise<void> {
  const authHeader = request.headers.authorization;
  
  if (authHeader?.startsWith('Bearer ')) {
    try {
      await authenticateRequest(request, {} as any);
    } catch {
      // Ignore auth errors for optional auth
    }
  }
}

// =====================================
// PERMISSION CHECK
// =====================================

export function requirePermission(...permissions: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as UserContext | undefined;
    
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

export function requireRole(...roles: Array<UserContext['role']>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as UserContext | undefined;
    
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

// =====================================
// ENTITLEMENT CHECK
// =====================================

export function requireEntitlement(
  entitlementKey: string,
  options?: {
    minNumericValue?: number;
  }
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as UserContext | undefined;

    if (!user) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const now = new Date();

    const [entitlement] = await db
      .select()
      .from(tenantEntitlements)
      .where(and(
        eq(tenantEntitlements.tenantId, user.tenantId),
        eq(tenantEntitlements.entitlementKey, entitlementKey),
        or(
          eq(tenantEntitlements.effectiveUntil, null as any),
          gt(tenantEntitlements.effectiveUntil, now)
        )
      ))
      .limit(1);

    if (!entitlement || entitlement.isEnabled !== true) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: `Entitlement required: ${entitlementKey}`,
      });
    }

    if (
      typeof options?.minNumericValue === 'number'
      && typeof entitlement.numericValue === 'number'
      && entitlement.numericValue < options.minNumericValue
    ) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: `Entitlement ${entitlementKey} requires minimum value ${options.minNumericValue}`,
      });
    }
  };
}
