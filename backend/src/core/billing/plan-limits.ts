/**
 * Enforcement de limites por plano (billing).
 *
 * Os limites vêm de BILLING_PLANS (billing.plans.ts). O plano do tenant vem da
 * billing_subscriptions (default 'free' quando não há assinatura). Limite -1 =
 * ilimitado. Erros são 403 Forbidden com estrutura { code, resource, limit, current }.
 */
import { and, eq, sql } from 'drizzle-orm';
import { db, withTenant } from '../../shared/database/db.js';
import { billingSubscriptions, tenantUsage } from '../../shared/database/schema/billing.js';
import { projects } from '../../shared/database/schema/projects.js';
import { scenarios } from '../../shared/database/schema/scenarios.js';
import { memberships } from '../../shared/database/schema/workspaces.js';
import { getTenantEntitlements as getEntitlements } from './entitlements.js';
import { BILLING_PLANS, normalizePlan } from '../../modules/billing/billing.plans.js';
import type { BillingPlanLimits } from '../../modules/billing/billing.plans.js';

export class PlanLimitError extends Error {
  readonly statusCode = 403;
  constructor(
    public readonly code: string,
    public readonly resource: string,
    public readonly limit: number,
    public readonly current: number,
    message: string,
  ) {
    super(message);
    this.name = 'PlanLimitError';
  }
}

/**
 * Erro de assinatura inativa (pagamento pendente/suspensa). 402 Payment Required,
 * distinto do 403 de limite de plano: aqui o problema é o estado da assinatura,
 * não a quantidade de recursos. Leitura permanece liberada (contas são permanentes);
 * apenas criação de novos recursos é bloqueada.
 */
export class SubscriptionInactiveError extends Error {
  readonly statusCode = 402;
  readonly code = 'SUBSCRIPTION_INACTIVE';
  constructor(public readonly status: string, message: string) {
    super(message);
    this.name = 'SubscriptionInactiveError';
  }
}

// Estados que bloqueiam criação de novos recursos. 'active', 'trialing' e
// 'grace_period' permanecem liberados.
const BLOCKED_SUBSCRIPTION_STATUSES = new Set([
  'past_due', 'unpaid', 'suspended', 'canceled', 'incomplete',
]);

/**
 * Garante que a assinatura do tenant está em estado que permite criar recursos.
 * Sem assinatura = default free liberado. Não afeta leitura/listagem.
 */
export async function assertSubscriptionActive(tenantId: string): Promise<void> {
  const [sub] = await db
    .select({ status: billingSubscriptions.status })
    .from(billingSubscriptions)
    .where(eq(billingSubscriptions.tenantId, tenantId))
    .limit(1);

  if (!sub) return;
  if (BLOCKED_SUBSCRIPTION_STATUSES.has(sub.status)) {
    throw new SubscriptionInactiveError(
      sub.status,
      `Assinatura ${sub.status}: regularize o pagamento para criar novos recursos. Seus dados continuam acessíveis.`,
    );
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
  await assertSubscriptionActive(tenantId);
  const entitlements = await getEntitlements(tenantId);
  if (entitlements.maxProjects === -1) return;

  // Ensure usage record exists
  await db.insert(tenantUsage).values({
    tenantId,
    projectsCount: 0,
    storageBytes: 0,
    usersCount: 0,
    scenariosCount: 0,
  }).onConflictDoNothing();

  const [usage] = await db
    .select({ count: tenantUsage.projectsCount })
    .from(tenantUsage)
    .where(eq(tenantUsage.tenantId, tenantId));

  const current = usage?.count ?? 0;
  if (current >= entitlements.maxProjects) {
    throw new PlanLimitError(
      'PLAN_LIMIT_REACHED',
      'projects',
      entitlements.maxProjects,
      current,
      `Limite do plano atingido: ${entitlements.maxProjects} projeto(s). Faça upgrade para criar mais.`,
    );
  }
}

/** Garante que o tenant pode ter mais um membro (maxUsers). */
export async function assertCanAddMember(tenantId: string): Promise<void> {
  await assertSubscriptionActive(tenantId);
  const entitlements = await getEntitlements(tenantId);
  if (entitlements.maxUsers === -1) return;

  // Ensure usage record exists
  await db.insert(tenantUsage).values({
    tenantId,
    projectsCount: 0,
    storageBytes: 0,
    usersCount: 0,
    scenariosCount: 0,
  }).onConflictDoNothing();

  const [usage] = await db
    .select({ count: tenantUsage.usersCount })
    .from(tenantUsage)
    .where(eq(tenantUsage.tenantId, tenantId));

  const current = usage?.count ?? 0;
  if (current >= entitlements.maxUsers) {
    throw new PlanLimitError(
      'PLAN_LIMIT_REACHED',
      'users',
      entitlements.maxUsers,
      current,
      `Limite do plano atingido: ${entitlements.maxUsers} membro(s). Faça upgrade para adicionar mais.`,
    );
  }
}

/** Garante que um arquivo respeita o maxFileSizeMB do plano. */
export async function assertFileWithinPlan(tenantId: string, fileSizeBytes: number): Promise<void> {
  const entitlements = await getEntitlements(tenantId);
  if (entitlements.maxFileSizeMB === -1) return;
  const mb = fileSizeBytes / (1024 * 1024);
  if (mb > entitlements.maxFileSizeMB) {
    throw new PlanLimitError(
      'PLAN_LIMIT_REACHED',
      'file_size',
      entitlements.maxFileSizeMB,
      Math.ceil(mb),
      `Arquivo de ${mb.toFixed(0)}MB excede o limite do plano (${entitlements.maxFileSizeMB}MB). Faça upgrade.`,
    );
  }
}

/** Garante que o tenant possui espaço em disco disponível no plano (maxStorageGB). */
export async function assertStorageWithinPlan(tenantId: string, newFileSizeBytes: number): Promise<void> {
  await assertSubscriptionActive(tenantId);
  const entitlements = await getEntitlements(tenantId);
  if (entitlements.maxStorageGB === -1) return;

  // Ensure usage record exists
  await db.insert(tenantUsage).values({
    tenantId,
    projectsCount: 0,
    storageBytes: 0,
    usersCount: 0,
    scenariosCount: 0,
  }).onConflictDoNothing();

  const [usage] = await db
    .select({ bytes: tenantUsage.storageBytes })
    .from(tenantUsage)
    .where(eq(tenantUsage.tenantId, tenantId));

  const maxBytes = entitlements.maxStorageGB * 1024 * 1024 * 1024;
  const currentBytes = usage?.bytes ?? 0;
  if (currentBytes + newFileSizeBytes > maxBytes) {
    const currentGb = currentBytes / (1024 * 1024 * 1024);
    throw new PlanLimitError(
      'PLAN_LIMIT_REACHED',
      'storage',
      entitlements.maxStorageGB,
      Math.ceil(currentGb),
      `Limite de armazenamento atingido: ${currentGb.toFixed(2)}GB de ${entitlements.maxStorageGB}GB utilizados. Faça upgrade para expandir o espaço.`,
    );
  }
}

/** Garante que o tenant pode criar mais um cenário no projeto (maxScenarios por projeto). */
export async function assertCanCreateScenario(tenantId: string, projectId: string): Promise<void> {
  await assertSubscriptionActive(tenantId);
  const entitlements = await getEntitlements(tenantId);
  if (entitlements.maxScenarios === -1) return;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(scenarios)
    .where(
      and(
        eq(scenarios.projectId, projectId),
        eq(scenarios.tenantId, tenantId),
        sql`deleted_at IS NULL`
      )
    );

  const current = countResult?.count ?? 0;
  if (current >= entitlements.maxScenarios) {
    throw new PlanLimitError(
      'PLAN_LIMIT_REACHED',
      'scenarios',
      entitlements.maxScenarios,
      current,
      `Limite do plano atingido: ${entitlements.maxScenarios} cenário(s) por projeto. Faça upgrade para criar mais.`,
    );
  }
}

