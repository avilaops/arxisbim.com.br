/**
 * ModalHost - Gerenciador de modais (tipo portal/overlay)
 * Renderiza modais baseado no uiStore.modal
 */

import { uiStore } from '../../../../app/state/uiStore';
import type { ModalState } from '../../../../app/state/uiStore';
import { LoadFileModal } from '../modals/LoadFileModalSimple';

type ModalConstructor = new (container: HTMLElement, props?: any) => IModal;

interface IModal {
  destroy(): void;
}

const MODALS: Record<string, ModalConstructor> = {
  loadFile: LoadFileModal as any,
  // export: ExportModal,
  // settings: SettingsModal,
  // about: AboutModal,
  // share: ShareModal
};

/**
 * ModalHost component
 */
export class ModalHost {
  private container: HTMLElement;
  private currentModal?: IModal;
  private backdrop?: HTMLElement;
  private unsubscribe?: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.container.className = 'modal-host';
    this.subscribeToState();
  }

  private subscribeToState(): void {
    this.unsubscribe = uiStore.subscribe((state) => {
      this.updateModal(state.modal);
    });
  }

  private updateModal(modalState: ModalState): void {
    // Close current modal
    if (this.currentModal) {
      this.closeModal();
    }

    // Open new modal
    if (modalState.key) {
      this.openModal(modalState.key, modalState.props);
    }
  }

  private openModal(key: string, props?: any): void {
    // Create backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'modal-backdrop';
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        uiStore.closeModal();
      }
    });

    // Create modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';

    this.backdrop.appendChild(modalContainer);
    this.container.appendChild(this.backdrop);

    // Load modal
    const ModalClass = MODALS[key];
    if (ModalClass) {
      this.currentModal = new ModalClass(modalContainer, props);
    } else {
      console.warn(`[ModalHost] Modal not found: ${key}`);
      uiStore.closeModal();
    }

    // Animate in
    requestAnimationFrame(() => {
      this.backdrop?.classList.add('open');
    });
  }

  private closeModal(): void {
    if (this.backdrop) {
      this.backdrop.classList.remove('open');
      
      setTimeout(() => {
        if (this.backdrop) {
          this.backdrop.remove();
          this.backdrop = undefined;
        }
      }, 200); // Match transition duration
    }

    if (this.currentModal) {
      this.currentModal.destroy();
      this.currentModal = undefined;
    }
  }

  public destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.closeModal();
  }
}
