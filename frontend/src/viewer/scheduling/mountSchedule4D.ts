/**
 * mountSchedule4D (S35) — orquestração ponta-a-ponta da simulação 4D.
 *
 * Liga, numa única chamada:
 *   backend (/auto-match + schedule) → ConstructionTask[]
 *   TimelineController (play/pause/speed) → Schedule4DController.onDateChanged
 *     → ElementStateRenderer.applyStates (cores na cena) + GanttTimeline.setCursorDate
 *   GanttTimeline.onTaskClick → foco de câmera nos elementos
 *   SimulationControls → play/pause/speed/início/fim + toggle Planejado×Realizado
 *
 * Reusa o TimelineController existente (features/bim-4d) convertendo as tarefas
 * para ScheduleData via `constructionTasksToScheduleData` (pura/testável).
 */
import type * as THREE from 'three';
import { ElementStateRenderer } from '../ElementStateRenderer';
import { ScheduleManager, TimelineController, type ScheduleData, type Task } from '../../features/bim-4d/bim/4d';
import { getSchedulingService } from '../../api/v1/services/scheduling.service';
import type { BoundingSphere } from '../MeshReference';
import { SimulationEngine, type ConstructionTask } from './SimulationEngine';
import { GanttTimeline } from './GanttTimeline';
import { SimulationControls } from './SimulationControls';
import { Schedule4DController, type ElementSphereLookup } from './Schedule4DController';

function toDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const [y, m, d] = value.split('-').map(Number);
  return y && m && d ? new Date(Date.UTC(y, m - 1, d)) : new Date(value);
}

/** Converte ConstructionTask[] para ScheduleData do TimelineController. Pura. */
export function constructionTasksToScheduleData(
  tasks: ConstructionTask[],
  projectName = 'Cronograma 4D'
): ScheduleData {
  const mapped: Task[] = tasks.map((t) => {
    const start = toDate(t.plannedStart);
    const end = toDate(t.plannedEnd);
    const duration = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
    return {
      id: t.id,
      name: t.name,
      startDate: start,
      endDate: end,
      duration,
      predecessors: [],
      ifcGuids: t.elementIds,
      status: 'not-started',
    };
  });

  const allTimes = mapped.flatMap((t) => [t.startDate.getTime(), t.endDate.getTime()]);
  const startDate = allTimes.length ? new Date(Math.min(...allTimes)) : new Date();
  const endDate = allTimes.length ? new Date(Math.max(...allTimes)) : new Date();

  return { projectName, startDate, endDate, tasks: mapped };
}

export interface Mount4DOptions {
  scene: THREE.Scene;
  ganttContainer: HTMLElement;
  controlsContainer: HTMLElement;
  /** Resolve esferas por globalId p/ foco de câmera (ElementIndex satisfaz). */
  elementIndex?: ElementSphereLookup;
  focusCamera?: (sphere: BoundingSphere) => void;
  getHiddenElements?: () => Set<string>;
  projectName?: string;
  /** Velocidade inicial (dias de obra por segundo em 1×). Default 7. */
  speed?: number;
  /** Roda /auto-match (persist) antes de carregar as tarefas. Default false. */
  autoMatch?: boolean;
}

export interface Schedule4DHandle {
  controller: Schedule4DController;
  timeline: TimelineController;
  gantt: GanttTimeline;
  controls: SimulationControls;
  tasks: ConstructionTask[];
  dispose: () => void;
}

/**
 * Monta a simulação 4D para um cronograma. Busca as tarefas no backend, liga os
 * componentes e devolve um handle com `dispose()`.
 */
export async function mountSchedule4D(scheduleId: string, opts: Mount4DOptions): Promise<Schedule4DHandle> {
  const service = getSchedulingService();
  if (opts.autoMatch) {
    await service.autoMatch(scheduleId, { persist: true });
  }
  const tasks = await service.getConstructionTasks(scheduleId);

  // 1. Renderer de estados sobre a cena.
  const renderer = new ElementStateRenderer();
  renderer.cacheSceneMeshes(opts.scene);

  // 2. Engine + Gantt + Controls.
  const engine = new SimulationEngine();
  const gantt = new GanttTimeline(opts.ganttContainer);
  const controls = new SimulationControls(opts.controlsContainer);

  // 3. Controller central.
  const controller = new Schedule4DController({
    engine,
    renderer,
    gantt,
    elementIndex: opts.elementIndex,
    focusCamera: opts.focusCamera,
    getHiddenElements: opts.getHiddenElements,
  });

  // 4. TimelineController como fonte de tempo (reusa o motor de playback existente).
  const scheduleData = constructionTasksToScheduleData(tasks, opts.projectName);
  const manager = new ScheduleManager();
  await manager.loadSchedule(scheduleData);
  const timeline = new TimelineController(manager, { speed: opts.speed ?? 7, autoPlay: false });

  timeline.on('timeline:date-changed', (e: { currentDate: Date }) => {
    controller.onDateChanged(e.currentDate);
    controls.setDateLabel(formatDate(e.currentDate));
  });
  timeline.on('timeline:play', () => controls.setPlaying(true));
  timeline.on('timeline:pause', () => controls.setPlaying(false));
  timeline.on('timeline:ended', () => controls.setPlaying(false));

  // 5. Gantt → câmera / seek.
  gantt.setCallbacks({
    onTaskClick: (_id, elementIds) => controller.focusOnElements(elementIds),
    onSeek: (date) => timeline.seek(date),
  });

  // 6. Controls → timeline / modo.
  controls.setCallbacks({
    onPlayToggle: (playing) => (playing ? timeline.play() : timeline.pause()),
    onSpeedChange: (s) => timeline.setSpeed(s),
    onGoToStart: () => timeline.goToStart(),
    onGoToEnd: () => timeline.goToEnd(),
    onModeChange: (mode) => controller.setMode(mode),
  });

  // 7. Carga inicial.
  controller.loadTasks(tasks);
  controller.onDateChanged(timeline.getCurrentDate());
  controls.setDateLabel(formatDate(timeline.getCurrentDate()));

  return {
    controller,
    timeline,
    gantt,
    controls,
    tasks,
    dispose: () => {
      timeline.dispose();
      gantt.destroy();
      controls.destroy();
      renderer.restore(opts.getHiddenElements?.() ?? new Set());
      renderer.clearCache();
    },
  };
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}
