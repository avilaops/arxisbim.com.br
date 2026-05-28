/**
 * UserPresence Component
 * Exibe usuários online no viewer com avatares e cursores
 */

import { getRealtimeService, RealtimeUser } from '../../services/RealtimeService';

export interface UserPresenceProps {
  container?: HTMLElement;
}

export class UserPresence {
  private container: HTMLElement;
  private realtimeService: ReturnType<typeof getRealtimeService>;
  private cursorElements: Map<string, HTMLElement> = new Map();
  private userListElement: HTMLElement | null = null;

  constructor(props: UserPresenceProps = {}) {
    this.container = props.container || document.body;
    this.realtimeService = getRealtimeService();
    this.init();
  }

  private init(): void {
    // Conectar ao serviço realtime
    this.realtimeService.connect();

    // Criar UI de lista de usuários
    this.createUserList();

    // Ouvir eventos
    this.realtimeService.onRealtimeEvent((event) => {
      this.handleRealtimeEvent(event);
    });
  }

  private createUserList(): void {
    this.userListElement = document.createElement('div');
    this.userListElement.className = 'user-presence-list';
    this.userListElement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 8px;
      z-index: 1000;
      min-width: 200px;
    `;

    this.container.appendChild(this.userListElement);
    this.updateUserList();
  }

  private updateUserList(): void {
    if (!this.userListElement) {
      return;
    }

    const users = this.realtimeService.getOnlineUsers();
    this.userListElement.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 8px;">
        Online (${users.length})
      </div>
      ${users.map(user => `
        <div style="display: flex; align-items: center; margin: 4px 0;">
          <div style="
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: ${user.color};
            margin-right: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
          ">
            ${user.name.charAt(0).toUpperCase()}
          </div>
          <span>${user.name}</span>
        </div>
      `).join('')}
    `;
  }

  private handleRealtimeEvent(event: any): void {
    switch (event.type) {
      case 'user_joined':
      case 'user_left':
        this.updateUserList();
        break;
      case 'cursor_moved':
        this.updateCursor(event.userId, event.data.cursor);
        break;
    }
  }

  private updateCursor(userId: string, cursor: { x: number; y: number }): void {
    let cursorElement = this.cursorElements.get(userId);

    if (!cursorElement) {
      cursorElement = document.createElement('div');
      cursorElement.className = 'remote-cursor';
      cursorElement.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 9999;
        transition: transform 0.1s ease-out;
      `;
      this.container.appendChild(cursorElement);
      this.cursorElements.set(userId, cursorElement);
    }

    const users = this.realtimeService.getOnlineUsers();
    const user = users.find(u => u.id === userId);

    if (user) {
      cursorElement.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="${user.color}">
          <path d="M5 2L15 12L10 13L12 18L5 2Z"/>
        </svg>
        <div style="
          background: ${user.color};
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          margin-left: 12px;
          white-space: nowrap;
        ">
          ${user.name}
        </div>
      `;
    }

    cursorElement.style.transform = `translate(${cursor.x}px, ${cursor.y}px)`;
  }

  private removeCursor(userId: string): void {
    const cursorElement = this.cursorElements.get(userId);
    if (cursorElement) {
      cursorElement.remove();
      this.cursorElements.delete(userId);
    }
  }

  dispose(): void {
    // Remover todos os cursores
    this.cursorElements.forEach(element => element.remove());
    this.cursorElements.clear();

    // Remover lista de usuários
    if (this.userListElement) {
      this.userListElement.remove();
    }

    // Desconectar
    this.realtimeService.disconnect();
  }
}

export default UserPresence;
