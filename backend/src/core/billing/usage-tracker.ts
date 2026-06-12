import { eq, sql } from 'drizzle-orm';
import { db } from '../../shared/database/db.js';
import { tenantUsage } from '../../shared/database/schema/billing.js';

async function ensureUsageRecord(tenantId: string): Promise<void> {
  await db.insert(tenantUsage).values({
    tenantId,
    projectsCount: 0,
    storageBytes: 0,
    usersCount: 0,
    scenariosCount: 0,
  }).onConflictDoNothing();
}

export async function incrementProjectCount(tenantId: string, delta = 1): Promise<void> {
  await ensureUsageRecord(tenantId);
  await db
    .update(tenantUsage)
    .set({
      projectsCount: sql<number>`${tenantUsage.projectsCount} + ${delta}`,
      updatedAt: new Date(),
    })
    .where(eq(tenantUsage.tenantId, tenantId));
}

export async function incrementStorageBytes(tenantId: string, bytes: number): Promise<void> {
  await ensureUsageRecord(tenantId);
  await db
    .update(tenantUsage)
    .set({
      storageBytes: sql<number>`${tenantUsage.storageBytes} + ${bytes}`,
      updatedAt: new Date(),
    })
    .where(eq(tenantUsage.tenantId, tenantId));
}

export async function incrementUserCount(tenantId: string, delta = 1): Promise<void> {
  await ensureUsageRecord(tenantId);
  await db
    .update(tenantUsage)
    .set({
      usersCount: sql<number>`${tenantUsage.usersCount} + ${delta}`,
      updatedAt: new Date(),
    })
    .where(eq(tenantUsage.tenantId, tenantId));
}

export async function incrementScenarioCount(tenantId: string, delta = 1): Promise<void> {
  await ensureUsageRecord(tenantId);
  await db
    .update(tenantUsage)
    .set({
      scenariosCount: sql<number>`${tenantUsage.scenariosCount} + ${delta}`,
      updatedAt: new Date(),
    })
    .where(eq(tenantUsage.tenantId, tenantId));
}
