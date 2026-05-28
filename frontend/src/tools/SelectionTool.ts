import * as THREE from 'three';
import { BaseTool } from './Tool';
import { ToolType } from '../core';
import { appController } from '../app';

/**
 * SelectionTool - Ferramenta de seleção de objetos
 * Usa InputSystem via EventBus para raycasting
 */
export class SelectionTool extends BaseTool {
  public readonly name = 'Selection Tool';
  public readonly type = ToolType.SELECTION;

  private scene: THREE.Scene;
  
  // Material de highlight
  private highlightMaterial: THREE.MeshStandardMaterial;
  private highlightedObject: THREE.Object3D | null = null;
  private originalMaterial: THREE.Material | THREE.Material[] | null = null;

  constructor(scene: THREE.Scene, _camera: THREE.Camera) {
    super();
    this.scene = scene;

    // Material de highlight
    this.highlightMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.3,
      metalness: 0.3,
      roughness: 0.7,
      transparent: true,
      opacity: 0.8
    });
  }

  public activate(): void {
    super.activate();
    document.body.style.cursor = 'pointer';
  }

  public deactivate(): void {
    super.deactivate();
    document.body.style.cursor = 'default';
    this.removeHighlight();
  }

  public override onPointerDown(event: PointerEvent, raycaster: THREE.Raycaster): void {
    if (!this.isActive) return;

    // Ignora se clicou em UI
    const target = event.target as HTMLElement;
    if (this.isUIElement(target)) {
      return;
    }

    // Intersections já calculadas pelo raycaster
    const intersects = raycaster.intersectObjects(this.scene.children, true);

    // Filtra objetos selecionáveis
    const selectableIntersects = intersects.filter(intersect =>
      this.isSelectableObject(intersect.object)
    );

    if (selectableIntersects.length > 0) {
      const object = selectableIntersects[0].object;
      this.selectObject(object);
    } else {
      appController.deselectObject();
      console.log('👆 Clicked empty space - selection cleared');
    }
  }

  public override onPointerMove(_event: PointerEvent, raycaster: THREE.Raycaster): void {
    if (!this.isActive) return;

    // Intersections já calculadas pelo raycaster
    const intersects = raycaster.intersectObjects(this.scene.children, true);

    // Filtra objetos selecionáveis
    const selectableIntersects = intersects.filter(intersect =>
      this.isSelectableObject(intersect.object)
    );

    if (selectableIntersects.length > 0) {
      const object = selectableIntersects[0].object;
      this.highlightObject(object);
    } else {
      this.removeHighlight();
    }
  }

  /**
   * Seleciona um objeto
   */
  private selectObject(object: THREE.Object3D): void {
    // Usa o SelectionManager via AppController
    const expressID = (object as any).expressID;
    appController.selectObject(object, expressID);

    console.log('✅ Object selected:', object.name || object.type);
  }

  /**
   * Adiciona highlight temporário ao objeto
   */
  private highlightObject(object: THREE.Object3D): void {
    // Se já está destacando o mesmo objeto, não faz nada
    if (this.highlightedObject === object) {
      return;
    }

    // Remove highlight anterior
    this.removeHighlight();

    // Não adiciona highlight se é o objeto selecionado
    const selectedObject = appController.getSelectedObject();
    if (object === selectedObject) {
      return;
    }

    // Adiciona highlight
    if (object instanceof THREE.Mesh) {
      this.highlightedObject = object;
      this.originalMaterial = object.material;
      object.material = this.highlightMaterial;
    }
  }

  /**
   * Remove highlight
   */
  private removeHighlight(): void {
    if (this.highlightedObject && this.originalMaterial) {
      if (this.highlightedObject instanceof THREE.Mesh) {
        this.highlightedObject.material = this.originalMaterial;
      }
      this.highlightedObject = null;
      this.originalMaterial = null;
    }
  }

  /**
   * Verifica se o elemento é UI
   */
  private isUIElement(element: HTMLElement): boolean {
    return !!(
      element.closest('#toolbar') ||
      element.closest('#controls-info') ||
      element.closest('#stats-panel') ||
      element.closest('button') ||
      element.closest('#properties-panel')
    );
  }

  /**
   * Verifica se objeto é selecionável
   */
  private isSelectableObject(object: THREE.Object3D): boolean {
    // Verifica se é uma mesh
    if (!(object instanceof THREE.Mesh)) return false;

    // Ignora se não tem geometria
    if (!object.geometry) return false;

    // Ignora objetos com nomes específicos (helpers, grid, axes)
    const ignoredNames = ['GridHelper', 'AxesHelper', 'Helper', 'Grid', 'Axes', 'Line'];
    if (ignoredNames.some(name =>
      object.name.includes(name) ||
      object.type.includes(name)
    )) return false;

    // Ignora objetos invisíveis
    if (!object.visible) return false;

    return true;
  }

  public dispose(): void {
    super.dispose();
    this.removeHighlight();
    this.highlightMaterial.dispose();
  }
}
