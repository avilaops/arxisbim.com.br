/**
 * BIM4DTimelineStrip - Timeline inferior conectada ao BIM 4D real.
 *
 * Usa ScheduleManager + TimelineController. Enquanto a importação real de
 * cronograma não estiver plugada na shell, pode carregar uma fixture controlada.
 */

import {
  ScheduleManager,
  TimelineController,
  type ScheduleData,
  type Task,
  type TimelineChangeEvent
} from '../bim/4d';
import { cloneControlledBIM4DSchedule } from '../bim/4d/fixtures/controlledSchedule';

export interface BIM4DTimelineConfig {
  /** Habilitar controles de playback */
  enableControls?: boolean;
  /** Mostrar indicador de progresso */
  showProgress?: boolean;
  /** Mostrar segmentos de status */
  showSegments?: boolean;
  /** Cronograma inicial. Se omitido e autoLoadFixture=true, usa fixture controlada. */
  scheduleData?: ScheduleData | null;
  /** Carrega fixture controlada quando nenhum cronograma externo é fornecido. */
  autoLoadFixture?: boolean;
  /** Velocidade do TimelineController (dias de obra por segundo em 1x). */
  playbackSpeed?: number;
  /** Gerenciador externo para futura injeção pela shell. */
  scheduleManager?: ScheduleManager;
}

export interface BIM4DTimelineCounts {
  planned: number;
  executed: number;
  delayed: number;
  notStarted: number;
  inProgress: number;
  total: number;
}

export interface BIM4DTimelineState {
  hasSchedule: boolean;
  projectName: string | null;
  currentDate: Date | null;
  progress: number;
  counts: BIM4DTimelineCounts;
  activeTasks: Task[];
  isPlaying: boolean;
  speed: number;
}

export type BIM4DVisualState = 'planned' | 'executed' | 'delayed' | 'not-started';

interface ResolvedTimelineConfig {
  enableControls: boolean;
  showProgress: boolean;
  showSegments: boolean;
  autoLoadFixture: boolean;
  playbackSpeed: number;
}

interface SegmentViewModel {
  type: 'planned' | 'executed' | 'delayed';
  label: string;
  count: number;
  percent: number;
}

const EMPTY_COUNTS: BIM4DTimelineCounts = {
  planned: 0,
  executed: 0,
  delayed: 0,
  notStarted: 0,
  inProgress: 0,
  total: 0
};

/**
 * Timeline strip inferior para BIM 4D funcional.
 */
export class BIM4DTimelineStrip {
  private readonly container: HTMLElement;
  private readonly root: HTMLElement;
  private readonly config: ResolvedTimelineConfig;
  private readonly scheduleManager: ScheduleManager;
  private readonly ownsScheduleManager: boolean;

  private timelineController: TimelineController | null = null;
  private controllerUnsubscribers: Array<() => void> = [];
  private readonly rootClickHandler: (event: MouseEvent) => void;

  private headerEl!: HTMLElement;
  private dateEl!: HTMLElement;
  private trackEl!: HTMLElement;
  private controlsEl!: HTMLElement;
  private statusEl!: HTMLElement;

  private state: BIM4DTimelineState = {
    hasSchedule: false,
    projectName: null,
    currentDate: null,
    progress: 0,
    counts: { ...EMPTY_COUNTS },
    activeTasks: [],
    isPlaying: false,
    speed: 1
  };

  constructor(
    container: HTMLElement,
    config: BIM4DTimelineConfig = {}
  ) {
    this.container = container;
    this.config = {
      enableControls: config.enableControls ?? true,
      showProgress: config.showProgress ?? true,
      showSegments: config.showSegments ?? true,
      autoLoadFixture: config.autoLoadFixture ?? true,
      playbackSpeed: config.playbackSpeed ?? 7
    };

    this.scheduleManager = config.scheduleManager ?? new ScheduleManager();
    this.ownsScheduleManager = !config.scheduleManager;
    this.root = document.createElement('div');
    this.rootClickHandler = (event) => this.handleRootClick(event);

    this.render();
    this.root.addEventListener('click', this.rootClickHandler);

    const scheduleData = config.scheduleData ?? (this.config.autoLoadFixture ? cloneControlledBIM4DSchedule() : null);
    if (scheduleData) {
      void this.loadSchedule(scheduleData);
    } else if (this.scheduleManager.getScheduleInfo()) {
      this.attachController(new TimelineController(this.scheduleManager, {
        autoPlay: false,
        speed: this.config.playbackSpeed,
        loopEnabled: false
      }), true);
      this.refreshFromController();
    } else {
      this.renderFallback();
    }
  }

  /**
   * Carrega um cronograma real/controlado e conecta o TimelineController.
   */
  public async loadSchedule(scheduleData: ScheduleData): Promise<void> {
    await this.scheduleManager.loadSchedule(scheduleData);

    this.attachController(new TimelineController(this.scheduleManager, {
      autoPlay: false,
      speed: this.config.playbackSpeed,
      loopEnabled: false,
      initialDate: scheduleData.startDate
    }), true);

    this.refreshFromController();
  }

  /**
   * Limpa o cronograma atual e mostra fallback profissional.
   */
  public clearSchedule(): void {
    this.detachController();
    if (this.ownsScheduleManager) {
      this.scheduleManager.clear();
    }

    this.state = {
      hasSchedule: false,
      projectName: null,
      currentDate: null,
      progress: 0,
      counts: { ...EMPTY_COUNTS },
      activeTasks: [],
      isPlaying: false,
      speed: this.config.playbackSpeed
    };
    this.renderFallback();
  }

  /**
   * Define progresso manualmente via percentagem (0-100), usando seek real por data.
   */
  public setProgress(progress: number): void {
    this.seekToProgress(progress);
  }

  /**
   * Busca uma posição percentual do cronograma.
   */
  public seekToProgress(progress: number): void {
    const schedule = this.scheduleManager.getScheduleInfo();
    if (!this.timelineController || !schedule) return;

    const safeProgress = Math.max(0, Math.min(100, progress));
    const range = schedule.endDate.getTime() - schedule.startDate.getTime();
    const targetDate = new Date(schedule.startDate.getTime() + (range * safeProgress / 100));
    this.timelineController.seek(targetDate);
  }

  /**
   * Mostra/oculta timeline.
   */
  public setVisible(visible: boolean): void {
    this.root.style.display = visible ? 'flex' : 'none';
  }

  /**
   * Snapshot público do estado atual da timeline.
   */
  public getState(): BIM4DTimelineState {
    return {
      ...this.state,
      currentDate: this.state.currentDate ? new Date(this.state.currentDate) : null,
      counts: { ...this.state.counts },
      activeTasks: [...this.state.activeTasks]
    };
  }

  /**
   * Prévia de estado visual por IFC GUID para futura aplicação no modelo 3D.
   */
  public getElementVisualStates(): Map<string, BIM4DVisualState> {
    const visualStates = new Map<string, BIM4DVisualState>();
    const schedule = this.scheduleManager.getScheduleInfo();
    const currentDate = this.state.currentDate;

    if (!schedule || !currentDate) {
      return visualStates;
    }

    schedule.tasks.forEach(task => {
      const visualState = this.getTaskVisualState(task, currentDate);
      task.ifcGuids.forEach(guid => visualStates.set(guid, visualState));
    });

    return visualStates;
  }

  /**
   * Cleanup.
   */
  public destroy(): void {
    this.root.removeEventListener('click', this.rootClickHandler);
    this.detachController();
    this.root.remove();
  }

  /**
   * Renderiza estrutura estável da timeline.
   */
  private render(): void {
    this.root.className = 'bim4d-timeline-strip';
    this.root.setAttribute('role', 'region');
    this.root.setAttribute('aria-label', 'Timeline de Cronograma 4D');

    this.headerEl = document.createElement('div');
    this.headerEl.className = 'bim4d-timeline-strip__header';

    const label = document.createElement('span');
    label.className = 'bim4d-timeline-strip__label';
    label.textContent = 'BIM 4D';

    this.dateEl = document.createElement('span');
    this.dateEl.className = 'bim4d-timeline-strip__date';
    this.dateEl.id = 'timeline-current-date';

    this.headerEl.appendChild(label);
    this.headerEl.appendChild(this.dateEl);
    this.root.appendChild(this.headerEl);

    this.trackEl = document.createElement('div');
    this.trackEl.className = 'bim4d-timeline-strip__track';
    this.trackEl.setAttribute('role', 'slider');
    this.trackEl.setAttribute('aria-valuemin', '0');
    this.trackEl.setAttribute('aria-valuemax', '100');
    this.trackEl.setAttribute('aria-valuenow', '0');
    this.trackEl.setAttribute('aria-label', 'Progresso do cronograma 4D');
    this.root.appendChild(this.trackEl);

    this.controlsEl = document.createElement('div');
    this.controlsEl.className = 'bim4d-timeline-strip__controls';

    if (this.config.enableControls) {
      const buttons = [
        { id: 'start', label: '⏮', title: 'Ir para início' },
        { id: 'prev', label: '⏪', title: 'Voltar 5% do cronograma' },
        { id: 'play', label: '▶', title: 'Reproduzir' },
        { id: 'next', label: '⏩', title: 'Avançar 5% do cronograma' },
        { id: 'end', label: '⏭', title: 'Ir para fim' }
      ];

      buttons.forEach(btn => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'bim4d-timeline-strip__btn';
        button.dataset.action = btn.id;
        button.textContent = btn.label;
        button.title = btn.title;
        button.setAttribute('aria-label', btn.title);
        this.controlsEl.appendChild(button);
      });
    }

    this.statusEl = document.createElement('span');
    this.statusEl.className = 'bim4d-timeline-strip__status';
    this.statusEl.id = 'timeline-status';
    this.controlsEl.appendChild(this.statusEl);

    this.root.appendChild(this.controlsEl);
    this.container.appendChild(this.root);
    this.renderFallback();
  }

  private attachController(controller: TimelineController, owned: boolean): void {
    this.detachController();
    this.timelineController = controller;

    const onDateChanged = (event: TimelineChangeEvent) => this.updateFromTimelineEvent(event);
    const onPlay = () => {
      this.state.isPlaying = true;
      this.updatePlaybackUI();
    };
    const onPause = () => {
      this.state.isPlaying = false;
      this.updatePlaybackUI();
    };
    const onEnded = () => {
      this.state.isPlaying = false;
      this.refreshFromController();
    };
    const onSpeedChanged = ({ speed }: { speed: number }) => {
      this.state.speed = speed;
      this.updatePlaybackUI();
    };

    controller.on('timeline:date-changed', onDateChanged);
    controller.on('timeline:play', onPlay);
    controller.on('timeline:pause', onPause);
    controller.on('timeline:ended', onEnded);
    controller.on('timeline:speed-changed', onSpeedChanged);

    this.controllerUnsubscribers = [
      () => controller.off('timeline:date-changed', onDateChanged),
      () => controller.off('timeline:play', onPlay),
      () => controller.off('timeline:pause', onPause),
      () => controller.off('timeline:ended', onEnded),
      () => controller.off('timeline:speed-changed', onSpeedChanged),
      () => {
        if (owned) controller.dispose();
      }
    ];
  }

  private detachController(): void {
    this.controllerUnsubscribers.forEach(unsubscribe => unsubscribe());
    this.controllerUnsubscribers = [];
    this.timelineController = null;
  }

  private handleRootClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const button = target.closest('[data-action]') as HTMLElement | null;

    if (button) {
      if (button.hasAttribute('disabled')) return;
      this.handleAction(button.dataset.action);
      return;
    }

    if (this.config.showProgress && target.closest('.bim4d-timeline-strip__track')) {
      this.handleTrackSeek(event);
    }
  }

  private handleAction(action?: string): void {
    if (!this.timelineController) return;

    switch (action) {
      case 'start':
        this.timelineController.goToStart();
        break;
      case 'prev':
        this.stepByPercent(-5);
        break;
      case 'play':
        if (this.timelineController.getIsPlaying()) {
          this.timelineController.pause();
        } else {
          this.timelineController.play();
        }
        break;
      case 'next':
        this.stepByPercent(5);
        break;
      case 'end':
        this.timelineController.goToEnd();
        break;
    }
  }

  private handleTrackSeek(event: MouseEvent): void {
    if (!this.timelineController || !this.state.hasSchedule) return;

    const rect = this.trackEl.getBoundingClientRect();
    if (rect.width <= 0) return;

    const percent = ((event.clientX - rect.left) / rect.width) * 100;
    this.seekToProgress(percent);
  }

  private stepByPercent(delta: number): void {
    this.seekToProgress(this.state.progress + delta);
  }

  private refreshFromController(): void {
    if (!this.timelineController) {
      this.renderFallback();
      return;
    }

    const currentDate = this.timelineController.getCurrentDate();
    this.updateFromTimelineEvent({
      currentDate,
      progress: this.timelineController.getProgress(),
      activeTasks: this.scheduleManager.getTasksAtDate(currentDate)
    });
  }

  private updateFromTimelineEvent(event: TimelineChangeEvent): void {
    const schedule = this.scheduleManager.getScheduleInfo();
    if (!schedule || !this.timelineController) {
      this.renderFallback();
      return;
    }

    this.state = {
      hasSchedule: true,
      projectName: schedule.projectName,
      currentDate: new Date(event.currentDate),
      progress: Math.max(0, Math.min(100, event.progress)),
      counts: this.calculateCounts(schedule.tasks, event.currentDate),
      activeTasks: [...event.activeTasks],
      isPlaying: this.timelineController.getIsPlaying(),
      speed: this.timelineController.getSpeed()
    };

    this.renderScheduleState();
  }

  private calculateCounts(tasks: Task[], currentDate: Date): BIM4DTimelineCounts {
    const timestamp = currentDate.getTime();
    const counts: BIM4DTimelineCounts = {
      planned: tasks.length,
      executed: 0,
      delayed: 0,
      notStarted: 0,
      inProgress: 0,
      total: tasks.length
    };

    tasks.forEach(task => {
      const start = task.startDate.getTime();
      const end = task.endDate.getTime();
      const isDelayed = task.status === 'delayed' && timestamp >= start;

      if (isDelayed) {
        counts.delayed++;
      } else if (timestamp > end) {
        counts.executed++;
      } else if (timestamp < start) {
        counts.notStarted++;
      } else {
        counts.inProgress++;
      }
    });

    return counts;
  }

  private getTaskVisualState(task: Task, currentDate: Date): BIM4DVisualState {
    const timestamp = currentDate.getTime();
    const start = task.startDate.getTime();
    const end = task.endDate.getTime();

    if (task.status === 'delayed' && timestamp >= start) {
      return 'delayed';
    }

    if (timestamp > end) {
      return 'executed';
    }

    if (timestamp < start) {
      return 'not-started';
    }

    return 'planned';
  }

  private renderFallback(): void {
    this.dateEl.textContent = 'Sem cronograma';
    this.trackEl.innerHTML = '';
    this.trackEl.setAttribute('aria-valuenow', '0');
    this.trackEl.setAttribute('aria-valuetext', 'Nenhum cronograma 4D carregado');

    const segment = document.createElement('div');
    segment.className = 'bim4d-timeline-strip__segment bim4d-timeline-strip__segment--planned';
    segment.style.width = '100%';
    segment.title = 'Nenhum cronograma 4D carregado';

    const label = document.createElement('span');
    label.className = 'bim4d-timeline-strip__segment-label';
    label.textContent = 'Nenhum cronograma 4D carregado';
    segment.appendChild(label);
    this.trackEl.appendChild(segment);

    this.statusEl.textContent = 'Importação 4D em breve';
    this.setControlsEnabled(false);
  }

  private renderScheduleState(): void {
    this.dateEl.textContent = this.state.currentDate ? this.formatDate(this.state.currentDate) : 'Sem data';
    this.trackEl.innerHTML = '';

    if (this.config.showSegments) {
      this.buildSegments().forEach(segmentView => {
        const segment = document.createElement('div');
        segment.className = `bim4d-timeline-strip__segment bim4d-timeline-strip__segment--${segmentView.type}`;
        segment.style.width = `${segmentView.percent}%`;
        segment.title = `${segmentView.label}: ${segmentView.count} tarefa(s)`;

        const label = document.createElement('span');
        label.className = 'bim4d-timeline-strip__segment-label';
        label.textContent = `${segmentView.label} (${segmentView.count})`;
        segment.appendChild(label);
        this.trackEl.appendChild(segment);
      });
    }

    if (this.config.showProgress) {
      const indicator = document.createElement('div');
      indicator.className = 'bim4d-timeline-strip__indicator';
      indicator.id = 'timeline-progress-indicator';
      indicator.style.left = `${this.state.progress}%`;
      indicator.title = `${Math.round(this.state.progress)}%`;
      this.trackEl.appendChild(indicator);
    }

    this.trackEl.setAttribute('aria-valuenow', String(Math.round(this.state.progress)));
    this.trackEl.setAttribute('aria-valuetext', `${Math.round(this.state.progress)}% em ${this.dateEl.textContent}`);
    this.setControlsEnabled(true);
    this.updatePlaybackUI();
  }

  private buildSegments(): SegmentViewModel[] {
    const { counts } = this.state;
    const total = Math.max(counts.total, 1);
    const rawSegments: SegmentViewModel[] = [
      { type: 'executed', label: 'Executado', count: counts.executed, percent: (counts.executed / total) * 100 },
      { type: 'planned', label: 'Em execução', count: counts.inProgress, percent: (counts.inProgress / total) * 100 },
      { type: 'delayed', label: 'Atrasado', count: counts.delayed, percent: (counts.delayed / total) * 100 },
      { type: 'planned', label: 'Não iniciado', count: counts.notStarted, percent: (counts.notStarted / total) * 100 }
    ];

    return rawSegments.filter(segment => segment.count > 0);
  }

  private updatePlaybackUI(): void {
    const playBtn = this.root.querySelector('[data-action="play"]');
    if (playBtn) {
      playBtn.textContent = this.state.isPlaying ? '⏸' : '▶';
      playBtn.setAttribute('title', this.state.isPlaying ? 'Pausar' : 'Reproduzir');
      playBtn.setAttribute('aria-label', this.state.isPlaying ? 'Pausar' : 'Reproduzir');
    }

    const { counts } = this.state;
    const progress = Math.round(this.state.progress);
    this.statusEl.textContent = this.state.hasSchedule
      ? `${progress}% · ${counts.planned} planejadas · ${counts.executed} executadas · ${counts.delayed} atrasadas`
      : 'Importação 4D em breve';
  }

  private setControlsEnabled(enabled: boolean): void {
    this.root.querySelectorAll<HTMLButtonElement>('.bim4d-timeline-strip__btn').forEach(button => {
      button.disabled = !enabled;
      button.setAttribute('aria-disabled', String(!enabled));
    });
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  }
}
