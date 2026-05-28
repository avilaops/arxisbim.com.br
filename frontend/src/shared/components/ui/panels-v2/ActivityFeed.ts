/**
 * Activity Feed
 * Feed de atividades do projeto em tempo real
 */

import { Card } from '../design-system/components/Card';
import { Select } from '../design-system/components/Select';

export interface Activity {
  id: string;
  type: 'edit' | 'comment' | 'issue' | 'upload' | 'delete' | 'share' | 'view' | 'export';
  user: string;
  userId: string;
  action: string;
  target?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export class ActivityFeed {
  private card: Card;
  private activities: Activity[] = [];
  private filterType: string = 'all';
  private filterUser: string = 'all';
  private autoScroll: boolean = true;
  private updateInterval?: number;

  constructor() {
    this.card = new Card({
      title: '📋 Feed de Atividades',
      variant: 'glass'
    });

    this.loadMockActivities();
    this.render();
    this.startAutoUpdate();
  }

  private loadMockActivities(): void {
    const now = Date.now();
    this.activities = [
      {
        id: 'act-1',
        type: 'edit',
        user: 'João Silva',
        userId: 'user-1',
        action: 'editou',
        target: 'Viga V-23',
        timestamp: now - 60000
      },
      {
        id: 'act-2',
        type: 'comment',
        user: 'Maria Santos',
        userId: 'user-2',
        action: 'comentou em',
        target: 'Issue #42',
        timestamp: now - 180000
      },
      {
        id: 'act-3',
        type: 'issue',
        user: 'Carlos Souza',
        userId: 'user-3',
        action: 'criou',
        target: 'Issue #43: Interferência hidráulica',
        timestamp: now - 300000
      },
      {
        id: 'act-4',
        type: 'upload',
        user: 'Ana Lima',
        userId: 'user-4',
        action: 'enviou',
        target: 'Planta Estrutural Rev.08',
        timestamp: now - 600000
      },
      {
        id: 'act-5',
        type: 'view',
        user: 'Pedro Costa',
        userId: 'user-5',
        action: 'visualizou',
        target: 'Pavimento 3',
        timestamp: now - 900000
      },
      {
        id: 'act-6',
        type: 'export',
        user: 'João Silva',
        userId: 'user-1',
        action: 'exportou',
        target: 'Relatório BCF',
        timestamp: now - 1200000
      },
      {
        id: 'act-7',
        type: 'share',
        user: 'Maria Santos',
        userId: 'user-2',
        action: 'compartilhou',
        target: 'Vista 3D com equipe',
        timestamp: now - 1800000
      },
      {
        id: 'act-8',
        type: 'delete',
        user: 'Carlos Souza',
        userId: 'user-3',
        action: 'removeu',
        target: 'Anotação #15',
        timestamp: now - 3600000
      }
    ];
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    // Controls
    const controls = document.createElement('div');
    controls.className = 'arxis-activity__controls';

    const typeFilter = new Select({
      label: 'Tipo:',
      options: [
        { value: 'all', label: 'Todas' },
        { value: 'edit', label: 'Edições' },
        { value: 'comment', label: 'Comentários' },
        { value: 'issue', label: 'Issues' },
        { value: 'upload', label: 'Uploads' },
        { value: 'export', label: 'Exportações' }
      ],
      value: this.filterType,
      onChange: (value) => {
        this.filterType = value;
        this.render();
      }
    });

    const userFilter = new Select({
      label: 'Usuário:',
      options: [
        { value: 'all', label: 'Todos' },
        ...this.getUniqueUsers().map(user => ({
          value: user.userId,
          label: user.userName
        }))
      ],
      value: this.filterUser,
      onChange: (value) => {
        this.filterUser = value;
        this.render();
      }
    });

    controls.appendChild(typeFilter.getElement());
    controls.appendChild(userFilter.getElement());
    body.appendChild(controls);

    // Timeline
    const timeline = document.createElement('div');
    timeline.className = 'arxis-activity__timeline';

    const filtered = this.getFilteredActivities();

    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'arxis-activity__empty';
      empty.innerHTML = '📭 Nenhuma atividade recente';
      timeline.appendChild(empty);
    } else {
      // Group by date
      const grouped = this.groupByDate(filtered);
      
      Object.entries(grouped).forEach(([date, items]) => {
        const dateHeader = document.createElement('div');
        dateHeader.className = 'arxis-activity__date-header';
        dateHeader.textContent = date;
        timeline.appendChild(dateHeader);

        items.forEach(activity => {
          const item = this.createActivityItem(activity);
          timeline.appendChild(item);
        });
      });
    }

    body.appendChild(timeline);
    this.injectStyles();

    // Auto scroll to bottom
    if (this.autoScroll) {
      setTimeout(() => {
        timeline.scrollTop = 0;
      }, 0);
    }
  }

  private getFilteredActivities(): Activity[] {
    return this.activities.filter(activity => {
      if (this.filterType !== 'all' && activity.type !== this.filterType) return false;
      if (this.filterUser !== 'all' && activity.userId !== this.filterUser) return false;
      return true;
    });
  }

  private groupByDate(activities: Activity[]): Record<string, Activity[]> {
    const groups: Record<string, Activity[]> = {};
    
    activities.forEach(activity => {
      const date = this.getDateLabel(activity.timestamp);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
    });

    return groups;
  }

  private getDateLabel(timestamp: number): string {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'long',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  }

  private getUniqueUsers(): Array<{ userId: string; userName: string }> {
    const users = new Map<string, string>();
    this.activities.forEach(activity => {
      users.set(activity.userId, activity.user);
    });
    return Array.from(users.entries()).map(([userId, userName]) => ({
      userId,
      userName
    }));
  }

  private createActivityItem(activity: Activity): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'arxis-activity__item';

    // Icon
    const icon = document.createElement('div');
    icon.className = `arxis-activity__icon arxis-activity__icon--${activity.type}`;
    icon.textContent = this.getTypeIcon(activity.type);
    item.appendChild(icon);

    // Content
    const content = document.createElement('div');
    content.className = 'arxis-activity__content';

    const text = document.createElement('div');
    text.className = 'arxis-activity__text';
    
    const user = document.createElement('strong');
    user.textContent = activity.user;
    
    const action = document.createTextNode(` ${activity.action} `);
    
    text.appendChild(user);
    text.appendChild(action);
    
    if (activity.target) {
      const target = document.createElement('span');
      target.className = 'arxis-activity__target';
      target.textContent = activity.target;
      text.appendChild(target);
    }

    const time = document.createElement('div');
    time.className = 'arxis-activity__time';
    time.textContent = this.formatTime(activity.timestamp);

    content.appendChild(text);
    content.appendChild(time);
    item.appendChild(content);

    return item;
  }

  private getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      edit: '✏️',
      comment: '💬',
      issue: '⚠️',
      upload: '📤',
      delete: '🗑️',
      share: '🔗',
      view: '👁️',
      export: '📥'
    };
    return icons[type] || '📌';
  }

  private formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes} min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  private startAutoUpdate(): void {
    this.updateInterval = window.setInterval(() => {
      // Simular nova atividade
      if (Math.random() > 0.7) {
        const types: Activity['type'][] = ['edit', 'comment', 'view', 'share'];
        const users = this.getUniqueUsers();
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const randomType = types[Math.floor(Math.random() * types.length)];

        const newActivity: Activity = {
          id: `act-${Date.now()}`,
          type: randomType,
          user: randomUser.userName,
          userId: randomUser.userId,
          action: this.getActionVerb(randomType),
          target: this.getRandomTarget(randomType),
          timestamp: Date.now()
        };

        this.activities.unshift(newActivity);
        this.render();
      }
    }, 15000);
  }

  private getActionVerb(type: Activity['type']): string {
    const verbs: Record<Activity['type'], string> = {
      edit: 'editou',
      comment: 'comentou em',
      issue: 'criou',
      upload: 'enviou',
      delete: 'removeu',
      share: 'compartilhou',
      view: 'visualizou',
      export: 'exportou'
    };
    return verbs[type];
  }

  private getRandomTarget(type: Activity['type']): string {
    const targets: Record<Activity['type'], string[]> = {
      edit: ['Viga V-15', 'Pilar P-23', 'Laje L-08'],
      comment: ['Issue #42', 'Anotação #18', 'Revisão estrutural'],
      issue: ['Interferência detectada', 'Erro de dimensão', 'Verificação necessária'],
      upload: ['Planta Rev.09', 'Corte AA', 'Memorial descritivo'],
      delete: ['Anotação #12', 'Comentário antigo', 'Versão anterior'],
      share: ['Vista 3D', 'Relatório de clash', 'Modelo BIM'],
      view: ['Pavimento 2', 'Fachada Norte', 'Cobertura'],
      export: ['Relatório PDF', 'Modelo IFC', 'Imagens renderizadas']
    };
    const options = targets[type] || ['Elemento'];
    return options[Math.floor(Math.random() * options.length)];
  }

  public addActivity(activity: Activity): void {
    this.activities.unshift(activity);
    this.render();
  }

  public clearActivities(): void {
    if (confirm('Limpar histórico de atividades?')) {
      this.activities = [];
      this.render();
    }
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    this.card.destroy();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-activity-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-activity-styles';
    style.textContent = `
      .arxis-activity__controls {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
      }

      .arxis-activity__timeline {
        max-height: 500px;
        overflow-y: auto;
        padding-right: 4px;
      }

      .arxis-activity__date-header {
        position: sticky;
        top: 0;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(10px);
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.8);
        text-transform: uppercase;
        margin-bottom: 12px;
        margin-top: 8px;
        z-index: 1;
      }

      .arxis-activity__date-header:first-child {
        margin-top: 0;
      }

      .arxis-activity__item {
        display: flex;
        gap: 12px;
        padding: 12px;
        margin-left: 8px;
        border-left: 2px solid rgba(255, 255, 255, 0.1);
        position: relative;
        animation: slideIn 0.3s;
      }

      .arxis-activity__item::before {
        content: '';
        position: absolute;
        left: -5px;
        top: 20px;
        width: 8px;
        height: 8px;
        background: rgba(0, 212, 255, 0.5);
        border-radius: 50%;
      }

      .arxis-activity__item:hover {
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
      }

      .arxis-activity__icon {
        width: 36px;
        height: 36px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.05);
      }

      .arxis-activity__icon--edit {
        background: rgba(0, 212, 255, 0.15);
      }

      .arxis-activity__icon--comment {
        background: rgba(123, 47, 247, 0.15);
      }

      .arxis-activity__icon--issue {
        background: rgba(255, 68, 68, 0.15);
      }

      .arxis-activity__icon--upload {
        background: rgba(76, 175, 80, 0.15);
      }

      .arxis-activity__icon--delete {
        background: rgba(255, 68, 68, 0.15);
      }

      .arxis-activity__icon--share {
        background: rgba(255, 170, 0, 0.15);
      }

      .arxis-activity__icon--view {
        background: rgba(0, 212, 255, 0.15);
      }

      .arxis-activity__icon--export {
        background: rgba(76, 175, 80, 0.15);
      }

      .arxis-activity__content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .arxis-activity__text {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.9);
        line-height: 1.4;
      }

      .arxis-activity__text strong {
        color: #00d4ff;
        font-weight: 600;
      }

      .arxis-activity__target {
        color: rgba(255, 255, 255, 0.7);
        font-style: italic;
      }

      .arxis-activity__time {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
      }

      .arxis-activity__empty {
        text-align: center;
        padding: 60px 20px;
        color: rgba(255, 255, 255, 0.5);
        font-size: 15px;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(-10px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
    `;
    document.head.appendChild(style);
  }
}
