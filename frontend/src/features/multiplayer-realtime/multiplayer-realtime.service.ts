/**
 * Multiplayer Realtime Service
 * 
 * Service para colaboração em tempo real multi-usuário
 */

import type {
  RoomOptions,
  UserSession,
  Participant,
  AvatarState,
  CollaborationAction,
  ChatMessage,
  RoomState,
  ConnectionState,
  ConnectionQuality,
  ParticipantJoinedCallback,
  ParticipantLeftCallback,
  AvatarUpdatedCallback,
  ChatMessageCallback,
  ActionCallback,
  ConnectionStateCallback,
  UnsubscribeFn,
} from './multiplayer-realtime.types';
import { DEFAULT_ROOM_OPTIONS } from './multiplayer-realtime.types';

export class MultiplayerRealtimeService {
  private static socket: WebSocket | null = null;
  private static roomState: RoomState | null = null;
  private static reconnectAttempts = 0;
  private static readonly MAX_RECONNECT_ATTEMPTS = 5;
  private static readonly RECONNECT_DELAY = 2000;
  private static lastConnectArgs: { roomId: string; user: UserSession & { accessToken?: string } } | null = null;
  /** Keepalive: ping a cada 25s para evitar sleep do Render free tier */
  private static keepaliveTimer: ReturnType<typeof setInterval> | null = null;

  // Event callbacks
  private static participantJoinedCallbacks: ParticipantJoinedCallback[] = [];
  private static participantLeftCallbacks: ParticipantLeftCallback[] = [];
  private static avatarUpdatedCallbacks: AvatarUpdatedCallback[] = [];
  private static chatMessageCallbacks: ChatMessageCallback[] = [];
  private static actionCallbacks: ActionCallback[] = [];
  private static connectionStateCallbacks: ConnectionStateCallback[] = [];

  /**
   * Cria uma nova sala de colaboração
   */
  static async createRoom(options: RoomOptions): Promise<string> {
    const opts = { ...DEFAULT_ROOM_OPTIONS, ...options };
    
    // In production, this would call backend API to create room
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('Room created:', roomId, opts);
    
    return roomId;
  }

  /**
   * Entra em uma sala existente
   */
  static async joinRoom(roomId: string, user: UserSession & { accessToken?: string }): Promise<void> {
    if (this.socket) {
      throw new Error('Already in a room. Leave current room first.');
    }

    this.lastConnectArgs = { roomId, user };
    await this.connect(roomId, user);
  }

  /**
   * Sai da sala atual
   */
  static leaveRoom(): void {
    this.lastConnectArgs = null;
    this.reconnectAttempts = 0;
    if (this.keepaliveTimer) { clearInterval(this.keepaliveTimer); this.keepaliveTimer = null; }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.roomState = null;
    this.emitConnectionState('disconnected');
  }

  /**
   * Obtém lista de participantes
   */
  static getParticipants(): Participant[] {
    return this.roomState?.participants || [];
  }

  /**
   * Obtém participante atual
   */
  static getCurrentParticipant(): Participant | null {
    return this.roomState?.currentUser || null;
  }

  /**
   * Obtém estado da sala
   */
  static getRoomState(): RoomState | null {
    return this.roomState;
  }

  /**
   * Envia mensagem de chat
   */
  static sendChatMessage(content: string, mentions?: string[], replyTo?: string): void {
    if (!this.socket) {
      throw new Error('Not connected to a room');
    }
    // Signaling server expects: { type: 'chat_message', content }
    this.send({ type: 'chat_message', content });
  }

  /**
   * Atualiza estado do avatar
   */
  static updateAvatar(state: AvatarState): void {
    if (!this.socket || !this.roomState?.currentUser) {
      throw new Error('Not connected to a room');
    }

    // Formato compatível com signaling-server/server.js handleAvatarUpdate:
    // recebe msg.avatarConfig e retransmite como { type, participantId, userId, avatarConfig }
    this.send({
      type: 'avatar_update',
      avatarConfig: state,
    });
  }

  /**
   * Sincroniza ação de colaboração
   */
  static syncAction(action: Omit<CollaborationAction, 'id' | 'timestamp'>): void {
    if (!this.socket) {
      throw new Error('Not connected to a room');
    }

    const fullAction: CollaborationAction = {
      ...action,
      id: this.generateId(),
      timestamp: new Date(),
    };

    this.send({
      type: 'sync_action',
      data: fullAction,
    });
  }

  /**
   * Obtém qualidade de conexão
   */
  static getConnectionQuality(): ConnectionQuality {
    // In production, this would measure actual connection metrics
    return {
      latency: 50,
      packetLoss: 0.01,
      bandwidth: 1000,
      quality: 5,
    };
  }

  // ==================== EVENT LISTENERS ====================

  static onParticipantJoined(callback: ParticipantJoinedCallback): UnsubscribeFn {
    this.participantJoinedCallbacks.push(callback);
    return () => this.removeCallback(this.participantJoinedCallbacks, callback);
  }

  static onParticipantLeft(callback: ParticipantLeftCallback): UnsubscribeFn {
    this.participantLeftCallbacks.push(callback);
    return () => this.removeCallback(this.participantLeftCallbacks, callback);
  }

  static onAvatarUpdated(callback: AvatarUpdatedCallback): UnsubscribeFn {
    this.avatarUpdatedCallbacks.push(callback);
    return () => this.removeCallback(this.avatarUpdatedCallbacks, callback);
  }

  static onChatMessage(callback: ChatMessageCallback): UnsubscribeFn {
    this.chatMessageCallbacks.push(callback);
    return () => this.removeCallback(this.chatMessageCallbacks, callback);
  }

  static onAction(callback: ActionCallback): UnsubscribeFn {
    this.actionCallbacks.push(callback);
    return () => this.removeCallback(this.actionCallbacks, callback);
  }

  static onConnectionStateChange(callback: ConnectionStateCallback): UnsubscribeFn {
    this.connectionStateCallbacks.push(callback);
    return () => this.removeCallback(this.connectionStateCallbacks, callback);
  }

  // ==================== PRIVATE METHODS ====================

  private static async connect(roomId: string, user: UserSession & { accessToken?: string }): Promise<void> {
    // Ensure old socket is gone before opening a new one
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
    this.emitConnectionState('connecting');

    // Use env var — fallback to same-host port 3002 (signaling server)
    const wsBase = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_WS_URL)
      || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname}:3002`;
    const wsUrl = wsBase;

    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('[Multiplayer] WebSocket connected to', wsUrl);
        this.reconnectAttempts = 0;

        // Keepalive: ping a cada 25s para não dormir no Render free
        if (this.keepaliveTimer) clearInterval(this.keepaliveTimer);
        this.keepaliveTimer = setInterval(() => {
          if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25_000);

        // Protocol matches signaling-server/server.js
        this.send({
          type: 'join_room',
          roomId,
          userId: user.userId,
          displayName: user.name,
          ...(user.accessToken ? { accessToken: user.accessToken } : {}),
        });

        this.emitConnectionState('connected');
        resolve();
      };

      this.socket.onclose = () => {
        console.log('WebSocket disconnected');
        this.handleDisconnect();
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    });
  }

  private static handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        // --- Signaling server protocol ---
        case 'room_joined': {
          // Set currentUser from server-confirmed identity
          const currentUser = this.makeParticipant(
            message.participantId ?? message.userId,
            message.userId ?? message.participantId,
            message.role,
            this.lastConnectArgs?.user.name, // use the name we passed in
          );
          const existingParticipants: Participant[] = (message.members ?? []).map(
            (m: any) => this.makeParticipant(m.participantId ?? m.userId, m.userId ?? m.participantId, m.role, m.displayName),
          );
          this.roomState = {
            roomId: message.roomId,
            currentUser,
            participants: existingParticipants,
            messages: [],
            actions: [],
          };
          break;
        }

        case 'user_joined':
          this.handleParticipantJoined(
            this.makeParticipant(message.participantId ?? message.userId, message.userId ?? message.participantId, message.role, message.displayName),
          );
          break;

        case 'user_left':
          this.handleParticipantLeft(message.participantId ?? message.userId);
          break;

        case 'position_update':
          this.handleAvatarUpdate({
            participantId: message.userId,
            state: { position: [message.x, message.y, message.z], rotation: [0, message.yaw, 0], animation: 'idle' },
          });
          break;

        case 'avatar_update':
          // signaling retransmite: { type, participantId, userId, avatarConfig, timestamp }
          this.handleAvatarUpdate({
            participantId: message.participantId ?? message.userId,
            state: message.avatarConfig,
          });
          break;

        // --- Extended protocol for chat/actions ---
        case 'chat_message': {
          // Server broadcasts: { participantId, userId, content, timestamp }
          const raw = message.data ?? message;
          const chatMsg: ChatMessage = {
            id: raw.id ?? `${raw.timestamp ?? Date.now()}_${raw.participantId ?? raw.userId}`,
            userId: raw.participantId ?? raw.userId ?? 'unknown',
            userName: this.resolveParticipantName(raw.participantId ?? raw.userId) ?? raw.userId ?? 'Desconhecido',
            content: raw.content ?? '',
            timestamp: raw.timestamp ? new Date(raw.timestamp) : new Date(),
          };
          this.handleChatMessage(chatMsg);
          break;
        }

        case 'sync_action':
          this.handleAction(message.data ?? message);
          break;

        case 'server_shutdown':
          this.handleDisconnect();
          break;

        default:
          // Ignore unknown types silently
          break;
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  private static handleRoomState(state: RoomState): void {
    this.roomState = state;
    console.log('Room state updated:', state);
  }

  private static handleParticipantJoined(participant: Participant): void {
    if (this.roomState) {
      this.roomState.participants.push(participant);
    }
    
    this.participantJoinedCallbacks.forEach(cb => cb(participant));
  }

  private static handleParticipantLeft(participantId: string): void {
    if (this.roomState) {
      this.roomState.participants = this.roomState.participants.filter(
        p => p.id !== participantId
      );
    }
    
    this.participantLeftCallbacks.forEach(cb => cb(participantId));
  }

  private static handleAvatarUpdate(data: { participantId: string; state: AvatarState }): void {
    if (this.roomState) {
      const participant = this.roomState.participants.find(p => p.id === data.participantId);
      if (participant) {
        participant.avatar = data.state;
      }
    }
    
    this.avatarUpdatedCallbacks.forEach(cb => cb(data.participantId, data.state));
  }

  private static handleChatMessage(message: ChatMessage): void {
    if (this.roomState) {
      this.roomState.messages.push(message);
    }
    
    this.chatMessageCallbacks.forEach(cb => cb(message));
  }

  private static handleAction(action: CollaborationAction): void {
    this.actionCallbacks.forEach(cb => cb(action));
  }

  private static handleDisconnect(): void {
    this.socket = null;
    this.emitConnectionState('disconnected');

    if (!this.lastConnectArgs) return; // leaveRoom() was called intentionally

    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      console.log(`[Multiplayer] Reconnect attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}...`);
      this.emitConnectionState('reconnecting');
      setTimeout(async () => {
        if (!this.lastConnectArgs) return;
        try {
          await this.connect(this.lastConnectArgs.roomId, this.lastConnectArgs.user);
        } catch {
          this.handleDisconnect();
        }
      }, this.RECONNECT_DELAY * this.reconnectAttempts);
    } else {
      console.warn('[Multiplayer] Max reconnect attempts reached.');
      this.lastConnectArgs = null;
    }
  }

  private static send(message: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.error('Cannot send message: WebSocket not connected');
    }
  }

  private static emitConnectionState(state: ConnectionState): void {
    this.connectionStateCallbacks.forEach(cb => cb(state));
  }

  private static removeCallback<T>(callbacks: T[], callback: T): void {
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  private static generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static makeParticipant(id: string, userId: string, role = 'viewer', displayName?: string): Participant {
    return {
      id,
      user: { userId, name: displayName || userId, role },
      joinedAt: new Date(),
      avatar: { position: [0, 0, 0], rotation: [0, 0, 0], animation: 'idle' },
    };
  }

  private static resolveParticipantName(participantId: string): string | null {
    if (!this.roomState) return null;
    if (this.roomState.currentUser?.id === participantId) {
      return this.roomState.currentUser.user.name;
    }
    return this.roomState.participants.find(p => p.id === participantId)?.user.name ?? null;
  }
}
