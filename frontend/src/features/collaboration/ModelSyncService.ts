/**
 * ModelSyncService — sincroniza o modelo IFC do anfitrião com todos os
 * participantes de uma reunião colaborativa.
 *
 * Transporte: canal de ações do MultiplayerRealtimeService (o mesmo usado por
 * cursores e seleção compartilhada). Mensagens trocadas:
 *   - 'model_shared'        anfitrião → todos: descritor do modelo ativo
 *   - 'model_sync_request'  participante novo → todos: "qual é o modelo atual?"
 *
 * O modelo é identificado pelo seu `id` no backend. Cada participante baixa o
 * arquivo pelo endpoint autenticado (IFCUploadManager.loadModelIntoScene), o
 * que evita trafegar megabytes pelo WebSocket e respeita o isolamento por
 * tenant/permissões do backend.
 *
 * Eventos emitidos no eventBus (para a UI reagir):
 *   - 'collab:model-loading'  começou a baixar o modelo do anfitrião
 *   - 'collab:model-loaded'   modelo do anfitrião carregado na cena
 *   - 'collab:model-error'    falha ao carregar o modelo do anfitrião
 */

import { eventBus } from '../../core';
import { MultiplayerRealtimeService } from '../multiplayer-realtime/multiplayer-realtime.service';
import { IFCUploadManager } from '../../systems/model/IFCUploadManager';
import { CollaborationToast } from './CollaborationToast';

export interface SharedModelDescriptor {
  id: string;
  name: string;
  projectId?: string;
  fileSize?: number;
  schema?: string;
}

export class ModelSyncService {
  private static instance: ModelSyncService | null = null;

  private localParticipantId: string;
  private current: SharedModelDescriptor | null = null;
  private lastLoaded: SharedModelDescriptor | null = null; // último modelo na cena (mesmo fora de reunião)
  private loadingRemoteId: string | null = null; // guard contra loop de re-broadcast
  private loadedRemoteId: string | null = null;   // último modelo remoto já carregado
  private started = false;

  // Referências para remoção dos listeners
  private unsubAction: (() => void) | null = null;
  private unsubJoined: (() => void) | null = null;
  private onIfcLoaded = (payload: any) => this.handleLocalModelLoaded(payload);

  static getInstance(): ModelSyncService {
    if (!this.instance) this.instance = new ModelSyncService();
    return this.instance;
  }

  private constructor() {
    this.localParticipantId =
      localStorage.getItem('arxisvr_participant_id') || `p_${Date.now()}`;
    // Listener permanente: registra o último modelo carregado na cena, mesmo
    // antes de entrar numa reunião — assim o anfitrião que já tinha um modelo
    // aberto consegue compartilhá-lo ao iniciar a sessão.
    eventBus.on('ifc:loaded', this.onIfcLoaded);
  }

  /** Inicia a sincronização (idempotente). Chamar ao entrar numa reunião. */
  start(): void {
    if (this.started) return;
    this.started = true;
    this.localParticipantId =
      localStorage.getItem('arxisvr_participant_id') || this.localParticipantId;

    // 1. Recebe ações de modelo de outros participantes.
    this.unsubAction = MultiplayerRealtimeService.onAction((action: any) => {
      if (!action || action.participantId === this.localParticipantId) return;
      if (action.type === 'model_shared' && action.model?.id) {
        void this.loadRemoteModel(action.model as SharedModelDescriptor);
      } else if (action.type === 'model_sync_request') {
        // Alguém novo entrou e perguntou — se eu tenho o modelo, reanuncio.
        this.rebroadcast();
      }
    });

    // 2. Se já havia um modelo aberto antes da reunião, ele passa a ser o
    //    modelo compartilhado e é anunciado para a sala.
    if (!this.current && this.lastLoaded) {
      this.current = this.lastLoaded;
      this.broadcast(this.current);
    }

    // 3. Novo participante entrou → reanuncio meu modelo (se eu for o dono).
    this.unsubJoined = MultiplayerRealtimeService.onParticipantJoined(() => {
      // pequeno atraso p/ o novo cliente registrar os listeners antes do envio
      setTimeout(() => this.rebroadcast(), 800);
    });

    // 4. Acabei de entrar → pergunto qual é o modelo ativo da sala.
    this.requestCurrent();
  }

  /** Encerra a sincronização e remove listeners. */
  stop(): void {
    if (!this.started) return;
    try { this.unsubAction?.(); } catch { /* noop */ }
    try { this.unsubJoined?.(); } catch { /* noop */ }
    // O listener de 'ifc:loaded' é permanente (registrado no constructor) — não
    // removemos aqui, para continuar rastreando o último modelo da cena.
    this.unsubAction = null;
    this.unsubJoined = null;
    this.started = false;
    this.current = null;
    this.loadedRemoteId = null;
    this.loadingRemoteId = null;
  }

  /** Descritor do modelo atualmente compartilhado na sala (ou null). */
  getCurrent(): SharedModelDescriptor | null {
    return this.current;
  }

  /** Há uma reunião ativa com sincronização de modelo? */
  isActive(): boolean {
    return this.started;
  }

  // ── Internos ────────────────────────────────────────────────────────────

  private handleLocalModelLoaded(payload: any): void {
    const model = payload?.model;
    if (!model?.id) return;

    const descriptor: SharedModelDescriptor = {
      id: model.id,
      name: model.originalName || model.name || 'Modelo',
      projectId: model.projectId,
      fileSize: model.fileSize,
      schema: model.metadata?.ifcSchema,
    };
    // Sempre registra o último modelo da cena (mesmo fora de reunião).
    this.lastLoaded = descriptor;

    // Não reanunciar um modelo que acabei de baixar de outro participante.
    if (this.loadingRemoteId === model.id || this.loadedRemoteId === model.id) return;

    this.current = descriptor;
    // Só transmite se estiver numa reunião ativa.
    if (this.started) this.broadcast(descriptor);
  }

  private requestCurrent(attempt = 0): void {
    try {
      MultiplayerRealtimeService.syncAction({
        type: 'model_sync_request' as any,
        participantId: this.localParticipantId,
      } as any);
    } catch {
      // Socket pode não estar aberto ainda — tenta de novo algumas vezes.
      if (attempt < 4 && this.started) {
        setTimeout(() => this.requestCurrent(attempt + 1), 1200);
      }
    }
  }

  private rebroadcast(): void {
    if (this.current) this.broadcast(this.current);
  }

  private broadcast(model: SharedModelDescriptor): void {
    try {
      MultiplayerRealtimeService.syncAction({
        type: 'model_shared' as any,
        participantId: this.localParticipantId,
        model,
      } as any);
    } catch { /* não conectado */ }
  }

  private async loadRemoteModel(model: SharedModelDescriptor): Promise<void> {
    if (!model.id) return;
    if (this.loadedRemoteId === model.id || this.loadingRemoteId === model.id) return;
    if (this.current?.id === model.id) return; // já é o modelo ativo aqui

    this.loadingRemoteId = model.id;
    eventBus.emit('collab:model-loading', { model });
    try { CollaborationToast.show(`📦 Carregando modelo do anfitrião: ${model.name}`, 'info'); } catch { /* noop */ }
    try {
      const mgr = IFCUploadManager.getInstance();
      await mgr.loadModelIntoScene({
        id: model.id,
        originalName: model.name,
        projectId: model.projectId,
        fileSize: model.fileSize,
      } as any);
      this.loadedRemoteId = model.id;
      this.current = model;
      eventBus.emit('collab:model-loaded', { model });
      try { CollaborationToast.show(`✅ Modelo do anfitrião carregado`, 'join'); } catch { /* noop */ }
    } catch (err) {
      console.error('[ModelSync] Falha ao carregar modelo do anfitrião:', err);
      eventBus.emit('collab:model-error', { model, error: err });
      try { CollaborationToast.show(`⚠️ Não foi possível carregar o modelo do anfitrião`, 'leave'); } catch { /* noop */ }
    } finally {
      this.loadingRemoteId = null;
    }
  }
}

export const modelSyncService = ModelSyncService.getInstance();
