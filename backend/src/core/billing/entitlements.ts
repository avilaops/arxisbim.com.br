/**
 * Entitlements resolution: reads from tenant_entitlements table.
 * Fallback: seed from plan if entitlement doesn't exist.
 */
import { eq } from 'drizzle-orm';
import { db } from '../../shared/database/db.js';
import { billingSubscriptions, tenantEntitlements } from '../../shared/database/schema/billing.js';
import { BILLING_PLANS, normalizePlan } from '../../modules/billing/billing.plans.js';

export interface TenantEntitlements {
  maxProjects: number;
  maxStorageGB: number;
  maxUsers: number;
  maxScenarios: number;
  maxFileSizeMB: number;
}

/** Read tenant entitlements from DB, fallback to plan defaults. */
export async function getTenantEntitlements(tenantId: string): Promise<TenantEntitlements> {
  // Get plan first
  const [sub] = await db
    .select({ plan: billingSubscriptions.plan })
    .from(billingSubscriptions)
    .where(eq(billingSubscriptions.tenantId, tenantId))
    .limit(1);

  const planTier = normalizePlan(sub?.plan); // default 'free'
  const planLimits = BILLING_PLANS[planTier].limits;

  // Read overrides from tenant_entitlements
  const rows = await db
    .select({ key: tenantEntitlements.entitlementKey, value: tenantEntitlements.numericValue })
    .from(tenantEntitlements)
    .where(eq(tenantEntitlements.tenantId, tenantId));

  const overrides = Object.fromEntries(rows.map(r => [r.key, r.value]));

  // Return: override if exists, else plan default. -1 = unlimited.
  return {
    maxProjects: overrides['max_projects'] ?? planLimits.maxProjects,
    maxStorageGB: overrides['max_storage_gb'] ?? planLimits.maxStorageGB,
    maxUsers: overrides['max_users'] ?? planLimits.maxUsers,
    maxScenarios: overrides['max_scenarios'] ?? 0, // not in BILLING_PLANS yet
    maxFileSizeMB: overrides['max_file_size_mb'] ?? planLimits.maxFileSizeMB,
  };
}
