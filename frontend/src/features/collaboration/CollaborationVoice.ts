/**
 * CollaborationVoice — voz peer-to-peer via WebRTC
 *
 * Usa o WebSocket já conectado do MultiplayerRealtimeService como canal de
 * sinalização (offer / answer / ice_candidate).
 * O signaling server já faz relay desses tipos de mensagem.
 *
 * Uso:
 *   const voice = new CollaborationVoice(localParticipantId);
 *   await voice.start();       // pede microfone + escuta peers
 *   voice.mute(true/false);
 *   voice.dispose();           // fecha tudo
 */

import { MultiplayerRealtimeService } from '../multiplayer-realtime/multiplayer-realtime.service';
import { CollaborationToast } from './CollaborationToast';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

interface PeerEntry {
  pc: RTCPeerConnection;
  audioEl: HTMLAudioElement;
}

export class CollaborationVoice {
  private localId: string;
  private localStream: MediaStream | null = null;
  private peers = new Map<string, PeerEntry>(); // participantId → peer
  private unsubs: Array<() => void> = [];
  private muted = false;

  /** Indicador de nível de áudio no DOM */
  private voiceBar: HTMLElement | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId = 0;

  constructor(localParticipantId: string) {
    this.localId = localParticipantId;
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    // Pedir microfone
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        CollaborationToast.show('🎤 Permissão de microfone negada', 'leave');
      } else {
        CollaborationToast.show('🎤 Erro ao acessar microfone', 'leave');
      }
      throw err;
    }

    // VU meter
    this.startVUMeter(this.localStream);

    // Escutar mensagens WebRTC vindas do signaling server via onAction
    const unsubAction = MultiplayerRealtimeService.onAction(async (action: any) => {
      const { from } = action;
      if (!from || from === this.localId) return;
      // Filtrar: só processar mensagens direcionadas a este participante
      if (action.to && action.to !== this.localId) return;

      switch (action.type) {
        case 'webrtc_offer':
          await this.handleOffer(from, action.offer);
          break;
        case 'webrtc_answer':
          await this.handleAnswer(from, action.answer);
          break;
        case 'webrtc_ice':
          await this.handleIce(from, action.candidate);
          break;
        case 'webrtc_request':
          // Novo peer quer se conectar — iniciar como caller
          await this.initiatePeer(from);
          break;
      }
    });

    // Quando novo participante entra, anunciar presença de voz
    const unsubJoined = MultiplayerRealtimeService.onParticipantJoined(async (p) => {
      if (p.id === this.localId) return;
      // Avisar peer que temos voz ativa
      this.sendSignal(p.id, { type: 'webrtc_request', from: this.localId });
    });

    // Quando participante sai, fechar peer
    const unsubLeft = MultiplayerRealtimeService.onParticipantLeft((id) => {
      this.closePeer(id);
    });

    this.unsubs = [unsubAction, unsubJoined, unsubLeft];

    // Anunciar para participantes já na sala
    MultiplayerRealtimeService.getParticipants().forEach((p) => {
      if (p.id !== this.localId) {
        this.sendSignal(p.id, { type: 'webrtc_request', from: this.localId });
      }
    });

    this.mountVoiceUI();
    CollaborationToast.show('🎤 Microfone ativado', 'join');
  }

  mute(value: boolean): void {
    this.muted = value;
    this.localStream?.getAudioTracks().forEach((t) => { t.enabled = !value; });
    const btn = document.getElementById('collab-voice-mute');
    if (btn) btn.textContent = value ? '🔇 Mudo' : '🎤 Ativo';
    CollaborationToast.show(value ? '🔇 Microfone mudo' : '🎤 Microfone ativo', 'info');
  }

  dispose(): void {
    cancelAnimationFrame(this.animFrameId);
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.peers.forEach((_, id) => this.closePeer(id));
    document.getElementById('collab-voice-ui')?.remove();
  }

  // ─── WebRTC signaling ────────────────────────────────────────────────────────

  private async initiatePeer(remoteId: string): Promise<void> {
    const entry = this.getOrCreatePeer(remoteId);
    const offer = await entry.pc.createOffer();
    await entry.pc.setLocalDescription(offer);
    this.sendSignal(remoteId, { type: 'webrtc_offer', from: this.localId, offer });
  }

  private async handleOffer(remoteId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    const entry = this.getOrCreatePeer(remoteId);
    await entry.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await entry.pc.createAnswer();
    await entry.pc.setLocalDescription(answer);
    this.sendSignal(remoteId, { type: 'webrtc_answer', from: this.localId, answer });
  }

  private async handleAnswer(remoteId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const entry = this.peers.get(remoteId);
    if (!entry) return;
    await entry.pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  private async handleIce(remoteId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const entry = this.peers.get(remoteId);
    if (!entry || !candidate) return;
    try {
      await entry.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch { /* ignore stale candidates */ }
  }

  private getOrCreatePeer(remoteId: string): PeerEntry {
    if (this.peers.has(remoteId)) return this.peers.get(remoteId)!;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Adicionar tracks locais
    this.localStream?.getTracks().forEach((t) => pc.addTrack(t, this.localStream!));

    // ICE candidates → relay via signaling
    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        this.sendSignal(remoteId, { type: 'webrtc_ice', from: this.localId, candidate: ev.candidate });
      }
    };

    // Audio remoto → elemento <audio>
    const audioEl = document.createElement('audio');
    audioEl.autoplay = true;
    audioEl.style.display = 'none';
    document.body.appendChild(audioEl);

    pc.ontrack = (ev) => {
      if (ev.streams?.[0]) {
        audioEl.srcObject = ev.streams[0];
        this.updateVoiceUI();
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.closePeer(remoteId);
      }
    };

    const entry: PeerEntry = { pc, audioEl };
    this.peers.set(remoteId, entry);
    return entry;
  }

  private closePeer(remoteId: string): void {
    const entry = this.peers.get(remoteId);
    if (!entry) return;
    entry.pc.close();
    entry.audioEl.srcObject = null;
    entry.audioEl.remove();
    this.peers.delete(remoteId);
    this.updateVoiceUI();
  }

  /** Envia sinal para um peer específico via sync_action (relay pelo signaling server).
   *  O campo `to` é incluído para que o receptor filtre mensagens não endereçadas a ele. */
  private sendSignal(to: string, payload: Record<string, unknown>): void {
    try {
      MultiplayerRealtimeService.syncAction({ ...payload, to } as any);
    } catch { /* not connected */ }
  }

  // ─── VU Meter ────────────────────────────────────────────────────────────────

  private startVUMeter(stream: MediaStream): void {
    try {
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 256;
      src.connect(this.analyser);

      const data = new Uint8Array(this.analyser.frequencyBinCount);
      const tick = () => {
        this.animFrameId = requestAnimationFrame(tick);
        if (!this.analyser || this.muted) return;
        this.analyser.getByteFrequencyData(data);
        const avg = data.reduce((s, v) => s + v, 0) / data.length;
        const bar = document.getElementById('collab-voice-bar');
        if (bar) {
          const pct = Math.min(100, avg * 2.5);
          bar.style.width = pct + '%';
          bar.style.background = avg > 30 ? '#34d399' : '#3b82f6';
        }
      };
      this.animFrameId = requestAnimationFrame(tick);
    } catch { /* AudioContext not available */ }
  }

  // ─── Voice UI ────────────────────────────────────────────────────────────────

  private mountVoiceUI(): void {
    if (document.getElementById('collab-voice-ui')) return;

    const ui = document.createElement('div');
    ui.id = 'collab-voice-ui';
    ui.style.cssText = `
      position: fixed; bottom: 64px; left: 50%; transform: translateX(-50%);
      background: rgba(15,23,42,0.93); border: 1px solid #3b82f6;
      border-radius: 99px; padding: 8px 16px; display: flex; align-items: center;
      gap: 12px; z-index: 9999; backdrop-filter: blur(8px);
      box-shadow: 0 4px 24px rgba(0,0,0,0.4); font-family: Inter,system-ui,sans-serif;
      font-size: 12px; color: #94a3b8;
    `;
    ui.innerHTML = `
      <span id="collab-voice-peers">🔊 0 pares</span>
      <div style="width:80px;height:6px;background:#1e293b;border-radius:3px;overflow:hidden">
        <div id="collab-voice-bar" style="height:100%;width:0%;background:#3b82f6;transition:width .1s"></div>
      </div>
      <button id="collab-voice-mute" style="
        background:#1e40af;border:none;color:#fff;border-radius:99px;
        padding:3px 10px;cursor:pointer;font-size:12px;
      ">🎤 Ativo</button>
      <button id="collab-voice-stop" style="
        background:#7f1d1d;border:none;color:#fff;border-radius:99px;
        padding:3px 10px;cursor:pointer;font-size:12px;
      ">✕</button>
    `;
    document.body.appendChild(ui);

    document.getElementById('collab-voice-mute')!.addEventListener('click', () => {
      this.mute(!this.muted);
    });
    document.getElementById('collab-voice-stop')!.addEventListener('click', () => {
      this.dispose();
    });
  }

  private updateVoiceUI(): void {
    const el = document.getElementById('collab-voice-peers');
    if (el) el.textContent = `🔊 ${this.peers.size} par${this.peers.size !== 1 ? 'es' : ''}`;
  }
}
