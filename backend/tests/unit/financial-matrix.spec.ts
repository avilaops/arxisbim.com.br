import { describe, it, expect, vi } from 'vitest';
import {
  buildFinancialMatrix,
  FinancialMatrixService,
} from '../../src/modules/scenarios/financial-matrix.service.js';
import { generateMatrixPdf } from '../../src/modules/scenarios/financial-matrix-pdf.js';
import Fastify from 'fastify';
import { registerFinancialMatrixRoutes } from '../../src/modules/scenarios/financial-matrix.routes.js';
vi.mock('../../src/core/auth/middleware.js', () => ({
  authenticateRequest: async (request: any) => {
    request.user = { tenantId: 'tenant' };
  },
}));

const detail = (
  id: string,
  cost: string,
  days: number | null,
  priced = 3,
  total = 3,
) => ({
  id,
  name: id,
  totalCost: priced ? cost : null,
  durationDays: days,
  completionDate: days == null ? null : '2026-12-20',
  modelElements: total,
  pricedElements: priced,
  costLinks: priced,
  issues: [] as string[],
});
describe('matriz financeira', () => {
  it('calcula três alternativas e deltas decimais contra a referência explícita', () => {
    const matrix = buildFinancialMatrix(
      [
        detail('a', '100.10', 10),
        detail('b', '150.30', 15),
        detail('c', '90.05', 12),
      ],
      'a',
    );
    expect(
      matrix.scenarios.map((s) => [s.id, s.deltaCost, s.deltaDays]),
    ).toEqual([
      ['a', '0.00', 0],
      ['b', '50.20', 5],
      ['c', '-10.05', 2],
    ]);
    expect(matrix.baselineId).toBe('a');
    expect(matrix.recommendation.winningScenarioIds).toEqual(['a']);
  });
  it('não pontua ausência de orçamento/prazo e mantém deltas desconhecidos nulos', () => {
    const matrix = buildFinancialMatrix(
      [
        detail('a', '100', 10),
        detail('b', '0', null, 0),
        detail('c', '90', null),
      ],
      'b',
    );
    expect(matrix.scenarios[1]).toMatchObject({
      score: null,
      rank: null,
      deltaCost: null,
      deltaDays: null,
    });
    expect(matrix.scenarios[2]).toMatchObject({
      score: null,
      deltaCost: null,
      deltaDays: null,
    });
    expect(matrix.recommendation.winningScenarioIds).toEqual([]);
  });
  it('preserva empates e sinaliza cobertura física diferente sem tratá-la como completude', () => {
    const matrix = buildFinancialMatrix(
      [detail('a', '100', 10, 2, 4), detail('b', '100', 10, 3, 4)],
      'a',
    );
    expect(matrix.recommendation.winningScenarioIds).toEqual(['a', 'b']);
    expect(matrix.scenarios.map((s) => s.rank)).toEqual([1, 1]);
    expect(matrix.warnings.join(' ')).toMatch(/cobertura/i);
  });
  it('valida referência e conjunto antes de acessar o banco', async () => {
    const sql: any = vi.fn();
    const service = new FinancialMatrixService(sql);
    await expect(
      service.compare('tenant', 'project', ['a', 'a'], 'a'),
    ).rejects.toMatchObject({ statusCode: 400 });
    await expect(
      service.compare('tenant', 'project', ['a', 'b'], 'c'),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(sql).not.toHaveBeenCalled();
  });
  it('nega conjunto de outro tenant/projeto antes do cálculo', async () => {
    const sql: any = vi.fn(async () => []);
    await expect(
      new FinancialMatrixService(sql).compare(
        'tenant',
        'project',
        ['a', 'b'],
        'a',
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(sql.mock.calls[0][0].join(' ')).toContain('tenant_id');
  });
  it('gera PDF real com a matriz e as ressalvas', async () => {
    const matrix = buildFinancialMatrix(
      [
        detail('a', '100', 10),
        detail('b', '150', 12),
        detail('c', '0', null, 0),
      ],
      'a',
    );
    const pdf = await generateMatrixPdf({
      ...matrix,
      projectName: 'Projeto sintético',
    });
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1500);
  });
  it('recusa exportação que diverge da revisão exibida', async () => {
    const a = '11111111-1111-4111-8111-111111111111',
      b = '22222222-2222-4222-8222-222222222222';
    const matrix = buildFinancialMatrix(
      [detail(a, '100', 10), detail(b, '150', 12)],
      a,
    );
    const spy = vi
      .spyOn(FinancialMatrixService.prototype, 'compare')
      .mockResolvedValue(matrix);
    const app = Fastify();
    registerFinancialMatrixRoutes(app, {} as any);
    try {
      const response = await app.inject({
        method: 'POST',
        url: `/projects/${a}/financial-matrix/pdf`,
        payload: {
          scenarioIds: [a, b],
          baselineId: a,
          revision: '0'.repeat(64),
        },
      });
      expect(response.statusCode).toBe(409);
      expect(response.json().error).toContain('mudaram');
      const invalid = await app.inject({
        method: 'POST',
        url: `/projects/${a}/financial-matrix`,
        payload: { scenarioIds: [a], baselineId: a },
      });
      expect(invalid.statusCode).toBe(400);
      const upper='ABCDEFAB-ABCD-4ABC-8ABC-ABCDEFABCDEF';
      await app.inject({method:'POST',url:`/projects/${upper}/financial-matrix`,payload:{scenarioIds:[upper,b],baselineId:upper}});
      expect(spy).toHaveBeenLastCalledWith('tenant',upper.toLowerCase(),[upper.toLowerCase(),b],upper.toLowerCase());
    } finally {
      spy.mockRestore();
      await app.close();
    }
  });
});
