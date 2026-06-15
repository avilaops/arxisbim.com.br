/**
 * Schedule4DController (S35)
 *
 * Orquestra a simulação 4D ponta-a-ponta, ligando:
 *   TimelineController (data) → SimulationEngine.computeAt → ElementStateRenderer.applyStates
 *                                                          → GanttTimeline.setCursorDate
 *   GanttTimeline.onTaskClick → foco de câmera nos elementos vinculados
 *
 * Colaboradores injetados via interfaces mínimas → unit-testável headless, sem
 * Three.js nem DOM real. A função de foco recebe a esfera envolvente combinada
 * dos elementos da tarefa (center+radius), pronta para CameraAnimator/Camera.
 */
import type { SimulationElementState } from '../ElementStateRenderer';
import type { BoundingSphere } from '../MeshReference';
import type { ConstructionTask, ScheduleViewMode } from './SimulationEngine';
import { SimulationEngine } from './SimulationEngine';

export interface StateRendererLike {
  applyStates(states: Record<string, SimulationElementState>, hidden: Set<string>): void;
}

export interface GanttLike {
  setTasks(tasks: ConstructionTask[]): void;
  setCursorDate(date: Date): void;
}

export interface ElementSphereLookup {
  getByGlobalId(globalId: string): { boundingSphere: BoundingSphere } | undefined;
}

export interface Schedule4DDeps {
  engine?: SimulationEngine;
  renderer: StateRendererLike;
  gantt?: GanttLike;
  /** Resolve esferas envolventes por globalId (ElementIndex satisfaz isto). */
  elementIndex?: ElementSphereLookup;
  /** Recebe a esfera combinada dos elementos para enquadrar a câmera. */
  focusCamera?: (sphere: BoundingSphere) => void;
  /** Elementos ocultos pelo cenário (repassados ao renderer). */
  getHiddenElements?: () => Set<string>;
}

/**
 * Combina N esferas envolventes numa única que contém todas. Pura/testável.
 * Algoritmo incremental clássico (Ritter-like de mesclagem de 2 esferas).
 */
export function combineBoundingSpheres(spheres: BoundingSphere[]): BoundingSphere | null {
  if (spheres.length === 0) return null;
  let acc: BoundingSphere = {
    center: [...spheres[0].center] as [number, number, number],
    radius: spheres[0].radius,
  };

  for (let i = 1; i < spheres.length; i++) {
    const s = spheres[i];
    const dx = s.center[0] - acc.center[0];
    const dy = s.center[1] - acc.center[1];
    const dz = s.center[2] - acc.center[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Uma já contém a outra.
    if (dist + s.radius <= acc.radius) continue;
    if (dist + acc.radius <= s.radius) {
      acc = { center: [...s.center] as [number, number, number], radius: s.radius };
      continue;
    }

    const newRadius = (dist + acc.radius + s.radius) / 2;
    const t = dist > 0 ? (newRadius - acc.radius) / dist : 0;
    acc = {
      center: [
        acc.center[0] + dx * t,
        acc.center[1] + dy * t,
        acc.center[2] + dz * t,
      ],
      radius: newRadius,
    };
  }

  return acc;
}

export class Schedule4DController {
  private readonly engine: SimulationEngine;
  private readonly renderer: StateRendererLike;
  private readonly gantt?: GanttLike;
  private readonly elementIndex?: ElementSphereLookup;
  private readonly focusCamera?: (sphere: BoundingSphere) => void;
  private readonly getHiddenElements: () => Set<string>;

  private currentDate: Date | null = null;

  constructor(deps: Schedule4DDeps) {
    this.engine = deps.engine ?? new SimulationEngine();
    this.renderer = deps.renderer;
    this.gantt = deps.gantt;
    this.elementIndex = deps.elementIndex;
    this.focusCamera = deps.focusCamera;
    this.getHiddenElements = deps.getHiddenElements ?? (() => new Set<string>());
  }

  /** Carrega as tarefas (ex.: vindas da rota /auto-match) e renderiza no Gantt. */
  loadTasks(tasks: ConstructionTask[]): void {
    this.engine.setTasks(tasks);
    this.gantt?.setTasks(tasks);
    const bounds = this.engine.getBounds();
    if (bounds && !this.currentDate) this.currentDate = bounds.start;
    if (this.currentDate) this.onDateChanged(this.currentDate);
  }

  /** Alterna entre baseline planejado e realizado (planejado×realizado). */
  setMode(mode: ScheduleViewMode): void {
    this.engine.setMode(mode);
    if (this.currentDate) this.onDateChanged(this.currentDate);
  }

  getMode(): ScheduleViewMode {
    return this.engine.getMode();
  }

  /**
   * Handler para `TimelineController.on('timeline:date-changed', e => ctrl.onDateChanged(e.currentDate))`.
   * Recalcula estados, aplica cores na cena e move o cursor do Gantt.
   */
  onDateChanged(date: Date): void {
    this.currentDate = date;
    const states = this.engine.computeAt(date);
    this.renderer.applyStates(states, this.getHiddenElements());
    this.gantt?.setCursorDate(date);
  }

  /**
   * Handler para `GanttTimeline.onTaskClick` — enquadra a câmera nos elementos da
   * tarefa. Resolve as esferas via ElementIndex e combina numa só.
   */
  focusOnElements(elementIds: string[]): BoundingSphere | null {
    if (!this.elementIndex || elementIds.length === 0) return null;
    const spheres: BoundingSphere[] = [];
    for (const id of elementIds) {
      const ref = this.elementIndex.getByGlobalId(id);
      if (ref) spheres.push(ref.boundingSphere);
    }
    const combined = combineBoundingSpheres(spheres);
    if (combined && this.focusCamera) this.focusCamera(combined);
    return combined;
  }

  getCurrentDate(): Date | null {
    return this.currentDate ? new Date(this.currentDate) : null;
  }
}
