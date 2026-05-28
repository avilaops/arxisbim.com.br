import * as THREE from 'three';
import { appController } from '../../app/AppController';
import { IFCElement } from '../../core/types';
import { eventBus, EventType } from '../../core';
import { DetailedIFCProperties } from '../../app/IFCPropertyService';

/**
 * RightInspector - Painel de propriedades IFC
 * Exibe informações detalhadas do objeto selecionado
 */
export class RightInspector {
  private container: HTMLElement;
  private isVisible: boolean = false;
  private detailedProperties: DetailedIFCProperties | null = null;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }
    
    this.container = container;
    this.init();
  }

  /**
   * Inicializa o inspetor
   */
  private init(): void {
    this.container.className = 'inspector-panel';
    this.applyStyles();
    this.setupEventListeners();
    this.render();
    
    console.log('✅ RightInspector initialized');
  }

  /**
   * Aplica estilos CSS
   */
  private applyStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .inspector-panel {
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: 0;
        overflow: hidden;
      }
      
      .inspector-header {
        padding: 16px;
        background: var(--theme-secondary, #764ba2);
        color: white;
        font-weight: bold;
        font-size: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .inspector-close {
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
      
      .inspector-close:hover {
        background: rgba(255,0,0,0.6);
      }
      
      .inspector-content {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
      }
      
      .inspector-empty {
        text-align: center;
        color: var(--theme-foregroundMuted, #999);
        padding: 40px 20px;
        font-size: 14px;
      }
      
      .inspector-section {
        margin-bottom: 20px;
      }
      
      .inspector-section-title {
        font-size: 14px;
        font-weight: bold;
        color: var(--theme-primary, #667eea);
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 2px solid var(--theme-border, #333);
      }
      
      .inspector-property {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid var(--theme-border, #333);
        font-size: 13px;
      }
      
      .inspector-property:last-child {
        border-bottom: none;
      }
      
      .inspector-property-key {
        color: var(--theme-foregroundSecondary, #e0e0e0);
        font-weight: 500;
      }
      
      .inspector-property-value {
        color: var(--theme-foreground, #fff);
        font-family: monospace;
        font-size: 12px;
        text-align: right;
        word-break: break-all;
      }
      
      .inspector-object-info {
        background: var(--theme-backgroundTertiary, #252525);
        padding: 12px;
        border-radius: 6px;
        margin-bottom: 16px;
      }
      
      .inspector-object-name {
        font-size: 16px;
        font-weight: bold;
        color: var(--theme-accent, #00ff88);
        margin-bottom: 8px;
      }
      
      .inspector-object-type {
        font-size: 12px;
        color: var(--theme-foregroundMuted, #999);
        text-transform: uppercase;
        letter-spacing: 1px;
      }
    `;
    
    if (!document.getElementById('inspector-panel-styles')) {
      style.id = 'inspector-panel-styles';
      document.head.appendChild(style);
    }
  }

  /**
   * Configura event listeners
   */
  private setupEventListeners(): void {
    // Listen for selection changes
    eventBus.on(EventType.SELECTION_CHANGED, ({ selected }) => {
      if (selected) {
        this.show();
        this.render();
      } else {
        this.render();
      }
    });
  }

  /**
   * Renderiza o inspetor
   */
  private async render(): Promise<void> {
    this.container.innerHTML = '';
    
    // Header
    const header = this.createHeader();
    this.container.appendChild(header);
    
    // Content (async)
    const content = await this.createContent();
    this.container.appendChild(content);
  }

  /**
   * Cria header
   */
  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'inspector-header';
    
    const title = document.createElement('span');
    title.textContent = '🔍 Properties';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'inspector-close';
    closeBtn.textContent = '✕';
    closeBtn.onclick = () => this.toggle();
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    return header;
  }

  /**
   * Cria conteúdo
   */
  private async createContent(): Promise<HTMLElement> {
    const content = document.createElement('div');
    content.className = 'inspector-content';
    
    const selectedObject = appController.selectionManager.getSelectedObject();
    const selectedElement = appController.selectionManager.getSelectedElement();
    
    if (!selectedObject) {
      const empty = document.createElement('div');
      empty.className = 'inspector-empty';
      empty.innerHTML = `
        <p>👆 Select an object to view its properties</p>
        <p style="font-size: 12px; margin-top: 8px;">Click on any object in the scene</p>
      `;
      content.appendChild(empty);
      return content;
    }
    
    // Object info
    const objectInfo = this.createObjectInfo(selectedObject);
    content.appendChild(objectInfo);
    
    // Transform section
    const transformSection = this.createTransformSection(selectedObject);
    content.appendChild(transformSection);
    
    // Geometry section
    const geometrySection = this.createGeometrySection(selectedObject);
    content.appendChild(geometrySection);
    
    // IFC Properties section (if available)
    if (selectedElement || selectedObject.userData.expressID) {
      // Tenta obter propriedades reais do IFC
      const modelID = selectedObject.userData.modelID || 0;
      const expressID = selectedObject.userData.expressID;
      
      if (expressID !== undefined) {
        try {
          // Mostra loading
          const loadingDiv = document.createElement('div');
          loadingDiv.className = 'inspector-section';
          loadingDiv.innerHTML = '<div class="inspector-section-title">🔄 Loading IFC Properties...</div>';
          content.appendChild(loadingDiv);
          
          // Obtém propriedades reais
          this.detailedProperties = await appController.ifcPropertyService.getElementProperties(modelID, expressID);
          
          // Remove loading
          content.removeChild(loadingDiv);
          
          if (this.detailedProperties) {
            // IFC Properties completas
            const ifcSection = this.createDetailedIFCSection(this.detailedProperties);
            content.appendChild(ifcSection);
          } else if (selectedElement) {
            // Fallback para dados do SelectionManager
            const ifcSection = this.createIFCSection(selectedElement);
            content.appendChild(ifcSection);
          }
        } catch (error) {
          console.error('Erro ao carregar propriedades IFC:', error);
          // Fallback
          if (selectedElement) {
            const ifcSection = this.createIFCSection(selectedElement);
            content.appendChild(ifcSection);
          }
        }
      } else if (selectedElement) {
        const ifcSection = this.createIFCSection(selectedElement);
        content.appendChild(ifcSection);
      }
    }
    
    return content;
  }

  /**
   * Cria info do objeto
   */
  private createObjectInfo(object: THREE.Object3D): HTMLElement {
    const info = document.createElement('div');
    info.className = 'inspector-object-info';
    
    const name = document.createElement('div');
    name.className = 'inspector-object-name';
    name.textContent = object.name || 'Unnamed Object';
    
    const type = document.createElement('div');
    type.className = 'inspector-object-type';
    type.textContent = object.type;
    
    info.appendChild(name);
    info.appendChild(type);
    
    return info;
  }

  /**
   * Cria seção de transform
   */
  private createTransformSection(object: THREE.Object3D): HTMLElement {
    const section = document.createElement('div');
    section.className = 'inspector-section';
    
    const title = document.createElement('div');
    title.className = 'inspector-section-title';
    title.textContent = 'Transform';
    section.appendChild(title);
    
    const properties = [
      { key: 'Position X', value: object.position.x.toFixed(3) },
      { key: 'Position Y', value: object.position.y.toFixed(3) },
      { key: 'Position Z', value: object.position.z.toFixed(3) },
      { key: 'Rotation X', value: object.rotation.x.toFixed(3) },
      { key: 'Rotation Y', value: object.rotation.y.toFixed(3) },
      { key: 'Rotation Z', value: object.rotation.z.toFixed(3) },
      { key: 'Scale X', value: object.scale.x.toFixed(3) },
      { key: 'Scale Y', value: object.scale.y.toFixed(3) },
      { key: 'Scale Z', value: object.scale.z.toFixed(3) }
    ];
    
    properties.forEach(prop => {
      section.appendChild(this.createPropertyRow(prop.key, prop.value));
    });
    
    return section;
  }

  /**
   * Cria seção de geometria
   */
  private createGeometrySection(object: THREE.Object3D): HTMLElement {
    const section = document.createElement('div');
    section.className = 'inspector-section';
    
    const title = document.createElement('div');
    title.className = 'inspector-section-title';
    title.textContent = 'Geometry';
    section.appendChild(title);
    
    if (object instanceof THREE.Mesh) {
      const geometry = object.geometry;
      
      const properties = [
        { key: 'Type', value: geometry.type },
        { key: 'Vertices', value: geometry.attributes.position?.count || 0 },
        { key: 'Faces', value: geometry.index ? geometry.index.count / 3 : 0 }
      ];
      
      properties.forEach(prop => {
        section.appendChild(this.createPropertyRow(prop.key, prop.value.toString()));
      });
    } else {
      const empty = document.createElement('div');
      empty.className = 'inspector-empty';
      empty.textContent = 'No geometry data';
      section.appendChild(empty);
    }
    
    return section;
  }

  /**
   * Cria seção de propriedades IFC detalhadas (dados reais)
   */
  private createDetailedIFCSection(detailed: DetailedIFCProperties): HTMLElement {
    const container = document.createElement('div');
    
    // Basic Properties
    const basicSection = document.createElement('div');
    basicSection.className = 'inspector-section';
    
    const basicTitle = document.createElement('div');
    basicTitle.className = 'inspector-section-title';
    basicTitle.textContent = '🔍 IFC Properties (Real Data)';
    basicSection.appendChild(basicTitle);
    
    const basicProperties = [
      { key: 'Express ID', value: detailed.basic.expressID.toString() },
      { key: 'IFC Type', value: detailed.basic.type },
      { key: 'Global ID', value: detailed.basic.globalId },
      { key: 'Name', value: detailed.basic.name }
    ];
    
    if (detailed.basic.description) {
      basicProperties.push({ key: 'Description', value: detailed.basic.description });
    }
    
    basicProperties.forEach(prop => {
      basicSection.appendChild(this.createPropertyRow(prop.key, prop.value));
    });
    
    container.appendChild(basicSection);
    
    // Geometry Properties
    if (detailed.geometry && Object.keys(detailed.geometry).length > 0) {
      const geomSection = document.createElement('div');
      geomSection.className = 'inspector-section';
      
      const geomTitle = document.createElement('div');
      geomTitle.className = 'inspector-section-title';
      geomTitle.textContent = '📐 Geometry';
      geomSection.appendChild(geomTitle);
      
      if (detailed.geometry.length !== undefined) {
        geomSection.appendChild(this.createPropertyRow('Length', `${detailed.geometry.length.toFixed(3)} m`));
      }
      if (detailed.geometry.width !== undefined) {
        geomSection.appendChild(this.createPropertyRow('Width', `${detailed.geometry.width.toFixed(3)} m`));
      }
      if (detailed.geometry.height !== undefined) {
        geomSection.appendChild(this.createPropertyRow('Height', `${detailed.geometry.height.toFixed(3)} m`));
      }
      if (detailed.geometry.area !== undefined) {
        geomSection.appendChild(this.createPropertyRow('Area', `${detailed.geometry.area.toFixed(3)} m²`));
      }
      if (detailed.geometry.volume !== undefined) {
        geomSection.appendChild(this.createPropertyRow('Volume', `${detailed.geometry.volume.toFixed(3)} m³`));
      }
      
      container.appendChild(geomSection);
    }
    
    // Material Properties
    if (detailed.material && Object.keys(detailed.material).length > 0) {
      const matSection = document.createElement('div');
      matSection.className = 'inspector-section';
      
      const matTitle = document.createElement('div');
      matTitle.className = 'inspector-section-title';
      matTitle.textContent = '🎨 Material';
      matSection.appendChild(matTitle);
      
      if (detailed.material.name) {
        matSection.appendChild(this.createPropertyRow('Material Name', detailed.material.name));
      }
      if (detailed.material.layerThickness !== undefined) {
        matSection.appendChild(this.createPropertyRow('Thickness', `${detailed.material.layerThickness.toFixed(3)} m`));
      }
      
      container.appendChild(matSection);
    }
    
    // Additional Properties
    if (detailed.properties.length > 0) {
      const propsSection = document.createElement('div');
      propsSection.className = 'inspector-section';
      
      const propsTitle = document.createElement('div');
      propsTitle.className = 'inspector-section-title';
      propsTitle.textContent = '📋 Additional Properties';
      propsSection.appendChild(propsTitle);
      
      // Mostra até 20 propriedades
      detailed.properties.slice(0, 20).forEach(prop => {
        const valueStr = typeof prop.value === 'number' 
          ? prop.value.toFixed(3) 
          : prop.value.toString();
        propsSection.appendChild(this.createPropertyRow(prop.name, valueStr));
      });
      
      if (detailed.properties.length > 20) {
        const more = document.createElement('div');
        more.className = 'inspector-property';
        more.style.fontStyle = 'italic';
        more.style.color = 'var(--theme-foregroundMuted, #999)';
        more.textContent = `... and ${detailed.properties.length - 20} more properties`;
        propsSection.appendChild(more);
      }
      
      container.appendChild(propsSection);
    }
    
    // Property Sets
    if (detailed.propertySets.length > 0) {
      const psetsSection = document.createElement('div');
      psetsSection.className = 'inspector-section';
      
      const psetsTitle = document.createElement('div');
      psetsTitle.className = 'inspector-section-title';
      psetsTitle.textContent = '📦 Property Sets';
      psetsSection.appendChild(psetsTitle);
      
      detailed.propertySets.forEach(pset => {
        const psetName = pset.Name?.value || 'Unnamed PropertySet';
        psetsSection.appendChild(this.createPropertyRow('Property Set', psetName));
      });
      
      container.appendChild(psetsSection);
    }
    
    return container;
  }

  /**
   * Cria seção de propriedades IFC
   */
  private createIFCSection(element: IFCElement): HTMLElement {
    const section = document.createElement('div');
    section.className = 'inspector-section';
    
    const title = document.createElement('div');
    title.className = 'inspector-section-title';
    title.textContent = 'IFC Properties';
    section.appendChild(title);
    
    const properties = [
      { key: 'Express ID', value: element.expressID },
      { key: 'Type', value: element.type },
      { key: 'Global ID', value: element.globalId },
      { key: 'Name', value: element.name }
    ];
    
    properties.forEach(prop => {
      section.appendChild(this.createPropertyRow(prop.key, prop.value.toString()));
    });
    
    // Additional IFC properties
    if (element.properties && element.properties.length > 0) {
      element.properties.forEach(prop => {
        section.appendChild(this.createPropertyRow(prop.name, prop.value.toString()));
      });
    }
    
    return section;
  }

  /**
   * Cria linha de propriedade
   */
  private createPropertyRow(key: string, value: string): HTMLElement {
    const row = document.createElement('div');
    row.className = 'inspector-property';
    
    const keySpan = document.createElement('span');
    keySpan.className = 'inspector-property-key';
    keySpan.textContent = key;
    
    const valueSpan = document.createElement('span');
    valueSpan.className = 'inspector-property-value';
    valueSpan.textContent = value;
    
    row.appendChild(keySpan);
    row.appendChild(valueSpan);
    
    return row;
  }

  /**
   * Mostra o inspetor
   */
  public show(): void {
    this.container.style.display = 'flex';
    this.isVisible = true;
  }

  /**
   * Esconde o inspetor
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
   * Define visibilidade (compat)
   */
  public setVisible(visible: boolean): void {
    if (visible) {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * Atualiza o inspetor
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
