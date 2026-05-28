/**
 * SchedulePanel Component - BIM 4D Cronograma
 * Gerenciamento detalhado de cronograma de construção
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import { Input } from '../design-system/components/Input';
import { Select } from '../design-system/components/Select';

export interface ScheduleActivity {
  id: string;
  name: string;
  code: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  progress: number;
  predecessors: string[];
  resources: ScheduleResource[];
  elementIds: string[];
  status: 'planned' | 'active' | 'completed' | 'delayed';
  criticality: 'critical' | 'near-critical' | 'normal';
}

export interface ScheduleResource {
  type: 'labor' | 'equipment' | 'material';
  name: string;
  quantity: number;
  unit: string;
  cost: number;
}

export class SchedulePanel {
  private card: Card;
  private activities: ScheduleActivity[] = [];
  private filteredActivities: ScheduleActivity[] = [];
  private sortBy: 'startDate' | 'code' | 'duration' | 'progress' = 'startDate';
  private filterStatus: string = 'all';

  constructor() {
    this.card = new Card({
      title: '📅 Cronograma (4D)',
      collapsible: true
    });

    this.loadMockActivities();
    this.applyFilters();
    this.buildUI();
    this.applyStyles();
  }

  /**
   * Carrega atividades mock
   */
  private loadMockActivities(): void {
    const baseDate = new Date('2025-01-01');

    this.activities = [
      {
        id: '1',
        name: 'Mobilização de canteiro',
        code: 'A-001',
        startDate: new Date(baseDate),
        endDate: new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000),
        duration: 5,
        progress: 100,
        predecessors: [],
        resources: [
          { type: 'labor', name: 'Operários', quantity: 4, unit: 'pessoas', cost: 200 },
          { type: 'equipment', name: 'Containers', quantity: 2, unit: 'un', cost: 500 }
        ],
        elementIds: [],
        status: 'completed',
        criticality: 'critical'
      },
      {
        id: '2',
        name: 'Escavação',
        code: 'A-002',
        startDate: new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000),
        endDate: new Date(baseDate.getTime() + 10 * 24 * 60 * 60 * 1000),
        duration: 5,
        progress: 100,
        predecessors: ['1'],
        resources: [
          { type: 'labor', name: 'Operadores', quantity: 2, unit: 'pessoas', cost: 300 },
          { type: 'equipment', name: 'Retroescavadeira', quantity: 1, unit: 'un', cost: 800 }
        ],
        elementIds: ['excavation-1'],
        status: 'completed',
        criticality: 'critical'
      },
      {
        id: '3',
        name: 'Fundação - Estacas',
        code: 'A-003',
        startDate: new Date(baseDate.getTime() + 10 * 24 * 60 * 60 * 1000),
        endDate: new Date(baseDate.getTime() + 18 * 24 * 60 * 60 * 1000),
        duration: 8,
        progress: 80,
        predecessors: ['2'],
        resources: [
          { type: 'labor', name: 'Especialistas', quantity: 6, unit: 'pessoas', cost: 450 },
          { type: 'equipment', name: 'Bate-estaca', quantity: 1, unit: 'un', cost: 1200 },
          { type: 'material', name: 'Concreto', quantity: 15, unit: 'm³', cost: 350 }
        ],
        elementIds: ['pile-1', 'pile-2', 'pile-3'],
        status: 'active',
        criticality: 'critical'
      },
      {
        id: '4',
        name: 'Fundação - Blocos',
        code: 'A-004',
        startDate: new Date(baseDate.getTime() + 18 * 24 * 60 * 60 * 1000),
        endDate: new Date(baseDate.getTime() + 23 * 24 * 60 * 60 * 1000),
        duration: 5,
        progress: 30,
        predecessors: ['3'],
        resources: [
          { type: 'labor', name: 'Pedreiros', quantity: 8, unit: 'pessoas', cost: 320 },
          { type: 'material', name: 'Concreto', quantity: 25, unit: 'm³', cost: 350 },
          { type: 'material', name: 'Aço', quantity: 1.5, unit: 'ton', cost: 4500 }
        ],
        elementIds: ['foundation-1', 'foundation-2'],
        status: 'active',
        criticality: 'critical'
      },
      {
        id: '5',
        name: 'Estrutura - 1º Pavimento',
        code: 'A-005',
        startDate: new Date(baseDate.getTime() + 23 * 24 * 60 * 60 * 1000),
        endDate: new Date(baseDate.getTime() + 35 * 24 * 60 * 60 * 1000),
        duration: 12,
        progress: 0,
        predecessors: ['4'],
        resources: [
          { type: 'labor', name: 'Equipe estrutura', quantity: 12, unit: 'pessoas', cost: 400 },
          { type: 'equipment', name: 'Betoneira', quantity: 1, unit: 'un', cost: 300 },
          { type: 'material', name: 'Concreto', quantity: 45, unit: 'm³', cost: 350 }
        ],
        elementIds: ['column-1', 'beam-1', 'slab-1'],
        status: 'planned',
        criticality: 'critical'
      }
    ];
  }

  /**
   * Aplica filtros
   */
  private applyFilters(): void {
    this.filteredActivities = this.activities.filter(activity => {
      if (this.filterStatus === 'all') return true;
      return activity.status === this.filterStatus;
    });

    // Sort
    this.filteredActivities.sort((a, b) => {
      switch (this.sortBy) {
        case 'startDate':
          return a.startDate.getTime() - b.startDate.getTime();
        case 'code':
          return a.code.localeCompare(b.code);
        case 'duration':
          return b.duration - a.duration;
        case 'progress':
          return b.progress - a.progress;
        default:
          return 0;
      }
    });
  }

  /**
   * Constrói a UI
   */
  private buildUI(): void {
    const container = document.createElement('div');
    container.className = 'schedule-panel';

    // Controls
    const controls = this.createControls();
    container.appendChild(controls);

    // Stats
    const stats = this.createStats();
    container.appendChild(stats);

    // Activities list
    const list = this.createActivityList();
    container.appendChild(list);

    // Critical path
    const criticalPath = this.createCriticalPath();
    container.appendChild(criticalPath);

    this.card.setBody(container);
  }

  /**
   * Cria controles
   */
  private createControls(): HTMLElement {
    const controls = document.createElement('div');
    controls.className = 'schedule-controls';

    // Search
    const search = new Input({
      placeholder: 'Buscar atividade...',
      icon: '🔍',
      size: 'sm',
      onChange: (value) => this.searchActivities(value)
    });
    controls.appendChild(search.getElement());

    // Filters
    const filterRow = document.createElement('div');
    filterRow.className = 'schedule-filter-row';

    const statusFilter = new Select({
      options: [
        { value: 'all', label: 'Todos os status' },
        { value: 'planned', label: 'Planejadas' },
        { value: 'active', label: 'Em andamento' },
        { value: 'completed', label: 'Concluídas' },
        { value: 'delayed', label: 'Atrasadas' }
      ],
      value: this.filterStatus,
      size: 'sm',
      onChange: (value) => {
        this.filterStatus = value;
        this.applyFilters();
        this.buildUI();
      }
    });
    filterRow.appendChild(statusFilter.getElement());

    const sortSelect = new Select({
      options: [
        { value: 'startDate', label: 'Data de início' },
        { value: 'code', label: 'Código' },
        { value: 'duration', label: 'Duração' },
        { value: 'progress', label: 'Progresso' }
      ],
      value: this.sortBy,
      size: 'sm',
      onChange: (value) => {
        this.sortBy = value as any;
        this.applyFilters();
        this.buildUI();
      }
    });
    filterRow.appendChild(sortSelect.getElement());

    controls.appendChild(filterRow);

    return controls;
  }

  /**
   * Cria estatísticas
   */
  private createStats(): HTMLElement {
    const stats = document.createElement('div');
    stats.className = 'schedule-stats';

    const total = this.activities.length;
    const completed = this.activities.filter(a => a.status === 'completed').length;
    const active = this.activities.filter(a => a.status === 'active').length;
    const planned = this.activities.filter(a => a.status === 'planned').length;
    const avgProgress = this.activities.reduce((sum, a) => sum + a.progress, 0) / total;

    const items = [
      { label: 'Total', value: total, color: '#667eea' },
      { label: 'Concluídas', value: completed, color: '#00ff88' },
      { label: 'Em andamento', value: active, color: '#ffd700' },
      { label: 'Planejadas', value: planned, color: '#64b5f6' },
      { label: 'Progresso médio', value: `${avgProgress.toFixed(0)}%`, color: '#f093fb' }
    ];

    items.forEach(item => {
      const stat = document.createElement('div');
      stat.className = 'schedule-stat';
      stat.innerHTML = `
        <div class="schedule-stat-value" style="color: ${item.color}">${item.value}</div>
        <div class="schedule-stat-label">${item.label}</div>
      `;
      stats.appendChild(stat);
    });

    return stats;
  }

  /**
   * Cria lista de atividades
   */
  private createActivityList(): HTMLElement {
    const list = document.createElement('div');
    list.className = 'schedule-activity-list';

    const header = document.createElement('div');
    header.className = 'schedule-activity-header';
    header.innerHTML = `
      <div>Código</div>
      <div>Atividade</div>
      <div>Início</div>
      <div>Duração</div>
      <div>Progresso</div>
      <div>Status</div>
    `;
    list.appendChild(header);

    this.filteredActivities.forEach(activity => {
      const item = this.createActivityItem(activity);
      list.appendChild(item);
    });

    return list;
  }

  /**
   * Cria item de atividade
   */
  private createActivityItem(activity: ScheduleActivity): HTMLElement {
    const item = document.createElement('div');
    item.className = 'schedule-activity-item';

    if (activity.criticality === 'critical') {
      item.classList.add('schedule-activity-item--critical');
    }

    // Code
    const code = document.createElement('div');
    code.className = 'schedule-activity-code';
    code.textContent = activity.code;
    item.appendChild(code);

    // Name
    const name = document.createElement('div');
    name.className = 'schedule-activity-name';
    name.textContent = activity.name;
    item.appendChild(name);

    // Start date
    const start = document.createElement('div');
    start.className = 'schedule-activity-date';
    start.textContent = activity.startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    item.appendChild(start);

    // Duration
    const duration = document.createElement('div');
    duration.className = 'schedule-activity-duration';
    duration.textContent = `${activity.duration}d`;
    item.appendChild(duration);

    // Progress
    const progress = document.createElement('div');
    progress.className = 'schedule-activity-progress';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'schedule-progress-bar';
    
    const progressFill = document.createElement('div');
    progressFill.className = 'schedule-progress-fill';
    progressFill.style.width = `${activity.progress}%`;
    progressBar.appendChild(progressFill);
    
    const progressText = document.createElement('span');
    progressText.textContent = `${activity.progress}%`;
    
    progress.appendChild(progressBar);
    progress.appendChild(progressText);
    item.appendChild(progress);

    // Status
    const status = document.createElement('div');
    status.className = `schedule-activity-status schedule-activity-status--${activity.status}`;
    status.textContent = this.getStatusLabel(activity.status);
    item.appendChild(status);

    // Click handler
    item.addEventListener('click', () => {
      this.showActivityDetails(activity);
    });

    return item;
  }

  /**
   * Cria caminho crítico
   */
  private createCriticalPath(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'schedule-critical-section';

    const header = document.createElement('div');
    header.className = 'schedule-critical-header';
    header.innerHTML = `
      <span>⚠️ Caminho Crítico</span>
      <span class="schedule-critical-count">${this.activities.filter(a => a.criticality === 'critical').length} atividades</span>
    `;
    section.appendChild(header);

    const critical = this.activities.filter(a => a.criticality === 'critical');
    
    const chain = document.createElement('div');
    chain.className = 'schedule-critical-chain';
    
    critical.forEach((activity, index) => {
      const node = document.createElement('div');
      node.className = 'schedule-critical-node';
      node.textContent = activity.code;
      chain.appendChild(node);

      if (index < critical.length - 1) {
        const arrow = document.createElement('div');
        arrow.className = 'schedule-critical-arrow';
        arrow.textContent = '→';
        chain.appendChild(arrow);
      }
    });

    section.appendChild(chain);

    return section;
  }

  /**
   * Busca atividades
   */
  private searchActivities(query: string): void {
    if (!query.trim()) {
      this.applyFilters();
    } else {
      const lowerQuery = query.toLowerCase();
      this.filteredActivities = this.activities.filter(a => 
        a.name.toLowerCase().includes(lowerQuery) ||
        a.code.toLowerCase().includes(lowerQuery)
      );
    }
    
    const list = this.card.getElement().querySelector('.schedule-activity-list');
    if (list) {
      list.innerHTML = '';
      const header = document.createElement('div');
      header.className = 'schedule-activity-header';
      header.innerHTML = `
        <div>Código</div>
        <div>Atividade</div>
        <div>Início</div>
        <div>Duração</div>
        <div>Progresso</div>
        <div>Status</div>
      `;
      list.appendChild(header);
      
      this.filteredActivities.forEach(activity => {
        list.appendChild(this.createActivityItem(activity));
      });
    }
  }

  /**
   * Mostra detalhes da atividade
   */
  private showActivityDetails(activity: ScheduleActivity): void {
    console.log('Atividade:', activity);
    // Implementar modal de detalhes
  }

  /**
   * Retorna label do status
   */
  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'planned': 'Planejada',
      'active': 'Em andamento',
      'completed': 'Concluída',
      'delayed': 'Atrasada'
    };
    return labels[status] || status;
  }

  /**
   * Aplica estilos CSS
   */
  private applyStyles(): void {
    if (document.getElementById('schedule-panel-styles')) return;

    const style = document.createElement('style');
    style.id = 'schedule-panel-styles';
    style.textContent = `
      .schedule-panel {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .schedule-controls {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .schedule-filter-row {
        display: flex;
        gap: 8px;
      }

      .schedule-filter-row > * {
        flex: 1;
      }

      .schedule-stats {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 12px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
      }

      .schedule-stat {
        text-align: center;
      }

      .schedule-stat-value {
        font-size: 20px;
        font-weight: 700;
        margin-bottom: 4px;
      }

      .schedule-stat-label {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
      }

      .schedule-activity-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .schedule-activity-header {
        display: grid;
        grid-template-columns: 80px 2fr 80px 80px 140px 100px;
        gap: 12px;
        padding: 8px 12px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.5);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .schedule-activity-item {
        display: grid;
        grid-template-columns: 80px 2fr 80px 80px 140px 100px;
        gap: 12px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s ease;
        font-size: 13px;
        align-items: center;
      }

      .schedule-activity-item:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .schedule-activity-item--critical {
        border-left: 3px solid #f5576c;
      }

      .schedule-activity-code {
        font-weight: 600;
        font-family: 'Courier New', monospace;
        color: var(--theme-accent, #00ff88);
      }

      .schedule-activity-name {
        color: var(--theme-foreground, #fff);
      }

      .schedule-activity-date {
        color: rgba(255, 255, 255, 0.7);
      }

      .schedule-activity-duration {
        font-family: 'Courier New', monospace;
        color: rgba(255, 255, 255, 0.7);
      }

      .schedule-activity-progress {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .schedule-progress-bar {
        flex: 1;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        overflow: hidden;
      }

      .schedule-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #00ff88 0%, #00d9ff 100%);
        transition: width 0.3s ease;
      }

      .schedule-activity-progress span {
        font-size: 11px;
        font-weight: 600;
        font-family: 'Courier New', monospace;
        color: var(--theme-accent, #00ff88);
        min-width: 35px;
      }

      .schedule-activity-status {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        text-align: center;
      }

      .schedule-activity-status--planned {
        background: rgba(100, 181, 246, 0.2);
        color: #64b5f6;
      }

      .schedule-activity-status--active {
        background: rgba(255, 215, 0, 0.2);
        color: #ffd700;
      }

      .schedule-activity-status--completed {
        background: rgba(0, 255, 136, 0.2);
        color: #00ff88;
      }

      .schedule-activity-status--delayed {
        background: rgba(245, 87, 108, 0.2);
        color: #f5576c;
      }

      .schedule-critical-section {
        padding: 16px;
        background: rgba(245, 87, 108, 0.05);
        border: 1px solid rgba(245, 87, 108, 0.2);
        border-radius: 8px;
      }

      .schedule-critical-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        font-size: 14px;
        font-weight: 600;
      }

      .schedule-critical-count {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }

      .schedule-critical-chain {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .schedule-critical-node {
        padding: 8px 12px;
        background: rgba(245, 87, 108, 0.2);
        border: 1px solid #f5576c;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
        font-family: 'Courier New', monospace;
        color: #f5576c;
      }

      .schedule-critical-arrow {
        font-size: 16px;
        color: #f5576c;
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
    this.card.destroy();
  }
}
