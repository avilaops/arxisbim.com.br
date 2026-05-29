/**
 * MeetingsSocketService - Serviço Socket.IO para reuniões XR multiplayer
 */

import { io, Socket } from 'socket.io-client';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

export interface AvatarState {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  animation: string;
}

export interface Participant {
  id: string;
  userId: string;
  userName: string;
  avatarState: AvatarState;
}

export interface MeetingMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
}

export interface MeetingAction {
  id: string;
  userId: string;
  actionType: string;
  actionData: any;
  targetElementId?: string;
  timestamp: string;
}

export interface CollaborationUpdate {
  fromUserId: string;
  fromParticipantId: string;
  update: number[];
  origin?: string;
  version: number;
  isSnapshot: boolean;
  timestamp: string;
}

type EventsCallback = (data: any) => void;

export class MeetingsSocketService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private currentRoomId: string | null = null;
  private currentParticipantId: string | null = null;

  // Callbacks
  private onJoinedCallback: EventsCallback | null = null;
  private onParticipantJoinedCallback: EventsCallback | null = null;
  private onParticipantLeftCallback: EventsCallback | null = null;
  private onAvatarUpdatedCallback: EventsCallback | null = null;
  private onMessageReceivedCallback: EventsCallback | null = null;
  private onActionCreatedCallback: EventsCallback | null = null;
  private onCollaborationUpdatedCallback: EventsCallback | null = null;
  private onCollaborationHistoryCallback: EventsCallback | null = null;
  private onErrorCallback: EventsCallback | null = null;
  private onWebRTCOfferCallback: EventsCallback | null = null;
  private onWebRTCAnswerCallback: EventsCallback | null = null;
  private onWebRTCIceCandidateCallback: EventsCallback | null = null;

  /**
   * Conecta ao Socket.IO server
   */
  connect(token: string): void {
    if (this.socket?.connected) {
      console.log('Socket já conectado');
      return;
    }

    this.token = token;

    this.socket = io(`${API_BASE_URL}`, {
      path: '/socket.io/',
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.setupEventListeners();
    console.log('🔌 Conectando ao Socket.IO...');
  }

  /**
   * Desconecta do Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentRoomId = null;
      this.currentParticipantId = null;
      console.log('🔌 Desconectado do Socket.IO');
    }
  }

  /**
   * Entra em uma sala de reunião
   */
  joinRoom(roomId: string, userName: string, avatarState?: AvatarState): void {
    if (!this.socket?.connected) {
      console.error('Socket não conectado');
      return;
    }

    this.currentRoomId = roomId;
    this.socket.emit('JOIN_ROOM', {
      roomId,
      userName,
      avatarState: avatarState || {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        animation: 'idle'
      }
    });
  }

  /**
   * Sai da sala atual
   */
  leaveRoom(): void {
    if (this.socket?.connected && this.currentRoomId) {
      this.socket.emit('LEAVE_ROOM');
      this.currentRoomId = null;
      this.currentParticipantId = null;
    }
  }

  /**
   * Atualiza estado do avatar
   */
  updateAvatar(avatarState: AvatarState): void {
    if (this.socket?.connected) {
      this.socket.emit('UPDATE_AVATAR', avatarState);
    }
  }

  /**
   * Envia mensagem de chat
   */
  sendMessage(message: string): void {
    if (this.socket?.connected) {
      this.socket.emit('SEND_MESSAGE', { message });
    }
  }

  /**
   * Cria ação (laser pointer, highlight, etc)
   */
  createAction(actionType: string, actionData: any, targetElementId?: string): void {
    if (this.socket?.connected) {
      this.socket.emit('CREATE_ACTION', { actionType, actionData, targetElementId });
    }
  }

  /**
   * Envia update de colaboração CRDT
   */
  sendCollaborationUpdate(update: number[], origin?: string, isSnapshot?: boolean): void {
    if (this.socket?.connected) {
      this.socket.emit('COLLABORATION_UPDATE', { update, origin, isSnapshot });
    }
  }

  /**
   * Solicita histórico de colaboração
   */
  requestCollaborationHistory(afterVersion?: number, limit?: number): void {
    if (this.socket?.connected) {
      this.socket.emit('COLLABORATION_HISTORY_REQUEST', { afterVersion, limit });
    }
  }

  /**
   * WebRTC Signaling - Enviar offer
   */
  sendWebRTCOffer(to: string, offer: any): void {
    if (this.socket?.connected) {
      this.socket.emit('WEBRTC_OFFER', { to, offer });
    }
  }

  /**
   * WebRTC Signaling - Enviar answer
   */
  sendWebRTCAnswer(to: string, answer: any): void {
    if (this.socket?.connected) {
      this.socket.emit('WEBRTC_ANSWER', { to, answer });
    }
  }

  /**
   * WebRTC Signaling - Enviar ICE candidate
   */
  sendWebRTCIceCandidate(to: string, candidate: any): void {
    if (this.socket?.connected) {
      this.socket.emit('WEBRTC_ICE_CANDIDATE', { to, candidate });
    }
  }

  /**
   * Configura listeners de eventos
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket.IO conectado');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket.IO desconectado');
    });

    this.socket.on('JOINED', (data) => {
      console.log('✅ Entrou na sala:', data);
      this.currentParticipantId = data.participant?.id;
      this.onJoinedCallback?.(data);
    });

    this.socket.on('PARTICIPANT_JOINED', (data) => {
      console.log('👤 Participante entrou:', data);
      this.onParticipantJoinedCallback?.(data);
    });

    this.socket.on('PARTICIPANT_LEFT', (data) => {
      console.log('👤 Participante saiu:', data);
      this.onParticipantLeftCallback?.(data);
    });

    this.socket.on('AVATAR_UPDATED', (data) => {
      this.onAvatarUpdatedCallback?.(data);
    });

    this.socket.on('MESSAGE_RECEIVED', (data) => {
      console.log('💬 Mensagem recebida:', data);
      this.onMessageReceivedCallback?.(data);
    });

    this.socket.on('ACTION_CREATED', (data) => {
      console.log('🎯 Ação criada:', data);
      this.onActionCreatedCallback?.(data);
    });

    this.socket.on('COLLABORATION_UPDATED', (data) => {
      this.onCollaborationUpdatedCallback?.(data);
    });

    this.socket.on('COLLABORATION_HISTORY', (data) => {
      console.log('📜 Histórico de colaboração:', data);
      this.onCollaborationHistoryCallback?.(data);
    });

    this.socket.on('ERROR', (data) => {
      console.error('❌ Erro Socket.IO:', data);
      this.onErrorCallback?.(data);
    });

    this.socket.on('WEBRTC_OFFER', (data) => {
      console.log('📞 WebRTC offer recebida:', data);
      this.onWebRTCOfferCallback?.(data);
    });

    this.socket.on('WEBRTC_ANSWER', (data) => {
      console.log('📞 WebRTC answer recebida:', data);
      this.onWebRTCAnswerCallback?.(data);
    });

    this.socket.on('WEBRTC_ICE_CANDIDATE', (data) => {
      console.log('📞 WebRTC ICE candidate recebido:', data);
      this.onWebRTCIceCandidateCallback?.(data);
    });
  }

  /**
   * Configura callbacks
   */
  onJoined(callback: EventsCallback): void {
    this.onJoinedCallback = callback;
  }

  onParticipantJoined(callback: EventsCallback): void {
    this.onParticipantJoinedCallback = callback;
  }

  onParticipantLeft(callback: EventsCallback): void {
    this.onParticipantLeftCallback = callback;
  }

  onAvatarUpdated(callback: EventsCallback): void {
    this.onAvatarUpdatedCallback = callback;
  }

  onMessageReceived(callback: EventsCallback): void {
    this.onMessageReceivedCallback = callback;
  }

  onActionCreated(callback: EventsCallback): void {
    this.onActionCreatedCallback = callback;
  }

  onCollaborationUpdated(callback: EventsCallback): void {
    this.onCollaborationUpdatedCallback = callback;
  }

  onCollaborationHistory(callback: EventsCallback): void {
    this.onCollaborationHistoryCallback = callback;
  }

  onError(callback: EventsCallback): void {
    this.onErrorCallback = callback;
  }

  onWebRTCOffer(callback: EventsCallback): void {
    this.onWebRTCOfferCallback = callback;
  }

  onWebRTCAnswer(callback: EventsCallback): void {
    this.onWebRTCAnswerCallback = callback;
  }

  onWebRTCIceCandidate(callback: EventsCallback): void {
    this.onWebRTCIceCandidateCallback = callback;
  }

  /**
   * Getters
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getCurrentRoomId(): string | null {
    return this.currentRoomId;
  }

  getCurrentParticipantId(): string | null {
    return this.currentParticipantId;
  }
}

// Singleton instance
let meetingsSocketServiceInstance: MeetingsSocketService | null = null;

export function getMeetingsSocketService(): MeetingsSocketService {
  if (!meetingsSocketServiceInstance) {
    meetingsSocketServiceInstance = new MeetingsSocketService();
  }
  return meetingsSocketServiceInstance;
}
