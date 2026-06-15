import { describe, it, expect } from 'vitest';
import {
  computeTaskState,
  computeElementStates,
  summarizeStates,
  SimulationEngine,
  type ConstructionTask,
} from './SimulationEngine';

const D = (s: string) => new Date(`${s}T00:00:00Z`);
const t = (s: string) => D(s).getTime();

describe('computeTaskState — modo planned', () => {
  const task: ConstructionTask = {
    id: '1', name: 'Vigas', plannedStart: '2026-06-10', plannedEnd: '2026-06-20', elementIds: ['g1'],
  };
  it('not_started antes do início', () => {
    expect(computeTaskState(task, t('2026-06-05'), 'planned')).toBe('not_started');
  });
  it('active durante a janela', () => {
    expect(computeTaskState(task, t('2026-06-15'), 'planned')).toBe('active');
  });
  it('complete após o fim', () => {
    expect(computeTaskState(task, t('2026-06-25'), 'planned')).toBe('complete');
  });
  it('nunca marca delayed no baseline planejado', () => {
    expect(computeTaskState(task, t('2026-06-19'), 'planned')).not.toBe('delayed');
  });
});

describe('computeTaskState — modo actual / atraso', () => {
  it('delayed quando passou do fim planejado sem concluir', () => {
    const task: ConstructionTask = {
      id: '1', name: 'Laje', plannedStart: '2026-06-10', plannedEnd: '2026-06-20',
      actualStart: '2026-06-12', percentComplete: 40, elementIds: ['g1'],
    };
    expect(computeTaskState(task, t('2026-06-25'), 'actual')).toBe('delayed');
  });

  it('complete quando actualEnd alcançado', () => {
    const task: ConstructionTask = {
      id: '1', name: 'Laje', plannedStart: '2026-06-10', plannedEnd: '2026-06-20',
      actualStart: '2026-06-12', actualEnd: '2026-06-18', percentComplete: 100, elementIds: ['g1'],
    };
    expect(computeTaskState(task, t('2026-06-19'), 'actual')).toBe('complete');
  });

  it('delayed quando deveria ter começado pelo plano mas não começou', () => {
    const task: ConstructionTask = {
      id: '1', name: 'Pilar', plannedStart: '2026-06-10', plannedEnd: '2026-06-20',
      actualStart: null, percentComplete: 0, elementIds: ['g1'],
    };
    expect(computeTaskState(task, t('2026-06-15'), 'actual')).toBe('delayed');
  });

  it('active quando dentro do prazo e iniciada', () => {
    const task: ConstructionTask = {
      id: '1', name: 'Pilar', plannedStart: '2026-06-10', plannedEnd: '2026-06-20',
      actualStart: '2026-06-10', percentComplete: 50, elementIds: ['g1'],
    };
    expect(computeTaskState(task, t('2026-06-15'), 'actual')).toBe('active');
  });
});

describe('computeElementStates', () => {
  const tasks: ConstructionTask[] = [
    { id: 'a', name: 'Vigas P3', plannedStart: '2026-06-10', plannedEnd: '2026-06-20', actualStart: '2026-06-10', percentComplete: 60, elementIds: ['v1', 'v2'] },
    { id: 'b', name: 'Pilar P0', plannedStart: '2026-06-01', plannedEnd: '2026-06-05', actualEnd: '2026-06-05', percentComplete: 100, elementIds: ['p1'] },
    { id: 'c', name: 'Laje atrasada', plannedStart: '2026-06-01', plannedEnd: '2026-06-08', percentComplete: 20, elementIds: ['l1'] },
  ];

  it('mapeia cada elemento ao estado da tarefa na data', () => {
    const states = computeElementStates(tasks, D('2026-06-15'), 'actual');
    expect(states['v1']).toBe('active');
    expect(states['v2']).toBe('active');
    expect(states['p1']).toBe('complete');
    expect(states['l1']).toBe('delayed');
  });

  it('prioriza delayed/active sobre complete em elemento compartilhado', () => {
    const shared: ConstructionTask[] = [
      { id: 'x', name: 'concluída', plannedStart: '2026-06-01', plannedEnd: '2026-06-05', actualEnd: '2026-06-05', percentComplete: 100, elementIds: ['s1'] },
      { id: 'y', name: 'atrasada', plannedStart: '2026-06-01', plannedEnd: '2026-06-08', percentComplete: 10, elementIds: ['s1'] },
    ];
    const states = computeElementStates(shared, D('2026-06-15'), 'actual');
    expect(states['s1']).toBe('delayed');
  });
});

describe('summarizeStates', () => {
  it('conta estados', () => {
    const stats = summarizeStates({ a: 'active', b: 'active', c: 'delayed', d: 'complete', e: 'not_started' });
    expect(stats).toMatchObject({ active: 2, delayed: 1, complete: 1, notStarted: 1 });
  });
});

describe('SimulationEngine', () => {
  const tasks: ConstructionTask[] = [
    { id: 'a', name: 'T1', plannedStart: '2026-06-10', plannedEnd: '2026-06-20', actualStart: '2026-06-10', percentComplete: 50, elementIds: ['g1'] },
    { id: 'b', name: 'T2', plannedStart: '2026-06-01', plannedEnd: '2026-06-30', actualEnd: '2026-06-09', percentComplete: 100, elementIds: ['g2'] },
  ];

  it('computeAt e statsAt respeitam o modo', () => {
    const eng = new SimulationEngine();
    eng.setTasks(tasks);
    eng.setMode('actual');
    const states = eng.computeAt(D('2026-06-15'));
    expect(states['g1']).toBe('active');
    expect(states['g2']).toBe('complete');
    expect(eng.statsAt(D('2026-06-15')).complete).toBe(1);
  });

  it('getBounds cobre min start e max end', () => {
    const eng = new SimulationEngine();
    eng.setTasks(tasks);
    const b = eng.getBounds()!;
    expect(b.start.getTime()).toBe(t('2026-06-01'));
    expect(b.end.getTime()).toBe(t('2026-06-30'));
  });

  it('getBounds null sem tarefas', () => {
    expect(new SimulationEngine().getBounds()).toBeNull();
  });
});
