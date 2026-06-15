import { describe, it, expect, beforeEach } from 'vitest';
import { GanttTimeline, barMetrics, computeBounds } from './GanttTimeline';
import type { ConstructionTask } from './SimulationEngine';

const tasks: ConstructionTask[] = [
  { id: 'a', name: 'Vigas P3', plannedStart: '2026-06-01', plannedEnd: '2026-06-11', actualStart: '2026-06-01', percentComplete: 50, elementIds: ['v1', 'v2'] },
  { id: 'b', name: 'Laje atrasada', plannedStart: '2026-06-01', plannedEnd: '2026-06-06', percentComplete: 10, elementIds: ['l1'] },
];

describe('computeBounds', () => {
  it('cobre min start e max end', () => {
    const b = computeBounds(tasks)!;
    expect(b.start).toBe(Date.UTC(2026, 5, 1));
    expect(b.end).toBe(Date.UTC(2026, 5, 11));
    expect(b.span).toBe(b.end - b.start);
  });
  it('null sem tarefas', () => {
    expect(computeBounds([])).toBeNull();
  });
});

describe('barMetrics', () => {
  const bounds = { start: 0, end: 100, span: 100 };
  it('calcula posição e largura percentuais', () => {
    const m = barMetrics(20, 60, bounds)!;
    expect(m.leftPct).toBe(20);
    expect(m.widthPct).toBe(40);
  });
  it('faz clamp em 0..100', () => {
    const m = barMetrics(-10, 200, bounds)!;
    expect(m.leftPct).toBe(0);
    expect(m.widthPct).toBeLessThanOrEqual(100);
  });
  it('null quando span inválido', () => {
    expect(barMetrics(0, 10, { start: 0, end: 0, span: 0 })).toBeNull();
  });
});

describe('GanttTimeline DOM', () => {
  let container: HTMLElement;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('renderiza uma linha por tarefa com barras planejada e realizada', () => {
    const g = new GanttTimeline(container);
    g.setTasks(tasks);
    const rows = container.querySelectorAll('.gantt-timeline__row');
    expect(rows).toHaveLength(2);
    expect(container.querySelectorAll('.gantt-timeline__bar--planned').length).toBe(2);
    expect(container.querySelectorAll('.gantt-timeline__bar--actual').length).toBeGreaterThanOrEqual(1);
  });

  it('marca linha atrasada na data de referência', () => {
    const g = new GanttTimeline(container);
    g.setCursorDate(new Date('2026-06-10T00:00:00Z')); // laje passou do fim planejado (06-06) sem concluir
    g.setTasks(tasks);
    const delayed = container.querySelector('.gantt-timeline__row--delayed') as HTMLElement;
    expect(delayed).not.toBeNull();
    expect(delayed.dataset.taskId).toBe('b');
  });

  it('estado vazio quando sem tarefas', () => {
    const g = new GanttTimeline(container);
    g.setTasks([]);
    expect(container.querySelector('.gantt-timeline__empty')).not.toBeNull();
  });

  it('clique no rótulo dispara onTaskClick com elementIds', () => {
    let captured: { id: string; els: string[] } | null = null;
    const g = new GanttTimeline(container, {
      onTaskClick: (id, els) => { captured = { id, els }; },
    });
    g.setTasks(tasks);
    const label = container.querySelector('[data-task-id="a"] .gantt-timeline__label') as HTMLElement;
    label.click();
    expect(captured).toEqual({ id: 'a', els: ['v1', 'v2'] });
  });

  it('cursor é posicionado conforme a data', () => {
    const g = new GanttTimeline(container);
    g.setTasks(tasks);
    g.setCursorDate(new Date(Date.UTC(2026, 5, 6))); // meio do span de 10 dias
    const cursor = container.querySelector('.gantt-timeline__cursor') as HTMLElement;
    expect(cursor.style.display).toBe('block');
    expect(parseFloat(cursor.style.left)).toBeCloseTo(50, 0);
  });
});
