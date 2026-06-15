import { describe, it, expect } from 'vitest';
import { activitiesToConstructionTasks, type ScheduleActivityDTO } from './scheduling.service';

describe('activitiesToConstructionTasks', () => {
  it('mapeia DTO da API para ConstructionTask, normalizando percent string e elements', () => {
    const dto: ScheduleActivityDTO[] = [
      {
        id: 'a1', name: 'Vigas', plannedStart: '2026-06-01', plannedEnd: '2026-06-10',
        actualStart: '2026-06-02', actualEnd: null, percentComplete: '45.50',
        elements: [{ globalId: 'g1' }, { globalId: 'g2', stateDuring: 'active' }],
      },
    ];
    const [task] = activitiesToConstructionTasks(dto);
    expect(task).toEqual({
      id: 'a1', name: 'Vigas', plannedStart: '2026-06-01', plannedEnd: '2026-06-10',
      actualStart: '2026-06-02', actualEnd: null, percentComplete: 45.5, elementIds: ['g1', 'g2'],
    });
  });

  it('usa 0 e [] quando campos opcionais ausentes', () => {
    const [task] = activitiesToConstructionTasks([
      { id: 'a', name: 'X', plannedStart: '2026-06-01', plannedEnd: '2026-06-02' },
    ]);
    expect(task.percentComplete).toBe(0);
    expect(task.elementIds).toEqual([]);
    expect(task.actualStart).toBeNull();
  });
});
