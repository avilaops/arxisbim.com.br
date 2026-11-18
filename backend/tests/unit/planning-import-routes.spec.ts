import Fastify from 'fastify';
import { it, expect, vi, beforeEach } from 'vitest';
import { createPlanningImportRoutes } from '../../src/modules/scheduling/planning-import-workflow.routes.js';
import { createBudgetReportRoutes } from '../../src/modules/costs/budget-report.routes.js';
const identity = vi.hoisted(() => ({ role: 'user', tenantId: 'test' }));
vi.mock('../../src/core/auth/middleware.js', () => ({
  authenticateRequest: async (request: any) => {
    request.user = identity;
  },
}));
beforeEach(() => {
  identity.role = 'user';
  identity.tenantId = 'test';
});
it('rejects viewer writes before database access', async () => {
  identity.role = 'viewer';
  const sql: any = vi.fn();
  const app = Fastify();
  await app.register(createPlanningImportRoutes(sql));
  try {
    const response = await app.inject({
      method: 'POST',
      url: '/projects/11111111-1111-4111-8111-111111111111/planning-import/apply',
      payload: {},
    });
    expect(response.statusCode).toBe(403);
    expect(sql).not.toHaveBeenCalled();
  } finally {
    await app.close();
  }
});
it('rejects invalid import and report identifiers without querying the database', async () => {
  const sql: any = vi.fn(),
    app = Fastify();
  await app.register(createPlanningImportRoutes(sql));
  await app.register(createBudgetReportRoutes(sql));
  try {
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/projects/bad/planning-import/preview',
          payload: {},
        })
      ).statusCode
    ).toBe(400);
    expect((await app.inject('/scenarios/bad/budget-report.xlsx')).statusCode).toBe(400);
    expect(sql).not.toHaveBeenCalled();
  } finally {
    await app.close();
  }
});
it('denies a report outside the authenticated organization', async () => {
  const sql: any = vi.fn(async () => []);
  sql.begin = async (fn: any) => fn(sql);
  const app = Fastify();
  await app.register(createBudgetReportRoutes(sql));
  try {
    expect(
      (await app.inject('/scenarios/11111111-1111-4111-8111-111111111111/budget-report')).statusCode
    ).toBe(404);
  } finally {
    await app.close();
  }
});
