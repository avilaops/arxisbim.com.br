/**
 * IFCProjectPanel - UI Component for managing project IFC models
 * Sidebar panel with upload, list, and controls
 */

import { getIFCUploadManager } from './IFCUploadManager';
import { IfcModel, IfcDiscipline, IfcPhase } from '../../api/v1/services';

export interface IFCProjectPanelOptions {
  projectId: string;
  container?: HTMLElement;
  onModelSelected?: (model: IfcModel) => void;
  onModelLoaded?: (model: IfcModel) => void;
}

export class IFCProjectPanel {
  private uploadManager = getIFCUploadManager();
  private options: IFCProjectPanelOptions;
  private panel: HTMLElement | null = null;
  private models: IfcModel[] = [];
  
  constructor(options: IFCProjectPanelOptions) {
    this.options = options;
  }

  /**
   * Create and inject panel into DOM
   */
  public async create(): Promise<HTMLElement> {
    this.panel = this.createPanelElement();
    
    if (this.options.container) {
      this.options.container.appendChild(this.panel);
    } else {
      document.body.appendChild(this.panel);
    }

    // Load models
    await this.refreshModelList();

    return this.panel;
  }

  /**
   * Create panel HTML structure
   */
  private createPanelElement(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'ifc-project-panel';
    panel.className = 'ifc-panel';
    panel.innerHTML = `
      <style>
        .ifc-panel {
          position: fixed;
          right: 0;
          top: 60px;
          width: 360px;
          height: calc(100vh - 60px);
          background: rgba(30, 30, 30, 0.98);
          backdrop-filter: blur(20px);
          border-left: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          z-index: 1000;
          transform: translateX(100%);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: #fff;
        }

        .ifc-panel.visible {
          transform: translateX(0);
        }

        .ifc-panel-header {
          padding: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ifc-panel-title {
          font-size: 18px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ifc-panel-close {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          background: transparent;
          border: none;
          color: #999;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .ifc-panel-close:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .ifc-panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .ifc-upload-zone {
          border: 2px dashed rgba(0, 255, 136, 0.3);
          border-radius: 12px;
          padding: 30px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          margin-bottom: 20px;
          background: rgba(0, 255, 136, 0.05);
        }

        .ifc-upload-zone:hover {
          border-color: #00ff88;
          background: rgba(0, 255, 136, 0.1);
        }

        .ifc-upload-zone.dragging {
          border-color: #00ff88;
          background: rgba(0, 255, 136, 0.2);
          transform: scale(1.02);
        }

        .ifc-upload-icon {
          font-size: 48px;
          margin-bottom: 10px;
          opacity: 0.8;
        }

        .ifc-upload-text {
          font-size: 14px;
          color: #999;
          margin-bottom: 5px;
        }

        .ifc-upload-hint {
          font-size: 12px;
          color: #666;
        }

        .ifc-models-section {
          margin-top: 20px;
        }

        .ifc-section-title {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #999;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .ifc-model-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.2s;
          border-left: 3px solid transparent;
        }

        .ifc-model-card:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .ifc-model-card.selected {
          background: rgba(0, 255, 136, 0.1);
          border-left-color: #00ff88;
        }

        .ifc-model-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .ifc-model-name {
          font-size: 14px;
          font-weight: 500;
          color: #fff;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ifc-model-actions {
          display: flex;
          gap: 4px;
        }

        .ifc-model-action {
          width: 28px;
          height: 28px;
          border-radius: 4px;
          background: transparent;
          border: none;
          color: #999;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          font-size: 16px;
        }

        .ifc-model-action:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .ifc-model-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .ifc-badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          color: #fff;
        }

        .ifc-model-info {
          font-size: 11px;
          color: #999;
          margin-top: 6px;
        }

        .ifc-progress {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 12px;
        }

        .ifc-progress-bar {
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
          margin-top: 8px;
        }

        .ifc-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #00ff88, #00d4aa);
          transition: width 0.3s;
        }

        .ifc-empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #666;
        }

        .ifc-empty-icon {
          font-size: 64px;
          opacity: 0.3;
          margin-bottom: 12px;
        }

        input[type="file"] {
          display: none;
        }

        .ifc-toggle {
          width: 32px;
          height: 18px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 9px;
          position: relative;
          cursor: pointer;
          transition: background 0.2s;
        }

        .ifc-toggle.active {
          background: #00ff88;
        }

        .ifc-toggle-knob {
          width: 14px;
          height: 14px;
          background: #fff;
          border-radius: 50%;
          position: absolute;
          top: 2px;
          left: 2px;
          transition: transform 0.2s;
        }

        .ifc-toggle.active .ifc-toggle-knob {
          transform: translateX(14px);
        }
      </style>

      <div class="ifc-panel-header">
        <div class="ifc-panel-title">
          🏗️ <span>Modelos IFC</span>
        </div>
        <button class="ifc-panel-close" id="ifc-close-btn" title="Fechar">
          ✕
        </button>
      </div>

      <div class="ifc-panel-content">
        <!-- Upload Zone -->
        <div class="ifc-upload-zone" id="ifc-upload-zone">
          <div class="ifc-upload-icon">📤</div>
          <div class="ifc-upload-text">Arraste arquivos IFC aqui</div>
          <div class="ifc-upload-hint">ou clique para selecionar</div>
          <input type="file" id="ifc-file-input" accept=".ifc" />
        </div>

        <!-- Progress -->
        <div id="ifc-progress-container" style="display: none;"></div>

        <!-- Models List -->
        <div class="ifc-models-section">
          <div class="ifc-section-title">
            <span>Modelos do Projeto</span>
            <span id="ifc-models-count">0</span>
          </div>
          <div id="ifc-models-list"></div>
        </div>
      </div>
    `;

    this.attachEventListeners(panel);
    return panel;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(panel: HTMLElement): void {
    // Close button
    const closeBtn = panel.querySelector('#ifc-close-btn');
    closeBtn?.addEventListener('click', () => this.hide());

    // Upload zone
    const uploadZone = panel.querySelector('#ifc-upload-zone') as HTMLElement;
    const fileInput = panel.querySelector('#ifc-file-input') as HTMLInputElement;

    uploadZone?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => this.handleFileSelect(e));

    // Drag & Drop
    uploadZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragging');
    });

    uploadZone?.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragging');
    });

    uploadZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragging');
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        this.uploadFile(files[0]);
      }
    });
  }

  /**
   * Handle file selection
   */
  private async handleFileSelect(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      await this.uploadFile(file);
      input.value = ''; // Reset input
    }
  }

  /**
   * Upload file
   */
  private async uploadFile(file: File): Promise<void> {
    try {
      // Show upload modal to select discipline/phase
      const metadata = await this.showUploadModal(file);
      if (!metadata) return; // User cancelled

      const model = await this.uploadManager.upload({
        file,
        projectId: this.options.projectId,
        discipline: metadata.discipline,
        phase: metadata.phase,
        description: metadata.description,
        autoLoad: metadata.autoLoad,
        captureThumbnail: true
      });

      // Refresh list
      await this.refreshModelList();

      // Select new model
      this.selectModel(model.id);

    } catch (error) {
      console.error('Upload failed:', error);
      alert(`Erro no upload: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Show upload modal (placeholder - will be replaced with proper modal)
   */
  private async showUploadModal(file: File): Promise<{
    discipline: IfcDiscipline;
    phase?: IfcPhase;
    description?: string;
    autoLoad: boolean;
  } | null> {
    // TODO: Replace with proper modal component
    const discipline = prompt('Disciplina (architecture/structure/mep_electrical):', 'architecture') as IfcDiscipline;
    if (!discipline) return null;

    const phase = prompt('Fase (new/existing/renovation) [opcional]:') as IfcPhase | undefined;
    const description = prompt('Descrição [opcional]:', file.name) || undefined;

    return {
      discipline,
      phase: phase || undefined,
      description,
      autoLoad: confirm('Carregar modelo automaticamente após upload?')
    };
  }

  /**
   * Refresh model list
   */
  private async refreshModelList(): Promise<void> {
    try {
      this.models = await this.uploadManager.listProjectModels(this.options.projectId);
      this.renderModelList();
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  }

  /**
   * Render model list
   */
  private renderModelList(): void {
    if (!this.panel) return;

    const listContainer = this.panel.querySelector('#ifc-models-list');
    const countElement = this.panel.querySelector('#ifc-models-count');

    if (!listContainer || !countElement) return;

    countElement.textContent = this.models.length.toString();

    if (this.models.length === 0) {
      listContainer.innerHTML = `
        <div class="ifc-empty-state">
          <div class="ifc-empty-icon">📦</div>
          <div>Nenhum modelo carregado</div>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = this.models.map(model => `
      <div class="ifc-model-card" data-model-id="${model.id}">
        <div class="ifc-model-header">
          <div class="ifc-model-name" title="${model.originalName}">
            ${model.originalName}
          </div>
          <div class="ifc-model-actions">
            <button class="ifc-model-action" data-action="load" title="Carregar">
              👁️
            </button>
            <button class="ifc-model-action" data-action="download" title="Download">
              ⬇️
            </button>
            <button class="ifc-model-action" data-action="delete" title="Deletar">
              🗑️
            </button>
          </div>
        </div>
        <div class="ifc-model-meta">
          <span class="ifc-badge" style="background-color: ${this.uploadManager.getDisciplineColor(model.discipline)}">
            ${this.uploadManager.getDisciplineLabel(model.discipline)}
          </span>
          ${model.phase ? `
            <span class="ifc-badge" style="background-color: #666">
              ${this.uploadManager.getPhaseLabel(model.phase)}
            </span>
          ` : ''}
        </div>
        <div class="ifc-model-info">
          ${this.uploadManager.formatFileSize(model.fileSize)} • 
          ${new Date(model.createdAt).toLocaleDateString('pt-BR')}
        </div>
      </div>
    `).join('');

    // Attach event listeners to cards
    listContainer.querySelectorAll('.ifc-model-card').forEach(card => {
      const modelId = card.getAttribute('data-model-id');
      if (!modelId) return;

      // Card click - select
      card.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('.ifc-model-action')) return;
        this.selectModel(modelId);
      });

      // Actions
      card.querySelectorAll('.ifc-model-action').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const action = btn.getAttribute('data-action');
          await this.handleModelAction(modelId, action as string);
        });
      });
    });
  }

  /**
   * Handle model action
   */
  private async handleModelAction(modelId: string, action: string): Promise<void> {
    const model = this.models.find(m => m.id === modelId);
    if (!model) return;

    try {
      switch (action) {
        case 'load':
          await this.uploadManager.loadModelIntoScene(model);
          if (this.options.onModelLoaded) {
            this.options.onModelLoaded(model);
          }
          break;

        case 'download':
          await this.uploadManager['ifcService'].download(modelId, model.originalName);
          break;

        case 'delete':
          if (confirm(`Deletar modelo "${model.originalName}"?`)) {
            await this.uploadManager.deleteModel(modelId);
            await this.refreshModelList();
          }
          break;
      }
    } catch (error) {
      console.error(`Action ${action} failed:`, error);
      alert(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Select model
   */
  private selectModel(modelId: string): void {
    if (!this.panel) return;

    // Remove previous selection
    this.panel.querySelectorAll('.ifc-model-card').forEach(card => {
      card.classList.remove('selected');
    });

    // Add selection
    const card = this.panel.querySelector(`[data-model-id="${modelId}"]`);
    card?.classList.add('selected');

    // Emit event
    const model = this.models.find(m => m.id === modelId);
    if (model && this.options.onModelSelected) {
      this.options.onModelSelected(model);
    }
  }

  /**
   * Show panel
   */
  public show(): void {
    this.panel?.classList.add('visible');
  }

  /**
   * Hide panel
   */
  public hide(): void {
    this.panel?.classList.remove('visible');
  }

  /**
   * Toggle panel visibility
   */
  public toggle(): void {
    if (this.panel?.classList.contains('visible')) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Destroy panel
   */
  public destroy(): void {
    this.panel?.remove();
    this.panel = null;
  }
}
