import { describe, it, expect, vi } from 'vitest';
import { Schedule4DController, combineBoundingSpheres } from './Schedule4DController';
import type { ConstructionTask } from './SimulationEngine';
import type { BoundingSphere } from '../MeshReference';

const tasks: ConstructionTask[] = [
  { id: 'a', name: 'Vigas', plannedStart: '2026-06-01', plannedEnd: '2026-06-11', actualStart: '2026-06-01', percentComplete: 50, elementIds: ['v1', 'v2'] },
  { id: 'b', name: 'Laje', plannedStart: '2026-06-01', plannedEnd: '2026-06-06', percentComplete: 10, elementIds: ['l1'] },
];

describe('combineBoundingSpheres', () => {
  it('null para vazio', () => {
    expect(combineBoundingSpheres([])).toBeNull();
  });
  it('retorna a própria esfera quando há só uma', () => {
    const s: BoundingSphere = { center: [1, 2, 3], radius: 5 };
    expect(combineBoundingSpheres([s])).toEqual(s);
  });
  it('mantém a maior quando uma contém a outra', () => {
    const big: BoundingSphere = { center: [0, 0, 0], radius: 10 };
    const small: BoundingSphere = { center: [1, 0, 0], radius: 2 };
    expect(combineBoundingSpheres([big, small])?.radius).toBe(10);
  });
  it('engloba duas esferas disjuntas', () => {
    const a: BoundingSphere = { center: [0, 0, 0], radius: 1 };
    const b: BoundingSphere = { center: [10, 0, 0], radius: 1 };
    const c = combineBoundingSpheres([a, b])!;
    expect(c.radius).toBeCloseTo(6, 5);
    expect(c.center[0]).toBeCloseTo(5, 5);
  });
});

describe('Schedule4DController', () => {
  function makeDeps() {
    const applied: Array<Record<string, string>> = [];
    const cursorDates: Date[] = [];
    const renderer = { applyStates: vi.fn((...args: any[]) => applied.push(args[0])) };
    const gantt = { setTasks: vi.fn(), setCursorDate: vi.fn((d: Date) => cursorDates.push(d)) };
    return { renderer, gantt, applied, cursorDates };
  }

  it('loadTasks alimenta engine+gantt e aplica estados na data inicial', () => {
    const { renderer, gantt, applied } = makeDeps();
    const ctrl = new Schedule4DController({ renderer, gantt });
    ctrl.loadTasks(tasks);

    expect(gantt.setTasks).toHaveBeenCalledWith(tasks);
    expect(renderer.applyStates).toHaveBeenCalled();
    // Data inicial = início do cronograma (01/06) → tarefas iniciando = active.
    expect(applied[0]['v1']).toBe('active');
  });

  it('onDateChanged recalcula estados e move o cursor', () => {
    const { renderer, gantt } = makeDeps();
    const ctrl = new Schedule4DController({ renderer, gantt });
    ctrl.loadTasks(tasks);

    ctrl.onDateChanged(new Date('2026-06-10T00:00:00Z'));
    const last = renderer.applyStates.mock.calls.at(-1)![0] as Record<string, string>;
    expect(last['l1']).toBe('delayed'); // laje passou do fim planejado (06) sem concluir
    expect(gantt.setCursorDate).toHaveBeenLastCalledWith(new Date('2026-06-10T00:00:00Z'));
  });

  it('setMode planned remove o atraso (baseline)', () => {
    const { renderer, gantt } = makeDeps();
    const ctrl = new Schedule4DController({ renderer, gantt });
    ctrl.loadTasks(tasks);
    ctrl.onDateChanged(new Date('2026-06-10T00:00:00Z'));
    ctrl.setMode('planned');
    const last = renderer.applyStates.mock.calls.at(-1)![0] as Record<string, string>;
    expect(last['l1']).not.toBe('delayed');
  });

  it('focusOnElements combina esferas e chama a câmera', () => {
    const { renderer, gantt } = makeDeps();
    const index = {
      getByGlobalId: (id: string) => {
        const map: Record<string, { boundingSphere: BoundingSphere }> = {
          v1: { boundingSphere: { center: [0, 0, 0], radius: 1 } },
          v2: { boundingSphere: { center: [10, 0, 0], radius: 1 } },
        };
        return map[id];
      },
    };
    const focusCamera = vi.fn();
    const ctrl = new Schedule4DController({ renderer, gantt, elementIndex: index, focusCamera });
    const sphere = ctrl.focusOnElements(['v1', 'v2'])!;
    expect(sphere.center[0]).toBeCloseTo(5, 5);
    expect(focusCamera).toHaveBeenCalledWith(sphere);
  });

  it('repassa hiddenElements ao renderer', () => {
    const { renderer, gantt } = makeDeps();
    const hidden = new Set(['x']);
    const ctrl = new Schedule4DController({ renderer, gantt, getHiddenElements: () => hidden });
    ctrl.loadTasks(tasks);
    expect(renderer.applyStates.mock.calls[0][1]).toBe(hidden);
  });
});
