import { ThemeSelector } from '../../../../core/theme/ThemeSelector';
import { eventBus, EventType } from '../../../../core';

/**
 * ThemeSelectorModal - Modal para seleção de temas
 * 
 * Exibe ThemeSelector em um modal centralizado
 */
export class ThemeSelectorModal {
  private modal: HTMLElement | null = null;
  private selector: ThemeSelector | null = null;
  private isVisible: boolean = false;

  constructor() {
    this.init();
  }

  /**
   * Inicializa o modal
   */
  private init(): void {
    this.applyStyles();
  }

  /**
   * Aplica estilos CSS
   */
  private applyStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .theme-modal-overlay {
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
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      
      .theme-modal-container {
        background: var(--theme-background, #141414);
        border: 2px solid var(--theme-primary, #667eea);
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
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
      
      .theme-modal-header {
        padding: 20px;
        background: var(--theme-primary, #667eea);
        color: white;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .theme-modal-title {
        font-size: 18px;
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .theme-modal-close {
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
      
      .theme-modal-close:hover {
        background: rgba(255, 0, 0, 0.6);
        transform: scale(1.1);
      }
      
      .theme-modal-body {
        padding: 20px;
        max-height: calc(80vh - 100px);
        overflow-y: auto;
      }
      
      .theme-modal-footer {
        padding: 16px 20px;
        background: var(--theme-backgroundSecondary, #1e1e1e);
        border-top: 1px solid var(--theme-border, #333);
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }
      
      .theme-modal-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        transition: all 0.2s;
      }
      
      .theme-modal-btn-primary {
        background: var(--theme-primary, #667eea);
        color: white;
      }
      
      .theme-modal-btn-primary:hover {
        background: var(--theme-accent, #00ff88);
        color: black;
        transform: translateY(-2px);
      }
      
      .theme-modal-btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: var(--theme-foreground, #fff);
      }
      
      .theme-modal-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    `;
    
    if (!document.getElementById('theme-modal-styles')) {
      style.id = 'theme-modal-styles';
      document.head.appendChild(style);
    }
  }

  /**
   * Mostra o modal
   */
  public show(): void {
    if (this.isVisible) return;
    
    // Cria overlay
    const overlay = document.createElement('div');
    overlay.className = 'theme-modal-overlay';
    
    // Cria container
    const container = document.createElement('div');
    container.className = 'theme-modal-container';
    
    // Header
    const header = document.createElement('div');
    header.className = 'theme-modal-header';
    header.innerHTML = `
      <div class="theme-modal-title">
        <span>🎨</span>
        <span>Select Theme</span>
      </div>
      <button class="theme-modal-close">×</button>
    `;
    
    // Body
    const body = document.createElement('div');
    body.className = 'theme-modal-body';
    
    // Cria container para ThemeSelector
    const selectorContainer = document.createElement('div');
    selectorContainer.id = 'theme-selector-modal-content';
    body.appendChild(selectorContainer);
    
    // Footer
    const footer = document.createElement('div');
    footer.className = 'theme-modal-footer';
    footer.innerHTML = `
      <button class="theme-modal-btn theme-modal-btn-secondary" data-action="close">
        Cancel
      </button>
      <button class="theme-modal-btn theme-modal-btn-primary" data-action="apply">
        Apply Theme
      </button>
    `;
    
    // Monta modal
    container.appendChild(header);
    container.appendChild(body);
    container.appendChild(footer);
    overlay.appendChild(container);
    
    // Event listeners
    header.querySelector('.theme-modal-close')?.addEventListener('click', () => this.hide());
    footer.querySelector('[data-action="close"]')?.addEventListener('click', () => this.hide());
    footer.querySelector('[data-action="apply"]')?.addEventListener('click', () => this.hide());
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hide();
      }
    });
    
    // Adiciona ao DOM
    document.body.appendChild(overlay);
    this.modal = overlay;
    
    // Cria ThemeSelector dentro do modal
    this.selector = new ThemeSelector('theme-selector-modal-content');
    this.selector.show();
    
    this.isVisible = true;
    
    // ESC fecha modal
    document.addEventListener('keydown', this.handleEscape);
    
    eventBus.emit(EventType.UI_MODAL_OPEN, { modalId: 'theme-selector' });
  }

  /**
   * Esconde o modal
   */
  public hide(): void {
    if (!this.isVisible) return;
    
    if (this.selector) {
      this.selector.dispose();
      this.selector = null;
    }
    
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
    
    this.isVisible = false;
    
    document.removeEventListener('keydown', this.handleEscape);
    
    eventBus.emit(EventType.UI_MODAL_CLOSE, { modalId: 'theme-selector' });
  }

  /**
   * Toggle visibilidade
   */
  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Handler para ESC
   */
  private handleEscape = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.hide();
    }
  };

  /**
   * Verifica se está visível
   */
  public get visible(): boolean {
    return this.isVisible;
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    this.hide();
  }
}

// Singleton global
let themeSelectorModal: ThemeSelectorModal | null = null;

export function getThemeSelectorModal(): ThemeSelectorModal {
  if (!themeSelectorModal) {
    themeSelectorModal = new ThemeSelectorModal();
  }
  return themeSelectorModal;
}
