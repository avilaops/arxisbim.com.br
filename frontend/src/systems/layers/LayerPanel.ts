import { LayerManager } from './LayerManager';
import { ILayer } from './LayerTypes';

/**
 * LayerPanel - Interface visual para controle de layers
 * Interface inspirada no AutoCAD e Photoshop
 */
export class LayerPanel {
  private layerManager: LayerManager;
  private panel: HTMLElement | null = null;
  private isVisible: boolean = false;
  private searchTerm: string = '';
  private selectedLayerId: string | null = null; // Track selected layer
  private colorPickerOverlay: HTMLElement | null = null; // Color picker UI

  constructor(layerManager: LayerManager) {
    this.layerManager = layerManager;
    this.createPanel();
    this.setupEventListeners();
  }

  /**
   * Cria o painel HTML
   */
  private createPanel(): void {
    // Remove painel existente se houver
    const existing = document.getElementById('layer-panel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'layer-panel';
    panel.style.cssText = `
      position: fixed;
      right: 20px;
      top: 80px;
      width: 320px;
      max-height: calc(100vh - 120px);
      background: rgba(0, 0, 0, 0.95);
      border: 2px solid #00ff88;
      border-radius: 12px;
      color: white;
      font-family: 'Segoe UI', system-ui, sans-serif;
      z-index: 9999;
      display: none;
      flex-direction: column;
      backdrop-filter: blur(10px);
      box-shadow: 0 10px 40px rgba(0, 255, 136, 0.3);
      overflow: hidden;
    `;

    // Header
    const header = this.createHeader();
    panel.appendChild(header);

    // Toolbar
    const toolbar = this.createToolbar();
    panel.appendChild(toolbar);

    // Search
    const search = this.createSearch();
    panel.appendChild(search);

    // Stats
    const stats = this.createStats();
    panel.appendChild(stats);

    // Layers list (scrollable)
    const listContainer = document.createElement('div');
    listContainer.id = 'layers-list-container';
    listContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 10px;
      min-height: 200px;
    `;
    panel.appendChild(listContainer);

    // Footer
    const footer = this.createFooter();
    panel.appendChild(footer);

    document.body.appendChild(panel);
    this.panel = panel;
  }

  /**
   * Cria header do painel
   */
  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 15px;
      background: rgba(0, 255, 136, 0.1);
      border-bottom: 1px solid #00ff88;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const title = document.createElement('h3');
    title.textContent = '📚 Layers';
    title.style.cssText = `
      margin: 0;
      font-size: 18px;
      color: #00ff88;
      font-weight: bold;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✖';
    closeBtn.style.cssText = `
      background: transparent;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      border-radius: 5px;
    `;
    closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,0,0,0.3)';
    closeBtn.onmouseout = () => closeBtn.style.background = 'transparent';
    closeBtn.onclick = () => this.hide();

    header.appendChild(title);
    header.appendChild(closeBtn);

    return header;
  }

  /**
   * Cria toolbar com ações rápidas
   */
  private createToolbar(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
      padding: 10px;
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
      background: rgba(255,255,255,0.03);
      border-bottom: 1px solid rgba(255,255,255,0.1);
    `;

    const buttons = [
      { icon: '👁️', label: 'Todos', action: () => this.showAll() },
      { icon: '🚫', label: 'Nenhum', action: () => this.hideAll() },
      { icon: '🔄', label: 'Inverter', action: () => this.invertVisibility() },
      { icon: '🎯', label: 'Isolar', action: () => this.isolateSelected() },
      { icon: '❄️', label: 'Freeze', action: () => this.freezeInactive() },
      { icon: '🔒', label: 'Lock', action: () => this.lockAll() }
    ];

    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.innerHTML = `${btn.icon}<br><span style="font-size: 9px;">${btn.label}</span>`;
      button.style.cssText = `
        flex: 1;
        min-width: 45px;
        padding: 8px 4px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 5px;
        color: white;
        cursor: pointer;
        font-size: 12px;
        line-height: 1.2;
      `;
      button.onmouseover = () => button.style.background = 'rgba(0,255,136,0.2)';
      button.onmouseout = () => button.style.background = 'rgba(255,255,255,0.05)';
      button.onclick = btn.action;

      toolbar.appendChild(button);
    });

    return toolbar;
  }

  /**
   * Cria campo de busca
   */
  private createSearch(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      padding: 10px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = '🔍 Buscar layers...';
    input.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 5px;
      color: white;
      font-size: 13px;
      box-sizing: border-box;
    `;
    input.oninput = (e) => {
      this.searchTerm = (e.target as HTMLInputElement).value;
      this.refreshLayersList();
    };

    container.appendChild(input);
    return container;
  }

  /**
   * Cria seção de estatísticas
   */
  private createStats(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'layer-stats';
    container.style.cssText = `
      padding: 10px;
      background: rgba(0,255,136,0.05);
      border-bottom: 1px solid rgba(255,255,255,0.1);
      font-size: 11px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px;
    `;

    this.updateStats();

    return container;
  }

  /**
   * Atualiza estatísticas
   */
  private updateStats(): void {
    const container = document.getElementById('layer-stats');
    if (!container) return;

    const stats = this.layerManager.getStats();

    container.innerHTML = `
      <div>📊 Total: ${stats.totalLayers}</div>
      <div>👁️ Visíveis: ${stats.visibleLayers}</div>
      <div>🔒 Bloqueados: ${stats.lockedLayers}</div>
      <div>❄️ Congelados: ${stats.frozenLayers}</div>
      <div>📦 Objetos: ${stats.totalObjects}</div>
      <div>✅ Renderizados: ${stats.visibleObjects}</div>
    `;
  }

  /**
   * Cria footer com botões principais
   */
  private createFooter(): HTMLElement {
    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 10px;
      border-top: 1px solid #00ff88;
      display: flex;
      gap: 5px;
    `;

    const newLayerBtn = document.createElement('button');
    newLayerBtn.textContent = '➕ Novo Layer';
    newLayerBtn.style.cssText = this.getButtonStyle('#00ff88');
    newLayerBtn.onclick = () => this.createNewLayer();

    const exportBtn = document.createElement('button');
    exportBtn.textContent = '💾 Exportar';
    exportBtn.style.cssText = this.getButtonStyle('#4ECDC4');
    exportBtn.onclick = () => this.exportConfiguration();

    footer.appendChild(newLayerBtn);
    footer.appendChild(exportBtn);

    return footer;
  }

  /**
   * Estilo padrão de botão
   */
  private getButtonStyle(color: string): string {
    return `
      flex: 1;
      padding: 10px;
      background: ${color};
      border: none;
      border-radius: 5px;
      color: black;
      font-weight: bold;
      cursor: pointer;
      font-size: 12px;
    `;
  }

  /**
   * Atualiza lista de layers
   */
  public refreshLayersList(): void {
    const container = document.getElementById('layers-list-container');
    if (!container) return;

    container.innerHTML = '';

    let layers = this.layerManager.getAllLayers();

    // Filtra por busca
    if (this.searchTerm) {
      layers = layers.filter(layer => 
        layer.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        layer.type.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }

    // Agrupa por categoria
    const byCategory = new Map<string, ILayer[]>();
    layers.forEach(layer => {
      const category = layer.category || 'Sem Categoria';
      if (!byCategory.has(category)) {
        byCategory.set(category, []);
      }
      byCategory.get(category)!.push(layer);
    });

    // Renderiza categorias
    byCategory.forEach((layersInCategory, category) => {
      // Header de categoria
      const categoryHeader = document.createElement('div');
      categoryHeader.style.cssText = `
        padding: 8px;
        background: rgba(0,255,136,0.1);
        margin: 5px 0;
        border-radius: 5px;
        font-weight: bold;
        font-size: 12px;
        color: #00ff88;
      `;
      categoryHeader.textContent = `📁 ${category} (${layersInCategory.length})`;
      container.appendChild(categoryHeader);

      // Layers da categoria
      layersInCategory.forEach(layer => {
        const layerItem = this.createLayerItem(layer);
        container.appendChild(layerItem);
      });
    });

    this.updateStats();
  }

  /**
   * Cria item de layer na lista
   */
  private createLayerItem(layer: ILayer): HTMLElement {
    const item = document.createElement('div');
    const isSelected = this.selectedLayerId === layer.id;
    item.setAttribute('data-layer-id', layer.id); // Add data attribute for selection
    item.style.cssText = `
      padding: 8px;
      margin: 2px 0;
      background: ${isSelected ? 'rgba(0, 255, 136, 0.2)' : (layer.visible ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.3)')};
      border-left: 4px solid ${layer.color.base.getStyle()};
      border-radius: 3px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      cursor: pointer;
      outline: ${isSelected ? '2px solid #00ff88' : 'none'};
    `;


    // Cor indicator
    const colorBox = document.createElement('div');
    colorBox.style.cssText = `
      width: 20px;
      height: 20px;
      background: ${layer.color.base.getStyle()};
      border: 1px solid white;
      border-radius: 3px;
      cursor: pointer;
    `;
    colorBox.onclick = (e) => {
      e.stopPropagation();
      this.changeLayerColor(layer);
    };

    // Visibility toggle
    const visibilityBtn = document.createElement('button');
    visibilityBtn.textContent = layer.visible ? '👁️' : '🚫';
    visibilityBtn.style.cssText = `
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 16px;
      padding: 0;
    `;
    visibilityBtn.onclick = (e) => {
      e.stopPropagation();
      this.layerManager.setLayerVisibility(layer.id, !layer.visible);
      this.refreshLayersList();
    };

    // Lock toggle
    const lockBtn = document.createElement('button');
    lockBtn.textContent = layer.locked ? '🔒' : '🔓';
    lockBtn.style.cssText = `
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 14px;
      padding: 0;
    `;
    lockBtn.onclick = (e) => {
      e.stopPropagation();
      this.layerManager.setLayerLocked(layer.id, !layer.locked);
      this.refreshLayersList();
    };

    // Name and info
    const info = document.createElement('div');
    info.style.cssText = 'flex: 1;';
    info.innerHTML = `
      <div style="font-weight: bold;">${layer.name}</div>
      <div style="font-size: 10px; opacity: 0.7;">${layer.type} • ${layer.count} obj</div>
    `;

    // Opacity slider
    const opacityContainer = document.createElement('div');
    opacityContainer.style.cssText = 'display: flex; align-items: center; gap: 5px;';
    
    const opacityLabel = document.createElement('span');
    opacityLabel.textContent = Math.round(layer.opacity * 100) + '%';
    opacityLabel.style.cssText = 'font-size: 10px; min-width: 30px;';

    const opacitySlider = document.createElement('input');
    opacitySlider.type = 'range';
    opacitySlider.min = '0';
    opacitySlider.max = '100';
    opacitySlider.value = String(layer.opacity * 100);
    opacitySlider.style.cssText = 'width: 60px;';
    opacitySlider.oninput = (e) => {
      const value = parseInt((e.target as HTMLInputElement).value) / 100;
      this.layerManager.setLayerOpacity(layer.id, value);
      opacityLabel.textContent = Math.round(value * 100) + '%';
    };

    opacityContainer.appendChild(opacitySlider);
    opacityContainer.appendChild(opacityLabel);

    item.appendChild(colorBox);
    item.appendChild(visibilityBtn);
    item.appendChild(lockBtn);
    item.appendChild(info);
    item.appendChild(opacityContainer);

    // Click no item para selecionar
    item.onclick = () => this.selectLayer(layer);

    return item;
  }

  /**
   * Ações rápidas
   */
  private showAll(): void {
    this.layerManager.getAllLayers().forEach(layer => {
      this.layerManager.setLayerVisibility(layer.id, true);
    });
    this.refreshLayersList();
  }

  private hideAll(): void {
    this.layerManager.getAllLayers().forEach(layer => {
      this.layerManager.setLayerVisibility(layer.id, false);
    });
    this.refreshLayersList();
  }

  private invertVisibility(): void {
    this.layerManager.getAllLayers().forEach(layer => {
      this.layerManager.setLayerVisibility(layer.id, !layer.visible);
    });
    this.refreshLayersList();
  }

  private isolateSelected(): void {
    if (!this.selectedLayerId) {
      console.warn('Nenhum layer selecionado para isolar');
      return;
    }
    
    // Hide all layers except selected
    this.layerManager.getAllLayers().forEach(layer => {
      this.layerManager.setLayerVisibility(layer.id, layer.id === this.selectedLayerId);
    });
    this.refreshLayersList();
  }

  private freezeInactive(): void {
    this.layerManager.getAllLayers().forEach(layer => {
      if (!layer.visible) {
        this.layerManager.setLayerFrozen(layer.id, true);
      }
    });
    this.refreshLayersList();
  }

  private lockAll(): void {
    this.layerManager.getAllLayers().forEach(layer => {
      this.layerManager.setLayerLocked(layer.id, true);
    });
    this.refreshLayersList();
  }

  private selectLayer(layer: ILayer): void {
    console.log('Layer selecionado:', layer.name);
    
    // Update selected layer
    this.selectedLayerId = layer.id;
    
    // Highlight selected layer in UI
    const container = document.getElementById('layers-list-container');
    if (container) {
      const allItems = container.querySelectorAll('[data-layer-id]');
      allItems.forEach(item => {
        const itemElement = item as HTMLElement;
        const isSelected = itemElement.dataset.layerId === layer.id;
        itemElement.style.background = isSelected 
          ? 'rgba(0, 255, 136, 0.2)' 
          : (layer.visible ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.3)');
        itemElement.style.outline = isSelected ? '2px solid #00ff88' : 'none';
      });
    }
    
    // Emit custom event for other components
    const event = new CustomEvent('layer-selected', { detail: { layer } });
    document.dispatchEvent(event);
  }

  private changeLayerColor(layer: ILayer): void {
    console.log('Mudar cor do layer:', layer.name);
    
    // Remove existing color picker if any
    if (this.colorPickerOverlay) {
      this.colorPickerOverlay.remove();
      this.colorPickerOverlay = null;
      return; // Toggle off
    }
    
    // Create color picker overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.7);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    const picker = document.createElement('div');
    picker.style.cssText = `
      background: #1a1a1a;
      border: 2px solid #00ff88;
      border-radius: 12px;
      padding: 20px;
      max-width: 400px;
      box-shadow: 0 10px 40px rgba(0, 255, 136, 0.5);
    `;
    
    picker.innerHTML = `
      <h3 style="margin: 0 0 15px 0; color: #00ff88;">🎨 Selecionar Cor - ${layer.name}</h3>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; color: white; font-size: 12px;">Cor Base:</label>
        <input 
          type="color" 
          id="color-picker-input" 
          value="${layer.color.base.getHexString()}" 
          style="width: 100%; height: 50px; border: none; border-radius: 5px; cursor: pointer;"
        />
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; color: white; font-size: 12px;">Pré-definidas:</label>
        <div id="preset-colors" style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 5px;">
          ${this.getPresetColors().map(color => `
            <div 
              class="preset-color" 
              data-color="${color}"
              style="
                width: 40px;
                height: 40px;
                background: ${color};
                border: 2px solid white;
                border-radius: 5px;
                cursor: pointer;
              "
            ></div>
          `).join('')}
        </div>
      </div>
      
      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <button id="color-picker-apply" style="
          flex: 1;
          padding: 10px;
          background: #00ff88;
          border: none;
          border-radius: 5px;
          color: black;
          font-weight: bold;
          cursor: pointer;
        ">✓ Aplicar</button>
        <button id="color-picker-cancel" style="
          flex: 1;
          padding: 10px;
          background: #ff4444;
          border: none;
          border-radius: 5px;
          color: white;
          font-weight: bold;
          cursor: pointer;
        ">✖ Cancelar</button>
      </div>
    `;
    
    overlay.appendChild(picker);
    document.body.appendChild(overlay);
    this.colorPickerOverlay = overlay;
    
    // Event listeners for color picker
    const colorInput = picker.querySelector('#color-picker-input') as HTMLInputElement;
    const presetColors = picker.querySelectorAll('.preset-color');
    const applyBtn = picker.querySelector('#color-picker-apply');
    const cancelBtn = picker.querySelector('#color-picker-cancel');
    
    // Preset color click
    presetColors.forEach(preset => {
      const presetElement = preset as HTMLElement;
      presetElement.onclick = () => {
        const color = presetElement.dataset.color!;
        colorInput.value = color;
        // Visual feedback
        presetColors.forEach(p => (p as HTMLElement).style.borderColor = 'white');
        presetElement.style.borderColor = '#00ff88';
      };
    });
    
    // Apply button
    applyBtn?.addEventListener('click', () => {
      const newColor = colorInput.value;
      // Convert hex to THREE.Color
      const threeColor = new (window as any).THREE.Color(newColor);
      this.layerManager.setLayerColor(layer.id, threeColor);
      this.closeColorPicker();
      this.refreshLayersList();
    });
    
    // Cancel button
    cancelBtn?.addEventListener('click', () => {
      this.closeColorPicker();
    });
    
    // Click outside to close
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        this.closeColorPicker();
      }
    };
  }
  
  private getPresetColors(): string[] {
    return [
      '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
      '#FF00FF', '#00FFFF', '#FFA500', '#800080',
      '#008000', '#000080', '#808080', '#C0C0C0',
      '#FFFFFF', '#000000', '#A52A2A', '#FF69B4'
    ];
  }
  
  private closeColorPicker(): void {
    if (this.colorPickerOverlay) {
      this.colorPickerOverlay.remove();
      this.colorPickerOverlay = null;
    }
  }

  private createNewLayer(): void {
    const name = prompt('Nome do novo layer:');
    if (name) {
      this.layerManager.createLayer({ name });
      this.refreshLayersList();
    }
  }

  private exportConfiguration(): void {
    const json = this.layerManager.exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `layers_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Event listeners
   */
  private setupEventListeners(): void {
    this.layerManager.addEventListener('*', () => {
      if (this.isVisible) {
        this.refreshLayersList();
      }
    });
  }

  /**
   * Mostra painel
   */
  public show(): void {
    if (this.panel) {
      this.panel.style.display = 'flex';
      this.isVisible = true;
      this.refreshLayersList();
    }
  }

  /**
   * Oculta painel
   */
  public hide(): void {
    if (this.panel) {
      this.panel.style.display = 'none';
      this.isVisible = false;
    }
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
   * Dispose
   */
  public dispose(): void {
    this.closeColorPicker();
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
  }
}
