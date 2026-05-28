import * as THREE from 'three';
import { appState, eventBus, EventType, IFCElement } from '../core';

/**
 * SelectionManager - Gerenciador de seleção de objetos
 * Controla seleção, destaque e informações de elementos IFC
 */
export class SelectionManager {
  private outlineMaterial: THREE.LineBasicMaterial;
  private selectedOutline: THREE.LineSegments | null = null;

  constructor() {
    this.outlineMaterial = new THREE.LineBasicMaterial({ 
      color: 0x00ff88,
      linewidth: 2
    });
    
    this.setupEventListeners();
  }

  /**
   * Seleciona um objeto
   */
  public selectObject(object: THREE.Object3D | null, expressID?: number): void {
    // Deselect previous
    if (appState.selectedObject) {
      this.deselectObject();
    }

    if (!object) {
      return;
    }

    // Update state
    appState.setSelectedObject(object);

    // Create outline
    this.createOutline(object);

    // Emit event
    eventBus.emit(EventType.OBJECT_SELECTED, { object, expressID });
    eventBus.emit(EventType.SELECTION_CHANGED, { selected: object });
  }

  /**
   * Deseleciona o objeto atual
   */
  public deselectObject(): void {
    const currentObject = appState.selectedObject;
    
    if (!currentObject) {
      return;
    }

    // Remove outline
    this.removeOutline();

    // Clear state
    appState.setSelectedObject(null);
    appState.setSelectedElement(null);

    // Emit events
    eventBus.emit(EventType.OBJECT_DESELECTED, { object: currentObject });
    eventBus.emit(EventType.SELECTION_CHANGED, { selected: null });
  }
  
  /**
   * Deseleciona todos os objetos (FASE 5)
   * Alias para deselectObject para compatibilidade
   */
  public deselectAll(): void {
    this.deselectObject();
    // Limpa array de selecionados
    appState.setSelectedObjects([]);
  }

  /**
   * Define informações do elemento IFC selecionado
   */
  public setSelectedElement(element: IFCElement | null): void {
    appState.setSelectedElement(element);
  }

  /**
   * Retorna o objeto selecionado
   */
  public getSelectedObject(): THREE.Object3D | null {
    return appState.selectedObject;
  }

  /**
   * Retorna informações do elemento IFC selecionado
   */
  public getSelectedElement(): IFCElement | null {
    return appState.selectedElement;
  }

  /**
   * Verifica se há algo selecionado
   */
  public hasSelection(): boolean {
    return appState.selectedObject !== null;
  }

  /**
   * Cria outline para objeto selecionado
   */
  private createOutline(object: THREE.Object3D): void {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    const geometry = object.geometry;
    const edges = new THREE.EdgesGeometry(geometry, 15);
    this.selectedOutline = new THREE.LineSegments(edges, this.outlineMaterial);
    
    // Copy transform from original object
    this.selectedOutline.position.copy(object.position);
    this.selectedOutline.rotation.copy(object.rotation);
    this.selectedOutline.scale.copy(object.scale);
    
    // Add to parent
    if (object.parent) {
      object.parent.add(this.selectedOutline);
    }
  }

  /**
   * Remove outline do objeto selecionado
   */
  private removeOutline(): void {
    if (this.selectedOutline) {
      if (this.selectedOutline.parent) {
        this.selectedOutline.parent.remove(this.selectedOutline);
      }
      this.selectedOutline.geometry.dispose();
      this.selectedOutline = null;
    }
  }

  /**
   * Configura listeners de eventos
   */
  private setupEventListeners(): void {
    // Deseleciona quando mudar de ferramenta
    eventBus.on(EventType.TOOL_CHANGED, () => {
      // Mantém seleção ao trocar de ferramenta
    });
  }

  /**
   * Limpa todos os recursos
   */
  public dispose(): void {
    this.deselectObject();
    this.outlineMaterial.dispose();
  }
}
