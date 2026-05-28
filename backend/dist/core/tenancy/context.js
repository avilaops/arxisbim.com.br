import jwt from 'jsonwebtoken';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { tenants } from '../../shared/database/schema/tenants.js';
// Database connection (singleton)
let dbInstance = null;
function getDb() {
    if (!dbInstance) {
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL not configured');
        }
        const client = postgres(process.env.DATABASE_URL);
        dbInstance = drizzle(client, { schema: { tenants } });
    }
    return dbInstance;
}
// Tenant cache (in-memory, expires after 5 minutes)
const tenantCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
function getCachedTenant(tenantId) {
    const cached = tenantCache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.context;
    }
    tenantCache.delete(tenantId);
    return null;
}
function cacheTenant(tenantId, context) {
    tenantCache.set(tenantId, {
        context,
        expiresAt: Date.now() + CACHE_TTL,
    });
}
// =====================================
// TENANT MIDDLEWARE
// =====================================
export async function extractTenantContext(request) {
    // Extract tenant from header, subdomain, or JWT
    const tenantId = request.headers['x-tenant-id'] ||
        extractTenantFromSubdomain(request.hostname) ||
        extractTenantFromJWT(request.headers.authorization);
    if (!tenantId) {
        return null;
    }
    // Check cache first
    const cached = getCachedTenant(tenantId);
    if (cached) {
        return cached;
    }
    try {
        const db = getDb();
        // Fetch tenant from database
        const [tenant] = await db
            .select()
            .from(tenants)
            .where(eq(tenants.tenantId, tenantId))
            .limit(1);
        if (!tenant || !tenant.isActive) {
            return null;
        }
        // Map database tenant to TenantContext
        const subscription = tenant.subscription || {};
        const context = {
            tenantId: tenant.tenantId,
            tenantName: tenant.name,
            plan: subscription.plan || 'free',
            features: {
                vrEnabled: subscription.vrEnabled ?? false,
                arEnabled: subscription.arEnabled ?? false,
                federationEnabled: subscription.federationEnabled ?? false,
                maxUsers: subscription.maxUsers,
                maxProjects: subscription.maxProjects,
                maxStorageGB: subscription.maxStorageGB,
            },
        };
        // Cache the result
        cacheTenant(tenantId, context);
        return context;
    }
    catch (error) {
        console.error('Error fetching tenant context:', error);
        return null;
    }
}
function extractTenantFromSubdomain(hostname) {
    // Extract tenant from subdomain: acme.arxisvr.com → acme
    const parts = hostname.split('.');
    if (parts.length >= 3) {
        return parts[0];
    }
    return null;
}
function extractTenantFromJWT(authHeader) {
    if (!authHeader?.startsWith('Bearer ')) {
        return null;
    }
    try {
        const token = authHeader.substring(7);
        // Decode without verifying (just to extract tenant claim)
        // The signature will be verified by auth middleware
        const decoded = jwt.decode(token);
        return decoded?.tenantId || null;
    }
    catch {
        return null;
    }
}
// =====================================
// TENANT VALIDATION
// =====================================
export function validateTenantAccess(tenant, feature) {
    switch (feature) {
        case 'vr':
            return tenant.features.vrEnabled;
        case 'ar':
            return tenant.features.arEnabled;
        case 'federation':
            return tenant.features.federationEnabled;
        default:
            return true;
    }
}
export function checkTenantLimits(tenant, resource, current) {
    switch (resource) {
        case 'users':
            return tenant.features.maxUsers ? current < tenant.features.maxUsers : true;
        case 'projects':
            return tenant.features.maxProjects ? current < tenant.features.maxProjects : true;
        case 'storage':
            return tenant.features.maxStorageGB ? current < tenant.features.maxStorageGB : true;
        default:
            return true;
    }
}
//# sourceMappingURL=context.js.map