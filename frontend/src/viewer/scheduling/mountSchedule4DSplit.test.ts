import { describe, it, expect } from 'vitest';
import { computeSplitFrames } from './mountSchedule4DSplit';
import type { ConstructionTask } from './SimulationEngine';

const tasks: ConstructionTask[] = [
  // Atrasada: passou do fim planejado (06) sem concluir.
  { id: 'a', name: 'Laje', plannedStart: '2026-06-01', plannedEnd: '2026-06-06', percentComplete: 10, elementIds: ['l1'] },
];

describe('computeSplitFrames', () => {
  it('lado planejado nunca marca atraso; lado realizado marca', () => {
    const { planned, actual } = computeSplitFrames(tasks, new Date('2026-06-10T00:00:00Z'));
    // No baseline planejado, em 10/06 a laje já passou do fim → complete.
    expect(planned['l1']).toBe('complete');
    // No realizado, sem conclusão real → delayed.
    expect(actual['l1']).toBe('delayed');
  });

  it('antes do início ambos não iniciados', () => {
    const { planned, actual } = computeSplitFrames(tasks, new Date('2026-05-01T00:00:00Z'));
    expect(planned['l1']).toBe('not_started');
    expect(actual['l1']).toBe('not_started');
  });
});
