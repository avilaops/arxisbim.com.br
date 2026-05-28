import { networkManager } from './NetworkManager';
import { eventBus } from '../core';
import { NetworkEventType } from './events/NetworkEvents';

/**
 * VoIPSystem - Sistema de voz para multiplayer
 * WebRTC P2P audio communication
 * 
 * Features:
 * - WebRTC peer-to-peer audio
 * - Spatial audio 3D (futuro)
 * - Push-to-talk
 * - Voice activity detection
 * - Audio quality management
 * - Mute/unmute controls
 * 
 * Preparado para integração com THREE.PositionalAudio
 */
export class VoIPSystem {
  // WebRTC
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  
  // Audio context
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  
  // State
  private isEnabled: boolean = false;
  private isMuted: boolean = false;
  private isPushToTalk: boolean = true;
  private isTalking: boolean = false;
  
  // Configuration
  private audioConstraints: MediaStreamConstraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000
    },
    video: false
  };
  
  constructor() {
    this.setupAudioContext();
    this.setupNetworkListeners();
    console.log('🎤 VoIP System initialized');
  }
  
  /**
   * Configura listeners de rede para VoIP signaling
   */
  private setupNetworkListeners(): void {
    // ✅ Escuta mensagens de signaling (webrtc_offer/answer/ice_candidate)
    eventBus.on(NetworkEventType.MESSAGE_RECEIVED, (data) => {
      const { from, message } = data;
      
      if (!message || typeof message !== 'object') return;
      
      switch (message.type) {
        case 'webrtc_offer':
          if (message.offer) {
            this.handleOffer(from, message.offer);
          }
          break;
        
        case 'webrtc_answer':
          if (message.answer) {
            this.handleAnswer(from, message.answer);
          }
          break;
        
        case 'ice_candidate':
          if (message.candidate) {
            this.handleIceCandidate(from, message.candidate);
          }
          break;
      }
    });
    
    // Desconecta quando player sai
    eventBus.on(NetworkEventType.PLAYER_LEFT, (data) => {
      this.disconnectPeer(data.playerId);
    });
  }
  
  /**
   * Configura Audio Context
   */
  private setupAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      
      console.log('✅ Audio context created');
    } catch (error) {
      console.error('❌ Failed to create audio context:', error);
    }
  }
  
  /**
   * Habilita VoIP
   */
  public async enable(): Promise<void> {
    if (this.isEnabled) {
      console.warn('⚠️ VoIP already enabled');
      return;
    }
    
    try {
      // Solicita acesso ao microfone
      this.localStream = await navigator.mediaDevices.getUserMedia(this.audioConstraints);
      
      console.log('✅ Microphone access granted');
      
      this.isEnabled = true;
      
      // Conecta a todos os players existentes
      this.connectToExistingPlayers();
      
      console.log('🎤 VoIP enabled');
      
    } catch (error) {
      console.error('❌ Failed to enable VoIP:', error);
      throw error;
    }
  }
  
  /**
   * Desabilita VoIP
   */
  public disable(): void {
    if (!this.isEnabled) {
      console.warn('⚠️ VoIP already disabled');
      return;
    }
    
    // Para local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    
    // Fecha todas as conexões
    this.peerConnections.forEach((_, playerId) => {
      this.disconnectPeer(playerId);
    });
    
    this.isEnabled = false;
    
    console.log('🎤 VoIP disabled');
  }
  
  /**
   * Conecta a players existentes
   */
  private connectToExistingPlayers(): void {
    const players = networkManager.getPlayers();
    
    players.forEach((_, playerId) => {
      if (playerId !== networkManager.getPlayerId()) {
        this.connectToPeer(playerId);
      }
    });
  }
  
  /**
   * Conecta a um peer
   */
  public async connectToPeer(playerId: string): Promise<void> {
    if (!this.isEnabled || !this.localStream) {
      console.warn('⚠️ VoIP not enabled');
      return;
    }
    
    try {
      // Cria peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      
      // Adiciona local stream
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
      
      // Handle remote stream
      pc.ontrack = (event) => {
        this.handleRemoteStream(playerId, event.streams[0]);
      };
      
      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // Envia candidate para peer via signaling server
          networkManager.sendMessage(playerId, {
            type: 'ice_candidate',
            candidate: event.candidate
          });
        }
      };
      
      // Handle connection state
      pc.onconnectionstatechange = () => {
        console.log(`🔌 Connection state (${playerId}):`, pc.connectionState);
        
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          this.disconnectPeer(playerId);
        }
      };
      
      // Cria offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Envia offer para peer
      networkManager.sendMessage(playerId, {
        type: 'webrtc_offer',
        offer: offer
      });
      
      this.peerConnections.set(playerId, pc);
      
      console.log(`🎤 Connected to peer: ${playerId}`);
      
    } catch (error) {
      console.error(`❌ Failed to connect to peer ${playerId}:`, error);
    }
  }
  
  /**
   * Desconecta de um peer
   */
  public disconnectPeer(playerId: string): void {
    const pc = this.peerConnections.get(playerId);
    
    if (pc) {
      pc.close();
      this.peerConnections.delete(playerId);
      
      console.log(`🎤 Disconnected from peer: ${playerId}`);
    }
  }
  
  /**
   * Handle remote stream
   */
  private handleRemoteStream(playerId: string, stream: MediaStream): void {
    console.log(`🔊 Receiving audio from: ${playerId}`);
    
    // Cria audio element
    const audio = new Audio();
    audio.srcObject = stream;
    audio.autoplay = true;
    
    // Conecta ao audio context para spatial audio (futuro)
    if (this.audioContext && this.gainNode) {
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.gainNode);
    }
  }
  
  /**
   * Handle WebRTC offer
   */
  public async handleOffer(playerId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.isEnabled || !this.localStream) return;
    
    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });
      
      // Adiciona local stream
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
      
      // Handle remote stream
      pc.ontrack = (event) => {
        this.handleRemoteStream(playerId, event.streams[0]);
      };
      
      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          networkManager.sendMessage(playerId, {
            type: 'ice_candidate',
            candidate: event.candidate
          });
        }
      };
      
      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Send answer
      networkManager.sendMessage(playerId, {
        type: 'webrtc_answer',
        answer: answer
      });
      
      this.peerConnections.set(playerId, pc);
      
      console.log(`🎤 Answered offer from: ${playerId}`);
      
    } catch (error) {
      console.error(`❌ Failed to handle offer from ${playerId}:`, error);
    }
  }
  
  /**
   * Handle WebRTC answer
   */
  public async handleAnswer(playerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peerConnections.get(playerId);
    
    if (pc) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log(`🎤 Received answer from: ${playerId}`);
      } catch (error) {
        console.error(`❌ Failed to handle answer from ${playerId}:`, error);
      }
    }
  }
  
  /**
   * Handle ICE candidate
   */
  public async handleIceCandidate(playerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.peerConnections.get(playerId);
    
    if (pc) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error(`❌ Failed to add ICE candidate from ${playerId}:`, error);
      }
    }
  }
  
  /**
   * Mute/unmute
   */
  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
    
    console.log(`🎤 ${muted ? 'Muted' : 'Unmuted'}`);
  }
  
  /**
   * Toggle mute
   */
  public toggleMute(): void {
    this.setMuted(!this.isMuted);
  }
  
  /**
   * Push to talk - press
   */
  public pushToTalkPress(): void {
    if (this.isPushToTalk && !this.isTalking) {
      this.isTalking = true;
      this.setMuted(false);
      console.log('🎤 Push to talk: ON');
    }
  }
  
  /**
   * Push to talk - release
   */
  public pushToTalkRelease(): void {
    if (this.isPushToTalk && this.isTalking) {
      this.isTalking = false;
      this.setMuted(true);
      console.log('🎤 Push to talk: OFF');
    }
  }
  
  /**
   * Define push to talk mode
   */
  public setPushToTalk(enabled: boolean): void {
    this.isPushToTalk = enabled;
    
    if (!enabled) {
      this.setMuted(false);
    }
    
    console.log(`🎤 Push to talk: ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Define volume
   */
  public setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
      console.log(`🔊 Volume: ${Math.round(volume * 100)}%`);
    }
  }
  
  /**
   * Retorna se está habilitado
   */
  public getIsEnabled(): boolean {
    return this.isEnabled;
  }
  
  /**
   * Retorna se está mutado
   */
  public getIsMuted(): boolean {
    return this.isMuted;
  }
  
  /**
   * Retorna estatísticas
   */
  public getStats(): {
    enabled: boolean;
    muted: boolean;
    pushToTalk: boolean;
    connections: number;
  } {
    return {
      enabled: this.isEnabled,
      muted: this.isMuted,
      pushToTalk: this.isPushToTalk,
      connections: this.peerConnections.size
    };
  }
  
  /**
   * Imprime estatísticas
   */
  public printStats(): void {
    const stats = this.getStats();
    console.log('📊 VoIP Stats:');
    console.log(`   Enabled: ${stats.enabled}`);
    console.log(`   Muted: ${stats.muted}`);
    console.log(`   Push to Talk: ${stats.pushToTalk}`);
    console.log(`   Active Connections: ${stats.connections}`);
  }
}
