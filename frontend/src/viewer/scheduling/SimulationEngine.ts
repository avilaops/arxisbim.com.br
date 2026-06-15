/**
 * SimulationEngine (S35)
 *
 * Motor de simulação temporal 4D — puro/determinístico. Dado um conjunto de
 * tarefas de construção (com datas planejadas + realizadas + % concluído) e uma
 * data simulada, calcula o estado físico de cada elemento BIM vinculado.
 *
 * Distingue os quatro estados físicos do S35:
 *   not_started → Planejado (translúcido cinza)
 *   active      → Em execução (amarelo)
 *   delayed     → Atrasado: passou do fim planejado sem conclusão (vermelho)
 *   complete    → Concluído (sólido / material original)
 *
 * Os estados são compatíveis com `SimulationElementState` de ElementStateRenderer,
 * que aplica as cores na cena via troca de material em lote.
 */
import type { SimulationElementState } from '../ElementStateRenderer';

export type ScheduleViewMode = 'planned' | 'actual';

export interface ConstructionTask {
  id: string;
  name: string;
  /** Início planejado (ISO 'YYYY-MM-DD' ou Date). */
  plannedStart: string | Date;
  /** Fim planejado (ISO 'YYYY-MM-DD' ou Date). */
  plannedEnd: string | Date;
  /** Início real (opcional). */
  actualStart?: string | Date | null;
  /** Fim real (opcional). */
  actualEnd?: string | Date | null;
  /** Percentual concluído 0..100. */
  percentComplete?: number;
  /** globalIds (IFC GUID) dos elementos vinculados. */
  elementIds: string[];
}

export interface SimulationStats {
  notStarted: number;
  active: number;
  delayed: number;
  complete: number;
  /** Tarefas atrasadas na data simulada. */
  delayedTasks: number;
}

function toTime(value: string | Date | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.getTime();
  // 'YYYY-MM-DD' → UTC midnight para evitar deslocamento por fuso.
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) {
    const t = new Date(value).getTime();
    return Number.isNaN(t) ? null : t;
  }
  return Date.UTC(y, m - 1, d);
}

/**
 * Estado físico de UMA tarefa numa data simulada, num dado modo de visualização.
 *
 * Modo 'planned': segue apenas as datas planejadas (não há atraso — é o baseline).
 * Modo 'actual': usa datas reais quando disponíveis e marca `delayed` quando a
 * data simulada ultrapassa o fim planejado sem a tarefa estar concluída.
 */
export function computeTaskState(
  task: ConstructionTask,
  simTime: number,
  mode: ScheduleViewMode
): SimulationElementState {
  const pStart = toTime(task.plannedStart);
  const pEnd = toTime(task.plannedEnd);
  const percent = task.percentComplete ?? 0;

  if (mode === 'planned') {
    if (pStart === null || simTime < pStart) return 'not_started';
    if (pEnd !== null && simTime > pEnd) return 'complete';
    return 'active';
  }

  // mode === 'actual'
  const aStart = toTime(task.actualStart);
  const aEnd = toTime(task.actualEnd);

  // Concluída de fato?
  if ((aEnd !== null && simTime >= aEnd) || percent >= 100) return 'complete';

  // Começou de fato? (início real registrado ou algum avanço físico)
  const hasStarted = aStart !== null || percent > 0;

  if (!hasStarted) {
    // Deveria ter começado pelo plano mas não começou → atraso.
    if (pStart !== null && simTime > pStart) return 'delayed';
    return 'not_started';
  }

  const effectiveStart = aStart ?? pStart;
  if (effectiveStart !== null && simTime < effectiveStart) return 'not_started';

  // Já começou e não concluiu: atrasada se passou do fim planejado.
  if (pEnd !== null && simTime > pEnd) return 'delayed';
  return 'active';
}

/**
 * Calcula o estado de cada elemento na data simulada.
 * Quando um elemento pertence a múltiplas tarefas, prevalece o estado de maior
 * prioridade visual: delayed > active > not_started > complete (atraso e execução
 * nunca devem ser mascarados por uma tarefa concluída concorrente).
 */
export function computeElementStates(
  tasks: ConstructionTask[],
  simDate: Date,
  mode: ScheduleViewMode = 'actual'
): Record<string, SimulationElementState> {
  const simTime = simDate.getTime();
  const out: Record<string, SimulationElementState> = {};

  for (const task of tasks) {
    const state = computeTaskState(task, simTime, mode);
    for (const id of task.elementIds) {
      const prev = out[id];
      out[id] = prev ? higherPriority(prev, state) : state;
    }
  }

  return out;
}

const PRIORITY: Record<SimulationElementState, number> = {
  delayed: 5,
  active: 4,
  not_started: 3,
  complete: 2,
  removed: 1,
  hidden: 0,
};

function higherPriority(a: SimulationElementState, b: SimulationElementState): SimulationElementState {
  return PRIORITY[a] >= PRIORITY[b] ? a : b;
}

/** Sumariza a contagem de estados (para HUD/relatório). */
export function summarizeStates(states: Record<string, SimulationElementState>): SimulationStats {
  const stats: SimulationStats = { notStarted: 0, active: 0, delayed: 0, complete: 0, delayedTasks: 0 };
  for (const s of Object.values(states)) {
    if (s === 'not_started') stats.notStarted++;
    else if (s === 'active') stats.active++;
    else if (s === 'delayed') stats.delayed++;
    else if (s === 'complete') stats.complete++;
  }
  return stats;
}

/**
 * SimulationEngine — fachada com estado de tarefas em cache. Recalcula os estados
 * por elemento a cada `seek(date)`, devolvendo o mapa pronto para ElementStateRenderer.
 */
export class SimulationEngine {
  private tasks: ConstructionTask[] = [];
  private mode: ScheduleViewMode = 'actual';

  setTasks(tasks: ConstructionTask[]): void {
    this.tasks = tasks;
  }

  setMode(mode: ScheduleViewMode): void {
    this.mode = mode;
  }

  getMode(): ScheduleViewMode {
    return this.mode;
  }

  /** Estados por elemento na data informada. */
  computeAt(date: Date): Record<string, SimulationElementState> {
    return computeElementStates(this.tasks, date, this.mode);
  }

  /** Estatísticas agregadas na data informada. */
  statsAt(date: Date): SimulationStats {
    return summarizeStates(this.computeAt(date));
  }

  /** Limites temporais do conjunto de tarefas (min planned/actual start, max end). */
  getBounds(): { start: Date; end: Date } | null {
    let min = Infinity;
    let max = -Infinity;
    for (const t of this.tasks) {
      const starts = [toTime(t.plannedStart), toTime(t.actualStart)].filter((v): v is number => v !== null);
      const ends = [toTime(t.plannedEnd), toTime(t.actualEnd)].filter((v): v is number => v !== null);
      for (const s of starts) if (s < min) min = s;
      for (const e of ends) if (e > max) max = e;
    }
    if (min === Infinity || max === -Infinity) return null;
    return { start: new Date(min), end: new Date(max) };
  }
}
