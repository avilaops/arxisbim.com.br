import { describe, it, expect } from 'vitest';
import { constructionTasksToScheduleData } from './mountSchedule4D';
import type { ConstructionTask } from './SimulationEngine';

const tasks: ConstructionTask[] = [
  { id: 'a', name: 'Vigas', plannedStart: '2026-06-01', plannedEnd: '2026-06-11', elementIds: ['v1', 'v2'] },
  { id: 'b', name: 'Laje', plannedStart: '2026-06-05', plannedEnd: '2026-06-20', elementIds: ['l1'] },
];

describe('constructionTasksToScheduleData', () => {
  it('converte tarefas e calcula limites do projeto', () => {
    const data = constructionTasksToScheduleData(tasks, 'Obra X');
    expect(data.projectName).toBe('Obra X');
    expect(data.tasks).toHaveLength(2);
    expect(data.startDate.getTime()).toBe(Date.UTC(2026, 5, 1));
    expect(data.endDate.getTime()).toBe(Date.UTC(2026, 5, 20));
  });

  it('mapeia ifcGuids e duração em dias', () => {
    const data = constructionTasksToScheduleData(tasks);
    expect(data.tasks[0].ifcGuids).toEqual(['v1', 'v2']);
    expect(data.tasks[0].duration).toBe(10); // 01→11 jun
    expect(data.tasks[0].status).toBe('not-started');
  });

  it('lida com lista vazia', () => {
    const data = constructionTasksToScheduleData([]);
    expect(data.tasks).toHaveLength(0);
    expect(data.startDate).toBeInstanceOf(Date);
  });
});
