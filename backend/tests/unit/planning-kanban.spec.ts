import { describe, it, expect, vi } from 'vitest';
import Fastify from 'fastify';
import { createPlanningKanbanRoutes } from '../../src/modules/scheduling/planning-kanban.routes.js';
vi.mock('../../src/core/auth/middleware.js', () => ({
  authenticateRequest: async (request: any) => {
    request.user = { tenantId: 'test', role: 'viewer' };
  },
}));
import {
  defaultBoard,
  changeBoard,
  readBoard,
} from '../../src/modules/scheduling/planning-kanban.service.js';
describe('Kanban de organização do planejamento', () => {
  it('nega escrita para viewer antes de acessar o banco', async () => {
    const sql: any = vi.fn();
    const app = Fastify();
    await app.register(createPlanningKanbanRoutes(sql));
    try {
      const response = await app.inject({
        method: 'PATCH',
        url: '/schedules/11111111-1111-4111-8111-111111111111/planning-board',
        payload: { revision: 0, columns: [] },
      });
      expect(response.statusCode).toBe(403);
      expect(sql).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
  it('distribui atividades sem alterar datas, progresso ou vínculos', () => {
    const board = changeBoard(
      defaultBoard(),
      { revision: 0, move: { activityId: 'a', columnId: 'structure' } },
      ['a', 'b'],
    );
    expect(board.revision).toBe(1);
    expect(board.assignments).toEqual({ a: 'structure' });
    expect(Object.keys(board).sort()).toEqual([
      'assignments',
      'columns',
      'revision',
    ]);
  });
  it('remover uma etapa devolve seus cartões para Sem etapa', () => {
    const board = changeBoard(
      defaultBoard(),
      { revision: 0, move: { activityId: 'a', columnId: 'structure' } },
      ['a'],
    );
    const changed = changeBoard(
      board,
      {
        revision: 1,
        columns: board.columns.filter((c) => c.id !== 'structure'),
      },
      ['a'],
    );
    expect(changed.assignments).toEqual({});
  });
  it('recusa revisões obsoletas, etapas inválidas e atividades alheias', () => {
    expect(() =>
      changeBoard(
        defaultBoard(),
        { revision: 2, move: { activityId: 'a', columnId: 'structure' } },
        ['a'],
      ),
    ).toThrow(/recarregue/i);
    expect(() =>
      changeBoard(
        defaultBoard(),
        { revision: 0, move: { activityId: 'foreign', columnId: 'structure' } },
        ['a'],
      ),
    ).toThrow(/atividade/i);
    expect(() =>
      changeBoard(
        defaultBoard(),
        { revision: 0, move: { activityId: 'a', columnId: 'other' } },
        ['a'],
      ),
    ).toThrow(/etapa/i);
    expect(() =>
      changeBoard(
        defaultBoard(),
        {
          revision: 0,
          columns: [
            { id: 'unassigned', name: 'Sem etapa' },
            { id: 'a', name: 'Etapa' },
            { id: 'b', name: 'ETAPA' },
          ],
        },
        ['a'],
      ),
    ).toThrow(/nomes/i);
  });
  it('limpa referências excluídas ao ler e mantém apenas o quadro do cronograma', () => {
    const board = defaultBoard();
    board.assignments = { a: 'structure', deleted: 'structure' };
    expect(
      readBoard(
        { planningKanban: { schedule: board, other: {} } },
        'schedule',
        ['a'],
      ).assignments,
    ).toEqual({ a: 'structure' });
    expect(readBoard({}, 'new', ['a']).revision).toBe(0);
  });
});
