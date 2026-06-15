/**
 * GanttTimeline (S35)
 *
 * Gráfico de Gantt interativo, sincronizado com o visualizador 3D. Renderiza uma
 * linha por tarefa com a barra Planejada e a barra Realizada sobrepostas, um
 * cursor vertical na data simulada, e dispara callbacks para:
 *   - onTaskClick(taskId, elementIds): foco de câmera nos elementos vinculados
 *   - onSeek(date): mover o cursor da timeline ao clicar na régua de tempo
 *
 * Componente vanilla TS/DOM (padrão do codebase — ver BIM4DTimelineStrip).
 * A lógica de posicionamento é pura e testável em jsdom.
 */
import type { ConstructionTask } from './SimulationEngine';
import { computeTaskState } from './SimulationEngine';

export interface GanttCallbacks {
  onTaskClick?: (taskId: string, elementIds: string[]) => void;
  onSeek?: (date: Date) => void;
}

interface Bounds {
  start: number;
  end: number;
  span: number;
}

function toTime(value: string | Date | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.getTime();
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) {
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? null : t;
  }
  return Date.UTC(y, m - 1, d);
}

/** Posição/largura percentual de um intervalo dentro dos limites do cronograma. */
export function barMetrics(
  startMs: number | null,
  endMs: number | null,
  bounds: Bounds
): { leftPct: number; widthPct: number } | null {
  if (startMs === null || endMs === null || bounds.span <= 0) return null;
  const left = ((startMs - bounds.start) / bounds.span) * 100;
  const width = ((endMs - startMs) / bounds.span) * 100;
  return {
    leftPct: Math.max(0, Math.min(100, left)),
    widthPct: Math.max(0.5, Math.min(100 - Math.max(0, left), width)),
  };
}

export function computeBounds(tasks: ConstructionTask[]): Bounds | null {
  let min = Infinity;
  let max = -Infinity;
  for (const t of tasks) {
    for (const v of [toTime(t.plannedStart), toTime(t.actualStart)]) if (v !== null && v < min) min = v;
    for (const v of [toTime(t.plannedEnd), toTime(t.actualEnd)]) if (v !== null && v > max) max = v;
  }
  if (min === Infinity || max === -Infinity) return null;
  return { start: min, end: max, span: max - min };
}

export class GanttTimeline {
  private readonly container: HTMLElement;
  private readonly root: HTMLElement;
  private callbacks: GanttCallbacks;

  private tasks: ConstructionTask[] = [];
  private bounds: Bounds | null = null;
  private cursorDate: Date | null = null;
  private rowsEl!: HTMLElement;
  private cursorEl!: HTMLElement;
  private readonly clickHandler: (e: MouseEvent) => void;

  constructor(container: HTMLElement, callbacks: GanttCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.root = document.createElement('div');
    this.clickHandler = (e) => this.handleClick(e);
    this.render();
    this.root.addEventListener('click', this.clickHandler);
  }

  setTasks(tasks: ConstructionTask[]): void {
    this.tasks = tasks;
    this.bounds = computeBounds(tasks);
    this.renderRows();
    this.updateCursor();
  }

  /** Mescla novos callbacks (permite ligar após a construção). */
  setCallbacks(callbacks: GanttCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  setCursorDate(date: Date): void {
    this.cursorDate = date;
    this.updateCursor();
  }

  getCursorDate(): Date | null {
    return this.cursorDate ? new Date(this.cursorDate) : null;
  }

  destroy(): void {
    this.root.removeEventListener('click', this.clickHandler);
    this.root.remove();
  }

  // ----- render -----

  private render(): void {
    this.root.className = 'gantt-timeline';
    this.root.setAttribute('role', 'table');
    this.root.setAttribute('aria-label', 'Gráfico de Gantt 4D');

    this.rowsEl = document.createElement('div');
    this.rowsEl.className = 'gantt-timeline__rows';
    this.root.appendChild(this.rowsEl);

    this.cursorEl = document.createElement('div');
    this.cursorEl.className = 'gantt-timeline__cursor';
    this.cursorEl.style.display = 'none';
    this.root.appendChild(this.cursorEl);

    this.container.appendChild(this.root);
  }

  private renderRows(): void {
    this.rowsEl.innerHTML = '';
    if (!this.bounds || this.tasks.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'gantt-timeline__empty';
      empty.textContent = 'Nenhum cronograma 4D carregado';
      this.rowsEl.appendChild(empty);
      return;
    }

    const refTime = (this.cursorDate ?? new Date(this.bounds.end)).getTime();

    for (const task of this.tasks) {
      const row = document.createElement('div');
      row.className = 'gantt-timeline__row';
      row.dataset.taskId = task.id;
      row.setAttribute('role', 'row');

      const label = document.createElement('span');
      label.className = 'gantt-timeline__label';
      label.textContent = task.name;
      label.title = task.name;
      row.appendChild(label);

      const track = document.createElement('div');
      track.className = 'gantt-timeline__track';

      // Barra planejada
      const planned = barMetrics(toTime(task.plannedStart), toTime(task.plannedEnd), this.bounds);
      if (planned) {
        const bar = document.createElement('div');
        bar.className = 'gantt-timeline__bar gantt-timeline__bar--planned';
        bar.style.left = `${planned.leftPct}%`;
        bar.style.width = `${planned.widthPct}%`;
        track.appendChild(bar);
      }

      // Barra realizada (quando há dados reais ou progresso)
      const actualStart = toTime(task.actualStart) ?? toTime(task.plannedStart);
      // Em execução (sem fim real) → barra vai até a data de referência/cursor.
      const actualEnd = toTime(task.actualEnd) ?? refTime;
      const realized = barMetrics(actualStart, actualEnd, this.bounds);
      if (realized && (task.actualStart || task.actualEnd || (task.percentComplete ?? 0) > 0)) {
        const bar = document.createElement('div');
        const state = computeTaskState(task, refTime, 'actual');
        bar.className = `gantt-timeline__bar gantt-timeline__bar--actual gantt-timeline__bar--${state}`;
        bar.style.left = `${realized.leftPct}%`;
        bar.style.width = `${realized.widthPct}%`;
        track.appendChild(bar);
      }

      // Marca de atraso (estado na data de referência)
      const state = computeTaskState(task, refTime, 'actual');
      if (state === 'delayed') row.classList.add('gantt-timeline__row--delayed');

      row.appendChild(track);
      this.rowsEl.appendChild(row);
    }
  }

  private updateCursor(): void {
    if (!this.bounds || !this.cursorDate) {
      this.cursorEl.style.display = 'none';
      return;
    }
    const pct = ((this.cursorDate.getTime() - this.bounds.start) / this.bounds.span) * 100;
    this.cursorEl.style.display = 'block';
    this.cursorEl.style.left = `${Math.max(0, Math.min(100, pct))}%`;
  }

  private handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const row = target.closest('[data-task-id]') as HTMLElement | null;
    if (!row) return;

    const taskId = row.dataset.taskId!;
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Clique no track → seek por data; clique no rótulo → foco de câmera.
    const track = target.closest('.gantt-timeline__track') as HTMLElement | null;
    if (track && this.bounds && this.callbacks.onSeek) {
      const rect = track.getBoundingClientRect();
      if (rect.width > 0) {
        const ratio = (event.clientX - rect.left) / rect.width;
        const ms = this.bounds.start + this.bounds.span * Math.max(0, Math.min(1, ratio));
        this.callbacks.onSeek(new Date(ms));
        return;
      }
    }

    this.callbacks.onTaskClick?.(taskId, task.elementIds);
  }
}
