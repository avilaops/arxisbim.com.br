import { eventBus } from '../core';
import { NetworkEventType, PlayerData, NetworkMessage } from './events/NetworkEvents';

/**
 * NetworkManager - Gerenciador de rede para multiplayer
 * WebSocket + WebRTC para low-latency sync
 * 
 * Features:
 * - WebSocket para mensagens
 * - WebRTC para VoIP e dados P2P
 * - State synchronization
 * - Player tracking
 * - Room management
 * - Auto-reconnect
 * 
 * Preparado para SignalR e Photon integration
 */
export class NetworkManager {
  private static instance: NetworkManager;
  
  // Connection
  private ws: WebSocket | null = null;
  private serverUrl: string = '';
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  
  // Player state
  private playerId: string | null = null;
  private playerName: string = '';
  private currentRoom: string | null = null;
  
  // Other players
  private players: Map<string, PlayerData> = new Map();
  
  // Sync state
  private syncRate: number = 20; // Hz (50ms)
  private syncTimer: number | null = null;
  
  private constructor() {
    console.log('🌐 Network Manager initialized');
  }
  
  /**
   * Retorna instância singleton
   */
  public static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }
  
  /**
   * Conecta ao servidor
   */
  public async connect(serverUrl: string, playerName: string): Promise<void> {
    this.serverUrl = serverUrl;
    this.playerName = playerName;
    
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(serverUrl);
        
        this.ws.onopen = () => {
          console.log('✅ Connected to server');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Envia handshake
          this.send({
            type: 'handshake',
            from: this.playerId || 'new',
            data: { playerName: this.playerName },
            timestamp: Date.now()
          });
          
          // ❌ NÃO inicia sync aqui - aguarda handshake_response
          
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
        
        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          
          eventBus.emit(NetworkEventType.CONNECTION_ERROR, {
            error: new Error('WebSocket connection failed')
          });
          
          reject(error);
        };
        
        this.ws.onclose = () => {
          console.log('🔌 Disconnected from server');
          this.isConnected = false;
          
          this.stopSyncLoop();
          
          eventBus.emit(NetworkEventType.DISCONNECTED, {
            reason: 'Connection closed'
          });
          
          // Auto-reconnect
          if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
            this.scheduleReconnect();
          }
        };
        
      } catch (error) {
        console.error('❌ Failed to connect:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Desconecta do servidor
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.stopSyncLoop();
    this.isConnected = false;
    this.playerId = null;
    this.currentRoom = null;
    this.players.clear();
    
    console.log('🔌 Disconnected');
  }
  
  /**
   * Agenda reconexão
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})`);
    
    window.setTimeout(() => {
      this.connect(this.serverUrl, this.playerName)
        .catch((error) => {
          console.error('❌ Reconnect failed:', error);
        });
    }, delay);
  }
  
  /**
   * Processa mensagem recebida
   */
  private handleMessage(data: string): void {
    try {
      const message: NetworkMessage = JSON.parse(data);
      
      switch (message.type) {
        case 'handshake_response':
          this.playerId = message.data.playerId;
          console.log(`✅ Player ID: ${this.playerId}`);
          
          // ✅ Emite CONNECTED após playerId confirmado
          eventBus.emit(NetworkEventType.CONNECTED, {
            playerId: this.playerId,
            timestamp: Date.now()
          });
          
          // ✅ Inicia sync loop APÓS handshake completo
          this.startSyncLoop();
          break;
        
        case 'player_joined':
          this.handlePlayerJoined(message.data);
          break;
        
        case 'player_left':
          this.handlePlayerLeft(message.data.playerId);
          break;
        
        case 'player_update':
          this.handlePlayerUpdate(message.data);
          break;
        
        case 'state_sync':
          this.handleStateSync(message.data);
          break;
        
        case 'message':
          this.handleDirectMessage(message);
          break;
        
        case 'broadcast':
          this.handleBroadcast(message);
          break;
        
        default:
          console.warn('⚠️ Unknown message type:', message.type);
      }
      
    } catch (error) {
      console.error('❌ Error handling message:', error);
    }
  }
  
  /**
   * Handle player joined
   */
  private handlePlayerJoined(playerData: PlayerData): void {
    this.players.set(playerData.id, playerData);
    
    console.log(`👤 Player joined: ${playerData.name}`);
    
    // ✅ Emit NetworkEventType.PLAYER_JOINED (não TOOL_ACTIVATED)
    eventBus.emit(NetworkEventType.PLAYER_JOINED, {
      playerId: playerData.id,
      playerData: playerData
    });
  }
  
  /**
   * Handle player left
   */
  private handlePlayerLeft(playerId: string): void {
    const player = this.players.get(playerId);
    
    if (player) {
      this.players.delete(playerId);
      console.log(`👤 Player left: ${player.name}`);
      
      eventBus.emit(NetworkEventType.PLAYER_LEFT, {
        playerId: playerId
      });
    }
  }
  
  /**
   * Handle player update
   */
  private handlePlayerUpdate(playerData: PlayerData): void {
    this.players.set(playerData.id, playerData);
    
    eventBus.emit(NetworkEventType.PLAYER_UPDATED, {
      playerId: playerData.id,
      data: playerData
    });
  }
  
  /**
   * Handle state sync
   */
  private handleStateSync(state: any): void {
    // Sync global state
    console.log('🔄 State synced');
    
    eventBus.emit(NetworkEventType.STATE_SYNC, {
      state: state
    });
  }
  
  /**
   * Handle direct message
   */
  private handleDirectMessage(message: NetworkMessage): void {
    console.log(`💬 Message from ${message.from}:`, message.data);
    
    // ✅ Roteia VoIP signaling (webrtc_offer/answer/ice_candidate)
    const data = message.data;
    if (data && (data.type === 'webrtc_offer' || data.type === 'webrtc_answer' || data.type === 'ice_candidate')) {
      eventBus.emit(NetworkEventType.MESSAGE_RECEIVED, {
        from: message.from,
        message: data
      });
    } else {
      // Mensagem normal
      eventBus.emit(NetworkEventType.MESSAGE_RECEIVED, {
        from: message.from,
        message: data
      });
    }
  }
  
  /**
   * Handle broadcast
   */
  private handleBroadcast(message: NetworkMessage): void {
    console.log(`📢 Broadcast from ${message.from}:`, message.data);
    
    eventBus.emit(NetworkEventType.BROADCAST_RECEIVED, {
      from: message.from,
      message: message.data
    });
  }
  
  /**
   * Envia mensagem
   */
  public send(message: NetworkMessage): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ Not connected, message not sent');
    }
  }
  
  /**
   * Envia mensagem direta
   */
  public sendMessage(to: string, data: any): void {
    this.send({
      type: 'message',
      from: this.playerId || '',
      to,
      data,
      timestamp: Date.now()
    });
  }
  
  /**
   * Envia broadcast
   */
  public broadcast(data: any): void {
    this.send({
      type: 'broadcast',
      from: this.playerId || '',
      data,
      timestamp: Date.now()
    });
  }
  
  /**
   * Sincroniza estado do player
   */
  public syncPlayerState(position: { x: number; y: number; z: number }, rotation: { x: number; y: number; z: number; w: number }, isVR: boolean): void {
    if (!this.isConnected || !this.playerId) return;
    
    const playerData: PlayerData = {
      id: this.playerId,
      name: this.playerName,
      position,
      rotation,
      isVR,
      timestamp: Date.now()
    };
    
    this.send({
      type: 'player_update',
      from: this.playerId,
      data: playerData,
      timestamp: Date.now()
    });
  }
  
  /**
   * Inicia loop de sincronização
   */
  private startSyncLoop(): void {
    this.syncTimer = window.setInterval(() => {
      // Sync automático será implementado aqui
    }, 1000 / this.syncRate);
  }
  
  /**
   * Para loop de sincronização
   */
  private stopSyncLoop(): void {
    if (this.syncTimer !== null) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }
  
  /**
   * Cria sala
   */
  public async createRoom(roomName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const roomId = `room_${Date.now()}`;
      
      // Aguarda mensagem room_created do servidor
      const handler = (event: MessageEvent) => {
        try {
          const msg: NetworkMessage = JSON.parse(event.data);
          if (msg.type === 'room_created' && msg.data.roomId === roomId) {
            this.currentRoom = roomId;
            this.ws!.removeEventListener('message', handler);
            
            eventBus.emit(NetworkEventType.ROOM_CREATED, {
              roomId: roomId,
              roomData: msg.data
            });
            
            resolve(roomId);
          }
        } catch (error) {
          // Ignora erro de parse
        }
      };
      
      if (this.ws) {
        this.ws.addEventListener('message', handler);
        
        this.send({
          type: 'create_room',
          from: this.playerId || '',
          data: { roomId, roomName },
          timestamp: Date.now()
        });
        
        // Timeout de 5s para evitar deadlock
        setTimeout(() => {
          this.ws?.removeEventListener('message', handler);
          reject(new Error('Room creation timeout'));
        }, 5000);
      } else {
        reject(new Error('Not connected'));
      }
    });
  }
  
  /**
   * Entra em sala
   */
  public async joinRoom(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Aguarda mensagem room_joined do servidor
      const handler = (event: MessageEvent) => {
        try {
          const msg: NetworkMessage = JSON.parse(event.data);
          if (msg.type === 'room_joined' && msg.data.roomId === roomId) {
            this.currentRoom = roomId;
            this.ws!.removeEventListener('message', handler);
            
            eventBus.emit(NetworkEventType.ROOM_JOINED, {
              roomId: roomId
            });
            
            resolve();
          }
        } catch (error) {
          // Ignora erro de parse
        }
      };
      
      if (this.ws) {
        this.ws.addEventListener('message', handler);
        
        this.send({
          type: 'join_room',
          from: this.playerId || '',
          data: { roomId },
          timestamp: Date.now()
        });
        
        // Timeout de 5s
        setTimeout(() => {
          this.ws?.removeEventListener('message', handler);
          reject(new Error('Room join timeout'));
        }, 5000);
      } else {
        reject(new Error('Not connected'));
      }
    });
  }
  
  /**
   * Sai da sala
   */
  public leaveRoom(): void {
    if (this.currentRoom) {
      this.send({
        type: 'leave_room',
        from: this.playerId || '',
        data: { roomId: this.currentRoom },
        timestamp: Date.now()
      });
      
      eventBus.emit(NetworkEventType.ROOM_LEFT, {
        roomId: this.currentRoom
      });
      
      this.currentRoom = null;
    }
  }
  
  /**
   * Retorna estado de conexão
   */
  public getIsConnected(): boolean {
    return this.isConnected;
  }
  
  /**
   * Retorna player ID
   */
  public getPlayerId(): string | null {
    return this.playerId;
  }
  
  /**
   * Retorna players conectados
   */
  public getPlayers(): Map<string, PlayerData> {
    return this.players;
  }
  
  /**
   * Retorna sala atual
   */
  public getCurrentRoom(): string | null {
    return this.currentRoom;
  }
  
  /**
   * Define taxa de sincronização
   */
  public setSyncRate(hz: number): void {
    this.syncRate = hz;
    
    if (this.syncTimer !== null) {
      this.stopSyncLoop();
      this.startSyncLoop();
    }
    
    console.log(`🔄 Sync rate: ${hz}Hz`);
  }
}

// Exporta instância global
export const networkManager = NetworkManager.getInstance();
