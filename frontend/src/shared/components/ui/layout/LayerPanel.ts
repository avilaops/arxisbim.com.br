import { LayerManager } from '../../app/LayerManager';
import { Layer } from '../../core/types';

/**
 * LayerPanel - Interface visual para controle de layers
 * Integrado com nova arquitetura (app/LayerManager)
 */
export class LayerPanel {
  private layerManager: LayerManager;
  private container: HTMLElement;
  private isVisible: boolean = false;

  constructor(containerId: string, layerManager: LayerManager) {
    this.layerManager = layerManager;
    
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
    this.container.className = 'layer-panel';
    this.applyStyles();
    this.render();
    
    console.log('✅ LayerPanel initialized');
  }

  /**
   * Aplica estilos CSS
   */
  private applyStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .layer-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: 0;
        overflow: hidden;
      }
      
      .layer-panel-header {
        padding: 16px;
        background: var(--theme-primary, #667eea);
        color: white;
        font-weight: bold;
        font-size: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .layer-panel-close {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.2s;
      }
      
      .layer-panel-close:hover {
        background: rgba(255,0,0,0.6);
      }
      
      .layer-panel-toolbar {
        padding: 12px;
        background: var(--theme-backgroundSecondary, #1e1e1e);
        border-bottom: 1px solid var(--theme-border, #333);
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      
      .layer-panel-btn {
        padding: 6px 12px;
        background: var(--theme-backgroundTertiary, #252525);
        border: 1px solid var(--theme-border, #333);
        color: var(--theme-foreground, #fff);
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }
      
      .layer-panel-btn:hover {
        background: var(--theme-hover, #2a2a2a);
        border-color: var(--theme-primary, #667eea);
      }
      
      .layer-list {
        flex: 1;
        overflow-y: auto;
        padding: 12px;
      }
      
      .layer-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        margin-bottom: 8px;
        background: var(--theme-backgroundTertiary, #252525);
        border: 1px solid var(--theme-border, #333);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .layer-item:hover {
        background: var(--theme-hover, #2a2a2a);
        border-color: var(--theme-primary, #667eea);
        transform: translateX(4px);
      }
      
      .layer-item.active {
        border-color: var(--theme-accent, #00ff88);
        background: var(--theme-active, #3a3a3a);
      }
      
      .layer-visibility {
        width: 24px;
        height: 24px;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.2s;
      }
      
      .layer-visibility:hover {
        transform: scale(1.2);
      }
      
      .layer-lock {
        width: 20px;
        height: 20px;
        background: none;
        border: none;
        cursor: pointer;
        font-size: 14px;
        opacity: 0.6;
        transition: all 0.2s;
      }
      
      .layer-lock:hover {
        opacity: 1;
        transform: scale(1.1);
      }
      
      .layer-name {
        flex: 1;
        color: var(--theme-foreground, #fff);
        font-size: 14px;
        font-weight: 500;
      }
      
      .layer-color-indicator {
        width: 20px;
        height: 20px;
        border-radius: 4px;
        border: 2px solid var(--theme-border, #333);
      }
    `;
    
    if (!document.getElementById('layer-panel-styles')) {
      style.id = 'layer-panel-styles';
      document.head.appendChild(style);
    }
  }

  /**
   * Renderiza o painel
   */
  private render(): void {
    this.container.innerHTML = '';
    
    // Header
    const header = this.createHeader();
    this.container.appendChild(header);
    
    // Toolbar
    const toolbar = this.createToolbar();
    this.container.appendChild(toolbar);
    
    // Layer list
    const list = this.createLayerList();
    this.container.appendChild(list);
  }

  /**
   * Cria header
   */
  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'layer-panel-header';
    
    const title = document.createElement('span');
    title.textContent = '📚 Layers';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'layer-panel-close';
    closeBtn.textContent = '✕';
    closeBtn.onclick = () => this.toggle();
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    return header;
  }

  /**
   * Cria toolbar
   */
  private createToolbar(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'layer-panel-toolbar';
    
    const actions = [
      { label: '👁️ All', action: () => this.showAll() },
      { label: '🚫 None', action: () => this.hideAll() },
      { label: '➕ New', action: () => this.createLayer() }
    ];
    
    actions.forEach(({ label, action }) => {
      const btn = document.createElement('button');
      btn.className = 'layer-panel-btn';
      btn.textContent = label;
      btn.onclick = action;
      toolbar.appendChild(btn);
    });
    
    return toolbar;
  }

  /**
   * Cria lista de layers
   */
  private createLayerList(): HTMLElement {
    const list = document.createElement('div');
    list.className = 'layer-list';
    
    const layers = this.layerManager.getLayers();
    const activeLayerId = this.layerManager.getActiveLayer()?.id;
    
    if (layers.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No layers yet';
      empty.style.cssText = 'text-align: center; color: #999; padding: 20px;';
      list.appendChild(empty);
    } else {
      layers.forEach(layer => {
        const item = this.createLayerItem(layer, layer.id === activeLayerId);
        list.appendChild(item);
      });
    }
    
    return list;
  }

  /**
   * Cria item de layer
   */
  private createLayerItem(layer: Layer, isActive: boolean): HTMLElement {
    const item = document.createElement('div');
    item.className = `layer-item ${isActive ? 'active' : ''}`;
    
    // Visibility toggle
    const visibilityBtn = document.createElement('button');
    visibilityBtn.className = 'layer-visibility';
    visibilityBtn.textContent = layer.visible ? '👁️' : '🚫';
    visibilityBtn.onclick = (e) => {
      e.stopPropagation();
      this.toggleVisibility(layer.id);
    };
    
    // Lock toggle
    const lockBtn = document.createElement('button');
    lockBtn.className = 'layer-lock';
    lockBtn.textContent = layer.locked ? '🔒' : '🔓';
    lockBtn.onclick = (e) => {
      e.stopPropagation();
      this.toggleLock(layer.id);
    };
    
    // Color indicator
    const colorIndicator = document.createElement('div');
    colorIndicator.className = 'layer-color-indicator';
    if (layer.color) {
      colorIndicator.style.backgroundColor = layer.color;
    }
    
    // Name
    const name = document.createElement('div');
    name.className = 'layer-name';
    name.textContent = layer.name;
    
    // Click handler
    item.onclick = () => this.setActiveLayer(layer.id);
    
    item.appendChild(visibilityBtn);
    item.appendChild(lockBtn);
    item.appendChild(colorIndicator);
    item.appendChild(name);
    
    return item;
  }

  /**
   * Toggle visibility de um layer
   */
  private toggleVisibility(layerId: string): void {
    this.layerManager.toggleLayerVisibility(layerId);
    this.render();
  }

  /**
   * Toggle lock de um layer
   */
  private toggleLock(layerId: string): void {
    this.layerManager.toggleLayerLock(layerId);
    this.render();
  }

  /**
   * Define layer ativo
   */
  private setActiveLayer(layerId: string): void {
    this.layerManager.setActiveLayer(layerId);
    this.render();
  }

  /**
   * Mostra todos os layers
   */
  private showAll(): void {
    const layers = this.layerManager.getLayers();
    layers.forEach(layer => {
      if (!layer.visible) {
        this.layerManager.setLayerVisibility(layer.id, true);
      }
    });
    this.render();
  }

  /**
   * Esconde todos os layers
   */
  private hideAll(): void {
    const layers = this.layerManager.getLayers();
    layers.forEach(layer => {
      if (layer.visible) {
        this.layerManager.setLayerVisibility(layer.id, false);
      }
    });
    this.render();
  }

  /**
   * Cria novo layer
   */
  private createLayer(): void {
    const name = prompt('Enter layer name:', `Layer ${this.layerManager.getLayers().length + 1}`);
    if (name) {
      this.layerManager.createLayer(name);
      this.render();
    }
  }

  /**
   * Mostra o painel
   */
  public show(): void {
    this.container.style.display = 'flex';
    this.isVisible = true;
  }

  /**
   * Esconde o painel
   */
  public hide(): void {
    this.container.style.display = 'none';
    this.isVisible = false;
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
   * Atualiza o painel
   */
  public refresh(): void {
    this.render();
  }

  /**
   * Limpa recursos
   */
  public dispose(): void {
    this.container.innerHTML = '';
    this.isVisible = false;
  }
}
