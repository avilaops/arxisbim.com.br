/**
 * User Presence Widget
 * Widget de presença de usuários online
 */

import { Card } from '../design-system/components/Card';

export interface User {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  currentView?: string;
  lastSeen?: number;
  color?: string;
}

export class UserPresenceWidget {
  private card: Card;
  private users: User[] = [];
  private onUserClick?: (user: User) => void;
  private updateInterval?: number;

  constructor(options?: {
    onUserClick?: (user: User) => void;
  }) {
    this.onUserClick = options?.onUserClick;
    
    this.card = new Card({
      title: '👥 Usuários Online',
      variant: 'glass'
    });

    this.loadMockUsers();
    this.render();
    this.startAutoUpdate();
  }

  private loadMockUsers(): void {
    this.users = [
      {
        id: 'user-1',
        name: 'João Silva',
        status: 'online',
        currentView: 'Pavimento 3 - Estrutura',
        color: '#00d4ff'
      },
      {
        id: 'user-2',
        name: 'Maria Santos',
        status: 'online',
        currentView: 'Fachada Sul',
        color: '#7b2ff7'
      },
      {
        id: 'user-3',
        name: 'Carlos Souza',
        status: 'away',
        currentView: 'Planta Baixa',
        lastSeen: Date.now() - 300000,
        color: '#ffaa00'
      },
      {
        id: 'user-4',
        name: 'Ana Lima',
        status: 'busy',
        currentView: 'Instalações Hidráulicas',
        color: '#ff4444'
      },
      {
        id: 'user-5',
        name: 'Pedro Costa',
        status: 'offline',
        lastSeen: Date.now() - 3600000,
        color: '#4caf50'
      }
    ];
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    // Summary
    const summary = document.createElement('div');
    summary.className = 'arxis-presence__summary';
    
    const onlineCount = this.users.filter(u => u.status === 'online').length;
    const awayCount = this.users.filter(u => u.status === 'away').length;
    const busyCount = this.users.filter(u => u.status === 'busy').length;

    summary.innerHTML = `
      <div class="arxis-presence__count">
        <span class="arxis-presence__count-value">${onlineCount}</span>
        <span class="arxis-presence__count-label">Online</span>
      </div>
      <div class="arxis-presence__count arxis-presence__count--away">
        <span class="arxis-presence__count-value">${awayCount}</span>
        <span class="arxis-presence__count-label">Ausente</span>
      </div>
      <div class="arxis-presence__count arxis-presence__count--busy">
        <span class="arxis-presence__count-value">${busyCount}</span>
        <span class="arxis-presence__count-label">Ocupado</span>
      </div>
    `;
    body.appendChild(summary);

    // Users list
    const list = document.createElement('div');
    list.className = 'arxis-presence__list';

    // Sort: online first, then by name
    const sortedUsers = [...this.users].sort((a, b) => {
      const statusOrder = { online: 0, busy: 1, away: 2, offline: 3 };
      const aOrder = statusOrder[a.status];
      const bOrder = statusOrder[b.status];
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    });

    sortedUsers.forEach(user => {
      const item = this.createUserItem(user);
      list.appendChild(item);
    });

    body.appendChild(list);
    this.injectStyles();
  }

  private createUserItem(user: User): HTMLDivElement {
    const item = document.createElement('div');
    item.className = `arxis-presence__user arxis-presence__user--${user.status}`;

    // Avatar
    const avatarWrapper = document.createElement('div');
    avatarWrapper.className = 'arxis-presence__avatar-wrapper';

    const avatar = document.createElement('div');
    avatar.className = 'arxis-presence__avatar';
    avatar.style.background = user.color || '#00d4ff';
    avatar.textContent = user.avatar || this.getInitials(user.name);

    const statusIndicator = document.createElement('div');
    statusIndicator.className = `arxis-presence__status arxis-presence__status--${user.status}`;

    avatarWrapper.appendChild(avatar);
    avatarWrapper.appendChild(statusIndicator);
    item.appendChild(avatarWrapper);

    // Info
    const info = document.createElement('div');
    info.className = 'arxis-presence__info';

    const name = document.createElement('div');
    name.className = 'arxis-presence__name';
    name.textContent = user.name;

    const status = document.createElement('div');
    status.className = 'arxis-presence__status-text';
    
    if (user.status === 'online' || user.status === 'busy') {
      status.innerHTML = `
        <span class="arxis-presence__view">📍 ${user.currentView || 'Navegando'}</span>
      `;
    } else if (user.status === 'away') {
      const timeAway = this.formatTimeAgo(user.lastSeen || Date.now());
      status.innerHTML = `
        <span class="arxis-presence__away">⏸️ Ausente há ${timeAway}</span>
      `;
    } else {
      const lastSeen = this.formatTimeAgo(user.lastSeen || Date.now());
      status.innerHTML = `
        <span class="arxis-presence__offline">Visto há ${lastSeen}</span>
      `;
    }

    info.appendChild(name);
    info.appendChild(status);
    item.appendChild(info);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'arxis-presence__actions';

    if (user.status !== 'offline') {
      const followBtn = document.createElement('button');
      followBtn.className = 'arxis-presence__action-btn';
      followBtn.textContent = '👁️';
      followBtn.title = 'Seguir usuário';
      followBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.followUser(user);
      });
      actions.appendChild(followBtn);

      const chatBtn = document.createElement('button');
      chatBtn.className = 'arxis-presence__action-btn';
      chatBtn.textContent = '💬';
      chatBtn.title = 'Enviar mensagem';
      chatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.chatWithUser(user);
      });
      actions.appendChild(chatBtn);
    }

    item.appendChild(actions);

    item.addEventListener('click', () => {
      this.onUserClick?.(user);
    });

    return item;
  }

  private getInitials(name: string): string {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  private formatTimeAgo(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'agora';
    if (minutes < 60) return `${minutes}min`;
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }

  private followUser(user: User): void {
    console.log('Seguindo usuário:', user.name);
    // Implementar seguir câmera do usuário
  }

  private chatWithUser(user: User): void {
    console.log('Iniciando chat com:', user.name);
    // Abrir chat direto com usuário
  }

  private startAutoUpdate(): void {
    this.updateInterval = window.setInterval(() => {
      // Simular updates de status
      const randomUser = this.users[Math.floor(Math.random() * this.users.length)];
      if (randomUser.status === 'online' && Math.random() > 0.7) {
        randomUser.currentView = this.getRandomView();
        this.render();
      }
    }, 10000);
  }

  private getRandomView(): string {
    const views = [
      'Pavimento Térreo',
      'Pavimento 1',
      'Cobertura',
      'Fachada Norte',
      'Corte AA',
      'Vista 3D',
      'Estrutura',
      'Instalações'
    ];
    return views[Math.floor(Math.random() * views.length)];
  }

  public addUser(user: User): void {
    this.users.push(user);
    this.render();
  }

  public removeUser(userId: string): void {
    this.users = this.users.filter(u => u.id !== userId);
    this.render();
  }

  public updateUser(userId: string, updates: Partial<User>): void {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      Object.assign(user, updates);
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
    if (document.getElementById('arxis-presence-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-presence-styles';
    style.textContent = `
      .arxis-presence__summary {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 6px;
        margin-bottom: 16px;
      }

      .arxis-presence__count {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .arxis-presence__count-value {
        font-size: 22px;
        font-weight: 700;
        color: #00d4ff;
      }

      .arxis-presence__count--away .arxis-presence__count-value {
        color: #ffaa00;
      }

      .arxis-presence__count--busy .arxis-presence__count-value {
        color: #ff4444;
      }

      .arxis-presence__count-label {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
        text-transform: uppercase;
      }

      .arxis-presence__list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 400px;
        overflow-y: auto;
      }

      .arxis-presence__user {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px;
        background: rgba(255, 255, 255, 0.04);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .arxis-presence__user:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateX(2px);
      }

      .arxis-presence__user--offline {
        opacity: 0.5;
      }

      .arxis-presence__avatar-wrapper {
        position: relative;
        flex-shrink: 0;
      }

      .arxis-presence__avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 14px;
        font-weight: 600;
      }

      .arxis-presence__status {
        position: absolute;
        bottom: -2px;
        right: -2px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid rgba(0, 0, 0, 0.8);
      }

      .arxis-presence__status--online {
        background: #4caf50;
        box-shadow: 0 0 8px rgba(76, 175, 80, 0.6);
      }

      .arxis-presence__status--away {
        background: #ffaa00;
      }

      .arxis-presence__status--busy {
        background: #ff4444;
      }

      .arxis-presence__status--offline {
        background: #666;
      }

      .arxis-presence__info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
      }

      .arxis-presence__name {
        font-size: 14px;
        font-weight: 500;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .arxis-presence__status-text {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }

      .arxis-presence__view {
        color: rgba(0, 212, 255, 0.8);
      }

      .arxis-presence__away {
        color: rgba(255, 170, 0, 0.8);
      }

      .arxis-presence__offline {
        color: rgba(255, 255, 255, 0.5);
      }

      .arxis-presence__actions {
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.2s;
      }

      .arxis-presence__user:hover .arxis-presence__actions {
        opacity: 1;
      }

      .arxis-presence__action-btn {
        width: 32px;
        height: 32px;
        border: none;
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .arxis-presence__action-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.1);
      }
    `;
    document.head.appendChild(style);
  }
}
