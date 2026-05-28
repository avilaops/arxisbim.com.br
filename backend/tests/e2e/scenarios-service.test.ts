import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '../../src/shared/database/index.js';
import { companies, tenants, users } from '../../src/shared/database/schema/tenants.js';
import { projects } from '../../src/shared/database/schema/projects.js';
import { scenarios } from '../../src/shared/database/schema/scenarios.js';
import { ScenarioService } from '../../src/modules/scenario/scenario.service.js';
import type { ScenarioConfig } from '../../src/modules/scenario/types/index.js';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/arxisvr_test';
const sql = postgres(DATABASE_URL, { max: 1 });

const tenantId = `scenario-e2e-${randomUUID()}`;
const otherTenantId = `scenario-other-${randomUUID()}`;
const companyId = `scenario-company-${randomUUID()}`;
const otherCompanyId = `scenario-other-company-${randomUUID()}`;
let userId: string;
let projectId: string;

const config: ScenarioConfig = {
  initialPosition: { x: 0, y: 1.7, z: 5 },
  initialRotation: { pitch: 0, yaw: 180, roll: 0 },
  movementSpeed: 5,
  rotationSpeed: 90,
  crouchMultiplier: 0.5,
  sprintMultiplier: 2,
  verticalSpeed: 3,
  enableMinimap: true,
  minimapConfig: {
    width: 240,
    height: 180,
    position: 'top-right',
    zoom: 1,
    showPlayerDirection: true,
    backgroundColor: '#111827',
    borderColor: '#38bdf8',
  },
};

describe('ScenarioService - E2E persistence', () => {
  beforeAll(async () => {
    await db.insert(tenants).values([
      { tenantId, name: 'Scenario E2E Tenant', isActive: true },
      { tenantId: otherTenantId, name: 'Scenario Other Tenant', isActive: true },
    ]);

    await db.insert(companies).values([
      { companyId, tenantId, name: 'Scenario E2E Company', isActive: true },
      { companyId: otherCompanyId, tenantId: otherTenantId, name: 'Scenario Other Company', isActive: true },
    ]);

    const [user] = await db.insert(users).values({
      email: `scenario-e2e-${randomUUID()}@example.com`,
      name: 'Scenario E2E User',
      passwordHash: 'test-hash',
      tenantId,
      companyId,
      role: 'admin',
      isActive: true,
    }).returning();

    const [project] = await db.insert(projects).values({
      tenantId,
      companyId,
      name: 'Scenario E2E Project',
      status: 'active',
    }).returning();

    userId = user.id;
    projectId = project.id;
  });

  afterAll(async () => {
    await db.delete(scenarios).where(eq(scenarios.tenantId, tenantId));
    await db.delete(projects).where(eq(projects.tenantId, tenantId));
    await db.delete(users).where(eq(users.tenantId, tenantId));
    await db.delete(companies).where(eq(companies.tenantId, tenantId));
    await db.delete(companies).where(eq(companies.tenantId, otherTenantId));
    await db.delete(tenants).where(eq(tenants.tenantId, tenantId));
    await db.delete(tenants).where(eq(tenants.tenantId, otherTenantId));
    await sql.end();
  });

  it('creates, scopes, updates, teleports, lists, and deletes a scenario', async () => {
    const service = new ScenarioService();
    const scenarioId = randomUUID();

    const created = await service.createScenario(
      scenarioId,
      projectId,
      'Scenario E2E',
      config,
      'E2E scenario persistence test',
      { tenantId, createdBy: userId, presetId: 'e2e-preset' }
    );

    expect(created.id).toBe(scenarioId);
    expect(created.tenantId).toBe(tenantId);
    expect(created.createdBy).toBe(userId);

    await expect(service.getScenario(scenarioId, otherTenantId)).resolves.toBeNull();

    const fetched = await service.getScenario(scenarioId, tenantId);
    expect(fetched?.name).toBe('Scenario E2E');

    const updated = await service.updateScenarioConfig(
      scenarioId,
      { name: 'Scenario E2E Updated', description: 'Updated description', config: { movementSpeed: 8 } },
      tenantId
    );
    expect(updated?.name).toBe('Scenario E2E Updated');
    expect(updated?.description).toBe('Updated description');
    expect(updated?.config.movementSpeed).toBe(8);

    const teleported = await service.teleportPlayer(scenarioId, { x: 10, y: 2, z: -3 }, tenantId);
    expect(teleported?.player.position).toEqual({ x: 10, y: 2, z: -3 });

    const listed = await service.listScenarios(tenantId, projectId);
    expect(listed.some((scenario) => scenario.id === scenarioId)).toBe(true);

    await expect(service.deleteScenario(scenarioId, otherTenantId)).resolves.toBe(false);
    await expect(service.deleteScenario(scenarioId, tenantId)).resolves.toBe(true);
    await expect(service.getScenario(scenarioId, tenantId)).resolves.toBeNull();
  });
});
