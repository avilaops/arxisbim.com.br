/**
 * WebRTCPeer - Gerencia conexão individual WebRTC peer-to-peer
 */

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

export interface PeerCallbacks {
  onTrack?: (stream: MediaStream, peerId: string) => void;
  onIceCandidate?: (candidate: RTCIceCandidate, peerId: string) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState, peerId: string) => void;
  onDataChannel?: (channel: RTCDataChannel, peerId: string) => void;
}

export class WebRTCPeer {
  private peerConnection: RTCPeerConnection;
  private peerId: string;
  private callbacks: PeerCallbacks;
  private dataChannel?: RTCDataChannel;
  
  // Tracks locais
  private localStream?: MediaStream;
  
  constructor(
    peerId: string,
    config: WebRTCConfig,
    callbacks: PeerCallbacks
  ) {
    this.peerId = peerId;
    this.callbacks = callbacks;
    
    // Criar RTCPeerConnection
    this.peerConnection = new RTCPeerConnection({
      iceServers: config.iceServers,
      // Configurações otimizadas para BIM
      iceTransportPolicy: 'all', // Permite relay (TURN)
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    });
    
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // ICE candidate
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.callbacks.onIceCandidate) {
        this.callbacks.onIceCandidate(event.candidate, this.peerId);
      }
    };
    
    // Track recebido (áudio/vídeo remoto)
    this.peerConnection.ontrack = (event) => {
      if (event.streams[0] && this.callbacks.onTrack) {
        this.callbacks.onTrack(event.streams[0], this.peerId);
      }
    };
    
    // Estado da conexão
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      console.log(`🔗 Peer ${this.peerId} connection state: ${state}`);
      
      if (this.callbacks.onConnectionStateChange) {
        this.callbacks.onConnectionStateChange(state, this.peerId);
      }
    };
    
    // Data channel recebido
    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
      
      if (this.callbacks.onDataChannel) {
        this.callbacks.onDataChannel(event.channel, this.peerId);
      }
    };
  }

  /**
   * Adiciona stream local (mic/video)
   */
  public addLocalStream(stream: MediaStream): void {
    this.localStream = stream;
    
    stream.getTracks().forEach((track) => {
      this.peerConnection.addTrack(track, stream);
    });
    
    console.log(`📹 Stream local adicionado para peer ${this.peerId}`);
  }

  /**
   * Cria offer (iniciador)
   */
  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  /**
   * Cria answer (receptor)
   */
  public async createAnswer(): Promise<RTCSessionDescriptionInit> {
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  /**
   * Define remote description
   */
  public async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(description)
    );
  }

  /**
   * Adiciona ICE candidate remoto
   */
  public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      await this.peerConnection.addIceCandidate(
        new RTCIceCandidate(candidate)
      );
    } catch (error) {
      console.error('❌ Erro ao adicionar ICE candidate:', error);
    }
  }

  /**
   * Cria data channel (para posição, etc)
   */
  public createDataChannel(label: string): RTCDataChannel {
    this.dataChannel = this.peerConnection.createDataChannel(label, {
      ordered: false, // UDP-like para posição
      maxRetransmits: 0
    });
    
    this.setupDataChannel();
    return this.dataChannel;
  }

  /**
   * Setup data channel events
   */
  private setupDataChannel(): void {
    if (!this.dataChannel) return;
    
    this.dataChannel.onopen = () => {
      console.log(`📡 Data channel aberto para peer ${this.peerId}`);
    };
    
    this.dataChannel.onclose = () => {
      console.log(`📡 Data channel fechado para peer ${this.peerId}`);
    };
    
    this.dataChannel.onerror = (error) => {
      console.error(`❌ Erro no data channel:`, error);
    };
  }

  /**
   * Envia mensagem via data channel
   */
  public sendData(data: any): void {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(data));
    }
  }

  /**
   * Obtém estatísticas da conexão
   */
  public async getStats(): Promise<RTCStatsReport> {
    return await this.peerConnection.getStats();
  }

  /**
   * Fecha conexão
   */
  public close(): void {
    // Remove tracks locais
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    
    // Fecha data channel
    if (this.dataChannel) {
      this.dataChannel.close();
    }
    
    // Fecha peer connection
    this.peerConnection.close();
    
    console.log(`🔌 Peer ${this.peerId} desconectado`);
  }

  /**
   * Getters
   */
  public getPeerId(): string {
    return this.peerId;
  }

  public getConnectionState(): RTCPeerConnectionState {
    return this.peerConnection.connectionState;
  }

  public getDataChannel(): RTCDataChannel | undefined {
    return this.dataChannel;
  }
}
