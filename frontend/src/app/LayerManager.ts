import * as THREE from 'three';
import { appState, eventBus, EventType, Layer } from '../core';

/**
 * LayerManager - Gerenciador de layers do ArxisVR
 * Sistema inspirado em AutoCAD (organização) e Photoshop (controle visual)
 */
export class LayerManager {
  private scene: THREE.Scene | null = null;

  constructor() {
    this.setupEventListeners();
    this.createDefaultLayer();
  }

  /**
   * Define a cena Three.js
   */
  public setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }

  /**
   * Cria layer padrão (layer 0 do AutoCAD)
   */
  private createDefaultLayer(): void {
    const defaultLayer: Layer = {
      id: 'layer-0',
      name: '0 (Padrão)',
      visible: true,
      locked: false,
      opacity: 1.0
    };
    
    appState.addLayer(defaultLayer);
    appState.setActiveLayerId(defaultLayer.id);
  }

  /**
   * Cria um novo layer
   */
  public createLayer(name: string, color?: string, visible: boolean = true): string {
    const id = `layer-${Date.now()}`;
    
    const layer: Layer = {
      id,
      name,
      visible,
      locked: false,
      color,
      opacity: 1.0
    };

    appState.addLayer(layer);
    
    eventBus.emit(EventType.LAYER_CREATED, { layerId: id, layerName: name });

    return id;
  }

  /**
   * Remove um layer
   */
  public removeLayer(layerId: string): void {
    const layer = appState.getLayer(layerId);
    
    if (!layer) {
      console.warn(`Layer ${layerId} not found`);
      return;
    }

    // Não permite remover layer padrão
    if (layerId === 'layer-0') {
      console.warn('Cannot remove default layer');
      return;
    }

    appState.removeLayer(layerId);
    
    eventBus.emit(EventType.LAYER_DELETED, { layerId });

    // Se era o layer ativo, ativa o padrão
    if (appState.activeLayerId === layerId) {
      appState.setActiveLayerId('layer-0');
    }
  }

  /**
   * Alterna visibilidade de um layer
   */
  public toggleLayerVisibility(layerId: string): void {
    const layer = appState.getLayer(layerId);
    
    if (!layer) {
      console.warn(`Layer ${layerId} not found`);
      return;
    }

    const newVisibility = !layer.visible;
    appState.updateLayer(layerId, { visible: newVisibility });
    
    eventBus.emit(EventType.LAYER_TOGGLED, { layerId, visible: newVisibility });

    // Atualiza visibilidade dos objetos na cena
    this.updateObjectsVisibility(layerId, newVisibility);
  }

  /**
   * Define visibilidade de um layer
   */
  public setLayerVisibility(layerId: string, visible: boolean): void {
    const layer = appState.getLayer(layerId);
    
    if (!layer) {
      console.warn(`Layer ${layerId} not found`);
      return;
    }

    appState.updateLayer(layerId, { visible });
    
    eventBus.emit(EventType.LAYER_TOGGLED, { layerId, visible });

    this.updateObjectsVisibility(layerId, visible);
  }

  /**
   * Bloqueia/desbloqueia um layer
   */
  public toggleLayerLock(layerId: string): void {
    const layer = appState.getLayer(layerId);
    
    if (!layer) {
      console.warn(`Layer ${layerId} not found`);
      return;
    }

    const newLocked = !layer.locked;
    appState.updateLayer(layerId, { locked: newLocked });
    
    eventBus.emit(EventType.LAYER_LOCKED, { layerId, locked: newLocked });
  }

  /**
   * Define o layer ativo
   */
  public setActiveLayer(layerId: string): void {
    const layer = appState.getLayer(layerId);
    
    if (!layer) {
      console.warn(`Layer ${layerId} not found`);
      return;
    }

    appState.setActiveLayerId(layerId);
  }

  /**
   * Retorna o layer ativo
   */
  public getActiveLayer(): Layer | undefined {
    const activeId = appState.activeLayerId;
    return activeId ? appState.getLayer(activeId) : undefined;
  }

  /**
   * Retorna todos os layers
   */
  public getLayers(): Layer[] {
    return Array.from(appState.layers.values());
  }

  /**
   * Retorna um layer específico
   */
  public getLayer(layerId: string): Layer | undefined {
    return appState.getLayer(layerId);
  }

  /**
   * Verifica se um layer existe
   */
  public hasLayer(layerId: string): boolean {
    return appState.getLayer(layerId) !== undefined;
  }
  
  /**
   * Limpa todos os layers (FASE 5)
   */
  public clearLayers(): void {
    const layers = this.getLayers();
    layers.forEach(layer => {
      this.removeLayer(layer.id);
    });
    appState.setActiveLayerId(null);
    console.log('🧹 All layers cleared');
  }

  /**
   * Atualiza visibilidade dos objetos na cena
   */
  private updateObjectsVisibility(layerId: string, visible: boolean): void {
    if (!this.scene) {
      return;
    }

    // Percorre todos os objetos da cena
    this.scene.traverse((object) => {
      // Verifica se o objeto pertence ao layer
      if ((object as any).userData?.layerId === layerId) {
        object.visible = visible;
      }
    });
  }

  /**
   * Associa um objeto a um layer
   */
  public assignObjectToLayer(object: THREE.Object3D, layerId: string): void {
    const layer = appState.getLayer(layerId);
    
    if (!layer) {
      console.warn(`Layer ${layerId} not found`);
      return;
    }

    // Define o layer no userData do objeto
    object.userData.layerId = layerId;
    
    // Aplica visibilidade do layer
    object.visible = layer.visible;
  }

  /**
   * Configura listeners de eventos
   */
  private setupEventListeners(): void {
    // Listeners podem ser adicionados conforme necessário
  }
  
  /**
   * Clear all layers
   */
  public clear(): void {
    const layers = Array.from(appState.layers.values()); // Copy to avoid mutation during iteration
    layers.forEach((layer: any) => {
      appState.removeLayer(layer.id);
    });
  }

  /**
   * Limpa todos os recursos
   */
  public dispose(): void {
    this.scene = null;
  }
}
