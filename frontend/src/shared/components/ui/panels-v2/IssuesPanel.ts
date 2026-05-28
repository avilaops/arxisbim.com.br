/**
 * Issues Panel
 * Gestão de issues com suporte a BCF (BIM Collaboration Format)
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import { Select } from '../design-system/components/Select';

export interface Issue {
  id: string;
  title: string;
  description: string;
  type: 'error' | 'warning' | 'info' | 'question';
  status: 'open' | 'in-progress' | 'resolved' | 'closed' | 'rejected';
  priority: 'critical' | 'high' | 'medium' | 'low';
  assignee?: string;
  reporter: string;
  dueDate?: number;
  createdAt: number;
  updatedAt: number;
  elementIds: string[];
  viewpoint?: {
    camera: any;
    clippingPlanes?: any[];
    hiddenElements?: string[];
  };
  comments: IssueComment[];
  labels: string[];
}

export interface IssueComment {
  id: string;
  author: string;
  content: string;
  timestamp: number;
}

export class IssuesPanel {
  private card: Card;
  private issues: Issue[] = [];
  private filterStatus: string = 'all';
  private filterPriority: string = 'all';
  private sortBy: string = 'date';
  private onIssueSelect?: (issue: Issue) => void;

  constructor(options?: {
    onIssueSelect?: (issue: Issue) => void;
  }) {
    this.onIssueSelect = options?.onIssueSelect;
    
    this.card = new Card({
      title: '🐛 Issues',
      variant: 'glass'
    });

    this.loadMockIssues();
    this.render();
  }

  private loadMockIssues(): void {
    const now = Date.now();
    this.issues = [
      {
        id: 'issue-1',
        title: 'Clash entre estrutura e hidráulica',
        description: 'Tubulação de 150mm passa através da viga V-23. Necessário ajuste de projeto.',
        type: 'error',
        status: 'open',
        priority: 'critical',
        reporter: 'Sistema',
        assignee: 'João Silva',
        createdAt: now - 86400000,
        updatedAt: now - 43200000,
        elementIds: ['V-23', 'TUB-H-045'],
        comments: [
          {
            id: 'c1',
            author: 'João Silva',
            content: 'Analisando opções de desvio',
            timestamp: now - 43200000
          }
        ],
        labels: ['clash', 'estrutura', 'hidráulica']
      },
      {
        id: 'issue-2',
        title: 'Altura de pé-direito insuficiente',
        description: 'Sala 205 com pé-direito de 2.35m, abaixo do mínimo de 2.50m',
        type: 'warning',
        status: 'in-progress',
        priority: 'high',
        reporter: 'Maria Santos',
        assignee: 'Carlos Souza',
        dueDate: now + 604800000,
        createdAt: now - 172800000,
        updatedAt: now - 21600000,
        elementIds: ['SALA-205'],
        comments: [],
        labels: ['arquitetura', 'norma']
      },
      {
        id: 'issue-3',
        title: 'Verificar especificação de vidro',
        description: 'Confirmar se vidro temperado 8mm é adequado para fachada sul',
        type: 'question',
        status: 'open',
        priority: 'medium',
        reporter: 'Ana Lima',
        createdAt: now - 259200000,
        updatedAt: now - 259200000,
        elementIds: ['FAC-SUL-01'],
        comments: [],
        labels: ['fachada', 'especificação']
      },
      {
        id: 'issue-4',
        title: 'Documentação atualizada',
        description: 'Plantas estruturais revisadas conforme solicitação',
        type: 'info',
        status: 'resolved',
        priority: 'low',
        reporter: 'Pedro Costa',
        assignee: 'Maria Santos',
        createdAt: now - 604800000,
        updatedAt: now - 86400000,
        elementIds: [],
        comments: [
          {
            id: 'c2',
            author: 'Maria Santos',
            content: 'Documentação aprovada',
            timestamp: now - 86400000
          }
        ],
        labels: ['documentação']
      }
    ];
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'arxis-issues__toolbar';

    const newBtn = new Button({ text: '➕ Nova Issue', variant: 'primary', size: 'sm' });
    newBtn.getElement().addEventListener('click', () => this.createIssue());

    const importBtn = new Button({ text: '📥 Importar BCF', variant: 'secondary', size: 'sm' });
    importBtn.getElement().addEventListener('click', () => this.importBCF());

    const exportBtn = new Button({ text: '📤 Exportar BCF', variant: 'secondary', size: 'sm' });
    exportBtn.getElement().addEventListener('click', () => this.exportBCF());

    toolbar.appendChild(newBtn.getElement());
    toolbar.appendChild(importBtn.getElement());
    toolbar.appendChild(exportBtn.getElement());
    body.appendChild(toolbar);

    // Filters & Sort
    const controls = document.createElement('div');
    controls.className = 'arxis-issues__controls';

    const statusSelect = new Select({
      label: 'Status:',
      options: [
        { value: 'all', label: 'Todos' },
        { value: 'open', label: 'Abertos' },
        { value: 'in-progress', label: 'Em Progresso' },
        { value: 'resolved', label: 'Resolvidos' },
        { value: 'closed', label: 'Fechados' }
      ],
      value: this.filterStatus,
      onChange: (value) => {
        this.filterStatus = value;
        this.render();
      }
    });

    const prioritySelect = new Select({
      label: 'Prioridade:',
      options: [
        { value: 'all', label: 'Todas' },
        { value: 'critical', label: 'Crítica' },
        { value: 'high', label: 'Alta' },
        { value: 'medium', label: 'Média' },
        { value: 'low', label: 'Baixa' }
      ],
      value: this.filterPriority,
      onChange: (value) => {
        this.filterPriority = value;
        this.render();
      }
    });

    const sortSelect = new Select({
      label: 'Ordenar:',
      options: [
        { value: 'date', label: 'Data' },
        { value: 'priority', label: 'Prioridade' },
        { value: 'status', label: 'Status' },
        { value: 'title', label: 'Título' }
      ],
      value: this.sortBy,
      onChange: (value) => {
        this.sortBy = value;
        this.render();
      }
    });

    controls.appendChild(statusSelect.getElement());
    controls.appendChild(prioritySelect.getElement());
    controls.appendChild(sortSelect.getElement());
    body.appendChild(controls);

    // Summary
    const summary = this.renderSummary();
    body.appendChild(summary);

    // Issues list
    const list = document.createElement('div');
    list.className = 'arxis-issues__list';

    const filtered = this.getFilteredIssues();

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'arxis-issues__empty';
      empty.innerHTML = '📋 Nenhuma issue encontrada';
      list.appendChild(empty);
    } else {
      filtered.forEach(issue => {
        const item = this.createIssueItem(issue);
        list.appendChild(item);
      });
    }

    body.appendChild(list);
    this.injectStyles();
  }

  private renderSummary(): HTMLDivElement {
    const summary = document.createElement('div');
    summary.className = 'arxis-issues__summary';

    const counts = {
      total: this.issues.length,
      open: this.issues.filter(i => i.status === 'open').length,
      inProgress: this.issues.filter(i => i.status === 'in-progress').length,
      critical: this.issues.filter(i => i.priority === 'critical' && i.status !== 'closed').length
    };

    summary.innerHTML = `
      <div class="arxis-issues__summary-item">
        <span class="arxis-issues__summary-value">${counts.total}</span>
        <span class="arxis-issues__summary-label">Total</span>
      </div>
      <div class="arxis-issues__summary-item">
        <span class="arxis-issues__summary-value" style="color: #00d4ff;">${counts.open}</span>
        <span class="arxis-issues__summary-label">Abertos</span>
      </div>
      <div class="arxis-issues__summary-item">
        <span class="arxis-issues__summary-value" style="color: #ffaa00;">${counts.inProgress}</span>
        <span class="arxis-issues__summary-label">Em Progresso</span>
      </div>
      <div class="arxis-issues__summary-item">
        <span class="arxis-issues__summary-value" style="color: #ff4444;">${counts.critical}</span>
        <span class="arxis-issues__summary-label">Críticos</span>
      </div>
    `;

    return summary;
  }

  private getFilteredIssues(): Issue[] {
    let filtered = this.issues.filter(issue => {
      if (this.filterStatus !== 'all' && issue.status !== this.filterStatus) return false;
      if (this.filterPriority !== 'all' && issue.priority !== this.filterPriority) return false;
      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (this.sortBy) {
        case 'date':
          return b.createdAt - a.createdAt;
        case 'priority':
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case 'status':
          return a.status.localeCompare(b.status);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered;
  }

  private createIssueItem(issue: Issue): HTMLDivElement {
    const item = document.createElement('div');
    item.className = `arxis-issues__item arxis-issues__item--${issue.priority}`;

    // Icon & Type
    const iconContainer = document.createElement('div');
    iconContainer.className = 'arxis-issues__icon-container';
    
    const icon = document.createElement('div');
    icon.className = `arxis-issues__icon arxis-issues__icon--${issue.type}`;
    icon.textContent = this.getTypeIcon(issue.type);
    
    iconContainer.appendChild(icon);
    item.appendChild(iconContainer);

    // Content
    const content = document.createElement('div');
    content.className = 'arxis-issues__content';

    const header = document.createElement('div');
    header.className = 'arxis-issues__header';

    const titleWrapper = document.createElement('div');
    titleWrapper.className = 'arxis-issues__title-wrapper';

    const title = document.createElement('h4');
    title.className = 'arxis-issues__title';
    title.textContent = issue.title;

    const id = document.createElement('span');
    id.className = 'arxis-issues__id';
    id.textContent = issue.id;

    titleWrapper.appendChild(title);
    titleWrapper.appendChild(id);

    const badges = document.createElement('div');
    badges.className = 'arxis-issues__badges';

    const priorityBadge = document.createElement('span');
    priorityBadge.className = `arxis-issues__badge arxis-issues__badge--${issue.priority}`;
    priorityBadge.textContent = this.getPriorityLabel(issue.priority);

    const statusBadge = document.createElement('span');
    statusBadge.className = `arxis-issues__badge arxis-issues__badge--${issue.status}`;
    statusBadge.textContent = this.getStatusLabel(issue.status);

    badges.appendChild(priorityBadge);
    badges.appendChild(statusBadge);

    header.appendChild(titleWrapper);
    header.appendChild(badges);

    const description = document.createElement('p');
    description.className = 'arxis-issues__description';
    description.textContent = issue.description;

    const meta = document.createElement('div');
    meta.className = 'arxis-issues__meta';

    const metaItems = [
      `👤 ${issue.reporter}`,
      `📅 ${this.formatDate(issue.createdAt)}`,
      issue.assignee ? `👥 ${issue.assignee}` : null,
      issue.dueDate ? `⏰ ${this.formatDate(issue.dueDate)}` : null,
      issue.comments.length > 0 ? `💬 ${issue.comments.length}` : null,
      issue.elementIds.length > 0 ? `🔗 ${issue.elementIds.length} elementos` : null
    ].filter(Boolean);

    meta.innerHTML = metaItems.join('<span class="arxis-issues__separator">•</span>');

    if (issue.labels.length > 0) {
      const labels = document.createElement('div');
      labels.className = 'arxis-issues__labels';
      issue.labels.forEach(label => {
        const labelEl = document.createElement('span');
        labelEl.className = 'arxis-issues__label';
        labelEl.textContent = `#${label}`;
        labels.appendChild(labelEl);
      });
      meta.appendChild(labels);
    }

    content.appendChild(header);
    content.appendChild(description);
    content.appendChild(meta);
    item.appendChild(content);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'arxis-issues__actions';

    const viewBtn = new Button({ text: '👁️', variant: 'secondary', size: 'sm' });
    viewBtn.getElement().addEventListener('click', (e) => {
      e.stopPropagation();
      this.viewIssue(issue);
    });

    const editBtn = new Button({ text: '✏️', variant: 'secondary', size: 'sm' });
    editBtn.getElement().addEventListener('click', (e) => {
      e.stopPropagation();
      this.editIssue(issue);
    });

    actions.appendChild(viewBtn.getElement());
    actions.appendChild(editBtn.getElement());
    item.appendChild(actions);

    item.addEventListener('click', () => {
      this.onIssueSelect?.(issue);
    });

    return item;
  }

  private getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      question: '❓'
    };
    return icons[type] || '📌';
  }

  private getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      critical: 'Crítica',
      high: 'Alta',
      medium: 'Média',
      low: 'Baixa'
    };
    return labels[priority] || priority;
  }

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      open: 'Aberto',
      'in-progress': 'Em Progresso',
      resolved: 'Resolvido',
      closed: 'Fechado',
      rejected: 'Rejeitado'
    };
    return labels[status] || status;
  }

  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  private createIssue(): void {
    console.log('Criar nova issue');
  }

  private viewIssue(issue: Issue): void {
    this.onIssueSelect?.(issue);
  }

  private editIssue(issue: Issue): void {
    console.log('Editar issue:', issue);
  }

  private importBCF(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.bcf,.bcfzip';
    input.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        console.log('Importando BCF:', file.name);
      }
    });
    input.click();
  }

  private exportBCF(): void {
    console.log('Exportando issues como BCF...');
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.card.destroy();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-issues-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-issues-styles';
    style.textContent = `
      .arxis-issues__toolbar {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }

      .arxis-issues__controls {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
        margin-bottom: 12px;
      }

      .arxis-issues__summary {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
        padding: 16px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        margin-bottom: 16px;
      }

      .arxis-issues__summary-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .arxis-issues__summary-value {
        font-size: 24px;
        font-weight: 700;
        color: #fff;
      }

      .arxis-issues__summary-label {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }

      .arxis-issues__list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: 500px;
        overflow-y: auto;
      }

      .arxis-issues__item {
        display: flex;
        gap: 12px;
        padding: 16px;
        background: rgba(255, 255, 255, 0.05);
        border-left: 4px solid transparent;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .arxis-issues__item:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateX(2px);
      }

      .arxis-issues__item--critical {
        border-left-color: #ff0000;
      }

      .arxis-issues__item--high {
        border-left-color: #ff4444;
      }

      .arxis-issues__item--medium {
        border-left-color: #ffaa00;
      }

      .arxis-issues__item--low {
        border-left-color: #00d4ff;
      }

      .arxis-issues__icon-container {
        display: flex;
        align-items: flex-start;
        padding-top: 4px;
      }

      .arxis-issues__icon {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        border-radius: 8px;
        flex-shrink: 0;
      }

      .arxis-issues__icon--error {
        background: rgba(255, 68, 68, 0.2);
      }

      .arxis-issues__icon--warning {
        background: rgba(255, 170, 0, 0.2);
      }

      .arxis-issues__icon--info {
        background: rgba(0, 212, 255, 0.2);
      }

      .arxis-issues__icon--question {
        background: rgba(123, 47, 247, 0.2);
      }

      .arxis-issues__content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .arxis-issues__header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
      }

      .arxis-issues__title-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      }

      .arxis-issues__title {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
        color: #fff;
      }

      .arxis-issues__id {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
        font-family: monospace;
      }

      .arxis-issues__badges {
        display: flex;
        gap: 6px;
        flex-shrink: 0;
      }

      .arxis-issues__badge {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
      }

      .arxis-issues__badge--critical {
        background: rgba(255, 0, 0, 0.2);
        color: #ff0000;
      }

      .arxis-issues__badge--high {
        background: rgba(255, 68, 68, 0.2);
        color: #ff4444;
      }

      .arxis-issues__badge--medium {
        background: rgba(255, 170, 0, 0.2);
        color: #ffaa00;
      }

      .arxis-issues__badge--low {
        background: rgba(0, 212, 255, 0.2);
        color: #00d4ff;
      }

      .arxis-issues__badge--open {
        background: rgba(0, 212, 255, 0.2);
        color: #00d4ff;
      }

      .arxis-issues__badge--in-progress {
        background: rgba(255, 170, 0, 0.2);
        color: #ffaa00;
      }

      .arxis-issues__badge--resolved {
        background: rgba(76, 175, 80, 0.2);
        color: #4caf50;
      }

      .arxis-issues__badge--closed {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.6);
      }

      .arxis-issues__description {
        margin: 0;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.8);
        line-height: 1.5;
      }

      .arxis-issues__meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }

      .arxis-issues__separator {
        color: rgba(255, 255, 255, 0.3);
      }

      .arxis-issues__labels {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 4px;
      }

      .arxis-issues__label {
        padding: 2px 8px;
        background: rgba(123, 47, 247, 0.2);
        border-radius: 10px;
        font-size: 11px;
        color: #7b2ff7;
      }

      .arxis-issues__actions {
        display: flex;
        gap: 6px;
        flex-shrink: 0;
      }

      .arxis-issues__empty {
        text-align: center;
        padding: 60px 20px;
        color: rgba(255, 255, 255, 0.5);
        font-size: 15px;
      }
    `;
    document.head.appendChild(style);
  }
}
