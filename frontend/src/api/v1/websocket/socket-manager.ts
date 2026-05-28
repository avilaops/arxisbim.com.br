/**
 * WebSocket Manager - Socket.IO Connection Manager
 * Gerencia conexões WebSocket centralizadas
 */

import { io, Socket } from 'socket.io-client';

export interface SocketConfig {
  url: string;
  path?: string;
  token?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

export type SocketEventHandler = (...args: any[]) => void;

export class SocketManager {
  private socket: Socket | null = null;
  private config: SocketConfig;
  private eventHandlers = new Map<string, Set<SocketEventHandler>>();

  constructor(config: SocketConfig) {
    this.config = {
      path: '/socket.io/',
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      ...config,
    };
  }

  /**
   * Conecta ao servidor WebSocket
   */
  connect(): Promise<void> {
    if (this.socket?.connected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const socket = io(this.config.url, {
        path: this.config.path,
        auth: this.config.token ? { token: this.config.token } : undefined,
        autoConnect: false,
        reconnection: this.config.reconnection,
        reconnectionAttempts: this.config.reconnectionAttempts,
        reconnectionDelay: this.config.reconnectionDelay,
        transports: ['websocket', 'polling'],
        withCredentials: true,
      });

      this.socket = socket;
      this.reattachEventHandlers();

      const cleanup = () => {
        socket.off('connect', onConnect);
        socket.off('connect_error', onConnectError);
      };

      const onConnect = () => {
        cleanup();
        resolve();
      };

      const onConnectError = (error: Error) => {
        cleanup();
        reject(error);
      };

      socket.once('connect', onConnect);
      socket.once('connect_error', onConnectError);
      socket.connect();
    });
  }

  /**
   * Desconecta do servidor WebSocket
   */
  disconnect(): void {
    if (!this.socket) return;

    this.socket.disconnect();
    this.socket = null;
  }

  /**
   * Verifica se está conectado
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Registra handler para evento
   */
  on(event: string, handler: SocketEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers.get(event)!.add(handler);
    this.socket?.on(event, handler);
  }

  /**
   * Remove handler de evento
   */
  off(event: string, handler: SocketEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }

    this.socket?.off(event, handler);
  }

  /**
   * Registra handler que executa apenas uma vez
   */
  once(event: string, handler: SocketEventHandler): void {
    const onceHandler: SocketEventHandler = (...args: any[]) => {
      handler(...args);
      this.off(event, onceHandler);
    };

    this.on(event, onceHandler);
  }

  /**
   * Emite evento para o servidor
   */
  emit(event: string, ...args: any[]): void {
    if (!this.socket?.connected) {
      console.warn(`[SocketManager] Cannot emit "${event}" while disconnected`);
      return;
    }

    this.socket.emit(event, ...args);
  }

  /**
   * Emite evento e aguarda resposta (com timeout)
   */
  emitWithAck<T = any>(event: string, data: any, timeout = 5000): Promise<T> {
    if (!this.socket?.connected) {
      return Promise.reject(new Error('Socket is not connected'));
    }

    return this.socket.timeout(timeout).emitWithAck(event, data) as Promise<T>;
  }

  /**
   * Atualiza o token de autenticação
   */
  updateToken(token: string): void {
    this.config.token = token;

    if (this.socket) {
      this.socket.auth = {
        ...(typeof this.socket.auth === 'object' ? this.socket.auth : {}),
        token,
      };
    }
  }

  /**
   * Re-anexa todos os event handlers após reconexão
   */
  private reattachEventHandlers(): void {
    if (!this.socket) return;

    this.eventHandlers.forEach((handlers, event) => {
      handlers.forEach(handler => {
        this.socket!.on(event, handler);
      });
    });
  }

  /**
   * Obtém ID do socket
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}
