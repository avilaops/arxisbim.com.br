/**
 * Modal Component - Sistema de Design ArxisVR
 * Modal/Dialog reutilizável com overlay e animações
 */

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  title?: string;
  subtitle?: string;
  size?: ModalSize;
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  footer?: HTMLElement | string;
  onOpen?: () => void;
  onClose?: () => void;
  className?: string;
}

export class Modal {
  private overlay: HTMLElement;
  private modal: HTMLElement;
  private header: HTMLElement | null = null;
  private body: HTMLElement;
  private footer: HTMLElement | null = null;
  private props: ModalProps;
  private isOpen: boolean = false;

  constructor(props: ModalProps = {}) {
    this.props = {
      size: 'md',
      closeOnOverlay: true,
      closeOnEscape: true,
      showCloseButton: true,
      ...props
    };
    this.overlay = this.createOverlay();
    this.modal = this.createModal();
    this.body = this.createBody();
    this.applyStyles();
    this.setupEventListeners();
  }

  /**
   * Cria o overlay
   */
  private createOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'arxis-modal-overlay';
    overlay.style.display = 'none';
    document.body.appendChild(overlay);
    return overlay;
  }

  /**
   * Cria o modal
   */
  private createModal(): HTMLElement {
    const modal = document.createElement('div');
    modal.className = this.getModalClasses();

    // Header
    if (this.props.title || this.props.showCloseButton) {
      this.header = this.createHeader();
      modal.appendChild(this.header);
    }

    this.overlay.appendChild(modal);
    return modal;
  }

  /**
   * Cria o header do modal
   */
  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'arxis-modal-header';

    // Title section
    if (this.props.title) {
      const titleSection = document.createElement('div');
      titleSection.className = 'arxis-modal-title-section';

      const title = document.createElement('h2');
      title.className = 'arxis-modal-title';
      title.textContent = this.props.title;
      titleSection.appendChild(title);

      if (this.props.subtitle) {
        const subtitle = document.createElement('p');
        subtitle.className = 'arxis-modal-subtitle';
        subtitle.textContent = this.props.subtitle;
        titleSection.appendChild(subtitle);
      }

      header.appendChild(titleSection);
    }

    // Close button
    if (this.props.showCloseButton) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'arxis-modal-close';
      closeBtn.innerHTML = '✕';
      closeBtn.onclick = () => this.close();
      header.appendChild(closeBtn);
    }

    return header;
  }

  /**
   * Cria o body do modal
   */
  private createBody(): HTMLElement {
    const body = document.createElement('div');
    body.className = 'arxis-modal-body';
    this.modal.appendChild(body);
    return body;
  }

  /**
   * Cria o footer do modal
   */
  private createFooter(): HTMLElement {
    const footer = document.createElement('div');
    footer.className = 'arxis-modal-footer';

    if (typeof this.props.footer === 'string') {
      footer.innerHTML = this.props.footer;
    } else if (this.props.footer instanceof HTMLElement) {
      footer.appendChild(this.props.footer);
    }

    return footer;
  }

  /**
   * Gera classes do modal
   */
  private getModalClasses(): string {
    const classes = ['arxis-modal'];
    
    if (this.props.size) {
      classes.push(`arxis-modal--${this.props.size}`);
    }
    
    if (this.props.className) {
      classes.push(this.props.className);
    }

    return classes.join(' ');
  }

  /**
   * Configura event listeners
   */
  private setupEventListeners(): void {
    // Close on overlay click
    if (this.props.closeOnOverlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) {
          this.close();
        }
      });
    }

    // Close on Escape key
    if (this.props.closeOnEscape) {
      this.handleEscape = this.handleEscape.bind(this);
    }
  }

  /**
   * Handler para tecla Escape
   */
  private handleEscape(e: KeyboardEvent): void {
    if (e.key === 'Escape' && this.isOpen) {
      this.close();
    }
  }

  /**
   * Aplica estilos CSS
   */
  private applyStyles(): void {
    if (document.getElementById('arxis-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-modal-styles';
    style.textContent = `
      .arxis-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: arxis-modal-fade-in 0.2s ease;
        padding: 20px;
      }

      @keyframes arxis-modal-fade-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .arxis-modal {
        background: rgba(20, 20, 20, 0.98);
        backdrop-filter: blur(20px);
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        flex-direction: column;
        max-height: 90vh;
        animation: arxis-modal-slide-up 0.3s ease;
      }

      @keyframes arxis-modal-slide-up {
        from {
          opacity: 0;
          transform: translateY(20px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      /* Sizes */
      .arxis-modal--sm {
        width: 400px;
      }

      .arxis-modal--md {
        width: 600px;
      }

      .arxis-modal--lg {
        width: 800px;
      }

      .arxis-modal--xl {
        width: 1000px;
      }

      .arxis-modal--full {
        width: calc(100vw - 40px);
        height: calc(100vh - 40px);
      }

      /* Header */
      .arxis-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 24px 28px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        gap: 16px;
      }

      .arxis-modal-title-section {
        flex: 1;
      }

      .arxis-modal-title {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: var(--theme-foreground, #fff);
      }

      .arxis-modal-subtitle {
        margin: 6px 0 0 0;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.6);
      }

      .arxis-modal-close {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 18px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .arxis-modal-close:hover {
        background: rgba(255, 0, 0, 0.6);
        transform: rotate(90deg);
      }

      /* Body */
      .arxis-modal-body {
        padding: 28px;
        overflow-y: auto;
        flex: 1;
        color: var(--theme-foreground, #fff);
      }

      .arxis-modal-body::-webkit-scrollbar {
        width: 8px;
      }

      .arxis-modal-body::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
      }

      .arxis-modal-body::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 4px;
      }

      .arxis-modal-body::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      /* Footer */
      .arxis-modal-footer {
        padding: 20px 28px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(0, 0, 0, 0.2);
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        align-items: center;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Abre o modal
   */
  public open(): void {
    this.overlay.style.display = 'flex';
    this.isOpen = true;
    document.body.style.overflow = 'hidden';
    
    if (this.props.closeOnEscape) {
      document.addEventListener('keydown', this.handleEscape);
    }
    
    if (this.props.onOpen) {
      this.props.onOpen();
    }
  }

  /**
   * Fecha o modal
   */
  public close(): void {
    this.overlay.style.display = 'none';
    this.isOpen = false;
    document.body.style.overflow = '';
    
    if (this.props.closeOnEscape) {
      document.removeEventListener('keydown', this.handleEscape);
    }
    
    if (this.props.onClose) {
      this.props.onClose();
    }
  }

  /**
   * Toggle open/close
   */
  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Define conteúdo do body
   */
  public setContent(content: HTMLElement | string): void {
    this.body.innerHTML = '';
    if (typeof content === 'string') {
      this.body.innerHTML = content;
    } else {
      this.body.appendChild(content);
    }
  }

  /**
   * Adiciona elemento ao body
   */
  public appendChild(element: HTMLElement): void {
    this.body.appendChild(element);
  }

  /**
   * Define footer
   */
  public setFooter(footer: HTMLElement | string): void {
    this.props.footer = footer;
    
    // Remove footer existente
    if (this.footer) {
      this.footer.remove();
      this.footer = null;
    }

    // Cria novo footer
    this.footer = this.createFooter();
    this.modal.appendChild(this.footer);
  }

  /**
   * Retorna o elemento body
   */
  public getBody(): HTMLElement {
    return this.body;
  }

  /**
   * Retorna o elemento modal principal
   */
  public getElement(): HTMLElement {
    return this.modal;
  }

  /**
   * Retorna estado de abertura
   */
  public isModalOpen(): boolean {
    return this.isOpen;
  }

  /**
   * Destrói o modal
   */
  public destroy(): void {
    this.close();
    if (this.props.closeOnEscape) {
      document.removeEventListener('keydown', this.handleEscape);
    }
    this.overlay.remove();
  }
}

/**
 * Helper para criar modal rapidamente
 */
export function createModal(props: ModalProps = {}): Modal {
  return new Modal(props);
}
