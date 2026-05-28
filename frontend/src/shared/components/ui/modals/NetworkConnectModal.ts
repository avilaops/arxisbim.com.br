import { eventBus, EventType, appState } from '../../../../core';
import { commandRegistry } from '../../../../commands';
import { CommandId } from '../../../../commands/Command';

/**
 * NetworkConnectModal - Modal para conectar multiplayer
 * 
 * Exibe formulário para URL do servidor e nome do jogador
 */
export class NetworkConnectModal {
  private modal: HTMLElement | null = null;
  private isVisible: boolean = false;

  constructor() {
    this.init();
  }

  /**
   * Inicializa o modal
   */
  private init(): void {
    this.applyStyles();
    this.listenEvents();
  }

  /**
   * Escuta eventos
   */
  private listenEvents(): void {
    // Abre modal ao receber comando NET_CONNECT
    eventBus.on(EventType.UI_MODAL_OPEN, (data: any) => {
      if (data.modal === 'network-connect') {
        this.open();
      }
    });
  }

  /**
   * Aplica estilos CSS (reutiliza estrutura do ThemeModal)
   */
  private applyStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .network-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.2s ease;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .network-modal-container {
        background: var(--theme-background, #141414);
        border: 2px solid var(--theme-primary, #667eea);
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        max-width: 500px;
        width: 90%;
        animation: slideIn 0.3s ease;
      }
      
      @keyframes slideIn {
        from {
          transform: translateY(-50px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      .network-modal-header {
        padding: 20px;
        background: linear-gradient(135deg, #44ff44, #00cc00);
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .network-modal-title {
        font-size: 18px;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .network-modal-close {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      
      .network-modal-close:hover {
        background: rgba(255, 0, 0, 0.6);
        transform: scale(1.1);
      }
      
      .network-modal-body {
        padding: 24px;
      }
      
      .network-form-group {
        margin-bottom: 20px;
      }
      
      .network-form-label {
        display: block;
        color: var(--theme-text, #fff);
        font-weight: bold;
        margin-bottom: 8px;
        font-size: 14px;
      }
      
      .network-form-input {
        width: 100%;
        padding: 12px;
        background: var(--theme-backgroundSecondary, #1e1e1e);
        border: 2px solid var(--theme-border, #333);
        border-radius: 6px;
        color: var(--theme-text, #fff);
        font-size: 14px;
        transition: all 0.2s;
      }
      
      .network-form-input:focus {
        outline: none;
        border-color: var(--theme-accent, #00ff88);
        box-shadow: 0 0 10px var(--theme-accent, #00ff88);
      }
      
      .network-form-hint {
        font-size: 12px;
        color: var(--theme-textSecondary, #999);
        margin-top: 4px;
      }
      
      .network-modal-footer {
        padding: 16px 24px;
        background: var(--theme-backgroundSecondary, #1e1e1e);
        border-top: 1px solid var(--theme-border, #333);
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }
      
      .network-modal-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        transition: all 0.2s;
      }
      
      .network-modal-btn-secondary {
        background: var(--theme-backgroundSecondary, #1e1e1e);
        border: 2px solid var(--theme-border, #333);
        color: var(--theme-text, #fff);
      }
      
      .network-modal-btn-secondary:hover {
        background: var(--theme-border, #333);
      }
      
      .network-modal-btn-primary {
        background: linear-gradient(135deg, #44ff44, #00cc00);
        color: white;
      }
      
      .network-modal-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(68, 255, 68, 0.4);
      }
      
      .network-modal-btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
      
      .network-status {
        padding: 12px;
        background: rgba(68, 255, 68, 0.1);
        border: 1px solid rgba(68, 255, 68, 0.3);
        border-radius: 6px;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--theme-text, #fff);
        font-size: 14px;
      }
      
      .network-status.error {
        background: rgba(255, 68, 68, 0.1);
        border-color: rgba(255, 68, 68, 0.3);
      }
    `;
    
    if (!document.getElementById('network-modal-styles')) {
      style.id = 'network-modal-styles';
      document.head.appendChild(style);
    }
  }

  /**
   * Abre o modal
   */
  public open(): void {
    if (this.isVisible) return;

    this.render();
    this.isVisible = true;
  }

  /**
   * Fecha o modal
   */
  public close(): void {
    if (!this.isVisible) return;

    if (this.modal && this.modal.parentElement) {
      this.modal.parentElement.removeChild(this.modal);
    }

    this.modal = null;
    this.isVisible = false;
  }

  /**
   * Renderiza o modal
   */
  private render(): void {
    const netState = appState.networkState;
    const defaultUrl = 'ws://localhost:3000';
    const defaultName = 'Player_' + Math.floor(Math.random() * 1000);

    this.modal = document.createElement('div');
    this.modal.className = 'network-modal-overlay';

    this.modal.innerHTML = `
      <div class="network-modal-container">
        <div class="network-modal-header">
          <div class="network-modal-title">
            🌐 Connect Multiplayer
          </div>
          <button class="network-modal-close" data-action="close">✕</button>
        </div>
        
        <div class="network-modal-body">
          ${netState.status === 'error' ? `
            <div class="network-status error">
              ⚠️ ${netState.errorMessage || 'Connection failed'}
            </div>
          ` : ''}
          
          <div class="network-form-group">
            <label class="network-form-label">Server URL</label>
            <input 
              type="text" 
              class="network-form-input" 
              id="network-server-url" 
              value="${defaultUrl}"
              placeholder="ws://localhost:3000"
            />
            <div class="network-form-hint">WebSocket URL (ws:// or wss://)</div>
          </div>
          
          <div class="network-form-group">
            <label class="network-form-label">Player Name</label>
            <input 
              type="text" 
              class="network-form-input" 
              id="network-player-name" 
              value="${defaultName}"
              placeholder="Your name"
              maxlength="20"
            />
            <div class="network-form-hint">Your display name (max 20 characters)</div>
          </div>
        </div>
        
        <div class="network-modal-footer">
          <button class="network-modal-btn network-modal-btn-secondary" data-action="close">
            Cancel
          </button>
          <button class="network-modal-btn network-modal-btn-primary" data-action="connect">
            🌐 Connect
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);

    // Event listeners
    this.modal.querySelector('[data-action="close"]')?.addEventListener('click', () => {
      this.close();
    });

    this.modal.querySelector('[data-action="connect"]')?.addEventListener('click', () => {
      this.handleConnect();
    });

    // ESC fecha modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // Enter submete
    const inputs = this.modal.querySelectorAll('.network-form-input');
    inputs.forEach(input => {
      input.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter') {
          this.handleConnect();
        }
      });
    });

    // Clica fora fecha modal
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // Foca no primeiro input
    setTimeout(() => {
      const firstInput = this.modal?.querySelector('#network-server-url') as HTMLInputElement;
      firstInput?.focus();
    }, 100);
  }

  /**
   * Processa conexão
   */
  private async handleConnect(): Promise<void> {
    const urlInput = document.getElementById('network-server-url') as HTMLInputElement;
    const nameInput = document.getElementById('network-player-name') as HTMLInputElement;

    if (!urlInput || !nameInput) return;

    const serverUrl = urlInput.value.trim();
    const playerName = nameInput.value.trim();

    if (!serverUrl || !playerName) {
      alert('Please fill all fields');
      return;
    }

    // Valida URL
    if (!serverUrl.startsWith('ws://') && !serverUrl.startsWith('wss://')) {
      alert('Server URL must start with ws:// or wss://');
      return;
    }

    // Fecha modal
    this.close();

    // Dispara comando
    try {
      await commandRegistry.execute(CommandId.NET_CONNECT, {
        serverUrl,
        playerName
      });
    } catch (error) {
      console.error('Failed to connect:', error);
      // Reabre modal com erro
      setTimeout(() => this.open(), 500);
    }
  }

  /**
   * Verifica se modal está visível
   */
  public get visible(): boolean {
    return this.isVisible;
  }
}

// Singleton
let networkConnectModal: NetworkConnectModal | null = null;

export function getNetworkConnectModal(): NetworkConnectModal {
  if (!networkConnectModal) {
    networkConnectModal = new NetworkConnectModal();
  }
  return networkConnectModal;
}
