/**
 * LoadFileModalSimple - VERSÃO SIMPLES QUE FUNCIONA
 * SEM dependências complexas, SÓ abre arquivo e carrega
 */

import { uiStore } from '../../../../app/state/uiStore';
import { eventBus } from '../../../../app/state/eventBus';
import { di } from '../../../../app/di';

export class LoadFileModal {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="simple-modal">
        <div class="simple-modal__header">
          <h2>Open IFC File</h2>
          <button class="simple-modal__close" id="close-modal">×</button>
        </div>
        
        <div class="simple-modal__body">
          <!-- Dropzone -->
          <div class="simple-dropzone" id="dropzone">
            <div class="simple-dropzone__icon">📁</div>
            <div class="simple-dropzone__text">
              <strong>Drag & drop IFC file here</strong>
              <span>or click to browse</span>
            </div>
            <input 
              type="file" 
              accept=".ifc,.IFC,application/x-step,model/ifc" 
              style="display: none;" 
              id="file-input"
            />
          </div>

          <!-- Loading -->
          <div class="simple-loading" id="loading" style="display: none;">
            <div class="simple-loading__spinner"></div>
            <div class="simple-loading__text">Loading IFC file...</div>
            <div class="simple-loading__progress" id="progress-text">0%</div>
          </div>

          <!-- Error -->
          <div class="simple-error" id="error" style="display: none;"></div>
        </div>
      </div>
    `;

    this.addStyles();
    this.setupEvents();
  }

  private setupEvents(): void {
    console.log('🔧 LoadFileModal: Setting up events');
    
    // Garantir que erro está escondido no início
    const errorEl = this.container.querySelector('#error') as HTMLElement;
    if (errorEl) {
      errorEl.style.display = 'none';
      errorEl.textContent = '';
      console.log('✅ Error element hidden');
    }
    
    // Close button
    const closeBtn = this.container.querySelector('#close-modal');
    closeBtn?.addEventListener('click', () => {
      console.log('❌ Close button clicked');
      uiStore.closeModal();
    });

    // Dropzone click
    const dropzone = this.container.querySelector('#dropzone') as HTMLElement;
    const fileInput = this.container.querySelector('#file-input') as HTMLInputElement;

    if (!dropzone || !fileInput) {
      console.error('❌ Dropzone or fileInput not found!');
      return;
    }

    console.log('✅ Dropzone and fileInput found');

    // Mobile-friendly click handler
    dropzone.addEventListener('click', (e) => {
      console.log('🖱️ Dropzone clicked', e);
      console.log('🖱️ Event type:', e.type);
      console.log('🖱️ Target:', e.target);
      
      // Não prevenir default se o clique for no próprio input (edge case)
      if (e.target !== fileInput) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      console.log('📁 Triggering file input click...');
      try {
        fileInput.click();
        console.log('✅ File input click() called successfully');
      } catch (error) {
        console.error('❌ Error calling fileInput.click():', error);
      }
    });
    
    // Touch support for mobile
    dropzone.addEventListener('touchend', (e) => {
      console.log('👆 Dropzone touched', e);
      e.preventDefault();
      e.stopPropagation();
      console.log('📁 Triggering file input click (touch)...');
      fileInput.click();
      console.log('✅ File input triggered (touch)');
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
      console.log('📄 File input changed', e);
      console.log('📄 Event target:', e.target);
      console.log('📄 Files:', (e.target as HTMLInputElement).files);
      
      const files = (e.target as HTMLInputElement).files;
      console.log('📄 Files length:', files?.length);
      
      const file = files?.[0];
      if (file) {
        console.log('✅ File selected:', file.name, file.size, 'bytes', file.type);
        this.loadFile(file);
      } else {
        console.warn('⚠️ No file selected from input');
      }
    }, { passive: false });

    // Drag & drop (desktop only)
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      
      const file = e.dataTransfer?.files[0];
      if (file && file.name.endsWith('.ifc')) {
        console.log('📦 File dropped:', file.name);
        this.loadFile(file);
      } else {
        console.warn('⚠️ Invalid file dropped');
        this.showError('Please select a valid IFC file');
      }
    });
    
    console.log('✅ All event listeners attached');
  }

  private async loadFile(file: File): Promise<void> {
    console.log('🚀 LoadFileModalSimple: Loading IFC file:', file.name);
    console.log('📦 File size:', (file.size / (1024 * 1024)).toFixed(2), 'MB');

    // Show loading
    const dropzone = this.container.querySelector('#dropzone') as HTMLElement;
    const loading = this.container.querySelector('#loading') as HTMLElement;
    const error = this.container.querySelector('#error') as HTMLElement;

    dropzone.style.display = 'none';
    loading.style.display = 'block';
    error.style.display = 'none';

    try {
      // Get IFCLoader from DI
      console.log('🔍 Getting IFCLoader from DI...');
      const ifcLoader = di.tryGet('ifcLoader');
      
      if (!ifcLoader) {
        console.error('❌ IFCLoader not found in DI');
        console.log('📋 Available services:', Object.keys(di.getAll()));
        throw new Error('IFCLoader not initialized. Check browser console.');
      }

      console.log('✅ IFCLoader found:', ifcLoader);
      console.log('🔄 Calling ifcLoader.load()...');

      // Load IFC
      await ifcLoader.load(file);

      // Success!
      console.log('✅ IFC loaded successfully!');
      
      // Emit event
      eventBus.emit({
        type: 'ModelLoaded',
        payload: {
          fileName: file.name,
          triangles: 0, // Will be updated by loader
          memory: file.size / (1024 * 1024)
        }
      });

      // Close modal
      setTimeout(() => {
        uiStore.closeModal();
      }, 500);

    } catch (err: any) {
      console.error('❌ Failed to load IFC:', err);
      console.error('📋 Error details:', {
        message: err.message,
        stack: err.stack
      });
      
      this.showError(err.message || 'Failed to load IFC file');
      
      // Show dropzone again
      dropzone.style.display = 'flex';
      loading.style.display = 'none';
    }
  }

  private showError(message: string): void {
    console.error('🚨 LoadFileModal: Showing error:', message);
    console.trace('🔍 Error called from:');
    const error = this.container.querySelector('#error') as HTMLElement;
    if (!error) {
      console.error('❌ Error element not found!');
      return;
    }
    error.textContent = `❌ ${message}`;
    error.style.display = 'block';
  }

  private addStyles(): void {
    if (document.getElementById('simple-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'simple-modal-styles';
    style.textContent = `
      .simple-modal {
        background: var(--bg-primary, #1e1e1e);
        border-radius: var(--radius-lg, 8px);
        padding: var(--space-6, 24px);
        min-width: 500px;
        max-width: 600px;
      }

      .simple-modal__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-6, 24px);
        padding-bottom: var(--space-4, 16px);
        border-bottom: 1px solid var(--border-color, #333);
      }

      .simple-modal__header h2 {
        margin: 0;
        font-size: 18px;
        color: var(--text-primary, #e0e0e0);
      }

      .simple-modal__close {
        background: none;
        border: none;
        color: var(--text-secondary, #999);
        font-size: 28px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.15s;
      }

      .simple-modal__close:hover {
        background: var(--bg-hover, #2d2d2d);
        color: var(--text-primary, #e0e0e0);
      }

      .simple-modal__body {
        min-height: 200px;
      }

      .simple-dropzone {
        border: 2px dashed var(--border-color, #444);
        border-radius: var(--radius-lg, 8px);
        padding: var(--space-10, 40px);
        text-align: center;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-4, 16px);
      }

      .simple-dropzone:hover,
      .simple-dropzone.dragover {
        border-color: var(--accent-color, #2196f3);
        background: rgba(33, 150, 243, 0.05);
      }

      .simple-dropzone__icon {
        font-size: 64px;
        opacity: 0.5;
      }

      .simple-dropzone__text {
        display: flex;
        flex-direction: column;
        gap: var(--space-2, 8px);
      }

      .simple-dropzone__text strong {
        font-size: 16px;
        color: var(--text-primary, #e0e0e0);
      }

      .simple-dropzone__text span {
        font-size: 14px;
        color: var(--text-secondary, #999);
      }

      .simple-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-4, 16px);
        padding: var(--space-10, 40px);
      }

      .simple-loading__spinner {
        width: 48px;
        height: 48px;
        border: 4px solid var(--border-color, #333);
        border-top-color: var(--accent-color, #2196f3);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .simple-loading__text {
        font-size: 16px;
        color: var(--text-primary, #e0e0e0);
      }

      .simple-loading__progress {
        font-size: 14px;
        color: var(--text-secondary, #999);
      }

      .simple-error {
        padding: var(--space-4, 16px);
        background: rgba(244, 67, 54, 0.1);
        border: 1px solid rgba(244, 67, 54, 0.3);
        border-radius: var(--radius-md, 6px);
        color: #f44336;
        margin-top: var(--space-4, 16px);
      }

      /* Mobile responsiveness */
      @media (max-width: 768px) {
        .simple-modal {
          min-width: auto;
          max-width: calc(100vw - 32px);
          width: calc(100vw - 32px);
          padding: 12px;
        }

        .simple-modal__header {
          margin-bottom: 12px;
          padding-bottom: 12px;
        }

        .simple-modal__header h2 {
          font-size: 16px;
        }

        .simple-modal__close {
          font-size: 24px;
          width: 28px;
          height: 28px;
        }

        .simple-modal__body {
          min-height: auto;
        }

        .simple-dropzone {
          padding: 20px 16px;
        }

        .simple-dropzone__icon {
          font-size: 40px;
        }

        .simple-dropzone__text {
          gap: 4px;
        }

        .simple-dropzone__text strong {
          font-size: 14px;
        }

        .simple-dropzone__text span {
          font-size: 12px;
        }

        .simple-loading {
          padding: 24px;
        }

        .simple-loading__spinner {
          width: 40px;
          height: 40px;
          border-width: 3px;
        }

        .simple-loading__text {
          font-size: 14px;
        }

        .simple-loading__progress {
          font-size: 12px;
        }

        .simple-error {
          padding: 12px;
          font-size: 12px;
          margin-top: 12px;
        }
      }

      @media (max-width: 480px) {
        .simple-modal {
          width: calc(100vw - 24px);
          max-width: calc(100vw - 24px);
          padding: 10px;
        }

        .simple-modal__header {
          margin-bottom: 10px;
          padding-bottom: 10px;
        }

        .simple-modal__header h2 {
          font-size: 15px;
        }

        .simple-dropzone {
          padding: 16px 12px;
        }

        .simple-dropzone__icon {
          font-size: 36px;
        }

        .simple-dropzone__text strong {
          font-size: 13px;
        }

        .simple-dropzone__text span {
          font-size: 11px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  public destroy(): void {
    // Cleanup
  }
}
