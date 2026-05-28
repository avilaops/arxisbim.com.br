/**
 * RealtimeService
 * Serviço de colaboração em tempo real via WebSocket
 * Suporta presença de usuários, chat e edição colaborativa
 */

import { eventBus } from '../../core';

export interface RealtimeUser {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  cursor?: { x: number; y: number };
  status: 'online' | 'away' | 'offline';
}

export interface RealtimeMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
  type: 'text' | 'system';
}

export interface RealtimeEvent {
  type: 'user_joined' | 'user_left' | 'cursor_moved' | 'message' | 'selection_changed';
  userId: string;
  timestamp: number;
  data?: any;
}

export type UnsubscribeFn = () => void;

class RealtimeService {
  private ws: WebSocket | null = null;
  private connected: boolean = false;
  private users: Map<string, RealtimeUser> = new Map();
  private messages: RealtimeMessage[] = [];
  private eventListeners: Set<(event: RealtimeEvent) => void> = new Set();
  private reconnectTimer: number | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  /**
   * Conecta ao servidor WebSocket
   */
  connect(url: string = 'ws://localhost:8080/realtime'): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[RealtimeService] Already connected');
      return;
    }

    console.log('[RealtimeService] Connecting to:', url);

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[RealtimeService] Connected');
      this.connected = true;
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.ws.onclose = () => {
      console.log('[RealtimeService] Disconnected');
      this.connected = false;
      this.scheduleReconnect(url);
    };

    this.ws.onerror = (error) => {
      console.error('[RealtimeService] WebSocket error:', error);
    };
  }

  /**
   * Desconecta do servidor
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connected = false;
    console.log('[RealtimeService] Disconnected');
  }

  /**
   * Envia mensagem de chat
   */
  sendMessage(content: string): void {
    if (!this.connected || !this.ws) {
      console.warn('[RealtimeService] Not connected');
      return;
    }

    const message = {
      type: 'message',
      content,
      timestamp: Date.now(),
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Atualiza posição do cursor
   */
  updateCursor(x: number, y: number): void {
    if (!this.connected || !this.ws) {
      return;
    }

    const cursorUpdate = {
      type: 'cursor_moved',
      x,
      y,
      timestamp: Date.now(),
    };

    this.ws.send(JSON.stringify(cursorUpdate));
  }

  /**
   * Notifica mudança de seleção
   */
  notifySelection(elementIds: string[]): void {
    if (!this.connected || !this.ws) {
      return;
    }

    const selectionUpdate = {
      type: 'selection_changed',
      elementIds,
      timestamp: Date.now(),
    };

    this.ws.send(JSON.stringify(selectionUpdate));
  }

  /**
   * Retorna usuários online
   */
  getOnlineUsers(): RealtimeUser[] {
    return Array.from(this.users.values()).filter(u => u.status === 'online');
  }

  /**
   * Retorna histórico de mensagens
   */
  getMessages(): RealtimeMessage[] {
    return [...this.messages];
  }

  /**
   * Eventos de realtime
   */
  onRealtimeEvent(callback: (event: RealtimeEvent) => void): UnsubscribeFn {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  /**
   * Processa mensagem recebida
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'user_joined':
          this.handleUserJoined(message);
          break;
        case 'user_left':
          this.handleUserLeft(message);
          break;
        case 'cursor_moved':
          this.handleCursorMoved(message);
          break;
        case 'message':
          this.handleChatMessage(message);
          break;
        case 'selection_changed':
          this.handleSelectionChanged(message);
          break;
        case 'user_list':
          this.handleUserList(message);
          break;
      }
    } catch (error) {
      console.error('[RealtimeService] Failed to parse message:', error);
    }
  }

  /**
   * Usuário entrou
   */
  private handleUserJoined(data: any): void {
    const user: RealtimeUser = {
      id: data.userId,
      name: data.userName,
      avatar: data.avatar,
      color: data.color || this.generateColor(),
      status: 'online',
    };

    this.users.set(user.id, user);

    this.emitRealtimeEvent('user_joined', user.id, { user });
    console.log('[RealtimeService] User joined:', user.name);
  }

  /**
   * Usuário saiu
   */
  private handleUserLeft(data: any): void {
    const userId = data.userId;
    this.users.delete(userId);

    this.emitRealtimeEvent('user_left', userId);
    console.log('[RealtimeService] User left:', userId);
  }

  /**
   * Cursor movido
   */
  private handleCursorMoved(data: any): void {
    const userId = data.userId;
    const user = this.users.get(userId);

    if (user) {
      user.cursor = { x: data.x, y: data.y };
      this.emitRealtimeEvent('cursor_moved', userId, { cursor: user.cursor });
    }
  }

  /**
   * Mensagem de chat
   */
  private handleChatMessage(data: any): void {
    const message: RealtimeMessage = {
      id: data.messageId,
      userId: data.userId,
      userName: data.userName,
      content: data.content,
      timestamp: data.timestamp,
      type: data.type || 'text',
    };

    this.messages.push(message);

    // Manter apenas últimas 50 mensagens
    if (this.messages.length > 50) {
      this.messages = this.messages.slice(-50);
    }

    this.emitRealtimeEvent('message', message.userId, { message });
  }

  /**
   * Seleção mudou
   */
  private handleSelectionChanged(data: any): void {
    this.emitRealtimeEvent('selection_changed', data.userId, { elementIds: data.elementIds });
  }

  /**
   * Lista de usuários
   */
  private handleUserList(data: any): void {
    data.users.forEach((userData: any) => {
      const user: RealtimeUser = {
        id: userData.id,
        name: userData.name,
        avatar: userData.avatar,
        color: userData.color || this.generateColor(),
        status: userData.status,
      };
      this.users.set(user.id, user);
    });

    console.log('[RealtimeService] User list updated:', this.users.size);
  }

  /**
   * Agenda reconexão
   */
  private scheduleReconnect(url: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[RealtimeService] Max reconnect attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`[RealtimeService] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = window.setTimeout(() => {
      this.connect(url);
    }, delay);
  }

  /**
   * Emite evento de realtime
   */
  private emitRealtimeEvent(type: RealtimeEvent['type'], userId: string, data?: any): void {
    const event: RealtimeEvent = {
      type,
      userId,
      timestamp: Date.now(),
      data,
    };

    this.eventListeners.forEach(listener => listener(event));
  }

  /**
   * Gera cor aleatória para usuário
   */
  private generateColor(): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Verifica se está conectado
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Retorna estatísticas
   */
  getStats(): Record<string, number> {
    return {
      onlineUsers: this.getOnlineUsers().length,
      totalUsers: this.users.size,
      messages: this.messages.length,
      connected: this.connected ? 1 : 0,
    };
  }
}

// Singleton instance
let realtimeServiceInstance: RealtimeService | null = null;

export function getRealtimeService(): RealtimeService {
  if (!realtimeServiceInstance) {
    realtimeServiceInstance = new RealtimeService();
  }
  return realtimeServiceInstance;
}

export default RealtimeService;
