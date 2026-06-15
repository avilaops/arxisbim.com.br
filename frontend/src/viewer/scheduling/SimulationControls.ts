/**
 * SimulationControls (S35)
 *
 * Painel de controle da simulação 4D — Play/Pause, slider de velocidade, ir para
 * início/fim e alternância de modo Planejado×Realizado. Componente vanilla TS/DOM
 * (padrão do codebase). Emite callbacks puros; não conhece TimelineController nem
 * a cena — o orquestrador (mountSchedule4D) faz o fio.
 */
import type { ScheduleViewMode } from './SimulationEngine';

export interface SimulationControlsCallbacks {
  onPlayToggle?: (playing: boolean) => void;
  onSpeedChange?: (speed: number) => void;
  onGoToStart?: () => void;
  onGoToEnd?: () => void;
  onModeChange?: (mode: ScheduleViewMode) => void;
}

const SPEEDS = [1, 7, 30, 90];

export class SimulationControls {
  private readonly container: HTMLElement;
  private callbacks: SimulationControlsCallbacks;
  private readonly root: HTMLElement;

  private playing = false;
  private mode: ScheduleViewMode = 'actual';
  private dateLabel!: HTMLElement;
  private playBtn!: HTMLButtonElement;
  private modeBtn!: HTMLButtonElement;
  private speedSelect!: HTMLSelectElement;

  constructor(container: HTMLElement, callbacks: SimulationControlsCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.root = document.createElement('div');
    this.render();
  }

  /** Mescla novos callbacks (permite ligar após a construção). */
  setCallbacks(callbacks: SimulationControlsCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  setPlaying(playing: boolean): void {
    this.playing = playing;
    this.playBtn.textContent = playing ? '⏸' : '▶';
    this.playBtn.setAttribute('aria-label', playing ? 'Pausar' : 'Reproduzir');
  }

  setMode(mode: ScheduleViewMode): void {
    this.mode = mode;
    this.modeBtn.textContent = mode === 'planned' ? 'Planejado' : 'Realizado';
    this.modeBtn.dataset.mode = mode;
  }

  getMode(): ScheduleViewMode {
    return this.mode;
  }

  setDateLabel(text: string): void {
    this.dateLabel.textContent = text;
  }

  setSpeed(speed: number): void {
    this.speedSelect.value = String(speed);
  }

  destroy(): void {
    this.root.remove();
  }

  private render(): void {
    this.root.className = 'sim-controls';
    this.root.setAttribute('role', 'group');
    this.root.setAttribute('aria-label', 'Controles de simulação 4D');

    const startBtn = this.button('⏮', 'Ir para início', () => this.callbacks.onGoToStart?.());

    this.playBtn = this.button('▶', 'Reproduzir', () => {
      this.setPlaying(!this.playing);
      this.callbacks.onPlayToggle?.(this.playing);
    });

    const endBtn = this.button('⏭', 'Ir para fim', () => this.callbacks.onGoToEnd?.());

    this.speedSelect = document.createElement('select');
    this.speedSelect.className = 'sim-controls__speed';
    this.speedSelect.setAttribute('aria-label', 'Velocidade de reprodução');
    for (const s of SPEEDS) {
      const opt = document.createElement('option');
      opt.value = String(s);
      opt.textContent = `${s}×`;
      this.speedSelect.appendChild(opt);
    }
    this.speedSelect.value = '7';
    this.speedSelect.addEventListener('change', () => {
      this.callbacks.onSpeedChange?.(Number(this.speedSelect.value));
    });

    this.modeBtn = document.createElement('button');
    this.modeBtn.type = 'button';
    this.modeBtn.className = 'sim-controls__mode';
    this.modeBtn.dataset.mode = this.mode;
    this.modeBtn.textContent = 'Realizado';
    this.modeBtn.title = 'Alternar Planejado×Realizado';
    this.modeBtn.addEventListener('click', () => {
      const next: ScheduleViewMode = this.mode === 'actual' ? 'planned' : 'actual';
      this.setMode(next);
      this.callbacks.onModeChange?.(next);
    });

    this.dateLabel = document.createElement('span');
    this.dateLabel.className = 'sim-controls__date';
    this.dateLabel.textContent = '—';

    this.root.append(startBtn, this.playBtn, endBtn, this.speedSelect, this.modeBtn, this.dateLabel);
    this.container.appendChild(this.root);
  }

  private button(label: string, title: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sim-controls__btn';
    btn.textContent = label;
    btn.title = title;
    btn.setAttribute('aria-label', title);
    btn.addEventListener('click', onClick);
    return btn;
  }
}
