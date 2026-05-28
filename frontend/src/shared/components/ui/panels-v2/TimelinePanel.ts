/**
 * TimelinePanel Component - BIM 4D Timeline
 * Gerenciamento de cronograma e simulação temporal
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import { Select } from '../design-system/components/Select';
import { Toggle } from '../design-system/components/Toggle';
import { Slider } from '../design-system/components/Slider';

export interface TimelineTask {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  duration: number; // dias
  progress: number; // 0-100
  dependencies: string[];
  elementIds: string[];
  color: string;
  status: 'not-started' | 'in-progress' | 'completed' | 'delayed';
}

export class TimelinePanel {
  private card: Card;
  private tasks: TimelineTask[] = [];
  private currentDate: Date = new Date();
  private isPlaying: boolean = false;
  private playbackSpeed: number = 1;
  private animationFrame: number | null = null;
  private timelineCanvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.card = new Card({
      title: '⏱️ Timeline (4D)',
      collapsible: true
    });

    this.timelineCanvas = document.createElement('canvas');
    this.timelineCanvas.width = 800;
    this.timelineCanvas.height = 400;
    this.ctx = this.timelineCanvas.getContext('2d')!;

    this.loadMockTasks();
    this.buildUI();
    this.applyStyles();
    this.renderTimeline();
  }

  /**
   * Carrega tarefas mock
   */
  private loadMockTasks(): void {
    const baseDate = new Date('2025-01-01');
    
    this.tasks = [
      {
        id: '1',
        name: 'Fundação',
        startDate: new Date(baseDate.getTime()),
        endDate: new Date(baseDate.getTime() + 15 * 24 * 60 * 60 * 1000),
        duration: 15,
        progress: 100,
        dependencies: [],
        elementIds: ['foundation-1', 'foundation-2'],
        color: '#8B4513',
        status: 'completed'
      },
      {
        id: '2',
        name: 'Estrutura',
        startDate: new Date(baseDate.getTime() + 15 * 24 * 60 * 60 * 1000),
        endDate: new Date(baseDate.getTime() + 45 * 24 * 60 * 60 * 1000),
        duration: 30,
        progress: 65,
        dependencies: ['1'],
        elementIds: ['column-1', 'column-2', 'beam-1'],
        color: '#708090',
        status: 'in-progress'
      },
      {
        id: '3',
        name: 'Alvenaria',
        startDate: new Date(baseDate.getTime() + 45 * 24 * 60 * 60 * 1000),
        endDate: new Date(baseDate.getTime() + 65 * 24 * 60 * 60 * 1000),
        duration: 20,
        progress: 0,
        dependencies: ['2'],
        elementIds: ['wall-1', 'wall-2'],
        color: '#CD853F',
        status: 'not-started'
      },
      {
        id: '4',
        name: 'Instalações',
        startDate: new Date(baseDate.getTime() + 50 * 24 * 60 * 60 * 1000),
        endDate: new Date(baseDate.getTime() + 70 * 24 * 60 * 60 * 1000),
        duration: 20,
        progress: 0,
        dependencies: ['2'],
        elementIds: ['pipe-1', 'electrical-1'],
        color: '#4169E1',
        status: 'not-started'
      },
      {
        id: '5',
        name: 'Acabamento',
        startDate: new Date(baseDate.getTime() + 65 * 24 * 60 * 60 * 1000),
        endDate: new Date(baseDate.getTime() + 85 * 24 * 60 * 60 * 1000),
        duration: 20,
        progress: 0,
        dependencies: ['3', '4'],
        elementIds: ['floor-1', 'ceiling-1'],
        color: '#32CD32',
        status: 'not-started'
      }
    ];

    this.currentDate = this.tasks[1].startDate; // Começar na segunda tarefa
  }

  /**
   * Constrói a UI
   */
  private buildUI(): void {
    const container = document.createElement('div');
    container.className = 'timeline-panel';

    // Controls
    const controls = this.createControls();
    container.appendChild(controls);

    // Timeline canvas
    this.timelineCanvas.className = 'timeline-canvas';
    container.appendChild(this.timelineCanvas);

    // Task list
    const taskList = this.createTaskList();
    container.appendChild(taskList);

    // Stats
    const stats = this.createStats();
    container.appendChild(stats);

    this.card.setBody(container);
  }

  /**
   * Cria controles
   */
  private createControls(): HTMLElement {
    const controls = document.createElement('div');
    controls.className = 'timeline-controls';

    // Date display
    const dateDisplay = document.createElement('div');
    dateDisplay.className = 'timeline-date';
    dateDisplay.textContent = this.formatDate(this.currentDate);
    controls.appendChild(dateDisplay);

    // Playback controls
    const playbackControls = document.createElement('div');
    playbackControls.className = 'timeline-playback';

    const backBtn = new Button({
      label: '⏮️',
      size: 'sm',
      variant: 'ghost',
      onClick: () => this.skipToStart()
    });

    const prevBtn = new Button({
      label: '⏪',
      size: 'sm',
      variant: 'ghost',
      onClick: () => this.previousDay()
    });

    const playBtn = new Button({
      label: this.isPlaying ? '⏸️' : '▶️',
      size: 'sm',
      variant: 'primary',
      onClick: () => this.togglePlayback()
    });

    const nextBtn = new Button({
      label: '⏩',
      size: 'sm',
      variant: 'ghost',
      onClick: () => this.nextDay()
    });

    const forwardBtn = new Button({
      label: '⏭️',
      size: 'sm',
      variant: 'ghost',
      onClick: () => this.skipToEnd()
    });

    playbackControls.appendChild(backBtn.getElement());
    playbackControls.appendChild(prevBtn.getElement());
    playbackControls.appendChild(playBtn.getElement());
    playbackControls.appendChild(nextBtn.getElement());
    playbackControls.appendChild(forwardBtn.getElement());

    controls.appendChild(playbackControls);

    // Speed control
    const speedControl = document.createElement('div');
    speedControl.className = 'timeline-speed';

    const speedLabel = document.createElement('span');
    speedLabel.textContent = 'Velocidade:';
    speedControl.appendChild(speedLabel);

    const speedSelect = new Select({
      options: [
        { value: '0.5', label: '0.5x' },
        { value: '1', label: '1x' },
        { value: '2', label: '2x' },
        { value: '5', label: '5x' },
        { value: '10', label: '10x' }
      ],
      value: '1',
      onChange: (value) => {
        this.playbackSpeed = parseFloat(value);
      }
    });
    speedControl.appendChild(speedSelect.getElement());

    controls.appendChild(speedControl);

    return controls;
  }

  /**
   * Renderiza timeline
   */
  private renderTimeline(): void {
    const ctx = this.ctx;
    const width = this.timelineCanvas.width;
    const height = this.timelineCanvas.height;

    // Clear
    ctx.fillStyle = 'rgba(20, 20, 20, 0.95)';
    ctx.fillRect(0, 0, width, height);

    // Calculate date range
    const minDate = Math.min(...this.tasks.map(t => t.startDate.getTime()));
    const maxDate = Math.max(...this.tasks.map(t => t.endDate.getTime()));
    const range = maxDate - minDate;

    const padding = 50;
    const taskHeight = 30;
    const taskGap = 10;

    // Draw tasks
    this.tasks.forEach((task, index) => {
      const y = padding + index * (taskHeight + taskGap);
      
      // Calculate positions
      const startX = padding + ((task.startDate.getTime() - minDate) / range) * (width - 2 * padding);
      const endX = padding + ((task.endDate.getTime() - minDate) / range) * (width - 2 * padding);
      const taskWidth = endX - startX;

      // Draw task bar
      ctx.fillStyle = task.color;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(startX, y, taskWidth, taskHeight);

      // Draw progress
      ctx.globalAlpha = 1;
      ctx.fillRect(startX, y, taskWidth * (task.progress / 100), taskHeight);

      // Draw border
      ctx.strokeStyle = task.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(startX, y, taskWidth, taskHeight);

      // Draw task name
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial';
      ctx.fillText(task.name, startX + 5, y + 20);

      // Draw status icon
      const statusIcon = this.getStatusIcon(task.status);
      ctx.fillText(statusIcon, endX + 10, y + 20);
    });

    // Draw current date marker
    const currentX = padding + ((this.currentDate.getTime() - minDate) / range) * (width - 2 * padding);
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(currentX, padding);
    ctx.lineTo(currentX, height - padding);
    ctx.stroke();

    // Draw current date label
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(this.formatDate(this.currentDate), currentX + 5, padding - 10);

    ctx.globalAlpha = 1;
  }

  /**
   * Cria lista de tarefas
   */
  private createTaskList(): HTMLElement {
    const list = document.createElement('div');
    list.className = 'timeline-task-list';

    const header = document.createElement('div');
    header.className = 'timeline-task-list-header';
    header.textContent = 'Tarefas';
    list.appendChild(header);

    this.tasks.forEach(task => {
      const item = document.createElement('div');
      item.className = 'timeline-task-item';

      const color = document.createElement('div');
      color.className = 'timeline-task-color';
      color.style.background = task.color;
      item.appendChild(color);

      const info = document.createElement('div');
      info.className = 'timeline-task-info';

      const name = document.createElement('div');
      name.className = 'timeline-task-name';
      name.textContent = task.name;
      info.appendChild(name);

      const dates = document.createElement('div');
      dates.className = 'timeline-task-dates';
      dates.textContent = `${this.formatDate(task.startDate)} - ${this.formatDate(task.endDate)}`;
      info.appendChild(dates);

      item.appendChild(info);

      const progress = document.createElement('div');
      progress.className = 'timeline-task-progress';
      progress.textContent = `${task.progress}%`;
      item.appendChild(progress);

      list.appendChild(item);
    });

    return list;
  }

  /**
   * Cria estatísticas
   */
  private createStats(): HTMLElement {
    const stats = document.createElement('div');
    stats.className = 'timeline-stats';

    const totalTasks = this.tasks.length;
    const completedTasks = this.tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = this.tasks.filter(t => t.status === 'in-progress').length;
    const delayedTasks = this.tasks.filter(t => t.status === 'delayed').length;

    const items = [
      { label: 'Total', value: totalTasks, color: '#667eea' },
      { label: 'Concluídas', value: completedTasks, color: '#00ff88' },
      { label: 'Em progresso', value: inProgressTasks, color: '#ffd700' },
      { label: 'Atrasadas', value: delayedTasks, color: '#f5576c' }
    ];

    items.forEach(item => {
      const stat = document.createElement('div');
      stat.className = 'timeline-stat';

      const value = document.createElement('div');
      value.className = 'timeline-stat-value';
      value.textContent = item.value.toString();
      value.style.color = item.color;
      stat.appendChild(value);

      const label = document.createElement('div');
      label.className = 'timeline-stat-label';
      label.textContent = item.label;
      stat.appendChild(label);

      stats.appendChild(stat);
    });

    return stats;
  }

  /**
   * Toggle playback
   */
  private togglePlayback(): void {
    this.isPlaying = !this.isPlaying;

    if (this.isPlaying) {
      this.startPlayback();
    } else {
      this.stopPlayback();
    }

    // Update button
    const playBtn = this.card.getElement().querySelector('.timeline-playback .arxis-btn--primary') as HTMLElement;
    if (playBtn) {
      playBtn.textContent = this.isPlaying ? '⏸️' : '▶️';
    }
  }

  /**
   * Inicia playback
   */
  private startPlayback(): void {
    const animate = () => {
      if (!this.isPlaying) return;

      // Avançar 1 dia
      this.currentDate = new Date(this.currentDate.getTime() + 24 * 60 * 60 * 1000 * this.playbackSpeed);

      // Check if reached end
      const maxDate = Math.max(...this.tasks.map(t => t.endDate.getTime()));
      if (this.currentDate.getTime() > maxDate) {
        this.isPlaying = false;
        return;
      }

      this.renderTimeline();
      this.updateDateDisplay();

      // Schedule next frame (1 dia virtual = 100ms)
      this.animationFrame = window.setTimeout(animate, 100 / this.playbackSpeed);
    };

    animate();
  }

  /**
   * Para playback
   */
  private stopPlayback(): void {
    if (this.animationFrame !== null) {
      clearTimeout(this.animationFrame);
      this.animationFrame = null;
    }
  }

  /**
   * Próximo dia
   */
  private nextDay(): void {
    this.currentDate = new Date(this.currentDate.getTime() + 24 * 60 * 60 * 1000);
    this.renderTimeline();
    this.updateDateDisplay();
  }

  /**
   * Dia anterior
   */
  private previousDay(): void {
    this.currentDate = new Date(this.currentDate.getTime() - 24 * 60 * 60 * 1000);
    this.renderTimeline();
    this.updateDateDisplay();
  }

  /**
   * Pular para início
   */
  private skipToStart(): void {
    this.currentDate = new Date(Math.min(...this.tasks.map(t => t.startDate.getTime())));
    this.renderTimeline();
    this.updateDateDisplay();
  }

  /**
   * Pular para fim
   */
  private skipToEnd(): void {
    this.currentDate = new Date(Math.max(...this.tasks.map(t => t.endDate.getTime())));
    this.renderTimeline();
    this.updateDateDisplay();
  }

  /**
   * Atualiza display de data
   */
  private updateDateDisplay(): void {
    const dateDisplay = this.card.getElement().querySelector('.timeline-date') as HTMLElement;
    if (dateDisplay) {
      dateDisplay.textContent = this.formatDate(this.currentDate);
    }
  }

  /**
   * Formata data
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('pt-BR');
  }

  /**
   * Retorna ícone de status
   */
  private getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'completed': '✅',
      'in-progress': '🔄',
      'not-started': '⏳',
      'delayed': '⚠️'
    };
    return icons[status] || '❓';
  }

  /**
   * Aplica estilos CSS
   */
  private applyStyles(): void {
    if (document.getElementById('timeline-panel-styles')) return;

    const style = document.createElement('style');
    style.id = 'timeline-panel-styles';
    style.textContent = `
      .timeline-panel {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .timeline-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
      }

      .timeline-date {
        font-size: 16px;
        font-weight: 600;
        color: var(--theme-accent, #00ff88);
        font-family: 'Courier New', monospace;
      }

      .timeline-playback {
        display: flex;
        gap: 4px;
      }

      .timeline-speed {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      }

      .timeline-canvas {
        width: 100%;
        height: 400px;
        border-radius: 8px;
        background: rgba(20, 20, 20, 0.95);
      }

      .timeline-task-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .timeline-task-list-header {
        font-size: 14px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.7);
        padding: 8px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .timeline-task-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 6px;
        transition: background 0.15s ease;
      }

      .timeline-task-item:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .timeline-task-color {
        width: 4px;
        height: 40px;
        border-radius: 2px;
      }

      .timeline-task-info {
        flex: 1;
      }

      .timeline-task-name {
        font-size: 13px;
        font-weight: 500;
        color: var(--theme-foreground, #fff);
        margin-bottom: 4px;
      }

      .timeline-task-dates {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
      }

      .timeline-task-progress {
        font-size: 13px;
        font-weight: 600;
        color: var(--theme-accent, #00ff88);
        font-family: 'Courier New', monospace;
      }

      .timeline-stats {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        padding: 16px 0;
      }

      .timeline-stat {
        text-align: center;
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 6px;
      }

      .timeline-stat-value {
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 4px;
      }

      .timeline-stat-label {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Retorna o elemento
   */
  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  /**
   * Destrói o painel
   */
  public destroy(): void {
    this.stopPlayback();
    this.card.destroy();
  }
}
