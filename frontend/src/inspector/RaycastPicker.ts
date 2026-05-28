/**
 * RaycastPicker - Detecta cliques em objetos 3D
 */

import * as THREE from 'three';
import { selectionService, SelectionPayload } from './SelectionService';

export class RaycastPicker {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private canvas: HTMLCanvasElement;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private enabled: boolean = true;

  constructor(scene: THREE.Scene, camera: THREE.Camera, canvas: HTMLCanvasElement) {
    this.scene = scene;
    this.camera = camera;
    this.canvas = canvas;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.setupEventListeners();
    console.log('🎯 RaycastPicker inicializado');
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('click', this.onClick.bind(this));
  }

  private onClick(event: MouseEvent): void {
    if (!this.enabled) return;

    // Calcular coordenadas normalizadas do mouse (-1 a +1)
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Atualizar raycaster
    this.raycaster.setFromCamera(this.pointer, this.camera);

    // Fazer raycast em todos os objetos da cena
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const object = hit.object;

      // Tentar identificar o objeto
      const payload = this.createSelectionPayload(object);
      selectionService.setSelected(payload);
    } else {
      // Clique no vazio - limpar seleção
      selectionService.clear();
    }
  }

  /**
   * Cria payload de seleção a partir do objeto Three.js
   */
  private createSelectionPayload(object: THREE.Object3D): SelectionPayload {
    const userData = object.userData || {};

    // Tentar identificar IFC
    const expressID = userData.expressID ?? userData.ifcId ?? userData.id;
    const modelID = userData.modelID;
    
    let type: 'ifc' | 'mesh' | 'unknown' = 'unknown';
    let id: string | number = object.uuid;

    if (expressID !== undefined) {
      type = 'ifc';
      id = expressID;
    } else if (object instanceof THREE.Mesh) {
      type = 'mesh';
      id = object.uuid;
    }

    return {
      object3D: object,
      id,
      type,
      expressID,
      modelID,
      properties: undefined // Será preenchido pelo PropertyResolver
    };
  }

  /**
   * Ativa/desativa o picker
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    this.canvas.removeEventListener('click', this.onClick.bind(this));
  }
}
