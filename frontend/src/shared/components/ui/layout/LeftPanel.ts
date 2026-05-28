import { appController } from '../../app/AppController';
import { eventBus, EventType, ToolType } from '../../core';
import { LayerPanel } from './LayerPanel';
import { SectionType } from '../../app/SectionManager';

/**
 * LeftPanel - Painel esquerdo
 * Contém: Project tree, Layers, Scene hierarchy
 */
export class LeftPanel {
  private container: HTMLElement;
  private layerPanel: LayerPanel | null = null;
  private currentTab: 'project' | 'layers' | 'hierarchy' | 'bim' | 'sections' = 'layers';
  private isVisible: boolean = true;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }
    
    this.container = container;
    this.init();
  }

  /**
   * Inicializa o painel
   */
  private init(): void {
    this.container.className = 'left-panel';
    this.applyStyles();
    this.setupEventListeners();
    this.render();
    
    console.log('✅ LeftPanel initialized');
  }

  /**
   * Aplica estilos CSS
   */
  private applyStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .left-panel {
        position: absolute;
        left: 0;
        top: 50px;
        width: 320px;
        height: calc(100vh - 50px);
        background: rgba(20, 20, 20, 0.95);
        backdrop-filter: blur(20px);
        box-shadow: 2px 0 10px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        z-index: 100;
        transition: transform 0.3s ease;
      }
      
      .left-panel.hidden {
        transform: translateX(-100%);
      }
      
      .left-panel-header {
        padding: 16px;
        background: var(--theme-primary, #667eea);
        color: white;
        font-weight: bold;
        font-size: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid var(--theme-accent, #00ff88);
      }
      
      .left-panel-close {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.2s;
      }
      
      .left-panel-close:hover {
        background: rgba(255, 0, 0, 0.6);
      }
      
      .left-panel-tabs {
        display: flex;
        background: var(--theme-backgroundSecondary, #1e1e1e);
        border-bottom: 1px solid var(--theme-border, #333);
      }
      
      .left-panel-tab {
        flex: 1;
        padding: 12px;
        background: transparent;
        border: none;
        color: var(--theme-foregroundMuted, #999);
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
        border-bottom: 3px solid transparent;
      }
      
      .left-panel-tab:hover {
        background: rgba(255, 255, 255, 0.05);
        color: var(--theme-foreground, #fff);
      }
      
      .left-panel-tab.active {
        color: var(--theme-accent, #00ff88);
        border-bottom-color: var(--theme-accent, #00ff88);
        background: rgba(0, 255, 136, 0.1);
      }
      
      .left-panel-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
      }
      
      .left-panel-tab-content {
        display: none;
        height: 100%;
      }
      
      .left-panel-tab-content.active {
        display: block;
      }
      
      /* Project Tab */
      .project-tree {
        padding: 16px;
      }
      
      .project-tree-item {
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--theme-foreground, #fff);
      }
      
      .project-tree-item:hover {
        background: var(--theme-hover, #2a2a2a);
      }
      
      .project-tree-item.selected {
        background: var(--theme-primary, #667eea);
      }
      
      .project-tree-icon {
        font-size: 16px;
      }
      
      .project-empty {
        padding: 40px 20px;
        text-align: center;
        color: var(--theme-foregroundMuted, #999);
        font-size: 14px;
      }
      
      /* Hierarchy Tab */
      .hierarchy-tree {
        padding: 16px;
      }
      
      .hierarchy-item {
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--theme-foreground, #fff);
      }
      
      .hierarchy-item:hover {
        background: var(--theme-hover, #2a2a2a);
      }
      
      .hierarchy-item.selected {
        background: var(--theme-primary, #667eea);
      }
      
      .hierarchy-expand {
        width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: var(--theme-foregroundMuted, #999);
      }
      
      .hierarchy-icon {
        font-size: 14px;
      }
      
      /* Toggle Button (float) */
      .left-panel-toggle {
        position: absolute;
        left: 320px;
        top: 70px;
        width: 24px;
        height: 48px;
        background: var(--theme-primary, #667eea);
        border: none;
        border-radius: 0 8px 8px 0;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        transition: all 0.3s;
        z-index: 101;
      }
      
      .left-panel-toggle:hover {
        background: var(--theme-accent, #00ff88);
        color: black;
        width: 28px;
      }
      
      .left-panel.hidden + .left-panel-toggle {
        left: 0;
      }
      
      /* BIM Management Tab */
      .bim-management {
        padding: 16px;
      }
      
      .bim-section {
        margin-bottom: 24px;
      }
      
      .bim-section h4 {
        margin: 0 0 12px 0;
        color: var(--theme-foreground, #fff);
        font-size: 14px;
        font-weight: 600;
      }
      
      .bim-add-btn {
        width: 100%;
        padding: 8px 12px;
        background: var(--theme-primary, #667eea);
        border: none;
        border-radius: 4px;
        color: white;
        cursor: pointer;
        font-size: 12px;
        margin-bottom: 12px;
        transition: background 0.2s;
      }
      
      .bim-add-btn:hover {
        background: var(--theme-accent, #00ff88);
        color: black;
      }
      
      .bim-list {
        max-height: 200px;
        overflow-y: auto;
      }
      
      .bim-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: var(--theme-background, #1a1a1a);
        border-radius: 4px;
        margin-bottom: 4px;
        border: 1px solid var(--theme-border, #333);
      }
      
      .bim-item:hover {
        background: var(--theme-hover, #2a2a2a);
      }
      
      .bim-status, .bim-type {
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 3px;
        font-weight: bold;
        text-transform: uppercase;
      }
      
      .bim-status.status-wip { background: #ffa500; color: black; }
      .bim-status.status-shared { background: #00ff88; color: black; }
      .bim-status.status-approved { background: #667eea; color: white; }
      .bim-status.status-published { background: #00ff88; color: black; }
      .bim-status.status-archived { background: #666; color: white; }
      
      .bim-type {
        background: var(--theme-primary, #667eea);
        color: white;
      }
      
      .bim-name {
        flex: 1;
        font-size: 12px;
        color: var(--theme-foreground, #fff);
      }
      
      .bim-actions {
        display: flex;
        gap: 4px;
      }
      
      .bim-actions button {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 12px;
        padding: 2px;
        border-radius: 2px;
        transition: background 0.2s;
      }
      
      .bim-actions button:hover {
        background: var(--theme-hover, #2a2a2a);
      }
      
      .bim-empty {
        padding: 20px;
        text-align: center;
        color: var(--theme-foregroundMuted, #999);
        font-style: italic;
      }
      
      .version-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-right: 8px;
      }
      
      .version-number {
        font-weight: bold;
        color: var(--theme-primary, #667eea);
        font-size: 12px;
      }
      
      .version-date {
        font-size: 10px;
        color: var(--theme-foregroundMuted, #999);
      }
      
      /* Sections Tab Styles */
      .sections-management {
        padding: 16px;
      }
      
      .section-toolbar {
        display: flex;
        gap: 4px;
        margin-bottom: 12px;
      }
      
      .section-btn {
        flex: 1;
        padding: 8px;
        background: var(--theme-backgroundSecondary, #2a2a2a);
        border: 1px solid var(--theme-border, #333);
        border-radius: 4px;
        color: var(--theme-foreground, #fff);
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }
      
      .section-btn:hover {
        background: var(--theme-primary, #667eea);
        border-color: var(--theme-accent, #00ff88);
      }
      
      .section-btn.full-width {
        width: 100%;
        margin-bottom: 4px;
      }
      
      .section-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .section-checkbox {
        display: flex;
        align-items: center;
        cursor: pointer;
      }
      
      .section-checkbox input[type="checkbox"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
      }
      
      .section-name {
        flex: 1;
        font-size: 12px;
        color: var(--theme-foreground, #fff);
      }
      
      .section-controls {
        margin-top: 12px;
      }
      
      .setting-group {
        margin-bottom: 8px;
      }
      
      .setting-label {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        cursor: pointer;
        font-size: 12px;
        color: var(--theme-foreground, #fff);
        transition: background 0.2s;
      }
      
      .setting-label:hover {
        background: var(--theme-hover, #2a2a2a);
        border-radius: 4px;
      }
      
      .setting-label input[type="checkbox"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
      }
    `;
    
    if (!document.getElementById('left-panel-styles')) {
      style.id = 'left-panel-styles';
      document.head.appendChild(style);
    }
  }

  /**
   * Configura event listeners
   */
  private setupEventListeners(): void {
    eventBus.on(EventType.LAYER_CREATED, this.handleLayerChange.bind(this));
    eventBus.on(EventType.LAYER_UPDATED, this.handleLayerChange.bind(this));
    eventBus.on(EventType.LAYER_DELETED, this.handleLayerChange.bind(this));
    
    eventBus.on(EventType.SCENE_LOADED, this.handleSceneChange.bind(this));
    eventBus.on(EventType.OBJECT_ADDED, this.handleSceneChange.bind(this));
    eventBus.on(EventType.OBJECT_REMOVED, this.handleSceneChange.bind(this));
    
    // Section events
    eventBus.on(EventType.SECTION_CREATED, this.handleSectionChange.bind(this));
    eventBus.on(EventType.SECTION_REMOVED, this.handleSectionChange.bind(this));
    eventBus.on(EventType.SECTION_UPDATED, this.handleSectionChange.bind(this));
    eventBus.on(EventType.SECTIONS_CLEARED, this.handleSectionChange.bind(this));
  }

  /**
   * Renderiza o conteúdo
   */
  private render(): void {
    this.container.innerHTML = `
      <div class="left-panel-header">
        <span>📁 Project</span>
        <button class="left-panel-close" data-action="close">×</button>
      </div>
      
      <div class="left-panel-tabs">
        <button class="left-panel-tab ${this.currentTab === 'project' ? 'active' : ''}" data-tab="project">
          📂 Files
        </button>
        <button class="left-panel-tab ${this.currentTab === 'layers' ? 'active' : ''}" data-tab="layers">
          🗂️ Layers
        </button>
        <button class="left-panel-tab ${this.currentTab === 'hierarchy' ? 'active' : ''}" data-tab="hierarchy">
          🌳 Scene
        </button>
        <button class="left-panel-tab ${this.currentTab === 'bim' ? 'active' : ''}" data-tab="bim">
          🏗️ BIM
        </button>
        <button class="left-panel-tab ${this.currentTab === 'sections' ? 'active' : ''}" data-tab="sections">
          ✂️ Sections
        </button>
      </div>
      
      <div class="left-panel-content">
        <div class="left-panel-tab-content ${this.currentTab === 'project' ? 'active' : ''}" data-content="project">
          ${this.renderProjectTab()}
        </div>
        
        <div class="left-panel-tab-content ${this.currentTab === 'layers' ? 'active' : ''}" data-content="layers" id="layers-container">
          <!-- LayerPanel será inserido aqui -->
        </div>
        
        <div class="left-panel-tab-content ${this.currentTab === 'hierarchy' ? 'active' : ''}" data-content="hierarchy">
          ${this.renderHierarchyTab()}
        </div>

        <div class="left-panel-tab-content ${this.currentTab === 'bim' ? 'active' : ''}" data-content="bim">
          ${this.renderBIMTab()}
        </div>

        <div class="left-panel-tab-content ${this.currentTab === 'sections' ? 'active' : ''}" data-content="sections">
          ${this.renderSectionsTab()}
        </div>
      </div>
    `;
    
    // Criar toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'left-panel-toggle';
    toggleBtn.innerHTML = '◀';
    toggleBtn.dataset.action = 'toggle';
    this.container.parentElement?.appendChild(toggleBtn);
    
    this.attachEventListeners();
    this.initializeLayerPanel();
  }

  /**
   * Renderiza aba de projeto
   */
  private renderProjectTab(): string {
    const state = appController.getState();
    
    if (!state.currentProject) {
      return `
        <div class="project-empty">
          <p>No project loaded</p>
          <p style="font-size: 12px; margin-top: 8px;">
            Open a file to start
          </p>
        </div>
      `;
    }
    
    return `
      <div class="project-tree">
        <div class="project-tree-item selected">
          <span class="project-tree-icon">📦</span>
          <span>${state.currentProject.name || 'Untitled Project'}</span>
        </div>
        ${state.loadedModels.map(model => `
          <div class="project-tree-item" data-model="${model.assetId}">
            <span class="project-tree-icon">🏗️</span>
            <span>${model.fileName || model.assetId}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Renderiza aba de hierarquia
   */
  private renderHierarchyTab(): string {
    const state = appController.getState();
    
    if (state.loadedModels.length === 0) {
      return `
        <div class="project-empty">
          <p>No objects in scene</p>
          <p style="font-size: 12px; margin-top: 8px;">
            Load a model to see hierarchy
          </p>
        </div>
      `;
    }
    
    return `
      <div class="hierarchy-tree">
        ${this.renderHierarchyItems()}
      </div>
    `;
  }

  /**
   * Renderiza items da hierarquia
   */
  private renderHierarchyItems(): string {
    const state = appController.getState();
    
    return state.loadedModels.map(model => `
      <div class="hierarchy-item" data-object="${model.assetId}">
        <span class="hierarchy-expand">▼</span>
        <span class="hierarchy-icon">📦</span>
        <span>${model.fileName || model.assetId}</span>
      </div>
    `).join('');
  }

  /**
   * Anexa event listeners aos elementos
   */
  private attachEventListeners(): void {
    // Fechar painel
    this.container.querySelector('[data-action="close"]')?.addEventListener('click', () => {
      this.setVisible(false);
    });
    
    // Toggle painel
    document.querySelector('.left-panel-toggle')?.addEventListener('click', () => {
      this.toggleVisibility();
    });
    
    // Tabs
    this.container.querySelectorAll('.left-panel-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = (tab as HTMLElement).dataset.tab as typeof this.currentTab;
        this.switchTab(tabName);
      });
    });
    
    // Project items
    this.container.querySelectorAll('[data-model]').forEach(item => {
      item.addEventListener('click', () => {
        const modelId = (item as HTMLElement).dataset.model;
        eventBus.emit(EventType.MODEL_SELECTED, { modelID: parseInt(modelId!) });
      });
    });
    
    // Hierarchy items
    this.container.querySelectorAll('[data-object]').forEach(item => {
      item.addEventListener('click', () => {
        const objectId = (item as HTMLElement).dataset.object;
        // TODO: Implement proper object selection from hierarchy
        console.log('Hierarchy item clicked:', objectId);
      });
    });
    
    // Section actions
    this.setupSectionEventListeners();
  }
  
  /**
   * Configura event listeners específicos para ações de seção
   */
  private setupSectionEventListeners(): void {
    // Criar seções por eixo
    this.container.querySelector('[data-action="create-section-x"]')?.addEventListener('click', () => {
      appController.sectionManager.createSection(SectionType.X_AXIS, 0);
      this.updateContent();
    });
    
    this.container.querySelector('[data-action="create-section-y"]')?.addEventListener('click', () => {
      appController.sectionManager.createSection(SectionType.Y_AXIS, 0);
      this.updateContent();
    });
    
    this.container.querySelector('[data-action="create-section-z"]')?.addEventListener('click', () => {
      appController.sectionManager.createSection(SectionType.Z_AXIS, 0);
      this.updateContent();
    });
    
    // Ativar ferramenta de seção
    this.container.querySelector('[data-action="activate-section-tool"]')?.addEventListener('click', () => {
      appController.activateTool(ToolType.CUT);
    });
    
    // Toggle seção
    this.container.querySelectorAll('[data-action="toggle-section"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const sectionId = target.dataset.id!;
        appController.sectionManager.toggleSection(sectionId, target.checked);
      });
    });
    
    // Flip seção
    this.container.querySelectorAll('[data-action="flip-section"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const sectionId = target.dataset.id!;
        appController.sectionManager.flipSection(sectionId);
        this.updateContent();
      });
    });
    
    // Delete seção
    this.container.querySelectorAll('[data-action="delete-section"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const sectionId = target.dataset.id!;
        appController.sectionManager.removeSection(sectionId);
        this.updateContent();
      });
    });
    
    // Clear all sections
    this.container.querySelector('[data-action="clear-sections"]')?.addEventListener('click', () => {
      appController.sectionManager.clearSections();
      this.updateContent();
    });
    
    // Toggle visual options
    this.container.querySelector('[data-action="toggle-section-lines"]')?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      appController.sectionManager.updateVisualOptions({ showSectionLines: target.checked });
    });
    
    this.container.querySelector('[data-action="toggle-clipping-planes"]')?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      appController.sectionManager.updateVisualOptions({ showClippingPlanes: target.checked });
    });
    
    // Measurement tools
    this.container.querySelector('[data-action="activate-measurement"]')?.addEventListener('click', () => {
      appController.activateTool(ToolType.MEASUREMENT);
    });
  }

  /**
   * Inicializa o LayerPanel dentro da tab
   */
  private initializeLayerPanel(): void {
    const layersContainer = this.container.querySelector('#layers-container');
    if (layersContainer && appController.layerManager) {
      // Criar um div interno para o LayerPanel
      const layerDiv = document.createElement('div');
      layerDiv.id = 'layer-panel-content';
      layerDiv.style.height = '100%';
      layersContainer.appendChild(layerDiv);
      
      this.layerPanel = new LayerPanel('layer-panel-content', appController.layerManager);
    }
  }

  /**
   * Troca de tab
   */
  private switchTab(tabName: typeof this.currentTab): void {
    this.currentTab = tabName;
    
    // Atualiza tabs
    this.container.querySelectorAll('.left-panel-tab').forEach(tab => {
      if ((tab as HTMLElement).dataset.tab === tabName) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    // Atualiza conteúdo
    this.container.querySelectorAll('.left-panel-tab-content').forEach(content => {
      if ((content as HTMLElement).dataset.content === tabName) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });
  }

  /**
   * Handler para mudança de layers
   */
  private handleLayerChange(): void {
    if (this.currentTab === 'layers' && this.layerPanel) {
      // LayerPanel já gerencia sua própria atualização via eventos
    }
  }

  /**
   * Handler para mudança de scene
   */
  private handleSceneChange(): void {
    if (this.currentTab === 'hierarchy' || this.currentTab === 'project') {
      this.updateContent();
    }
  }
  
  /**
   * Handler para mudança de seções
   */
  private handleSectionChange(): void {
    if (this.currentTab === 'sections') {
      this.updateContent();
    }
  }

  /**
   * Atualiza conteúdo
   */
  private updateContent(): void {
    const projectContent = this.container.querySelector('[data-content="project"]');
    const hierarchyContent = this.container.querySelector('[data-content="hierarchy"]');
    const sectionsContent = this.container.querySelector('[data-content="sections"]');
    
    if (projectContent) {
      projectContent.innerHTML = this.renderProjectTab();
    }
    
    if (hierarchyContent) {
      hierarchyContent.innerHTML = this.renderHierarchyTab();
    }
    
    if (sectionsContent) {
      sectionsContent.innerHTML = this.renderSectionsTab();
      // Re-attach event listeners após update
      this.setupSectionEventListeners();
    }
    
    // Re-anexar listeners
    this.attachEventListeners();
  }

  /**
   * Toggle visibilidade
   */
  public toggleVisibility(): void {
    this.isVisible = !this.isVisible;
    this.setVisible(this.isVisible);
  }

  /**
   * Define visibilidade
   */
  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    
    if (visible) {
      this.container.classList.remove('hidden');
      const toggleBtn = document.querySelector('.left-panel-toggle');
      if (toggleBtn) {
        (toggleBtn as HTMLElement).innerHTML = '◀';
      }
    } else {
      this.container.classList.add('hidden');
      const toggleBtn = document.querySelector('.left-panel-toggle');
      if (toggleBtn) {
        (toggleBtn as HTMLElement).innerHTML = '▶';
      }
    }
  }

  /**
   * Renderiza aba BIM (ISO 19650)
   */
  private renderBIMTab(): string {
    const projectManager = appController.projectManager;
    const workPackages = projectManager.getWorkPackages();
    const containers = projectManager.getInformationContainers();

    return `
      <div class="bim-management">
        <div class="bim-section">
          <h4>📦 Work Packages</h4>
          <button class="bim-add-btn" data-action="add-workpackage">+ Novo Work Package</button>
          <div class="bim-list">
            ${workPackages.map((wp: any) => `
              <div class="bim-item workpackage" data-id="${wp.id}">
                <span class="bim-status status-${wp.status.toLowerCase()}">${wp.status}</span>
                <span class="bim-name">${wp.name}</span>
                <div class="bim-actions">
                  <button data-action="edit-wp" data-id="${wp.id}">✏️</button>
                  <button data-action="delete-wp" data-id="${wp.id}">🗑️</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="bim-section">
          <h4>📄 Information Containers</h4>
          <button class="bim-add-btn" data-action="add-container">+ Novo Container</button>
          <div class="bim-list">
            ${containers.map((container: any) => `
              <div class="bim-item container" data-id="${container.id}">
                <span class="bim-type">${container.type}</span>
                <span class="bim-status status-${container.status.toLowerCase()}">${container.status}</span>
                <span class="bim-name">${container.name}</span>
                <div class="bim-actions">
                  <button data-action="edit-container" data-id="${container.id}">✏️</button>
                  <button data-action="delete-container" data-id="${container.id}">🗑️</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="bim-section">
          <h4>📝 Version History</h4>
          <button class="bim-add-btn" data-action="create-version">+ Criar Versão</button>
          <div class="bim-list">
            ${this.renderVersionHistory()}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza aba de Seções e Clipping
   */
  private renderSectionsTab(): string {
    const sections = appController.sectionManager.getSections();

    return `
      <div class="sections-management">
        <div class="bim-section">
          <h4>✂️ Section Planes</h4>
          <div class="section-toolbar">
            <button class="section-btn" data-action="create-section-x" title="Create X Section">
              <span style="color: #ff0000;">X</span>
            </button>
            <button class="section-btn" data-action="create-section-y" title="Create Y Section">
              <span style="color: #00ff00;">Y</span>
            </button>
            <button class="section-btn" data-action="create-section-z" title="Create Z Section">
              <span style="color: #0000ff;">Z</span>
            </button>
            <button class="section-btn" data-action="activate-section-tool" title="Interactive Section Tool">
              🎯 Tool
            </button>
          </div>
          
          <div class="bim-list" id="sections-list">
            ${sections.length === 0 ? '<div class="bim-empty">No sections created</div>' : sections.map((section) => `
              <div class="bim-item section-item" data-id="${section.id}">
                <label class="section-checkbox">
                  <input type="checkbox" ${section.enabled ? 'checked' : ''} data-action="toggle-section" data-id="${section.id}">
                </label>
                <span class="section-name">${section.name}</span>
                <div class="bim-actions">
                  <button data-action="flip-section" data-id="${section.id}" title="Flip section">🔄</button>
                  <button data-action="delete-section" data-id="${section.id}" title="Delete">🗑️</button>
                </div>
              </div>
            `).join('')}
          </div>
          
          <div class="section-controls">
            <button class="bim-add-btn" data-action="clear-sections">
              🧹 Clear All Sections
            </button>
          </div>
        </div>

        <div class="bim-section">
          <h4>🎨 Visual Settings</h4>
          <div class="setting-group">
            <label class="setting-label">
              <input type="checkbox" checked data-action="toggle-section-lines">
              Show Section Lines
            </label>
          </div>
          <div class="setting-group">
            <label class="setting-label">
              <input type="checkbox" checked data-action="toggle-clipping-planes">
              Show Clipping Planes
            </label>
          </div>
        </div>

        <div class="bim-section">
          <h4>📏 Measurement Tools</h4>
          <button class="section-btn full-width" data-action="activate-measurement">
            📏 Distance
          </button>
          <button class="section-btn full-width" data-action="activate-area">
            📐 Area
          </button>
          <button class="section-btn full-width" data-action="activate-volume">
            📦 Volume
          </button>
          <button class="section-btn full-width" data-action="activate-angle">
            📐 Angle
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Renderiza histórico de versões
   */
  private renderVersionHistory(): string {
    const projectSerializer = appController.projectSerializer;
    const versions = projectSerializer.getVersionHistory();

    if (versions.length === 0) {
      return '<div class="bim-empty">Nenhuma versão criada ainda</div>';
    }

    return versions.slice(-5).reverse().map((version: any) => `
      <div class="bim-item version" data-id="${version.id}">
        <div class="version-info">
          <span class="version-number">${version.version}</span>
          <span class="version-date">${new Date(version.timestamp).toLocaleDateString()}</span>
        </div>
        <span class="bim-name">${version.description}</span>
        <div class="bim-actions">
          <button data-action="revert-version" data-id="${version.id}" title="Reverter para esta versão">↩️</button>
          <button data-action="compare-version" data-id="${version.id}" title="Comparar versões">⚖️</button>
        </div>
      </div>
    `).join('');
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    if (this.layerPanel) {
      this.layerPanel.dispose();
    }
    
    const toggleBtn = document.querySelector('.left-panel-toggle');
    if (toggleBtn) {
      toggleBtn.remove();
    }
  }
}
