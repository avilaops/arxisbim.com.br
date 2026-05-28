/**
 * MediaService - Gerencia captura de áudio, vídeo e screen share
 */

export interface MediaConstraints {
  audio?: boolean | MediaTrackConstraints;
  video?: boolean | MediaTrackConstraints;
}

export interface ScreenShareConstraints {
  video: boolean | MediaTrackConstraints;
  audio?: boolean;
}

export class MediaService {
  private localStream?: MediaStream;
  private screenStream?: MediaStream;
  
  // Estado
  private audioEnabled = false;
  private videoEnabled = false;
  private screenShareActive = false;

  /**
   * Solicita acesso ao microfone
   */
  public async getMicrophoneStream(): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        },
        video: false
      });
      
      this.localStream = stream;
      this.audioEnabled = true;
      
      console.log('🎤 Microfone capturado');
      return stream;
    } catch (error) {
      console.error('❌ Erro ao capturar microfone:', error);
      throw error;
    }
  }

  /**
   * Solicita acesso à câmera
   */
  public async getCameraStream(constraints?: MediaConstraints): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: constraints?.audio !== false ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false,
        video: constraints?.video !== false ? {
          width: { ideal: 640 },
          height: { ideal: 360 },
          frameRate: { ideal: 30, max: 30 }
        } : false
      });
      
      this.localStream = stream;
      this.audioEnabled = stream.getAudioTracks().length > 0;
      this.videoEnabled = stream.getVideoTracks().length > 0;
      
      console.log('📹 Câmera capturada');
      return stream;
    } catch (error) {
      console.error('❌ Erro ao capturar câmera:', error);
      throw error;
    }
  }

  /**
   * Captura tela (screen share)
   */
  public async getScreenStream(constraints?: ScreenShareConstraints): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 15, max: 30 }
        },
        audio: constraints?.audio !== false
      });
      
      this.screenStream = stream;
      this.screenShareActive = true;
      
      // Listener para quando usuário para compartilhamento
      stream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare();
      };
      
      console.log('🖥️ Tela capturada');
      return stream;
    } catch (error) {
      console.error('❌ Erro ao capturar tela:', error);
      throw error;
    }
  }

  /**
   * Para screen share
   */
  public stopScreenShare(): void {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = undefined;
      this.screenShareActive = false;
      console.log('🖥️ Screen share parado');
    }
  }

  /**
   * Mute/unmute mic
   */
  public toggleAudio(): boolean {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      this.audioEnabled = audioTracks[0]?.enabled ?? false;
      console.log(`🎤 Áudio ${this.audioEnabled ? 'ativado' : 'desativado'}`);
    }
    return this.audioEnabled;
  }

  /**
   * Liga/desliga câmera
   */
  public toggleVideo(): boolean {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      this.videoEnabled = videoTracks[0]?.enabled ?? false;
      console.log(`📹 Vídeo ${this.videoEnabled ? 'ativado' : 'desativado'}`);
    }
    return this.videoEnabled;
  }

  /**
   * Para todos os streams
   */
  public stopAllStreams(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = undefined;
      this.audioEnabled = false;
      this.videoEnabled = false;
    }
    
    this.stopScreenShare();
    
    console.log('🔇 Todos os streams parados');
  }

  /**
   * Lista dispositivos disponíveis
   */
  public async getDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices;
    } catch (error) {
      console.error('❌ Erro ao listar dispositivos:', error);
      return [];
    }
  }

  /**
   * Troca dispositivo de áudio
   */
  public async switchAudioDevice(deviceId: string): Promise<void> {
    if (!this.localStream) return;
    
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
        video: false
      });
      
      const newAudioTrack = newStream.getAudioTracks()[0];
      const oldAudioTrack = this.localStream.getAudioTracks()[0];
      
      // Substitui track
      this.localStream.removeTrack(oldAudioTrack);
      this.localStream.addTrack(newAudioTrack);
      
      oldAudioTrack.stop();
      
      console.log('🎤 Dispositivo de áudio trocado');
    } catch (error) {
      console.error('❌ Erro ao trocar dispositivo de áudio:', error);
    }
  }

  /**
   * Getters
   */
  public getLocalStream(): MediaStream | undefined {
    return this.localStream;
  }

  public getCurrentScreenStream(): MediaStream | undefined {
    return this.screenStream;
  }

  public isAudioEnabled(): boolean {
    return this.audioEnabled;
  }

  public isVideoEnabled(): boolean {
    return this.videoEnabled;
  }

  public isScreenShareActive(): boolean {
    return this.screenShareActive;
  }
}
