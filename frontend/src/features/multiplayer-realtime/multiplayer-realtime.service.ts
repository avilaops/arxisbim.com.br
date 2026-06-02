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
  static async joinRoom(roomId: string, user: UserSession): Promise<void> {
    if (this.socket) {
      throw new Error('Already in a room. Leave current room first.');
    }

    // Establish WebSocket connection
    await this.connect(roomId, user);
  }

  /**
   * Sai da sala atual
   */
  static leaveRoom(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.roomState = null;
    this.reconnectAttempts = 0;
    
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
    if (!this.socket || !this.roomState?.currentUser) {
      throw new Error('Not connected to a room');
    }

    const message: ChatMessage = {
      id: this.generateId(),
      userId: this.roomState.currentUser.user.userId,
      userName: this.roomState.currentUser.user.name,
      content,
      timestamp: new Date(),
      mentions,
      replyTo,
    };

    this.send({
      type: 'chat_message',
      data: message,
    });
  }

  /**
   * Atualiza estado do avatar
   */
  static updateAvatar(state: AvatarState): void {
    if (!this.socket || !this.roomState?.currentUser) {
      throw new Error('Not connected to a room');
    }

    this.send({
      type: 'avatar_update',
      data: {
        participantId: this.roomState.currentUser.id,
        state,
      },
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

  private static async connect(roomId: string, user: UserSession): Promise<void> {
    this.emitConnectionState('connecting');

    // WebSocket URL (in production, this would be configurable)
    const wsUrl = `ws://localhost:3001/socket.io/?roomId=${roomId}&userId=${user.userId}`;

    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        
        // Send join message
        this.send({
          type: 'join_room',
          data: {
            roomId,
            user,
          },
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
        case 'room_state':
          this.handleRoomState(message.data);
          break;
        
        case 'participant_joined':
          this.handleParticipantJoined(message.data);
          break;
        
        case 'participant_left':
          this.handleParticipantLeft(message.data);
          break;
        
        case 'avatar_update':
          this.handleAvatarUpdate(message.data);
          break;
        
        case 'chat_message':
          this.handleChatMessage(message.data);
          break;
        
        case 'sync_action':
          this.handleAction(message.data);
          break;
        
        default:
          console.warn('Unknown message type:', message.type);
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
    this.emitConnectionState('disconnected');

    if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts++;
      console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}...`);
      
      setTimeout(() => {
        this.emitConnectionState('reconnecting');
        // Reconnection logic would go here
      }, this.RECONNECT_DELAY);
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
}
