/**
 * Enforcement de limites por plano (billing).
 *
 * Os limites vêm de BILLING_PLANS (billing.plans.ts). O plano do tenant vem da
 * billing_subscriptions (default 'free' quando não há assinatura). Limite -1 =
 * ilimitado. Erros são 402 Payment Required.
 */
import { and, count, eq } from 'drizzle-orm';
import { db } from '../../shared/database/db.js';
import { billingSubscriptions } from '../../shared/database/schema/billing.js';
import { projects } from '../../shared/database/schema/projects.js';
import { memberships } from '../../shared/database/schema/workspaces.js';
import { BILLING_PLANS, normalizePlan } from '../../modules/billing/billing.plans.js';
import type { BillingPlanLimits } from '../../modules/billing/billing.plans.js';

export class PlanLimitError extends Error {
  readonly statusCode = 402;
  constructor(public readonly limitKey: string, public readonly limit: number, message: string) {
    super(message);
    this.name = 'PlanLimitError';
  }
}

export async function getTenantPlanLimits(tenantId: string): Promise<{ tier: string; limits: BillingPlanLimits }> {
  const [sub] = await db
    .select({ plan: billingSubscriptions.plan })
    .from(billingSubscriptions)
    .where(eq(billingSubscriptions.tenantId, tenantId))
    .limit(1);
  const tier = normalizePlan(sub?.plan); // default 'free'
  return { tier, limits: BILLING_PLANS[tier].limits };
}

/** Garante que o tenant pode criar mais um projeto (maxProjects). */
export async function assertCanCreateProject(tenantId: string): Promise<void> {
  const { limits } = await getTenantPlanLimits(tenantId);
  if (limits.maxProjects === -1) return;
  const [{ n }] = await db.select({ n: count() }).from(projects).where(eq(projects.tenantId, tenantId));
  if (Number(n) >= limits.maxProjects) {
    throw new PlanLimitError(
      'max_projects',
      limits.maxProjects,
      `Limite do plano atingido: ${limits.maxProjects} projeto(s). Faça upgrade para criar mais.`,
    );
  }
}

/** Garante que o tenant pode ter mais um membro (maxUsers). */
export async function assertCanAddMember(tenantId: string): Promise<void> {
  const { limits } = await getTenantPlanLimits(tenantId);
  if (limits.maxUsers === -1) return;
  const [{ n }] = await db
    .select({ n: count() })
    .from(memberships)
    .where(and(eq(memberships.tenantId, tenantId), eq(memberships.status, 'active')));
  if (Number(n) >= limits.maxUsers) {
    throw new PlanLimitError(
      'max_users',
      limits.maxUsers,
      `Limite do plano atingido: ${limits.maxUsers} membro(s). Faça upgrade para adicionar mais.`,
    );
  }
}

/** Garante que um arquivo respeita o maxFileSizeMB do plano. */
export async function assertFileWithinPlan(tenantId: string, fileSizeBytes: number): Promise<void> {
  const { limits } = await getTenantPlanLimits(tenantId);
  if (limits.maxFileSizeMB === -1) return;
  const mb = fileSizeBytes / (1024 * 1024);
  if (mb > limits.maxFileSizeMB) {
    throw new PlanLimitError(
      'max_file_size',
      limits.maxFileSizeMB,
      `Arquivo de ${mb.toFixed(0)}MB excede o limite do plano (${limits.maxFileSizeMB}MB). Faça upgrade.`,
    );
  }
}
