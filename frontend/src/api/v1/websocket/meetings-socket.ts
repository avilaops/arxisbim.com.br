/**
 * Virtual Meetings WebSocket Client
 * Cliente WebSocket específico para reuniões virtuais
 */

import { SocketManager } from './socket-manager';

// Eventos do cliente para servidor
export enum ClientEvents {
  JOIN_ROOM = 'meeting:join',
  LEAVE_ROOM = 'meeting:leave',
  UPDATE_AVATAR = 'meeting:update-avatar',
  SEND_MESSAGE = 'meeting:send-message',
  CREATE_ACTION = 'meeting:create-action',
  COLLABORATION_UPDATE = 'meeting:collaboration-update',
  COLLABORATION_HISTORY_REQUEST = 'meeting:collaboration-history-request',
}

// Eventos do servidor para cliente
export enum ServerEvents {
  JOINED = 'meeting:joined',
  ERROR = 'meeting:error',
  PARTICIPANT_JOINED = 'meeting:participant-joined',
  PARTICIPANT_LEFT = 'meeting:participant-left',
  AVATAR_UPDATED = 'meeting:avatar-updated',
  MESSAGE_RECEIVED = 'meeting:message-received',
  ACTION_CREATED = 'meeting:action-created',
  COLLABORATION_UPDATED = 'meeting:collaboration-updated',
  COLLABORATION_HISTORY = 'meeting:collaboration-history',
  ROOM_ENDED = 'meeting:room-ended',
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface AvatarState {
  position: Vector3;
  rotation: Vector3;
  animation?: string;
  scale?: Vector3;
}

export interface JoinRoomPayload {
  roomId: string;
  userName: string;
  avatarState?: AvatarState;
}

export interface UpdateAvatarPayload {
  position?: Vector3;
  rotation?: Vector3;
  animation?: string;
}

export interface SendMessagePayload {
  message: string;
}

export interface CreateActionPayload {
  actionType: 'laser_pointer' | 'annotation' | 'highlight' | 'measure' | 'section';
  actionData: Record<string, any>;
  targetElementId?: string;
}

export interface CollaborationUpdatePayload {
  update: number[];
  origin?: 'selection' | 'annotation' | 'section' | 'presence' | 'snapshot' | string;
  isSnapshot?: boolean;
}

export interface CollaborationHistoryRequestPayload {
  afterVersion?: number;
  limit?: number;
}

export interface MeetingParticipant {
  id: string;
  userId: string;
  userName: string;
  avatarState: AvatarState;
  isConnected: boolean;
}

export interface MeetingRoom {
  id: string;
  projectId: string;
  meetingCode: string;
  isActive: boolean;
}

// Event Payloads from server
export interface JoinedPayload {
  participant: MeetingParticipant;
  room: MeetingRoom;
  participants: MeetingParticipant[];
}

export interface ParticipantJoinedPayload {
  participant: MeetingParticipant;
}

export interface ParticipantLeftPayload {
  participantId: string;
}

export interface AvatarUpdatedPayload {
  participantId: string;
  avatarState: AvatarState;
}

export interface MessageReceivedPayload {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
}

export interface ActionCreatedPayload {
  id: string;
  userId: string;
  actionType: string;
  actionData: Record<string, any>;
  targetElementId?: string;
  timestamp: string;
}

export interface CollaborationUpdatedPayload {
  fromUserId: string;
  fromParticipantId: string;
  update: number[];
  origin?: string;
  version: number;
  isSnapshot: boolean;
  timestamp: string;
}

export interface CollaborationUpdateRecord {
  id: string;
  roomId: string;
  userId?: string | null;
  participantId?: string | null;
  origin: string;
  ydocUpdate: number[];
  version: number;
  isSnapshot: boolean;
  createdAt: string;
}

export interface CollaborationSnapshotRecord {
  id: string;
  roomId: string;
  ydocUpdate: number[];
  version: number;
  updatedBy?: string | null;
  updatedAt: string;
}

export interface CollaborationHistoryPayload {
  roomId: string;
  snapshot: CollaborationSnapshotRecord | null;
  updates: CollaborationUpdateRecord[];
}

export class MeetingsSocket {
  private socketManager: SocketManager;
  private currentRoomId: string | null = null;

  constructor(url: string, token: string) {
    this.socketManager = new SocketManager({
      url,
      token,
      autoConnect: false,
    });
  }

  /**
   * Conecta ao servidor WebSocket
   */
  async connect(): Promise<void> {
    await this.socketManager.connect();
  }

  /**
   * Desconecta do servidor
   */
  disconnect(): void {
    if (this.currentRoomId) {
      this.leaveRoom();
    }
    this.socketManager.disconnect();
  }

  /**
   * Entra em uma sala de reunião
   */
  joinRoom(payload: JoinRoomPayload): void {
    this.socketManager.emit(ClientEvents.JOIN_ROOM, payload);
    this.currentRoomId = payload.roomId;
  }

  /**
   * Sai da sala atual
   */
  leaveRoom(): void {
    if (this.currentRoomId) {
      this.socketManager.emit(ClientEvents.LEAVE_ROOM);
      this.currentRoomId = null;
    }
  }

  /**
   * Atualiza estado do avatar
   */
  updateAvatar(payload: UpdateAvatarPayload): void {
    this.socketManager.emit(ClientEvents.UPDATE_AVATAR, payload);
  }

  /**
   * Envia mensagem no chat
   */
  sendMessage(payload: SendMessagePayload): void {
    this.socketManager.emit(ClientEvents.SEND_MESSAGE, payload);
  }

  /**
   * Cria ação colaborativa (laser pointer, annotation, etc)
   */
  createAction(payload: CreateActionPayload): void {
    this.socketManager.emit(ClientEvents.CREATE_ACTION, payload);
  }

  /**
   * Envia update CRDT/Yjs para sincronizar seleção, anotações e cortes
   */
  sendCollaborationUpdate(payload: CollaborationUpdatePayload): void {
    this.socketManager.emit(ClientEvents.COLLABORATION_UPDATE, payload);
  }

  /**
   * Solicita histórico CRDT/Yjs para late join/reconnect
   */
  requestCollaborationHistory(payload: CollaborationHistoryRequestPayload = {}): void {
    this.socketManager.emit(ClientEvents.COLLABORATION_HISTORY_REQUEST, payload);
  }

  // ==================== Event Listeners ====================

  /**
   * Callback quando entrou na sala com sucesso
   */
  onJoined(callback: (data: JoinedPayload) => void): void {
    this.socketManager.on(ServerEvents.JOINED, callback);
  }

  /**
   * Callback quando novo participante entra
   */
  onParticipantJoined(callback: (data: ParticipantJoinedPayload) => void): void {
    this.socketManager.on(ServerEvents.PARTICIPANT_JOINED, callback);
  }

  /**
   * Callback quando participante sai
   */
  onParticipantLeft(callback: (data: ParticipantLeftPayload) => void): void {
    this.socketManager.on(ServerEvents.PARTICIPANT_LEFT, callback);
  }

  /**
   * Callback quando avatar é atualizado
   */
  onAvatarUpdated(callback: (data: AvatarUpdatedPayload) => void): void {
    this.socketManager.on(ServerEvents.AVATAR_UPDATED, callback);
  }

  /**
   * Callback quando recebe mensagem
   */
  onMessageReceived(callback: (data: MessageReceivedPayload) => void): void {
    this.socketManager.on(ServerEvents.MESSAGE_RECEIVED, callback);
  }

  /**
   * Callback quando ação é criada
   */
  onActionCreated(callback: (data: ActionCreatedPayload) => void): void {
    this.socketManager.on(ServerEvents.ACTION_CREATED, callback);
  }

  /**
   * Callback quando recebe update CRDT/Yjs de outro participante
   */
  onCollaborationUpdated(callback: (data: CollaborationUpdatedPayload) => void): void {
    this.socketManager.on(ServerEvents.COLLABORATION_UPDATED, callback);
  }

  /**
   * Callback quando recebe snapshot + histórico CRDT/Yjs da sala
   */
  onCollaborationHistory(callback: (data: CollaborationHistoryPayload) => void): void {
    this.socketManager.on(ServerEvents.COLLABORATION_HISTORY, callback);
  }

  /**
   * Callback quando sala é encerrada
   */
  onRoomEnded(callback: () => void): void {
    this.socketManager.on(ServerEvents.ROOM_ENDED, callback);
  }

  /**
   * Callback para erros
   */
  onError(callback: (error: { message: string; code?: string }) => void): void {
    this.socketManager.on(ServerEvents.ERROR, callback);
  }

  /**
   * Remove listener de evento
   */
  off(event: ServerEvents, callback: (...args: any[]) => void): void {
    this.socketManager.off(event, callback);
  }

  /**
   * Verifica se está conectado
   */
  isConnected(): boolean {
    return this.socketManager.isConnected();
  }

  /**
   * Obtém ID do socket
   */
  getSocketId(): string | undefined {
    return this.socketManager.getSocketId();
  }
}
