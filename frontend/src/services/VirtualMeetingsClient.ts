import { io, Socket } from 'socket.io-client';
import type {
  JoinRoomRequest,
  JoinRoomResponse,
  UpdateAvatarRequest,
  SendMessageRequest,
  CreateActionRequest,
  MeetingParticipant,
  ChatMessage,
  MeetingAction,
  MeetingErrorPayload
} from './types.js';
import { ClientEvents, ServerEvents } from './events.js';

export class VirtualMeetingsClient {
  private socket: Socket | null = null;
  private token: string;
  private baseUrl: string;
  
  // Event handlers
  private eventHandlers: Map<string, Set<Function>> = new Map();

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  /**
   * Conectar ao servidor WebSocket
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.baseUrl, {
        path: '/socket.io/',
        auth: {
          token: this.token
        },
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to Virtual Meetings server');
        this.setupEventListeners();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected:', reason);
        this.emit('disconnected', { reason });
      });
    });
  }

  /**
   * Desconectar do servidor
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Entrar em uma sala de reunião
   */
  joinRoom(request: JoinRoomRequest): void {
    if (!this.socket) {
      throw new Error('Not connected. Call connect() first.');
    }
    this.socket.emit(ClientEvents.JOIN_ROOM, request);
  }

  /**
   * Sair da sala de reunião
   */
  leaveRoom(): void {
    if (!this.socket) return;
    this.socket.emit(ClientEvents.LEAVE_ROOM);
  }

  /**
   * Atualizar estado do avatar
   */
  updateAvatar(avatarState: UpdateAvatarRequest): void {
    if (!this.socket) return;
    this.socket.emit(ClientEvents.UPDATE_AVATAR, avatarState);
  }

  /**
   * Enviar mensagem de chat
   */
  sendMessage(message: string): void {
    if (!this.socket) return;
    this.socket.emit(ClientEvents.SEND_MESSAGE, { message });
  }

  /**
   * Criar ação (laser pointer, annotation, etc)
   */
  createAction(action: CreateActionRequest): void {
    if (!this.socket) return;
    this.socket.emit(ClientEvents.CREATE_ACTION, action);
  }

  // =====================================
  // Event Listeners
  // =====================================

  /**
   * Configurar listeners para eventos do servidor
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Room joined
    this.socket.on(ServerEvents.JOINED, (data: JoinRoomResponse) => {
      this.emit('joined', data);
    });

    // Participant joined
    this.socket.on(ServerEvents.PARTICIPANT_JOINED, (data) => {
      this.emit('participantJoined', data);
    });

    // Participant left
    this.socket.on(ServerEvents.PARTICIPANT_LEFT, (data) => {
      this.emit('participantLeft', data);
    });

    // Avatar updated
    this.socket.on(ServerEvents.AVATAR_UPDATED, (data) => {
      this.emit('avatarUpdated', data);
    });

    // Message received
    this.socket.on(ServerEvents.MESSAGE_RECEIVED, (data) => {
      this.emit('messageReceived', data);
    });

    // Action created
    this.socket.on(ServerEvents.ACTION_CREATED, (data) => {
      this.emit('actionCreated', data);
    });

    // Error
    this.socket.on(ServerEvents.ERROR, (data: MeetingErrorPayload) => {
      this.emit('error', data);
    });

    // Room ended
    this.socket.on(ServerEvents.ROOM_ENDED, () => {
      this.emit('roomEnded', {});
    });
  }

  /**
   * Registrar handler para evento
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Remover handler de evento
   */
  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Emitir evento local
   */
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  /**
   * Verificar se está conectado
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// =====================================
// Helper Functions
// =====================================

/**
 * Criar cliente de reuniões virtuais
 */
export function createMeetingsClient(baseUrl: string, token: string): VirtualMeetingsClient {
  return new VirtualMeetingsClient(baseUrl, token);
}
