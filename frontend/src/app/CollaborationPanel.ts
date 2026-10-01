/**
 * CollaborationPanel — painel de colaboração em tempo real.
 * Fluxo: cria sessão no backend → obtém inviteLink → abre WS com accessToken.
 */

import { MultiplayerRealtimeService } from '../features/multiplayer-realtime/multiplayer-realtime.service';
import type { ChatMessage } from '../features/multiplayer-realtime/multiplayer-realtime.types';
import { resolveApiBaseUrl } from '../config/apiBaseUrl';
import { CollaborationPresenceSystem } from '../features/collaboration/CollaborationPresenceSystem';
import { CollaborationVoice } from '../features/collaboration/CollaborationVoice';
import { modelSyncService } from '../features/collaboration/ModelSyncService';

const API = resolveApiBaseUrl();

export class CollaborationPanel {
  private readonly container: HTMLElement;
  private unsubscribers: Array<() => void> = [];
  private participantsEl!: HTMLElement;
  private messagesEl!: HTMLElement;
  private inputEl!: HTMLInputElement;
  private statusEl!: HTMLElement;
  private joinBtn!: HTMLButtonElement;
  private leaveBtn!: HTMLButtonElement;
  private callBtn!: HTMLButtonElement;
  private inviteLinkEl!: HTMLElement;

  private sessionId: string | null = null;
  private accessToken: string | null = null;
  private presenceSystem: CollaborationPresenceSystem | null = null;
  private voiceSystem: CollaborationVoice | null = null;

  // Plans that can initiate calls
  private static readonly CALL_PLANS = ['pro', 'professional', 'enterprise', 'business'];

  constructor(container: HTMLElement) {
    this.container = container;
    this.applyStyles();
    this.render();
    this.maybeAutoJoin();
  }

  private render(): void {
    this.container.innerHTML = '';
    this.container.className = 'collab-panel';

    const header = document.createElement('div');
    header.className = 'collab-panel__header';
    header.innerHTML = `<span class="collab-panel__title">👥 Colaboração</span>`;

    this.statusEl = document.createElement('div');
    this.statusEl.className = 'collab-panel__status collab-panel__status--disconnected';
    this.statusEl.textContent = '⚫ Desconectado';

    const actions = document.createElement('div');
    actions.className = 'collab-panel__actions';

    this.joinBtn = document.createElement('button');
    this.joinBtn.className = 'collab-panel__btn collab-panel__btn--primary';
    this.joinBtn.textContent = '+ Criar sessão';
    this.joinBtn.addEventListener('click', () => this.handleCreateSession());

    this.leaveBtn = document.createElement('button');
    this.leaveBtn.className = 'collab-panel__btn collab-panel__btn--danger';
    this.leaveBtn.textContent = 'Encerrar';
    this.leaveBtn.style.display = 'none';
    this.leaveBtn.addEventListener('click', () => this.handleLeave());

    this.callBtn = document.createElement('button');
    this.callBtn.className = 'collab-panel__btn collab-panel__btn--call';
    this.callBtn.title = 'Iniciar chamada de voz/vídeo';
    this.callBtn.textContent = '📞 Chamada';
    this.callBtn.style.display = 'none';
    this.callBtn.addEventListener('click', () => this.handleStartCall());

    actions.appendChild(this.joinBtn);
    actions.appendChild(this.leaveBtn);
    actions.appendChild(this.callBtn);

    this.inviteLinkEl = document.createElement('div');
    this.inviteLinkEl.className = 'collab-panel__invite';
    this.inviteLinkEl.style.display = 'none';

    const participantsSection = document.createElement('div');
    participantsSection.className = 'collab-panel__section';
    participantsSection.innerHTML = '<div class="collab-panel__section-title">Participantes</div>';
    this.participantsEl = document.createElement('div');
    this.participantsEl.className = 'collab-panel__participants';
    this.participantsEl.innerHTML = '<span class="collab-panel__empty">Nenhum participante</span>';
    participantsSection.appendChild(this.participantsEl);

    const chatSection = document.createElement('div');
    chatSection.className = 'collab-panel__section collab-panel__chat-section';
    chatSection.innerHTML = '<div class="collab-panel__section-title">Chat</div>';

    this.messagesEl = document.createElement('div');
    this.messagesEl.className = 'collab-panel__messages';

    const chatInput = document.createElement('div');
    chatInput.className = 'collab-panel__chat-input';

    this.inputEl = document.createElement('input');
    this.inputEl.type = 'text';
    this.inputEl.placeholder = 'Digite uma mensagem...';
    this.inputEl.className = 'collab-panel__input';
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleSendMessage();
    });

    const sendBtn = document.createElement('button');
    sendBtn.className = 'collab-panel__btn collab-panel__btn--primary';
    sendBtn.textContent = '↑';
    sendBtn.addEventListener('click', () => this.handleSendMessage());

    chatInput.appendChild(this.inputEl);
    chatInput.appendChild(sendBtn);
    chatSection.appendChild(this.messagesEl);
    chatSection.appendChild(chatInput);

    this.container.appendChild(header);
    this.container.appendChild(this.statusEl);
    this.container.appendChild(actions);
    this.container.appendChild(this.inviteLinkEl);
    this.container.appendChild(participantsSection);
    this.container.appendChild(chatSection);

    this.subscribeToEvents();
  }

  private getLoggedUser(): { id: string; name: string; email?: string; plan?: string } | null {
    try {
      const u = localStorage.getItem('arxisvr_user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  }

  private canMakeCalls(): boolean {
    const user = this.getLoggedUser();
    if (!user?.plan) return false;
    return CollaborationPanel.CALL_PLANS.includes(user.plan.toLowerCase());
  }

  private async handleCreateSession(): Promise<void> {
    this.joinBtn.disabled = true;
    this.setStatus('connecting', '🟡 Criando sessão...');

    try {
      const projectId = localStorage.getItem('arxisvr_project_id') || '';
      const authToken = localStorage.getItem('arxisvr_token') || '';

      const res = await fetch(`${API}/api/v1/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ projectId: projectId || undefined }),
      });

      if (!res.ok) {
        await this.joinLocalFallback();
        return;
      }

      const data = await res.json();
      this.sessionId = data.session.id;
      this.accessToken = data.accessToken;

      // Persistir token do host para reconectar após reload
      localStorage.setItem('arxisvr_host_session_id', data.session.id);
      localStorage.setItem('arxisvr_host_session_token', data.accessToken);
      localStorage.setItem('arxisvr_host_invite_link', data.inviteLink);

      try {
        (window as any).arxis?.track('meeting_created', {
          roomId: data.session.id,
          projectId: projectId,
        });
        (window as any).arxis?.flush();
      } catch (e) { /* ignora: falha aqui não impede o fluxo */ }

      this.showInviteLink(data.inviteLink);
      await this.connectWS(data.session.id, authToken, this.accessToken!);
    } catch {
      await this.joinLocalFallback();
    }
  }

  private async joinLocalFallback(): Promise<void> {
    const roomId = `room_${Date.now()}`;
    const loggedUser = this.getLoggedUser();
    const userId = loggedUser?.id ?? `user_${Math.random().toString(36).slice(2, 8)}`;
    const userName = loggedUser?.name ?? `User ${userId.slice(-4)}`;
    try {
      await MultiplayerRealtimeService.joinRoom(roomId, {
        userId, name: userName, role: 'editor',
      });
      this.joinBtn.style.display = 'none';
      this.leaveBtn.style.display = '';
      this.setStatus('connected', `🟢 Conectado (local)`);
      const localLink = `${window.location.origin}/join?token=${roomId}`;
      this.showInviteLink(localLink);
      this.updateCallButton();
      this.startPresence();
    } catch {
      this.setStatus('disconnected', '🔴 Erro ao conectar');
      this.joinBtn.disabled = false;
    }
  }

  private async connectWS(sessionId: string, _userId: string, accessToken: string): Promise<void> {
    try {
      const loggedUser = this.getLoggedUser();
      await MultiplayerRealtimeService.joinRoom(sessionId, {
        userId: loggedUser?.id || `host_${Date.now()}`,
        name: loggedUser?.name || localStorage.getItem('arxisvr_guest_name') || 'Host',
        role: 'editor',
        accessToken,
      });
      this.joinBtn.style.display = 'none';
      this.leaveBtn.style.display = '';
      this.setStatus('connected', `🟢 Sessão ativa`);
      try {
        (window as any).arxis?.track('meeting_joined', {
          roomId: sessionId,
          role: 'host',
        });
        (window as any).arxis?.flush();
      } catch (e) { /* ignora: falha aqui não impede o fluxo */ }
      this.updateCallButton();
      this.startPresence();
    } catch {
      this.setStatus('disconnected', '🔴 Erro no WebSocket');
      this.joinBtn.disabled = false;
    }
  }

  /** Show/hide the call button based on the user's plan */
  private updateCallButton(): void {
    if (this.canMakeCalls()) {
      this.callBtn.style.display = '';
      this.callBtn.title = 'Iniciar chamada (Plano Pro/Enterprise)';
    } else {
      // Show locked icon to make feature discoverable, but disabled
      this.callBtn.style.display = '';
      this.callBtn.textContent = '🔒 Chamada';
      this.callBtn.className = 'collab-panel__btn collab-panel__btn--call collab-panel__btn--locked';
      this.callBtn.title = 'Apenas planos Pro e Enterprise podem iniciar chamadas';
    }
  }

  private handleStartCall(): void {
    if (!this.canMakeCalls()) {
      this.showCallUpgradePrompt();
      return;
    }
    // Broadcast call_started via signaling server
    try {
      (MultiplayerRealtimeService as any).send?.({ type: 'call_started', sessionId: this.sessionId });
    } catch { /* best-effort */ }
    this.showCallModal();
  }

  private showCallUpgradePrompt(): void {
    const existing = document.getElementById('collab-upgrade-prompt');
    if (existing) { existing.remove(); return; }

    const el = document.createElement('div');
    el.id = 'collab-upgrade-prompt';
    el.className = 'collab-panel__upgrade-prompt';
    el.innerHTML = `
      <div class="collab-panel__upgrade-icon">🔒</div>
      <div class="collab-panel__upgrade-text">
        <strong>Chamadas disponíveis a partir do plano Pro</strong><br>
        <span>Seu plano atual: <em>${this.getLoggedUser()?.plan ?? 'free'}</em></span>
      </div>
      <a href="/account?tab=billing" class="collab-panel__upgrade-link">Fazer upgrade →</a>
    `;
    // Insert after actions
    const actions = this.container.querySelector('.collab-panel__actions');
    actions?.after(el);
    setTimeout(() => el.remove(), 5000);
  }

  private showCallModal(): void {
    // Toggle: se já há voz ativa, encerrar
    if (this.voiceSystem) {
      this.voiceSystem.dispose();
      this.voiceSystem = null;
      this.callBtn.textContent = '📞 Chamada';
      this.appendSystemMessage('📞 Chamada encerrada');
      return;
    }

    const localId =
      MultiplayerRealtimeService.getCurrentParticipant()?.id ??
      localStorage.getItem('arxisvr_participant_id') ??
      `local_${Date.now()}`;

    this.voiceSystem = new CollaborationVoice(localId);
    this.voiceSystem.start().then(() => {
      this.callBtn.textContent = '🔴 Em chamada';
      this.appendSystemMessage('📞 Chamada de voz iniciada');
    }).catch(() => {
      this.voiceSystem = null;
      this.callBtn.textContent = '📞 Chamada';
    });
  }

  private showInviteLink(link: string): void {
    this.inviteLinkEl.style.display = '';
    this.inviteLinkEl.innerHTML = `
      <div class="collab-panel__section-title">Link de convite</div>
      <div class="collab-panel__link-row">
        <input class="collab-panel__input collab-panel__link-input" id="collab-invite-input" readonly value="${link}" />
        <button class="collab-panel__btn collab-panel__btn--primary" id="collab-copy-btn">Copiar</button>
      </div>
      <div class="collab-panel__link-hint">Compartilhe com quem vai entrar</div>
    `;
    const copyBtn = document.getElementById('collab-copy-btn') as HTMLButtonElement;
    const input = document.getElementById('collab-invite-input') as HTMLInputElement;
    copyBtn?.addEventListener('click', () => {
      navigator.clipboard.writeText(link).then(() => {
        copyBtn.textContent = '✓ Copiado!';
        setTimeout(() => { copyBtn.textContent = 'Copiar'; }, 2000);
      });
      input.select();
      try {
        (window as any).arxis?.track('invite_sent', {
          roomId: this.sessionId || '',
        });
        (window as any).arxis?.flush();
      } catch (e) { /* ignora: falha aqui não impede o fluxo */ }
    });
  }

  private async maybeAutoJoin(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const sessionFromUrl = params.get('session');

    // ── Fluxo guest: veio de join.html ──────────────────────────────────────
    const guestToken = localStorage.getItem('arxisvr_session_token');    // JWT (backend mode)
    const localGuestId = localStorage.getItem('arxisvr_local_guest_id'); // ID gerado (local mode)
    const guestSessionId = localStorage.getItem('arxisvr_session_id');
    const guestName = localStorage.getItem('arxisvr_guest_name');

    const isGuestMode = (guestToken || localGuestId) && guestSessionId &&
      (!sessionFromUrl || sessionFromUrl === guestSessionId);

    if (isGuestMode && guestSessionId) {
      // Consumir tokens de guest para não reconectar em próximos reloads
      if (guestToken) localStorage.removeItem('arxisvr_session_token');
      if (localGuestId) localStorage.removeItem('arxisvr_local_guest_id');
      localStorage.removeItem('arxisvr_session_id');

      this.sessionId = guestSessionId;
      this.accessToken = guestToken;
      const userId = localStorage.getItem('arxisvr_participant_id') || `guest_${Date.now()}`;
      this.setStatus('connecting', `🟡 Entrando como ${guestName ?? 'convidado'}...`);

      try {
        await MultiplayerRealtimeService.joinRoom(guestSessionId, {
          userId,
          name: guestName || 'Convidado',
          role: 'viewer',
          ...(guestToken ? { accessToken: guestToken } : {}),
        });
        this.joinBtn.style.display = 'none';
        this.leaveBtn.style.display = '';
        this.setStatus('connected', `🟢 ${guestName ?? 'Convidado'}`);
        try {
          (window as any).arxis?.track('meeting_joined', {
            roomId: guestSessionId,
            role: 'guest',
          });
          (window as any).arxis?.flush();
        } catch (e) { /* ignora: falha aqui não impede o fluxo */ }
        this.updateCallButton();
        this.startPresence();
      } catch {
        this.setStatus('disconnected', '🔴 Erro ao entrar na sessão');
      }
      return;
    }

    // ── Fluxo host: sessão criada anteriormente ainda ativa ─────────────────
    const hostSessionId = localStorage.getItem('arxisvr_host_session_id');
    const hostToken = localStorage.getItem('arxisvr_host_session_token');
    const hostInviteLink = localStorage.getItem('arxisvr_host_invite_link');

    if (hostToken && hostSessionId && (!sessionFromUrl || sessionFromUrl === hostSessionId)) {
      this.sessionId = hostSessionId;
      this.accessToken = hostToken;
      if (hostInviteLink) this.showInviteLink(hostInviteLink);
      this.setStatus('connecting', '🟡 Reconectando sessão...');

      try {
        const loggedUser = this.getLoggedUser();
        await MultiplayerRealtimeService.joinRoom(hostSessionId, {
          userId: loggedUser?.id || `host_${Date.now()}`,
          name: loggedUser?.name || 'Host',
          role: 'editor',
          accessToken: hostToken,
        });
        this.joinBtn.style.display = 'none';
        this.leaveBtn.style.display = '';
        this.setStatus('connected', '🟢 Sessão ativa');
        this.updateCallButton();
        this.startPresence();
      } catch {
        // Token expirou — limpar e deixar host criar nova sessão
        localStorage.removeItem('arxisvr_host_session_id');
        localStorage.removeItem('arxisvr_host_session_token');
        localStorage.removeItem('arxisvr_host_invite_link');
        this.setStatus('disconnected', '⚫ Desconectado');
      }
    }
  }

  /** Inicia o sistema de presença 3D (cursors dos outros no viewer) */
  private startPresence(): void {
    this.presenceSystem?.dispose();
    // Pega a câmera e a cena do ViewerHost exposto globalmente
    const vh = (window as any).__viewerHost;
    if (!vh?.camera || !vh?.scene) {
      console.warn('[CollaborationPanel] ViewerHost não encontrado — presença 3D desabilitada');
      return;
    }
    this.presenceSystem = new CollaborationPresenceSystem(vh.scene, vh.camera);
    this.presenceSystem.start();
    // Sincroniza o modelo do anfitrião com todos os participantes (idempotente).
    modelSyncService.start();
    console.log('[CollaborationPanel] Presence + model sync iniciados ✅');
  }

  private async handleLeave(): Promise<void> {
    if (this.sessionId) {
      const authToken = localStorage.getItem('arxisvr_token');
      fetch(`${API}/api/v1/sessions/${this.sessionId}/end`, {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      }).catch(() => {});
    }
    this.presenceSystem?.dispose();
    this.presenceSystem = null;
    this.voiceSystem?.dispose();
    this.voiceSystem = null;
    modelSyncService.stop();
    MultiplayerRealtimeService.leaveRoom();
    localStorage.removeItem('arxisvr_host_session_id');
    localStorage.removeItem('arxisvr_host_session_token');
    localStorage.removeItem('arxisvr_host_invite_link');
    localStorage.removeItem('arxisvr_guest_name');
    localStorage.removeItem('arxisvr_participant_id');
    localStorage.removeItem('arxisvr_participant_role');
    this.joinBtn.style.display = '';
    this.joinBtn.disabled = false;
    this.leaveBtn.style.display = 'none';
    this.inviteLinkEl.style.display = 'none';
    this.sessionId = null;
    this.accessToken = null;
    this.setStatus('disconnected', '⚫ Desconectado');
    this.participantsEl.innerHTML = '<span class="collab-panel__empty">Nenhum participante</span>';
    this.messagesEl.innerHTML = '';
  }

  private handleSendMessage(): void {
    const content = this.inputEl.value.trim();
    if (!content) return;
    try {
      MultiplayerRealtimeService.sendChatMessage(content);
      this.inputEl.value = '';
      const me = MultiplayerRealtimeService.getRoomState()?.currentUser?.user?.name || 'Você';
      this.appendMessage({ id: Date.now().toString(), userId: 'me', userName: me, content, timestamp: new Date() });
    } catch {
      this.appendSystemMessage('⚠️ Conecte-se a uma sessão primeiro');
    }
  }

  private subscribeToEvents(): void {
    this.unsubscribers.push(
      MultiplayerRealtimeService.onParticipantJoined(() => this.renderParticipants()),
      MultiplayerRealtimeService.onParticipantLeft(() => this.renderParticipants()),
      MultiplayerRealtimeService.onChatMessage((msg) => this.appendMessage(msg)),
      MultiplayerRealtimeService.onConnectionStateChange((state) => {
        if (state === 'disconnected') this.setStatus('disconnected', '⚫ Desconectado');
        else if (state === 'reconnecting') this.setStatus('connecting', '🟡 Reconectando...');
      }),
    );
  }

  private renderParticipants(): void {
    const list = MultiplayerRealtimeService.getParticipants();
    if (!list.length) {
      this.participantsEl.innerHTML = '<span class="collab-panel__empty">Nenhum outro participante</span>';
      return;
    }
    this.participantsEl.innerHTML = list.map(p => `
      <div class="collab-panel__participant">
        <span class="collab-panel__avatar">${p.user.name.charAt(0).toUpperCase()}</span>
        <span>${p.user.name}</span>
        <span class="collab-panel__role">${p.user.role}</span>
      </div>`).join('');
  }

  private appendMessage(msg: Pick<ChatMessage, 'id' | 'userId' | 'userName' | 'content' | 'timestamp'>): void {
    const el = document.createElement('div');
    el.className = 'collab-panel__message';
    const time = new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    el.innerHTML = `<span class="collab-panel__msg-author">${msg.userName}</span>
      <span class="collab-panel__msg-time">${time}</span>
      <span class="collab-panel__msg-content">${this.esc(msg.content)}</span>`;
    this.messagesEl.appendChild(el);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  private appendSystemMessage(text: string): void {
    const el = document.createElement('div');
    el.className = 'collab-panel__message collab-panel__message--system';
    el.textContent = text;
    this.messagesEl.appendChild(el);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  private setStatus(type: 'connected' | 'connecting' | 'disconnected', label: string): void {
    this.statusEl.textContent = label;
    this.statusEl.className = `collab-panel__status collab-panel__status--${type}`;
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private applyStyles(): void {
    const id = 'collab-panel-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      .collab-panel { display:flex; flex-direction:column; height:100%; padding:12px; gap:10px; font-size:13px; color:#e2e8f0; overflow:hidden; }
      .collab-panel__header { font-size:14px; font-weight:600; padding-bottom:6px; border-bottom:1px solid #334155; }
      .collab-panel__title { color:#f1f5f9; }
      .collab-panel__status { padding:4px 8px; border-radius:4px; font-size:11px; font-weight:500; }
      .collab-panel__status--connected { background:#064e3b; color:#6ee7b7; }
      .collab-panel__status--connecting { background:#451a03; color:#fbbf24; }
      .collab-panel__status--disconnected { background:#1e293b; color:#94a3b8; }
      .collab-panel__actions { display:flex; gap:6px; }
      .collab-panel__invite { display:flex; flex-direction:column; gap:6px; background:#0f172a; border:1px solid #334155; border-radius:8px; padding:10px; }
      .collab-panel__link-row { display:flex; gap:6px; }
      .collab-panel__link-input { flex:1; font-size:11px; }
      .collab-panel__link-hint { font-size:10px; color:#475569; }
      .collab-panel__input { width:100%; padding:6px 8px; border-radius:6px; border:1px solid #334155; background:#0f172a; color:#e2e8f0; font-size:12px; box-sizing:border-box; }
      .collab-panel__input:focus { outline:none; border-color:#3b82f6; }
      .collab-panel__btn { padding:6px 10px; border-radius:6px; border:none; cursor:pointer; font-size:12px; font-weight:500; white-space:nowrap; }
      .collab-panel__btn--primary { background:#2563eb; color:#fff; }
      .collab-panel__btn--primary:hover:not(:disabled) { background:#1d4ed8; }
      .collab-panel__btn--primary:disabled { opacity:.5; cursor:not-allowed; }
      .collab-panel__btn--danger { background:#7f1d1d; color:#fca5a5; }
      .collab-panel__btn--danger:hover { background:#991b1b; }
      .collab-panel__section { display:flex; flex-direction:column; gap:6px; }
      .collab-panel__section-title { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:#64748b; }
      .collab-panel__participants { display:flex; flex-direction:column; gap:4px; min-height:32px; }
      .collab-panel__participant { display:flex; align-items:center; gap:8px; padding:4px 6px; background:#1e293b; border-radius:6px; }
      .collab-panel__avatar { width:24px; height:24px; border-radius:50%; background:#2563eb; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#fff; flex-shrink:0; }
      .collab-panel__role { margin-left:auto; font-size:10px; color:#64748b; }
      .collab-panel__empty { font-size:11px; color:#475569; }
      .collab-panel__chat-section { flex:1; overflow:hidden; display:flex; flex-direction:column; gap:6px; }
      .collab-panel__messages { flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:6px; min-height:80px; max-height:240px; }
      .collab-panel__message { display:flex; flex-direction:column; gap:1px; padding:6px 8px; background:#1e293b; border-radius:6px; }
      .collab-panel__message--system { background:transparent; color:#64748b; font-style:italic; font-size:11px; }
      .collab-panel__msg-author { font-weight:600; font-size:11px; color:#60a5fa; }
      .collab-panel__msg-time { font-size:10px; color:#475569; }
      .collab-panel__msg-content { font-size:12px; color:#e2e8f0; word-break:break-word; }
      .collab-panel__chat-input { display:flex; gap:6px; }
      .collab-panel__chat-input .collab-panel__input { flex:1; }
      .collab-panel__btn--call { background:#065f46; color:#6ee7b7; }
      .collab-panel__btn--call:hover:not(.collab-panel__btn--locked) { background:#047857; }
      .collab-panel__btn--locked { background:#1e293b; color:#475569; cursor:not-allowed; }
      .collab-panel__upgrade-prompt { display:flex; align-items:flex-start; gap:10px; background:#1e293b; border:1px solid #7c3aed33; border-radius:8px; padding:12px; margin:4px 0; animation:fadeIn .2s; }
      .collab-panel__upgrade-icon { font-size:20px; flex-shrink:0; }
      .collab-panel__upgrade-text { flex:1; font-size:12px; color:#cbd5e1; line-height:1.5; }
      .collab-panel__upgrade-text strong { color:#f1f5f9; }
      .collab-panel__upgrade-text em { color:#94a3b8; }
      .collab-panel__upgrade-link { font-size:12px; color:#818cf8; white-space:nowrap; text-decoration:none; font-weight:600; }
      .collab-panel__upgrade-link:hover { color:#a5b4fc; }
      .collab-call-modal { position:fixed; inset:0; background:rgba(0,0,0,.65); display:flex; align-items:center; justify-content:center; z-index:9999; backdrop-filter:blur(4px); }
      .collab-call-modal__inner { background:#0f172a; border:1px solid #334155; border-radius:16px; padding:32px 28px; text-align:center; width:320px; display:flex; flex-direction:column; gap:14px; }
      .collab-call-modal__icon { font-size:48px; animation:pulse 1.5s infinite; }
      .collab-call-modal__title { font-size:18px; font-weight:700; color:#f1f5f9; }
      .collab-call-modal__sub { font-size:13px; color:#64748b; }
      .collab-call-modal__participants { display:flex; flex-wrap:wrap; gap:8px; justify-content:center; min-height:24px; }
      .call-participant { font-size:12px; background:#1e293b; padding:4px 10px; border-radius:20px; color:#e2e8f0; }
      @keyframes fadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:none; } }
      @keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.1); } }
    `;
    document.head.appendChild(style);
  }

  public destroy(): void {
    this.unsubscribers.forEach(fn => fn());
  }
}
