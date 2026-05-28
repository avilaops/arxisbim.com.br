/**
 * Annotations Panel
 * Painel de marcações e comentários 3D
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import { Select } from '../design-system/components/Select';

export interface Annotation {
  id: string;
  type: 'comment' | 'issue' | 'measurement' | 'warning';
  title: string;
  description: string;
  author: string;
  timestamp: number;
  position: { x: number; y: number; z: number };
  cameraView?: { position: any; target: any };
  status: 'open' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  elementIds?: string[];
}

export class AnnotationsPanel {
  private card: Card;
  private annotations: Annotation[] = [];
  private filterStatus: string = 'all';
  private filterType: string = 'all';
  private onAnnotationClick?: (annotation: Annotation) => void;
  private onAnnotationAdd?: () => void;

  constructor(options?: {
    onAnnotationClick?: (annotation: Annotation) => void;
    onAnnotationAdd?: () => void;
  }) {
    this.onAnnotationClick = options?.onAnnotationClick;
    this.onAnnotationAdd = options?.onAnnotationAdd;
    
    this.card = new Card({
      title: '📍 Anotações',
      variant: 'glass'
    });

    this.loadMockAnnotations();
    this.render();
  }

  private loadMockAnnotations(): void {
    const now = Date.now();
    this.annotations = [
      {
        id: 'ann-1',
        type: 'issue',
        title: 'Interferência hidráulica',
        description: 'Tubulação passando pela viga V-15',
        author: 'João Silva',
        timestamp: now - 86400000,
        position: { x: 10, y: 5, z: 8 },
        status: 'open',
        priority: 'high',
        assignedTo: 'Maria Santos'
      },
      {
        id: 'ann-2',
        type: 'comment',
        title: 'Verificar acabamento',
        description: 'Confirmar tipo de revestimento especificado',
        author: 'Maria Santos',
        timestamp: now - 43200000,
        position: { x: -5, y: 2, z: 3 },
        status: 'open',
        priority: 'medium'
      },
      {
        id: 'ann-3',
        type: 'warning',
        title: 'Atenção estrutural',
        description: 'Sobrecarga detectada no pavimento',
        author: 'Carlos Souza',
        timestamp: now - 21600000,
        position: { x: 0, y: 10, z: 0 },
        status: 'open',
        priority: 'high'
      },
      {
        id: 'ann-4',
        type: 'measurement',
        title: 'Medição de área',
        description: 'Área total: 450m²',
        author: 'Ana Lima',
        timestamp: now - 7200000,
        position: { x: 5, y: 0, z: -5 },
        status: 'closed',
        priority: 'low'
      }
    ];
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'arxis-annotations__toolbar';

    const addBtn = new Button({ text: '➕ Nova Anotação', variant: 'primary', size: 'sm' });
    addBtn.getElement().addEventListener('click', () => {
      this.onAnnotationAdd?.();
    });

    const exportBtn = new Button({ text: '📤 Exportar BCF', variant: 'secondary', size: 'sm' });
    exportBtn.getElement().addEventListener('click', () => this.exportBCF());

    toolbar.appendChild(addBtn.getElement());
    toolbar.appendChild(exportBtn.getElement());
    body.appendChild(toolbar);

    // Filters
    const filters = document.createElement('div');
    filters.className = 'arxis-annotations__filters';

    const statusFilter = new Select({
      label: 'Status:',
      options: [
        { value: 'all', label: 'Todos' },
        { value: 'open', label: 'Abertos' },
        { value: 'resolved', label: 'Resolvidos' },
        { value: 'closed', label: 'Fechados' }
      ],
      value: this.filterStatus,
      onChange: (value) => {
        this.filterStatus = value;
        this.render();
      }
    });

    const typeFilter = new Select({
      label: 'Tipo:',
      options: [
        { value: 'all', label: 'Todos' },
        { value: 'comment', label: 'Comentários' },
        { value: 'issue', label: 'Problemas' },
        { value: 'warning', label: 'Avisos' },
        { value: 'measurement', label: 'Medições' }
      ],
      value: this.filterType,
      onChange: (value) => {
        this.filterType = value;
        this.render();
      }
    });

    filters.appendChild(statusFilter.getElement());
    filters.appendChild(typeFilter.getElement());
    body.appendChild(filters);

    // Stats
    const stats = document.createElement('div');
    stats.className = 'arxis-annotations__stats';
    const openCount = this.annotations.filter(a => a.status === 'open').length;
    const highPriority = this.annotations.filter(a => a.priority === 'high' && a.status === 'open').length;
    stats.innerHTML = `
      <span class="arxis-annotations__stat">📊 ${this.annotations.length} total</span>
      <span class="arxis-annotations__stat">🔓 ${openCount} abertos</span>
      <span class="arxis-annotations__stat">⚠️ ${highPriority} alta prioridade</span>
    `;
    body.appendChild(stats);

    // Annotations list
    const list = document.createElement('div');
    list.className = 'arxis-annotations__list';

    const filtered = this.getFilteredAnnotations();

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'arxis-annotations__empty';
      empty.textContent = 'Nenhuma anotação encontrada';
      list.appendChild(empty);
    } else {
      filtered.forEach(annotation => {
        const item = this.createAnnotationItem(annotation);
        list.appendChild(item);
      });
    }

    body.appendChild(list);
    this.injectStyles();
  }

  private getFilteredAnnotations(): Annotation[] {
    return this.annotations.filter(ann => {
      if (this.filterStatus !== 'all' && ann.status !== this.filterStatus) return false;
      if (this.filterType !== 'all' && ann.type !== this.filterType) return false;
      return true;
    });
  }

  private createAnnotationItem(annotation: Annotation): HTMLDivElement {
    const item = document.createElement('div');
    item.className = `arxis-annotations__item arxis-annotations__item--${annotation.priority}`;
    
    if (annotation.status === 'closed') {
      item.classList.add('arxis-annotations__item--closed');
    }

    // Icon
    const icon = document.createElement('div');
    icon.className = 'arxis-annotations__icon';
    icon.textContent = this.getIcon(annotation.type);
    item.appendChild(icon);

    // Content
    const content = document.createElement('div');
    content.className = 'arxis-annotations__content';

    const header = document.createElement('div');
    header.className = 'arxis-annotations__header';

    const title = document.createElement('h4');
    title.className = 'arxis-annotations__title';
    title.textContent = annotation.title;

    const badges = document.createElement('div');
    badges.className = 'arxis-annotations__badges';

    const priorityBadge = document.createElement('span');
    priorityBadge.className = `arxis-annotations__badge arxis-annotations__badge--${annotation.priority}`;
    priorityBadge.textContent = this.getPriorityLabel(annotation.priority);

    const statusBadge = document.createElement('span');
    statusBadge.className = `arxis-annotations__badge arxis-annotations__badge--${annotation.status}`;
    statusBadge.textContent = this.getStatusLabel(annotation.status);

    badges.appendChild(priorityBadge);
    badges.appendChild(statusBadge);

    header.appendChild(title);
    header.appendChild(badges);

    const description = document.createElement('p');
    description.className = 'arxis-annotations__description';
    description.textContent = annotation.description;

    const meta = document.createElement('div');
    meta.className = 'arxis-annotations__meta';
    meta.innerHTML = `
      <span>👤 ${annotation.author}</span>
      <span>📅 ${this.formatDate(annotation.timestamp)}</span>
      ${annotation.assignedTo ? `<span>👥 ${annotation.assignedTo}</span>` : ''}
    `;

    content.appendChild(header);
    content.appendChild(description);
    content.appendChild(meta);
    item.appendChild(content);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'arxis-annotations__actions';

    const viewBtn = new Button({ text: '👁️', variant: 'secondary', size: 'sm' });
    viewBtn.getElement().addEventListener('click', () => {
      this.onAnnotationClick?.(annotation);
    });

    const editBtn = new Button({ text: '✏️', variant: 'secondary', size: 'sm' });
    editBtn.getElement().addEventListener('click', () => this.editAnnotation(annotation));

    const deleteBtn = new Button({ text: '🗑️', variant: 'danger', size: 'sm' });
    deleteBtn.getElement().addEventListener('click', () => this.deleteAnnotation(annotation.id));

    actions.appendChild(viewBtn.getElement());
    actions.appendChild(editBtn.getElement());
    actions.appendChild(deleteBtn.getElement());
    item.appendChild(actions);

    item.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement).closest('button')) {
        this.onAnnotationClick?.(annotation);
      }
    });

    return item;
  }

  private getIcon(type: string): string {
    const icons: Record<string, string> = {
      comment: '💬',
      issue: '⚠️',
      measurement: '📏',
      warning: '🚨'
    };
    return icons[type] || '📍';
  }

  private getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta'
    };
    return labels[priority] || priority;
  }

  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      open: 'Aberto',
      resolved: 'Resolvido',
      closed: 'Fechado'
    };
    return labels[status] || status;
  }

  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);

    if (days === 0) return 'Hoje';
    if (days === 1) return 'Ontem';
    if (days < 7) return `${days} dias atrás`;
    return date.toLocaleDateString('pt-BR');
  }

  private editAnnotation(annotation: Annotation): void {
    console.log('Editar:', annotation);
    // Implementar edição
  }

  private deleteAnnotation(id: string): void {
    if (!confirm('Excluir esta anotação?')) return;
    this.annotations = this.annotations.filter(a => a.id !== id);
    this.render();
  }

  private exportBCF(): void {
    console.log('Exportando BCF...');
    // Implementar exportação BCF
  }

  public addAnnotation(annotation: Annotation): void {
    this.annotations.unshift(annotation);
    this.render();
  }

  public getAnnotations(): Annotation[] {
    return this.annotations;
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.card.destroy();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-annotations-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-annotations-styles';
    style.textContent = `
      .arxis-annotations__toolbar {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }

      .arxis-annotations__filters {
        display: flex;
        gap: 12px;
        margin-bottom: 12px;
      }

      .arxis-annotations__stats {
        display: flex;
        gap: 16px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 6px;
        margin-bottom: 12px;
      }

      .arxis-annotations__stat {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.8);
      }

      .arxis-annotations__list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: 500px;
        overflow-y: auto;
      }

      .arxis-annotations__item {
        display: flex;
        gap: 12px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.05);
        border-left: 3px solid transparent;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .arxis-annotations__item:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .arxis-annotations__item--high {
        border-left-color: #ff4444;
      }

      .arxis-annotations__item--medium {
        border-left-color: #ffaa00;
      }

      .arxis-annotations__item--low {
        border-left-color: #00d4ff;
      }

      .arxis-annotations__item--closed {
        opacity: 0.6;
      }

      .arxis-annotations__icon {
        font-size: 24px;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        flex-shrink: 0;
      }

      .arxis-annotations__content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .arxis-annotations__header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
      }

      .arxis-annotations__title {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #fff;
      }

      .arxis-annotations__badges {
        display: flex;
        gap: 6px;
        flex-shrink: 0;
      }

      .arxis-annotations__badge {
        padding: 3px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
        white-space: nowrap;
      }

      .arxis-annotations__badge--high {
        background: rgba(255, 68, 68, 0.2);
        color: #ff4444;
      }

      .arxis-annotations__badge--medium {
        background: rgba(255, 170, 0, 0.2);
        color: #ffaa00;
      }

      .arxis-annotations__badge--low {
        background: rgba(0, 212, 255, 0.2);
        color: #00d4ff;
      }

      .arxis-annotations__badge--open {
        background: rgba(0, 212, 255, 0.2);
        color: #00d4ff;
      }

      .arxis-annotations__badge--resolved {
        background: rgba(76, 175, 80, 0.2);
        color: #4caf50;
      }

      .arxis-annotations__badge--closed {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.6);
      }

      .arxis-annotations__description {
        margin: 0;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.8);
        line-height: 1.4;
      }

      .arxis-annotations__meta {
        display: flex;
        gap: 12px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }

      .arxis-annotations__actions {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex-shrink: 0;
      }

      .arxis-annotations__empty {
        text-align: center;
        padding: 40px 20px;
        color: rgba(255, 255, 255, 0.5);
      }
    `;
    document.head.appendChild(style);
  }
}
