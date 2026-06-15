/**
 * mountSchedule4DSplit (S35) — comparação Planejado × Realizado lado a lado.
 *
 * Reusa o SplitView existente (scissor + stateRendererA/B + sincronização de
 * câmera). A cada data simulada calcula DOIS mapas de estado por elemento:
 *   esquerda (A) = modo 'planned' (baseline do cronograma)
 *   direita  (B) = modo 'actual'  (execução real; atraso em vermelho)
 * e injeta nos frames do SplitView, que pinta cada viewport no render loop.
 *
 * O TimelineController dirige o tempo; GanttTimeline+SimulationControls dão a UI.
 */
import type { ViewerHost } from '../ViewerHost';
import type { BoundingSphere } from '../MeshReference';
import { SplitView } from '../SplitView';
import { ScheduleManager, TimelineController } from '../../features/bim-4d/bim/4d';
import { getSchedulingService } from '../../api/v1/services/scheduling.service';
import { computeElementStates, type ConstructionTask } from './SimulationEngine';
import type { SimulationElementState } from '../ElementStateRenderer';
import { GanttTimeline } from './GanttTimeline';
import { SimulationControls } from './SimulationControls';
import { Schedule4DController, type ElementSphereLookup } from './Schedule4DController';
import { constructionTasksToScheduleData } from './mountSchedule4D';

/** Calcula os dois mapas (planejado/realizado) numa data. Puro/testável. */
export function computeSplitFrames(
  tasks: ConstructionTask[],
  date: Date
): { planned: Record<string, SimulationElementState>; actual: Record<string, SimulationElementState> } {
  return {
    planned: computeElementStates(tasks, date, 'planned'),
    actual: computeElementStates(tasks, date, 'actual'),
  };
}

export interface Mount4DSplitOptions {
  viewerHost: ViewerHost;
  splitContainer: HTMLElement;
  ganttContainer: HTMLElement;
  controlsContainer: HTMLElement;
  elementIndex?: ElementSphereLookup;
  focusCamera?: (sphere: BoundingSphere) => void;
  projectName?: string;
  speed?: number;
  autoMatch?: boolean;
}

export interface Schedule4DSplitHandle {
  split: SplitView;
  timeline: TimelineController;
  gantt: GanttTimeline;
  controls: SimulationControls;
  tasks: ConstructionTask[];
  dispose: () => void;
}

function scenarioStub(id: string) {
  return { id, scenarioState: { visibility: { hiddenElements: [] as string[] } } };
}

export async function mountSchedule4DSplit(
  scheduleId: string,
  opts: Mount4DSplitOptions
): Promise<Schedule4DSplitHandle> {
  const service = getSchedulingService();
  if (opts.autoMatch) await service.autoMatch(scheduleId, { persist: true });
  const tasks = await service.getConstructionTasks(scheduleId);

  // 1. SplitView em modo de comparação temporal (dois frames mutáveis).
  const split = new SplitView(opts.splitContainer, opts.viewerHost, scenarioStub('planned'), scenarioStub('actual'));
  split.activateTemporalComparison(null, null, [{ elementStates: {} }], [{ elementStates: {} }]);

  // 2. Gantt (mostra o realizado) + controles.
  const gantt = new GanttTimeline(opts.ganttContainer);
  gantt.setTasks(tasks);
  const controls = new SimulationControls(opts.controlsContainer);

  // 3. Controller só para foco de câmera (clique no Gantt).
  const focusController = new Schedule4DController({
    renderer: { applyStates: () => {} }, // a pintura é feita pelo SplitView
    elementIndex: opts.elementIndex,
    focusCamera: opts.focusCamera,
  });

  // 4. Timeline.
  const scheduleData = constructionTasksToScheduleData(tasks, opts.projectName);
  const manager = new ScheduleManager();
  await manager.loadSchedule(scheduleData);
  const timeline = new TimelineController(manager, { speed: opts.speed ?? 7, autoPlay: false });

  const applyAt = (date: Date) => {
    const { planned, actual } = computeSplitFrames(tasks, date);
    if (split.temporalComparison) {
      split.temporalComparison.currentDate = date;
      split.temporalComparison.framesA[0].elementStates = planned;
      split.temporalComparison.framesB[0].elementStates = actual;
    }
    gantt.setCursorDate(date);
    controls.setDateLabel(formatDate(date));
  };

  timeline.on('timeline:date-changed', (e: { currentDate: Date }) => applyAt(e.currentDate));
  timeline.on('timeline:play', () => controls.setPlaying(true));
  timeline.on('timeline:pause', () => controls.setPlaying(false));
  timeline.on('timeline:ended', () => controls.setPlaying(false));

  // 5. Wiring de UI.
  gantt.setCallbacks({
    onTaskClick: (_id, elementIds) => focusController.focusOnElements(elementIds),
    onSeek: (date) => timeline.seek(date),
  });
  controls.setCallbacks({
    onPlayToggle: (playing) => (playing ? timeline.play() : timeline.pause()),
    onSpeedChange: (s) => timeline.setSpeed(s),
    onGoToStart: () => timeline.goToStart(),
    onGoToEnd: () => timeline.goToEnd(),
    // No modo lado a lado os dois painéis já mostram planejado×realizado.
  });

  // 6. Estado inicial.
  applyAt(timeline.getCurrentDate());

  return {
    split,
    timeline,
    gantt,
    controls,
    tasks,
    dispose: () => {
      timeline.dispose();
      gantt.destroy();
      controls.destroy();
      split.deactivate();
    },
  };
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}
