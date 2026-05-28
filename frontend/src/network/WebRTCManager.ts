/**
 * WebRTCManager - Gerencia todas as conexões WebRTC e coordena sistema
 */

import { WebRTCPeer, WebRTCConfig, PeerCallbacks } from './WebRTCPeer';
import { SignalingService, SignalingCallbacks } from './SignalingService';
import { MediaService } from './MediaService';
import { VideoTexture3D, ScreenSharePlane } from './VideoTexture3D';
import * as THREE from 'three';

export interface WebRTCManagerConfig {
  signalingServerUrl: string;
  userId: string;
  scene: THREE.Scene;
  camera: THREE.Camera;
  iceServers?: RTCIceServer[];
}

export class WebRTCManager {
  // Services
  private signaling: SignalingService;
  private media: MediaService;
  
  // Config
  private config: WebRTCManagerConfig;
  private webrtcConfig: WebRTCConfig;
  
  // Peers ativos
  private peers: Map<string, WebRTCPeer> = new Map();
  
  // Video textures 3D
  private videoTextures: Map<string, VideoTexture3D> = new Map();
  private screenSharePlane?: ScreenSharePlane;
  
  // Estado
  private currentRoomId?: string;
  private voiceEnabled = false;
  
  constructor(config: WebRTCManagerConfig) {
    this.config = config;
    
    // Config padrão de ICE servers (STUN/TURN)
    this.webrtcConfig = {
      iceServers: config.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // TURN server (produção - adicionar credenciais reais)
        // {
        //   urls: 'turn:your-turn-server.com:3478',
        //   username: 'user',
        //   credential: 'pass'
        // }
      ]
    };
    
    // Inicializa services
    this.media = new MediaService();
    this.signaling = new SignalingService(
      config.signalingServerUrl,
      config.userId,
      this.createSignalingCallbacks()
    );
  }

  /**
   * Cria callbacks do signaling service
   */
  private createSignalingCallbacks(): SignalingCallbacks {
    return {
      onConnected: () => {
        console.log('✅ WebRTC Manager conectado');
      },
      
      onDisconnected: () => {
        console.log('🔌 WebRTC Manager desconectado');
        this.cleanup();
      },
      
      onRoomJoined: (roomId, users) => {
        this.currentRoomId = roomId;
        console.log(`🚪 Entrou na sala ${roomId} com ${users.length} usuários`);
        
        // Conecta com cada usuário existente
        users.forEach((userId) => {
          if (userId !== this.config.userId) {
            this.createPeerConnection(userId, true);
          }
        });
      },
      
      onUserJoined: (userId) => {
        console.log(`👤 Usuário ${userId} entrou`);
        // Novo usuário será conectado quando ele enviar offer
      },
      
      onUserLeft: (userId) => {
        console.log(`👤 Usuário ${userId} saiu`);
        this.removePeer(userId);
      },
      
      onOffer: async (from, offer) => {
        console.log(`📨 Offer recebido de ${from}`);
        const peer = this.getPeer(from) || this.createPeerConnection(from, false);
        
        await peer.setRemoteDescription(offer);
        const answer = await peer.createAnswer();
        this.signaling.sendAnswer(from, answer);
      },
      
      onAnswer: async (from, answer) => {
        console.log(`📨 Answer recebido de ${from}`);
        const peer = this.getPeer(from);
        if (peer) {
          await peer.setRemoteDescription(answer);
        }
      },
      
      onIceCandidate: async (from, candidate) => {
        const peer = this.getPeer(from);
        if (peer) {
          await peer.addIceCandidate(candidate);
        }
      }
    };
  }

  /**
   * Cria callbacks do peer
   */
  private createPeerCallbacks(peerId: string): PeerCallbacks {
    return {
      onTrack: (stream) => {
        console.log(`📹 Stream recebido de ${peerId}`);
        this.handleRemoteStream(peerId, stream);
      },
      
      onIceCandidate: (candidate) => {
        this.signaling.sendIceCandidate(peerId, candidate);
      },
      
      onConnectionStateChange: (state) => {
        console.log(`🔗 Peer ${peerId} state: ${state}`);
        
        if (state === 'failed' || state === 'disconnected') {
          this.removePeer(peerId);
        }
      }
    };
  }

  /**
   * Conecta ao signaling server
   */
  public async connect(): Promise<void> {
    await this.signaling.connect();
  }

  /**
   * Entra em uma sala
   */
  public async joinRoom(roomId: string): Promise<void> {
    this.signaling.joinRoom(roomId);
  }

  /**
   * Sai da sala
   */
  public leaveRoom(): void {
    this.signaling.leaveRoom();
    this.cleanup();
  }

  /**
   * Ativa voz (microfone)
   */
  public async enableVoice(): Promise<void> {
    try {
      const stream = await this.media.getMicrophoneStream();
      
      // Adiciona stream para todos os peers
      this.peers.forEach((peer) => {
        peer.addLocalStream(stream);
      });
      
      this.voiceEnabled = true;
      console.log('🎤 Voz ativada');
    } catch (error) {
      console.error('❌ Erro ao ativar voz:', error);
      throw error;
    }
  }

  /**
   * Desativa voz
   */
  public disableVoice(): void {
    this.media.stopAllStreams();
    this.voiceEnabled = false;
    console.log('🔇 Voz desativada');
  }

  /**
   * Toggle mute
   */
  public toggleMute(): boolean {
    return this.media.toggleAudio();
  }

  /**
   * Inicia screen share
   */
  public async startScreenShare(): Promise<void> {
    try {
      const stream = await this.media.getScreenStream();
      
      // Cria plano 3D para screen share
      if (this.screenSharePlane) {
        this.screenSharePlane.dispose();
      }
      
      this.screenSharePlane = new ScreenSharePlane(
        this.config.userId,
        stream,
        this.config.scene
      );
      
      this.screenSharePlane.positionForPresentation(this.config.camera);
      
      // Adiciona stream para todos os peers
      this.peers.forEach((peer) => {
        peer.addLocalStream(stream);
      });
      
      console.log('🖥️ Screen share iniciado');
    } catch (error) {
      console.error('❌ Erro ao iniciar screen share:', error);
      throw error;
    }
  }

  /**
   * Para screen share
   */
  public stopScreenShare(): void {
    this.media.stopScreenShare();
    
    if (this.screenSharePlane) {
      this.screenSharePlane.dispose();
      this.screenSharePlane = undefined;
    }
    
    console.log('🖥️ Screen share parado');
  }

  /**
   * Cria conexão peer
   */
  private createPeerConnection(peerId: string, initiator: boolean): WebRTCPeer {
    const peer = new WebRTCPeer(
      peerId,
      this.webrtcConfig,
      this.createPeerCallbacks(peerId)
    );
    
    this.peers.set(peerId, peer);
    
    // Se é iniciador, adiciona stream local e envia offer
    if (initiator) {
      const localStream = this.media.getLocalStream();
      if (localStream) {
        peer.addLocalStream(localStream);
      }
      
      // Cria data channel para posição
      peer.createDataChannel('position');
      
      // Envia offer
      peer.createOffer().then((offer) => {
        this.signaling.sendOffer(peerId, offer);
      });
    }
    
    console.log(`🔗 Peer ${peerId} criado (initiator: ${initiator})`);
    return peer;
  }

  /**
   * Handle stream remoto
   */
  private handleRemoteStream(peerId: string, stream: MediaStream): void {
    // Remove texture antiga se existir
    const oldTexture = this.videoTextures.get(peerId);
    if (oldTexture) {
      oldTexture.dispose();
    }
    
    // Cria nova video texture 3D
    const videoTexture = new VideoTexture3D(
      peerId,
      stream,
      this.config.scene,
      {
        width: 0.8,
        height: 0.45,
        position: new THREE.Vector3(
          Math.random() * 4 - 2,
          2.5,
          -3
        )
      }
    );
    
    this.videoTextures.set(peerId, videoTexture);
    
    console.log(`📺 Video texture criado para ${peerId}`);
  }

  /**
   * Remove peer
   */
  private removePeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.close();
      this.peers.delete(peerId);
    }
    
    const videoTexture = this.videoTextures.get(peerId);
    if (videoTexture) {
      videoTexture.dispose();
      this.videoTextures.delete(peerId);
    }
    
    console.log(`🗑️ Peer ${peerId} removido`);
  }

  /**
   * Obtém peer
   */
  private getPeer(peerId: string): WebRTCPeer | undefined {
    return this.peers.get(peerId);
  }

  /**
   * Atualiza posição de avatar via data channel
   */
  public broadcastPosition(x: number, y: number, z: number, yaw: number): void {
    const data = { type: 'position', x, y, z, yaw };
    
    this.peers.forEach((peer) => {
      peer.sendData(data);
    });
  }

  /**
   * Cleanup
   */
  private cleanup(): void {
    // Remove todos os peers
    this.peers.forEach((_, peerId) => {
      this.removePeer(peerId);
    });
    
    // Para screen share
    if (this.screenSharePlane) {
      this.screenSharePlane.dispose();
      this.screenSharePlane = undefined;
    }
    
    // Para media
    this.media.stopAllStreams();
    this.voiceEnabled = false;
  }

  /**
   * Desconecta completamente
   */
  public disconnect(): void {
    this.leaveRoom();
    this.signaling.disconnect();
    this.cleanup();
    
    console.log('🔌 WebRTC Manager desconectado completamente');
  }

  /**
   * Getters
   */
  public isConnected(): boolean {
    return this.signaling.isConnected();
  }

  public isInRoom(): boolean {
    return this.currentRoomId !== undefined;
  }

  public isVoiceEnabled(): boolean {
    return this.voiceEnabled;
  }

  public getPeerCount(): number {
    return this.peers.size;
  }

  public getCurrentRoomId(): string | undefined {
    return this.currentRoomId;
  }
}
