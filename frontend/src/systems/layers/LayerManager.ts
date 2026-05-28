import * as THREE from 'three';
import {
  ILayer,
  IFCElementType,
  LayerStats,
  LayerChangeEvent,
  LayerConfigurationDTO,
  LayerGroup,
  LayerConfig,
  BlendMode,
  LayerFilter,
  toLayerDTO,
  fromLayerDTO
} from './LayerTypes';

/**
 * LayerManager - Gerenciador principal do sistema de layers
 * Combina funcionalidades do AutoCAD (organização técnica) e Photoshop (controle visual)
 */
export class LayerManager {
  private layers: Map<string, ILayer>;
  private groups: Map<string, LayerGroup>;
  private activeLayerId: string | null = null;
  private eventListeners: Map<string, Set<(event: LayerChangeEvent) => void>>;

  // Cores padrão por tipo IFC (seguindo convenções de engenharia)
  private static readonly DEFAULT_COLORS: Map<IFCElementType | string, number> = new Map([
    [IFCElementType.WALL, 0xFFFFFF],      // Branco
    [IFCElementType.SLAB, 0xCCCCCC],      // Cinza claro
    [IFCElementType.BEAM, 0xFF6B6B],      // Vermelho claro
    [IFCElementType.COLUMN, 0x4ECDC4],    // Azul-verde
    [IFCElementType.DOOR, 0xFFE66D],      // Amarelo
    [IFCElementType.WINDOW, 0x95E1D3],    // Verde água
    [IFCElementType.ROOF, 0xF38181],      // Rosa
    [IFCElementType.STAIR, 0xAA96DA],     // Roxo
    [IFCElementType.RAILING, 0xFCACA4],   // Salmão
    [IFCElementType.FURNITURE, 0xB5EAD7], // Verde menta
    [IFCElementType.SPACE, 0xE0E0E0],     // Cinza
    [IFCElementType.OTHER, 0x808080]      // Cinza médio
  ]);

  constructor() {
    this.layers = new Map();
    this.groups = new Map();
    this.eventListeners = new Map();

    // Cria layer padrão (como layer 0 do AutoCAD)
    this.createDefaultLayer();

    console.log('✅ LayerManager iniciado');
  }

  /**
   * Cria layer padrão
   */
  private createDefaultLayer(): void {
    const defaultLayer = this.createLayer({
      name: '0 (Padrão)',
      type: IFCElementType.OTHER,
      color: 0xFFFFFF,
      visible: true,
      locked: false,
      plotable: true
    });

    this.activeLayerId = defaultLayer.id;
  }

  /**
   * Cria novo layer
   */
  public createLayer(config: LayerConfig): ILayer {
    const id = this.generateLayerId();
    const color = config.color instanceof THREE.Color 
      ? config.color 
      : new THREE.Color(config.color || 0xFFFFFF);

    const layer: ILayer = {
      id,
      name: config.name,
      type: config.type || IFCElementType.OTHER,
      category: config.category,
      color: {
        base: color,
        emissive: new THREE.Color(0x000000),
        selected: new THREE.Color(0x00ff88)
      },
      opacity: config.opacity !== undefined ? config.opacity : 1.0,
      blendMode: BlendMode.NORMAL,
      visible: config.visible !== undefined ? config.visible : true,
      frozen: false,
      locked: config.locked || false,
      isolated: false,
      plotable: config.plotable !== undefined ? config.plotable : true,
      parentId: config.parentId,
      objects: [],
      objectIds: new Set(),
      count: 0,
      created: new Date(),
      modified: new Date(),
      selectable: true,
      highlightable: true
    };

    this.layers.set(id, layer);
    
    // Se tem parent, adiciona aos children
    if (config.parentId) {
      const parent = this.groups.get(config.parentId);
      if (parent) {
        if (!parent.children) parent.children = [];
        parent.children.push(id);
      }
    }

    this.emitEvent({
      type: 'add',
      layerId: id,
      newValue: layer,
      timestamp: new Date()
    });

    console.log(`✅ Layer criado: ${layer.name} (${id})`);
    return layer;
  }

  /**
   * Cria grupo de layers
   */
  public createGroup(name: string, parentId?: string): LayerGroup {
    const id = this.generateLayerId();

    const group: LayerGroup = {
      id,
      name,
      type: 'GROUP',
      isGroup: true,
      children: [],
      color: {
        base: new THREE.Color(0xFFFFFF)
      },
      opacity: 1.0,
      blendMode: BlendMode.NORMAL,
      visible: true,
      frozen: false,
      locked: false,
      isolated: false,
      plotable: true,
      parentId,
      expanded: true,
      objects: [],
      objectIds: new Set(),
      count: 0,
      created: new Date(),
      modified: new Date(),
      selectable: false,
      highlightable: false
    };

    this.groups.set(id, group);
    this.layers.set(id, group);

    console.log(`✅ Grupo criado: ${name} (${id})`);
    return group;
  }

  /**
   * Adiciona objeto a um layer
   */
  public addObjectToLayer(object: THREE.Object3D, layerId: string): void {
    const layer = this.layers.get(layerId);
    if (!layer) {
      console.warn(`Layer ${layerId} não encontrado`);
      return;
    }

    // Adiciona objeto
    layer.objects.push(object);
    layer.objectIds.add(object.uuid);
    layer.count++;
    layer.modified = new Date();

    // Armazena referência ao layer no objeto
    object.userData.layerId = layerId;

    // Aplica propriedades visuais do layer
    this.applyLayerProperties(object, layer);

    this.emitEvent({
      type: 'modify',
      layerId,
      timestamp: new Date()
    });
  }

  /**
   * Remove objeto de um layer
   */
  public removeObjectFromLayer(object: THREE.Object3D, layerId: string): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;

    const index = layer.objects.indexOf(object);
    if (index > -1) {
      layer.objects.splice(index, 1);
      layer.objectIds.delete(object.uuid);
      layer.count--;
      layer.modified = new Date();

      delete object.userData.layerId;
    }
  }

  /**
   * Move objeto entre layers
   */
  public moveObjectToLayer(object: THREE.Object3D, targetLayerId: string): void {
    const currentLayerId = object.userData.layerId;
    
    if (currentLayerId) {
      this.removeObjectFromLayer(object, currentLayerId);
    }
    
    this.addObjectToLayer(object, targetLayerId);
  }

  /**
   * Aplica propriedades visuais do layer ao objeto
   */
  private applyLayerProperties(object: THREE.Object3D, layer: ILayer): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Visibilidade
        child.visible = layer.visible && !layer.frozen;
        
        // Opacidade
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(mat => {
            if (mat instanceof THREE.MeshStandardMaterial || 
                mat instanceof THREE.MeshBasicMaterial) {
              mat.transparent = layer.opacity < 1.0;
              mat.opacity = layer.opacity;
              mat.needsUpdate = true;
            }
          });
        }

        // ⚠️ THREE.Layers limitado a 32 canais - não usar para layers infinitos
        // Use userData.layerId para controle de layer do ArxisVR
        // child.layers só para casos específicos (gizmo/selection pass)
      }
    });
  }

  /**
   * Atualiza propriedades visuais de todos objetos do layer
   */
  private updateLayerObjects(layer: ILayer): void {
    layer.objects.forEach(obj => this.applyLayerProperties(obj, layer));
  }

  /**
   * Define visibilidade de um layer
   */
  public setLayerVisibility(layerId: string, visible: boolean): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;

    const oldValue = layer.visible;
    layer.visible = visible;
    layer.modified = new Date();

    this.updateLayerObjects(layer);

    // Se é grupo, aplica recursivamente
    if ('isGroup' in layer && layer.children) {
      layer.children.forEach(childId => {
        this.setLayerVisibility(childId, visible);
      });
    }

    this.emitEvent({
      type: 'visibility',
      layerId,
      oldValue,
      newValue: visible,
      timestamp: new Date()
    });

    console.log(`👁️ Layer ${layer.name}: ${visible ? 'visível' : 'oculto'}`);
  }

  /**
   * Congela/descongela layer (freeze/thaw)
   */
  public setLayerFrozen(layerId: string, frozen: boolean): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;

    layer.frozen = frozen;
    layer.modified = new Date();

    this.updateLayerObjects(layer);

    this.emitEvent({
      type: 'freeze',
      layerId,
      newValue: frozen,
      timestamp: new Date()
    });

    console.log(`❄️ Layer ${layer.name}: ${frozen ? 'congelado' : 'descongelado'}`);
  }

  /**
   * Bloqueia/desbloqueia layer
   */
  public setLayerLocked(layerId: string, locked: boolean): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;

    const oldValue = layer.locked;
    layer.locked = locked;
    layer.selectable = !locked;
    layer.modified = new Date();

    this.emitEvent({
      type: 'lock',
      layerId,
      oldValue,
      newValue: locked,
      timestamp: new Date()
    });

    console.log(`🔒 Layer ${layer.name}: ${locked ? 'bloqueado' : 'desbloqueado'}`);
  }

  /**
   * Define opacidade do layer
   */
  public setLayerOpacity(layerId: string, opacity: number): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;

    const oldValue = layer.opacity;
    layer.opacity = Math.max(0, Math.min(1, opacity));
    layer.modified = new Date();

    this.updateLayerObjects(layer);

    this.emitEvent({
      type: 'opacity',
      layerId,
      oldValue,
      newValue: layer.opacity,
      timestamp: new Date()
    });
  }

  /**
   * Isola layer (mostra só ele)
   */
  public isolateLayer(layerId: string): void {
    // Oculta todos
    this.layers.forEach(layer => {
      if (layer.id !== layerId) {
        this.setLayerVisibility(layer.id, false);
      }
    });

    // Mostra o isolado
    this.setLayerVisibility(layerId, true);

    const layer = this.layers.get(layerId);
    if (layer) {
      layer.isolated = true;
      console.log(`🎯 Layer isolado: ${layer.name}`);
    }
  }

  /**
   * Remove isolamento (mostra todos)
   */
  public unisolateAll(): void {
    this.layers.forEach(layer => {
      layer.isolated = false;
      this.setLayerVisibility(layer.id, true);
    });

    console.log('🌐 Todos layers visíveis');
  }

  /**
   * Obtém layer por ID
   */
  public getLayer(layerId: string): ILayer | undefined {
    return this.layers.get(layerId);
  }

  /**
   * Obtém layer de um objeto
   */
  public getObjectLayer(object: THREE.Object3D): ILayer | undefined {
    const layerId = object.userData.layerId;
    return layerId ? this.layers.get(layerId) : undefined;
  }

  /**
   * Obtém todos os layers
   */
  public getAllLayers(): ILayer[] {
    return Array.from(this.layers.values());
  }

  /**
   * Filtra layers
   */
  public filterLayers(filter: LayerFilter): ILayer[] {
    return this.getAllLayers().filter(layer => {
      if (filter.types && !filter.types.includes(layer.type as IFCElementType)) {
        return false;
      }
      if (filter.categories && layer.category && !filter.categories.includes(layer.category)) {
        return false;
      }
      if (filter.visible !== undefined && layer.visible !== filter.visible) {
        return false;
      }
      if (filter.locked !== undefined && layer.locked !== filter.locked) {
        return false;
      }
      if (filter.searchTerm) {
        const term = filter.searchTerm.toLowerCase();
        if (!layer.name.toLowerCase().includes(term) && 
            !layer.type.toLowerCase().includes(term)) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Obtém estatísticas
   */
  public getStats(): LayerStats {
    const layers = this.getAllLayers();
    const byType = new Map<IFCElementType | string, number>();

    layers.forEach(layer => {
      byType.set(layer.type, (byType.get(layer.type) || 0) + layer.count);
    });

    return {
      totalLayers: layers.length,
      visibleLayers: layers.filter(l => l.visible).length,
      frozenLayers: layers.filter(l => l.frozen).length,
      lockedLayers: layers.filter(l => l.locked).length,
      totalObjects: layers.reduce((sum, l) => sum + l.count, 0),
      visibleObjects: layers.filter(l => l.visible).reduce((sum, l) => sum + l.count, 0),
      byType
    };
  }

  /**
   * Obtém cor padrão para tipo IFC
   */
  public static getDefaultColorForType(type: IFCElementType | string): THREE.Color {
    const colorValue = LayerManager.DEFAULT_COLORS.get(type as IFCElementType) || 0x808080;
    return new THREE.Color(colorValue);
  }

  /**
   * Gera ID único para layer com crypto.randomUUID()
   * Garante IDs estáveis para export/import, colaboração, undo/redo
   */
  private generateLayerId(): string {
    // Usa crypto.randomUUID() (RFC 4122 v4) quando disponível
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return `layer-${crypto.randomUUID()}`;
    }
    
    // Fallback para ambientes sem crypto.randomUUID()
    return `layer-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Registra listener de eventos
   */
  public addEventListener(type: string, callback: (event: LayerChangeEvent) => void): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(callback);
  }

  /**
   * Remove listener de eventos
   */
  public removeEventListener(type: string, callback: (event: LayerChangeEvent) => void): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Emite evento
   */
  private emitEvent(event: LayerChangeEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }

    // Emite para listeners genéricos
    const allListeners = this.eventListeners.get('*');
    if (allListeners) {
      allListeners.forEach(callback => callback(event));
    }
  }

  /**
   * Salva configuração atual (serializada com DTO)
   */
  public saveConfiguration(): LayerConfigurationDTO {
    return {
      version: '1.0.0',
      timestampEpoch: Date.now(),
      layers: Array.from(this.layers.values()).map(toLayerDTO),
      groups: Array.from(this.groups.values()).map(toLayerDTO),
      activeLayerId: this.activeLayerId || undefined
    };
  }

  /**
   * Carrega configuração (rehidrata de DTO)
   */
  public loadConfiguration(config: LayerConfigurationDTO): void {
    // Limpa layers existentes (exceto objetos)
    this.layers.clear();
    this.groups.clear();

    // Recria layers de DTO
    config.layers.forEach(layerDTO => {
      const layerPartial = fromLayerDTO(layerDTO);
      const layer: ILayer = {
        ...layerPartial,
        objects: [], // Objetos serão reatribuídos via addObjectToLayer
        objectIds: layerPartial.objectIds
      };
      
      this.layers.set(layer.id, layer);
    });

    // Recria grupos
    config.groups.forEach(groupDTO => {
      const groupPartial = fromLayerDTO(groupDTO);
      const group: LayerGroup = {
        ...groupPartial,
        objects: [],
        objectIds: groupPartial.objectIds,
        isGroup: true,
        children: groupPartial.children || []
      };
      
      this.groups.set(group.id, group);
    });

    this.activeLayerId = config.activeLayerId || null;

    console.log('✅ LayerConfiguration carregada:', {
      layers: this.layers.size,
      groups: this.groups.size
    });
  }

  /**
   * Exporta para JSON
   */
  public exportToJSON(): string {
    const config = this.saveConfiguration();
    return JSON.stringify(config, null, 2);
  }

  /**
   * Importa de JSON
   */
  public importFromJSON(json: string): void {
    const config = JSON.parse(json) as LayerConfigurationDTO;
    this.loadConfiguration(config);
  }

  /**
   * Limpa todos os layers
   */
  public clear(): void {
    this.layers.clear();
    this.groups.clear();
    this.activeLayerId = null;
    this.createDefaultLayer();
    console.log('🧹 Layers limpos');
  }

  /**
   * Dispose
   */
  public dispose(): void {
    this.clear();
    this.eventListeners.clear();
    console.log('♻️ LayerManager disposed');
  }
}
