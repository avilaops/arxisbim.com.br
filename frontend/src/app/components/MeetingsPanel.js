import { tenantService } from '../../api/v1/services/tenant.service';
import { getMeetingsSocketService } from '../../network/MeetingsSocketService';
import { MediaService } from '../../network/MediaService';

class MeetingsPanel {
  constructor() {
    this.isOpen = false;
    this.projectId = null;
    this.meetings = [];
    this.selectedMeeting = null;
    this.participants = [];
    this.messages = [];
    this.loading = false;
    this.error = null;
    this.socketService = getMeetingsSocketService();
    this.mediaService = new MediaService();
    this.webrtcManager = null; // Será inicializado quando necessário
    this.isConnected = false;
    this.userName = '';
    this.userId = '';
    this.audioEnabled = false;
    this.videoEnabled = false;
    this.remoteStreams = new Map(); // userId -> MediaStream
    this.showCreateMeetingInput = false;
    this.showJoinNameInput = false;
  }

  open(projectId) {
    this.projectId = projectId;
    this.isOpen = true;
    this.loadMeetings();
    this.render();
  }

  close() {
    this.isOpen = false;
    this.socketService.leaveRoom();
    this.mediaService.stopAllStreams();
    this.render();
  }

  connectSocket() {
    const token = localStorage.getItem('arxisvr_token');
    if (!token) {
      this.error = 'Token de autenticação não encontrado';
      this.render();
      return;
    }

    this.socketService.connect(token);
    this.setupSocketCallbacks();
  }

  setupSocketCallbacks() {
    this.socketService.onJoined((data) => {
      this.participants = data.participants || [];
      this.isConnected = true;
      this.userId = data.participant?.userId || '';
      this.render();
    });

    this.socketService.onParticipantJoined((data) => {
      if (data.participant) {
        this.participants.push(data.participant);
        // Iniciar WebRTC com novo participante
        this.initWebRTCWithPeer(data.participant.userId);
      }
      if (data.participants) {
        this.participants = data.participants;
      }
      this.render();
    });

    this.socketService.onParticipantLeft((data) => {
      this.participants = this.participants.filter(p => p.id !== data.participantId);
      // Remover stream remoto
      this.remoteStreams.delete(data.participantId);
      this.render();
    });

    this.socketService.onAvatarUpdated((data) => {
      const participant = this.participants.find(p => p.id === data.participantId);
      if (participant && data.avatarState) {
        participant.avatarState = data.avatarState;
      }
      this.render();
    });

    this.socketService.onMessageReceived((data) => {
      this.messages.push(data);
      this.render();
    });

    // WebRTC signaling callbacks
    this.socketService.onWebRTCOffer((data) => {
      console.log('WebRTC offer recebida de:', data.from);
      this.handleWebRTCOffer(data.from, data.offer);
    });

    this.socketService.onWebRTCAnswer((data) => {
      console.log('WebRTC answer recebida de:', data.from);
      this.handleWebRTCAnswer(data.from, data.answer);
    });

    this.socketService.onWebRTCIceCandidate((data) => {
      console.log('WebRTC ICE candidate recebido de:', data.from);
      this.handleWebRTCIceCandidate(data.from, data.candidate);
    });

    this.socketService.onError((data) => {
      this.error = data.message || 'Erro de conexão';
      this.render();
    });
  }

  async initWebRTCWithPeer(peerUserId) {
    // TODO: Integrar com WebRTCManager quando necessário
    console.log('Iniciando WebRTC com peer:', peerUserId);
  }

  async handleWebRTCOffer(from, offer) {
    // TODO: Processar offer via WebRTCManager
    console.log('Processando WebRTC offer de:', from);
  }

  async handleWebRTCAnswer(from, answer) {
    // TODO: Processar answer via WebRTCManager
    console.log('Processando WebRTC answer de:', from);
  }

  async handleWebRTCIceCandidate(from, candidate) {
    // TODO: Processar ICE candidate via WebRTCManager
    console.log('Processando ICE candidate de:', from);
  }

  async loadMeetings() {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      console.log('Loading meetings for project:', this.projectId);
      this.meetings = await tenantService.getProjectMeetingRooms(this.projectId);
      console.log('Loaded meetings:', this.meetings);
    } catch (err) {
      this.error = 'Failed to load meetings';
      console.error('Failed to load meetings:', err);
    } finally {
      this.loading = false;
      this.render();
    }
  }

  async createMeeting() {
    // Usar um input customizado no UI ao invés de prompt()
    this.showCreateMeetingInput = true;
    this.render();
  }

  async confirmCreateMeeting(name) {
    if (!name) {
      this.showCreateMeetingInput = false;
      this.render();
      return;
    }

    this.loading = true;
    this.error = null;
    this.showCreateMeetingInput = false;
    this.render();

    try {
      const newMeeting = await tenantService.createMeetingRoom(this.projectId, {
        settings: {
          maxParticipants: 10,
          allowRecording: true,
          allowChat: true,
        },
        avatarSettings: {
          allowCustomAvatars: true,
        },
      });
      this.meetings.push(newMeeting);
      this.selectedMeeting = newMeeting.id;
      await this.loadMeetingDetails(newMeeting.id);
    } catch (err) {
      this.error = 'Failed to create meeting';
      console.error('Failed to create meeting:', err);
    } finally {
      this.loading = false;
      this.render();
    }
  }

  async loadMeetingDetails(meetingId) {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      const [participants, messages] = await Promise.all([
        tenantService.getMeetingParticipants(meetingId),
        tenantService.getMeetingMessages(meetingId),
      ]);
      this.participants = participants;
      this.messages = messages;
    } catch (err) {
      this.error = 'Failed to load meeting details';
      console.error('Failed to load meeting details:', err);
    } finally {
      this.loading = false;
      this.render();
    }
  }

  async joinMeeting(meetingId) {
    this.selectedMeeting = meetingId;
    
    // Conectar Socket.IO se ainda não estiver conectado
    if (!this.socketService.isConnected()) {
      this.connectSocket();
    }

    // Mostrar input para nome do usuário
    this.showJoinNameInput = true;
    this.render();
  }

  async confirmJoinMeeting(userName) {
    if (!userName) {
      this.showJoinNameInput = false;
      this.render();
      return;
    }

    this.userName = userName;
    this.showJoinNameInput = false;

    // Entrar na sala via Socket.IO
    this.socketService.joinRoom(this.selectedMeeting, userName);
    
    // Carregar detalhes iniciais via REST
    await this.loadMeetingDetails(this.selectedMeeting);
  }

  sendMessage(message) {
    if (!message.trim()) return;
    this.socketService.sendMessage(message);
  }

  async toggleAudio() {
    try {
      if (!this.audioEnabled) {
        // Ativar microfone
        await this.mediaService.getMicrophoneStream();
        this.audioEnabled = true;
      } else {
        // Desativar microfone
        this.mediaService.toggleAudio();
        this.audioEnabled = this.mediaService.isAudioEnabled();
      }
      this.render();
    } catch (error) {
      console.error('Erro ao toggle áudio:', error);
      this.error = 'Erro ao acessar microfone';
      this.render();
    }
  }

  async toggleVideo() {
    try {
      if (!this.videoEnabled) {
        // Ativar câmera
        await this.mediaService.getCameraStream();
        this.videoEnabled = true;
      } else {
        // Desativar câmera
        this.mediaService.toggleVideo();
        this.videoEnabled = this.mediaService.isVideoEnabled();
      }
      this.render();
    } catch (error) {
      console.error('Erro ao toggle vídeo:', error);
      this.error = 'Erro ao acessar câmera';
      this.render();
    }
  }

  async endMeeting(meetingId) {
    // TODO: Add custom confirmation UI
    this.loading = true;
    this.error = null;
    this.render();

    try {
      await tenantService.endMeetingRoom(meetingId);
      await this.loadMeetings();
      this.selectedMeeting = null;
      this.participants = [];
      this.messages = [];
    } catch (err) {
      this.error = 'Failed to end meeting';
      console.error('Failed to end meeting:', err);
      this.loading = false;
      this.render();
    }
  }

  selectMeeting(meetingId) {
    this.selectedMeeting = meetingId;
    this.loadMeetingDetails(meetingId);
  }

  render() {
    let container = document.getElementById('meetings-panel-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'meetings-panel-container';
      document.body.appendChild(container);
    }

    if (!this.isOpen) {
      container.innerHTML = '';
      return;
    }

    const selectedMeeting = this.meetings.find(m => m.id === this.selectedMeeting);

    const isMobile = window.innerWidth <= 768;
    let html = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: ${isMobile ? 'flex-end' : 'center'};
        justify-content: center;
        z-index: 10000;
      ">
        <div style="
          background: var(--bg-primary);
          border-radius: ${isMobile ? '18px 18px 0 0' : '12px'};
          padding: ${isMobile ? '20px 16px 32px' : '32px'};
          width: 1000px;
          max-width: 100%;
          max-height: ${isMobile ? '92vh' : '90vh'};
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          ${isMobile ? 'width: 100%;' : ''}
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: ${isMobile ? '16px' : '24px'};">
            <h2 style="margin: 0; font-size: ${isMobile ? '18px' : '24px'}; color: var(--text-primary);">
              Reuniões XR
            </h2>
            <button id="meetings-close" style="
              background: none;
              border: none;
              color: var(--text-secondary);
              font-size: 24px;
              cursor: pointer;
              padding: 0;
              width: 32px;
              height: 32px;
            ">×</button>
          </div>
    `;

    if (this.error) {
      html += `
        <div style="
          padding: 12px;
          background: var(--accent-red);
          color: white;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 14px;
        ">
          ${this.error}
        </div>
      `;
    }

    // Meetings list
    html += `
      <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;">
        <div style="flex: 1; min-width: min(280px, 100%); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 16px; color: var(--text-primary);">Salas de Reunião</h3>
            <button id="meetings-create" style="
              padding: 6px 12px;
              background: var(--accent-blue);
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
            ">+ Criar</button>
          </div>
    `;

    if (this.showCreateMeetingInput) {
      html += `
        <div style="padding: 12px; background: var(--bg-secondary); border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 13px; color: var(--text-primary); margin-bottom: 8px;">Nome da reunião:</div>
          <div style="display: flex; gap: 8px;">
            <input type="text" id="meeting-create-name" placeholder="Digite o nome" style="
              flex: 1;
              padding: 8px;
              border: 1px solid var(--border-color);
              border-radius: 4px;
              background: var(--bg-primary);
              color: var(--text-primary);
              font-size: 13px;
            " />
            <button id="meeting-create-confirm" style="
              padding: 8px 16px;
              background: var(--accent-blue);
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 13px;
            ">Criar</button>
            <button id="meeting-create-cancel" style="
              padding: 8px 16px;
              background: var(--bg-secondary);
              color: var(--text-primary);
              border: 1px solid var(--border-color);
              border-radius: 4px;
              cursor: pointer;
              font-size: 13px;
            ">Cancelar</button>
          </div>
        </div>
      `;
    }

    if (this.loading) {
      html += `<p style="color: var(--text-secondary);">Carregando...</p>`;
    } else if (this.meetings.length === 0) {
      html += `<p style="color: var(--text-secondary);">Nenhuma sala de reunião</p>`;
    } else {
      this.meetings.forEach(meeting => {
        html += `
          <div style="
            padding: 12px;
            border: 1px solid ${this.selectedMeeting === meeting.id ? 'var(--accent-blue)' : 'var(--border-color)'};
            border-radius: 6px;
            margin-bottom: 8px;
            cursor: pointer;
            background: ${this.selectedMeeting === meeting.id ? 'var(--bg-secondary)' : 'transparent'};
          " class="meeting-item" data-id="${meeting.id}">
            <div style="font-weight: 600; color: var(--text-primary);">Sala ${meeting.id.substring(0, 8)}...</div>
            <div style="font-size: 12px; color: var(--text-secondary);">
              Código: ${meeting.meetingCode} | ${meeting.isActive ? 'Ativa' : 'Inativa'}
            </div>
          </div>
        `;
      });
    }

    html += `
        </div>
    `;

    // Selected meeting details
    if (selectedMeeting) {
      html += `
        <div style="flex: 2; min-width: min(280px, 100%); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 16px; color: var(--text-primary);">Detalhes da Sala</h3>
            <div style="display: flex; gap: 8px; align-items: center;">
              <span style="font-size: 12px; color: ${this.isConnected ? 'var(--accent-green)' : 'var(--text-secondary)'};">
                ${this.isConnected ? '● Conectado' : '○ Desconectado'}
              </span>
              <button class="meeting-end" data-id="${selectedMeeting.id}" style="
                padding: 6px 12px;
                background: var(--accent-red);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
              ">Encerrar</button>
            </div>
          </div>
          
          <div style="margin-bottom: 16px;">
            <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">
              Código de Acesso: <span style="background: var(--bg-secondary); padding: 4px 8px; border-radius: 4px;">${selectedMeeting.meetingCode}</span>
            </div>
            <div style="font-size: 12px; color: var(--text-secondary);">
              Compartilhe este código para convidar outros participantes
            </div>
          </div>

          ${!this.isConnected ? `
            <button class="meeting-join" data-id="${selectedMeeting.id}" style="
              width: 100%;
              padding: 12px;
              background: var(--accent-blue);
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 16px;
            ">Entrar na Reunião</button>
          ` : `
            <div style="display: flex; gap: 8px; margin-bottom: 16px;">
              <button class="meeting-toggle-audio" style="
                flex: 1;
                padding: 8px;
                background: ${this.audioEnabled ? 'var(--accent-green)' : 'var(--bg-secondary)'};
                color: var(--text-primary);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
              ">🎤 ${this.audioEnabled ? 'Mudo' : 'Ativo'}</button>
              <button class="meeting-toggle-video" style="
                flex: 1;
                padding: 8px;
                background: ${this.videoEnabled ? 'var(--accent-green)' : 'var(--bg-secondary)'};
                color: var(--text-primary);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
              ">📹 ${this.videoEnabled ? 'Off' : 'On'}</button>
            </div>
          `}

          ${this.showJoinNameInput ? `
            <div style="margin-bottom: 16px; padding: 12px; background: var(--bg-secondary); border-radius: 6px;">
              <div style="font-size: 13px; color: var(--text-primary); margin-bottom: 8px;">Seu nome para a reunião:</div>
              <div style="display: flex; gap: 8px;">
                <input type="text" id="meeting-join-name" placeholder="Digite seu nome" style="
                  flex: 1;
                  padding: 8px;
                  border: 1px solid var(--border-color);
                  border-radius: 4px;
                  background: var(--bg-primary);
                  color: var(--text-primary);
                  font-size: 13px;
                " />
                <button id="meeting-join-confirm" style="
                  padding: 8px 16px;
                  background: var(--accent-blue);
                  color: white;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 13px;
                ">Confirmar</button>
                <button id="meeting-join-cancel" style="
                  padding: 8px 16px;
                  background: var(--bg-secondary);
                  color: var(--text-primary);
                  border: 1px solid var(--border-color);
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 13px;
                ">Cancelar</button>
              </div>
            </div>
          ` : ''}

          <div style="margin-bottom: 16px;">
            <h4 style="margin: 0 0 8px 0; font-size: 14px; color: var(--text-primary);">Participantes (${this.participants.length})</h4>
      `;

      if (this.participants.length === 0) {
        html += `<p style="color: var(--text-secondary); font-size: 13px;">Nenhum participante</p>`;
      } else {
        html += `<div style="max-height: 150px; overflow-y: auto;">`;
        this.participants.forEach(participant => {
          const hasVideo = this.remoteStreams.has(participant.userId);
          html += `
            <div style="
              padding: 8px;
              border: 1px solid var(--border-color);
              border-radius: 4px;
              margin-bottom: 4px;
              display: flex;
              align-items: center;
              gap: 8px;
            ">
              <div style="width: 32px; height: 32px; background: var(--accent-blue); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">
                ${participant.userName.charAt(0).toUpperCase()}
              </div>
              <div style="flex: 1;">
                <div style="font-size: 13px; color: var(--text-primary);">${participant.userName}</div>
                <div style="font-size: 11px; color: var(--text-secondary);">${participant.isHost ? 'Host' : 'Participante'}</div>
              </div>
              ${hasVideo ? '<span style="font-size: 12px; color: var(--accent-green);">📹</span>' : ''}
            </div>
          `;
        });
        html += `</div>`;
      }

      html += `
          </div>

          ${this.remoteStreams.size > 0 ? `
            <div style="margin-bottom: 16px;">
              <h4 style="margin: 0 0 8px 0; font-size: 14px; color: var(--text-primary);">Vídeo (${this.remoteStreams.size})</h4>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px;">
                ${Array.from(this.remoteStreams.entries()).map(([userId, stream]) => {
                  const participant = this.participants.find(p => p.userId === userId);
                  const name = participant?.userName || userId.substring(0, 8);
                  return `
                    <div style="position: relative; aspect-ratio: 16/9; background: #000; border-radius: 6px; overflow: hidden;">
                      <video id="remote-video-${userId}" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover;"></video>
                      <div style="position: absolute; bottom: 4px; left: 4px; background: rgba(0,0,0,0.7); color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px;">
                        ${name}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}

          <div>
            <h4 style="margin: 0 0 8px 0; font-size: 14px; color: var(--text-primary);">Mensagens Recentes</h4>
      `;

      if (this.messages.length === 0) {
        html += `<p style="color: var(--text-secondary); font-size: 13px;">Nenhuma mensagem</p>`;
      } else {
        html += `<div style="max-height: 150px; overflow-y: auto;">`;
        this.messages.slice(-10).forEach(message => {
          html += `
            <div style="
              padding: 8px;
              background: var(--bg-secondary);
              border-radius: 4px;
              margin-bottom: 4px;
            ">
              <div style="font-size: 12px; font-weight: 600; color: var(--text-primary);">${message.userName}</div>
              <div style="font-size: 13px; color: var(--text-secondary);">${message.content || message.message}</div>
            </div>
          `;
        });
        html += `</div>`;
      }

      if (this.isConnected) {
        html += `
          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <input type="text" id="meeting-message-input" placeholder="Digite uma mensagem..." style="
              flex: 1;
              padding: 8px;
              border: 1px solid var(--border-color);
              border-radius: 6px;
              background: var(--bg-secondary);
              color: var(--text-primary);
              font-size: 13px;
            " />
            <button id="meeting-send-message" style="
              padding: 8px 16px;
              background: var(--accent-blue);
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 13px;
            ">Enviar</button>
          </div>
        `;
      }

      html += `
          </div>
        </div>
      `;
    } else {
      html += `
        <div style="flex: 2; min-width: min(280px, 100%); border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; display: flex; align-items: center; justify-content: center;">
          <p style="color: var(--text-secondary);">Selecione uma sala de reunião</p>
        </div>
      `;
    }

    html += `
      </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Attach event listeners
    document.getElementById('meetings-close')?.addEventListener('click', () => this.close());
    document.getElementById('meetings-create')?.addEventListener('click', () => this.createMeeting());

    // Create meeting input handlers
    document.getElementById('meeting-create-confirm')?.addEventListener('click', () => {
      const name = document.getElementById('meeting-create-name')?.value;
      this.confirmCreateMeeting(name);
    });
    document.getElementById('meeting-create-cancel')?.addEventListener('click', () => {
      this.showCreateMeetingInput = false;
      this.render();
    });

    // Join meeting input handlers
    document.getElementById('meeting-join-confirm')?.addEventListener('click', () => {
      const name = document.getElementById('meeting-join-name')?.value;
      this.confirmJoinMeeting(name);
    });
    document.getElementById('meeting-join-cancel')?.addEventListener('click', () => {
      this.showJoinNameInput = false;
      this.render();
    });

    container.querySelectorAll('.meeting-item').forEach(item => {
      item.addEventListener('click', () => this.selectMeeting(item.dataset.id));
    });

    container.querySelectorAll('.meeting-end').forEach(btn => {
      btn.addEventListener('click', () => this.endMeeting(btn.dataset.id));
    });

    container.querySelectorAll('.meeting-join').forEach(btn => {
      btn.addEventListener('click', () => this.joinMeeting(btn.dataset.id));
    });

    container.querySelector('.meeting-toggle-audio')?.addEventListener('click', () => this.toggleAudio());
    container.querySelector('.meeting-toggle-video')?.addEventListener('click', () => this.toggleVideo());

    const messageInput = document.getElementById('meeting-message-input');
    const sendButton = document.getElementById('meeting-send-message');
    
    const handleSendMessage = () => {
      const message = messageInput?.value;
      if (message) {
        this.sendMessage(message);
        messageInput.value = '';
      }
    };

    sendButton?.addEventListener('click', handleSendMessage);
    messageInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSendMessage();
    });

    // Conectar video elements aos streams remotos
    this.remoteStreams.forEach((stream, userId) => {
      const videoEl = document.getElementById(`remote-video-${userId}`);
      if (videoEl && stream instanceof MediaStream) {
        videoEl.srcObject = stream;
      }
    });

    // Close on backdrop click
    container.querySelector('div').addEventListener('click', (e) => {
      if (e.target === container.querySelector('div')) {
        this.close();
      }
    });
  }
}

export { MeetingsPanel };
