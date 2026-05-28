/**
 * SignalingService - Conecta com signaling server via WebSocket
 * Gerencia troca de SDP e ICE candidates
 * 
 * Features:
 * - Auto-reconnect com exponential backoff
 * - Error handling robusto
 * - Logging estruturado
 * - Health monitoring
 */

import { errorHandler, ErrorCategory, ErrorSeverity, logger, RetryPolicy } from '../core/errors';

export enum SignalingMessageType {
  // Room management
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  ROOM_JOINED = 'room_joined',
  ROOM_LEFT = 'room_left',
  
  // User events
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  USER_LIST = 'user_list',
  
  // WebRTC signaling
  OFFER = 'offer',
  ANSWER = 'answer',
  ICE_CANDIDATE = 'ice_candidate',
  
  // Avatar sync
  AVATAR_UPDATE = 'avatar_update',
  POSITION_UPDATE = 'position_update',
  
  // Errors
  ERROR = 'error'
}

export interface SignalingMessage {
  type: SignalingMessageType;
  from?: string;
  to?: string;
  data?: any;
  roomId?: string;
  userId?: string;
}

export interface SignalingCallbacks {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onRoomJoined?: (roomId: string, users: string[]) => void;
  onUserJoined?: (userId: string) => void;
  onUserLeft?: (userId: string) => void;
  onOffer?: (from: string, offer: RTCSessionDescriptionInit) => void;
  onAnswer?: (from: string, answer: RTCSessionDescriptionInit) => void;
  onIceCandidate?: (from: string, candidate: RTCIceCandidateInit) => void;
  onAvatarUpdate?: (userId: string, avatarConfig: any) => void;
  onPositionUpdate?: (userId: string, position: any) => void;
  onError?: (error: string) => void;
}

export class SignalingService {
  private ws?: WebSocket;
  private serverUrl: string;
  private callbacks: SignalingCallbacks;
  
  private userId: string;
  private currentRoomId?: string;
  
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout?: number;
  
  private heartbeatInterval?: number;
  private connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private log = logger.context('SignalingService');
  
  constructor(serverUrl: string, userId: string, callbacks: SignalingCallbacks) {
    this.serverUrl = serverUrl;
    this.userId = userId;
    this.callbacks = callbacks;
    
    this.log.info('SignalingService initialized', { serverUrl, userId });
  }

  /**
   * Conecta ao signaling server
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);
        
        this.ws.onopen = () => {
          this.connectionState = 'connected';
          this.log.info('Connected to signaling server');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          
          if (this.callbacks.onConnected) {
            this.callbacks.onConnected();
          }
          
          resolve();
        };
        
        this.ws.onclose = () => {
          this.connectionState = 'disconnected';
          this.log.info('Disconnected from signaling server');
          this.stopHeartbeat();
          
          if (this.callbacks.onDisconnected) {
            this.callbacks.onDisconnected();
          }
          
          this.attemptReconnect();
        };
        
        this.ws.onerror = (error) => {
          errorHandler.handleError({
            category: ErrorCategory.WEBSOCKET,
            severity: ErrorSeverity.WARNING,
            message: 'WebSocket connection error (non-critical, auto-retry enabled)',
            error,
            metadata: {
              serverUrl: this.serverUrl,
              connectionState: this.connectionState,
              reconnectAttempts: this.reconnectAttempts
            }
          });
          
          // Only reject on first connection attempt
          if (this.connectionState === 'connecting') {
            reject(error);
          }
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
        
      } catch (error) {
        errorHandler.handleError({
          category: ErrorCategory.WEBSOCKET,
          severity: ErrorSeverity.ERROR,
          message: 'Failed to initialize WebSocket connection',
          error,
          metadata: { serverUrl: this.serverUrl }
        });
        reject(error);
      }
    });
  }

  /**
   * Tenta reconectar automaticamente
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      errorHandler.handleError({
        category: ErrorCategory.WEBSOCKET,
        severity: ErrorSeverity.ERROR,
        message: 'Max reconnection attempts reached for signaling server',
        metadata: {
          maxAttempts: this.maxReconnectAttempts,
          serverUrl: this.serverUrl
        }
      });
      return;
    }
    
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.log.info(`Attempting reconnect in ${delay}ms`, {
      attempt: this.reconnectAttempts + 1,
      maxAttempts: this.maxReconnectAttempts
    });
    
    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectAttempts++;
      this.connectionState = 'connecting';
      this.connect().catch(() => {
        // Falhou, attemptReconnect será chamado novamente via onclose
      });
    }, delay);
  }

  /**
   * Heartbeat para manter conexão viva
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // A cada 30s
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  /**
   * Handle mensagem recebida
   */
  private handleMessage(data: string): void {
    try {
      const message: SignalingMessage = JSON.parse(data);
      
      switch (message.type) {
        case SignalingMessageType.ROOM_JOINED:
          this.currentRoomId = message.roomId;
          if (this.callbacks.onRoomJoined && message.data?.users) {
            this.callbacks.onRoomJoined(message.roomId!, message.data.users);
          }
          break;
          
        case SignalingMessageType.USER_JOINED:
          if (this.callbacks.onUserJoined && message.userId) {
            this.callbacks.onUserJoined(message.userId);
          }
          break;
          
        case SignalingMessageType.USER_LEFT:
          if (this.callbacks.onUserLeft && message.userId) {
            this.callbacks.onUserLeft(message.userId);
          }
          break;
          
        case SignalingMessageType.OFFER:
          if (this.callbacks.onOffer && message.from) {
            this.callbacks.onOffer(message.from, message.data);
          }
          break;
          
        case SignalingMessageType.ANSWER:
          if (this.callbacks.onAnswer && message.from) {
            this.callbacks.onAnswer(message.from, message.data);
          }
          break;
          
        case SignalingMessageType.ICE_CANDIDATE:
          if (this.callbacks.onIceCandidate && message.from) {
            this.callbacks.onIceCandidate(message.from, message.data);
          }
          break;
          
        case SignalingMessageType.AVATAR_UPDATE:
          if (this.callbacks.onAvatarUpdate && message.userId) {
            this.callbacks.onAvatarUpdate(message.userId, message.data);
          }
          break;
          
        case SignalingMessageType.POSITION_UPDATE:
          if (this.callbacks.onPositionUpdate && message.userId) {
            this.callbacks.onPositionUpdate(message.userId, message.data);
          }
          break;
          
        case SignalingMessageType.ERROR:
          if (this.callbacks.onError) {
            this.callbacks.onError(message.data);
          }
          break;
      }
    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
    }
  }

  /**
   * Envia mensagem
   */
  private send(message: SignalingMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ WebSocket não está conectado');
    }
  }

  /**
   * Entra em uma sala
   */
  public joinRoom(roomId: string): void {
    this.send({
      type: SignalingMessageType.JOIN_ROOM,
      userId: this.userId,
      roomId
    });
  }

  /**
   * Sai da sala
   */
  public leaveRoom(): void {
    if (this.currentRoomId) {
      this.send({
        type: SignalingMessageType.LEAVE_ROOM,
        userId: this.userId,
        roomId: this.currentRoomId
      });
      this.currentRoomId = undefined;
    }
  }

  /**
   * Envia offer WebRTC
   */
  public sendOffer(to: string, offer: RTCSessionDescriptionInit): void {
    this.send({
      type: SignalingMessageType.OFFER,
      from: this.userId,
      to,
      data: offer
    });
  }

  /**
   * Envia answer WebRTC
   */
  public sendAnswer(to: string, answer: RTCSessionDescriptionInit): void {
    this.send({
      type: SignalingMessageType.ANSWER,
      from: this.userId,
      to,
      data: answer
    });
  }

  /**
   * Envia ICE candidate
   */
  public sendIceCandidate(to: string, candidate: RTCIceCandidate): void {
    this.send({
      type: SignalingMessageType.ICE_CANDIDATE,
      from: this.userId,
      to,
      data: candidate.toJSON()
    });
  }

  /**
   * Broadcast avatar update
   */
  public broadcastAvatarUpdate(avatarConfig: any): void {
    this.send({
      type: SignalingMessageType.AVATAR_UPDATE,
      userId: this.userId,
      data: avatarConfig
    });
  }

  /**
   * Broadcast position update
   */
  public broadcastPositionUpdate(position: { x: number; y: number; z: number; yaw: number }): void {
    this.send({
      type: SignalingMessageType.POSITION_UPDATE,
      userId: this.userId,
      data: position
    });
  }

  /**
   * Desconecta
   */
  public disconnect(): void {
    this.stopHeartbeat();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    if (this.currentRoomId) {
      this.leaveRoom();
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  /**
   * Getters
   */
  public getUserId(): string {
    return this.userId;
  }

  public getCurrentRoomId(): string | undefined {
    return this.currentRoomId;
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
