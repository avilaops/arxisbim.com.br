import * as THREE from 'three';
import { eventBus, EventType } from '../../core';
import { VRToolkit } from './VRToolkit';

/**
 * SceneBuilder - Construtor de cenas VR
 * Permite criar e posicionar objetos diretamente no headset
 * 
 * Funcionalidades:
 * - Criação de primitivas 3D
 * - Posicionamento com snap-to-grid
 * - Preview em tempo real
 * - Undo/Redo de operações
 */
export class SceneBuilder {
private scene: THREE.Scene;
private isActive: boolean = false;
  
  // Histórico de ações (para undo/redo)
  private actionHistory: Array<{
    type: 'create' | 'delete' | 'move' | 'rotate' | 'scale';
    object: THREE.Object3D;
    data: any;
  }> = [];
  private historyIndex: number = -1;
  
  // Preview
  private previewObject: THREE.Mesh | null = null;
  private previewMaterial: THREE.MeshBasicMaterial;
  
  // Configurações
  private snapEnabled: boolean = true;
  private gridSize: number = 0.5;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    // Material de preview (transparente)
    this.previewMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.3,
      wireframe: true
    });
    
    console.log('🏗️ Scene Builder initialized');
  }
  
  /**
   * Ativa Scene Builder
   */
  public activate(): void {
    this.isActive = true;
    console.log('✅ Scene Builder activated');
  }
  
  /**
   * Desativa Scene Builder
   */
  public deactivate(): void {
    this.isActive = false;
    this.clearPreview();
    console.log('❌ Scene Builder deactivated');
  }
  
  /**
   * Cria preview de objeto antes de criar
   */
  public startPreview(geometryType: 'box' | 'sphere' | 'cylinder' | 'plane'): void {
    if (!this.isActive) return;
    
    this.clearPreview();
    
    let geometry: THREE.BufferGeometry;
    
    switch (geometryType) {
      case 'box':
        geometry = new THREE.BoxGeometry(1, 1, 1);
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(0.5, 32, 32);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
        break;
      case 'plane':
        geometry = new THREE.PlaneGeometry(1, 1);
        break;
    }
    
    this.previewObject = new THREE.Mesh(geometry, this.previewMaterial);
    this.scene.add(this.previewObject);
  }
  
  /**
   * Atualiza posição do preview
   */
  public updatePreviewPosition(position: THREE.Vector3): void {
    if (!this.previewObject) return;
    
    const finalPosition = this.snapEnabled
      ? VRToolkit.snapPositionToGrid(position, this.gridSize)
      : position;
    
    this.previewObject.position.copy(finalPosition);
  }
  
  /**
   * Confirma criação do objeto
   */
  public confirmCreation(): THREE.Mesh | null {
    if (!this.previewObject) return null;
    
    // Cria objeto real
    const geometry = this.previewObject.geometry.clone();
    const material = new THREE.MeshStandardMaterial({
      color: Math.random() * 0xffffff,
      roughness: 0.7,
      metalness: 0.3
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this.previewObject.position);
    mesh.rotation.copy(this.previewObject.rotation);
    mesh.scale.copy(this.previewObject.scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `object_${Date.now()}`;
    
    this.scene.add(mesh);
    
    // Adiciona ao histórico
    this.addToHistory({
      type: 'create',
      object: mesh,
      data: { position: mesh.position.clone() }
    });
    
    // Limpa preview
    this.clearPreview();
    
    eventBus.emit(EventType.OBJECT_CREATED, { object: mesh, type: 'mesh' });
    console.log('📦 Object created:', mesh.name);
    
    return mesh;
  }
  
  /**
   * Limpa preview
   */
  public clearPreview(): void {
    if (this.previewObject) {
      this.scene.remove(this.previewObject);
      this.previewObject.geometry.dispose();
      this.previewObject = null;
    }
  }
  
  /**
   * Clona objeto existente
   */
  public cloneObject(object: THREE.Object3D): THREE.Object3D {
    const clone = VRToolkit.cloneObject(object);
    
    // Offset para não sobrepor
    clone.position.add(new THREE.Vector3(1, 0, 1));
    
    this.scene.add(clone);
    
    this.addToHistory({
      type: 'create',
      object: clone,
      data: { original: object }
    });
    
    eventBus.emit(EventType.OBJECT_CREATED, { object: clone, type: 'clone' });
    console.log('📦 Object cloned:', clone.name);
    
    return clone;
  }
  
  /**
   * Deleta objeto
   */
  public deleteObject(object: THREE.Object3D): void {
    this.scene.remove(object);
    
    this.addToHistory({
      type: 'delete',
      object,
      data: { position: object.position.clone() }
    });
    
    eventBus.emit(EventType.OBJECT_DELETED, { object });
    console.log('🗑️ Object deleted:', object.name);
  }
  
  /**
   * Move objeto
   */
  public moveObject(object: THREE.Object3D, newPosition: THREE.Vector3): void {
    const oldPosition = object.position.clone();
    
    const finalPosition = this.snapEnabled
      ? VRToolkit.snapPositionToGrid(newPosition, this.gridSize)
      : newPosition;
    
    object.position.copy(finalPosition);
    
    this.addToHistory({
      type: 'move',
      object,
      data: { oldPosition, newPosition: finalPosition.clone() }
    });
  }
  
  /**
   * Rotaciona objeto
   */
  public rotateObject(object: THREE.Object3D, axis: 'x' | 'y' | 'z', angle: number): void {
    const oldRotation = object.rotation.clone();
    
    switch (axis) {
      case 'x':
        object.rotation.x += angle;
        break;
      case 'y':
        object.rotation.y += angle;
        break;
      case 'z':
        object.rotation.z += angle;
        break;
    }
    
    this.addToHistory({
      type: 'rotate',
      object,
      data: { oldRotation, newRotation: object.rotation.clone(), axis, angle }
    });
  }
  
  /**
   * Escala objeto
   */
  public scaleObject(object: THREE.Object3D, scaleFactor: number): void {
    const oldScale = object.scale.clone();
    
    object.scale.multiplyScalar(scaleFactor);
    
    this.addToHistory({
      type: 'scale',
      object,
      data: { oldScale, newScale: object.scale.clone(), scaleFactor }
    });
  }
  
  /**
   * Adiciona ação ao histórico
   */
  private addToHistory(action: any): void {
    // Remove ações futuras se estiver no meio do histórico
    if (this.historyIndex < this.actionHistory.length - 1) {
      this.actionHistory = this.actionHistory.slice(0, this.historyIndex + 1);
    }
    
    this.actionHistory.push(action);
    this.historyIndex++;
    
    // Limita histórico a 50 ações
    if (this.actionHistory.length > 50) {
      this.actionHistory.shift();
      this.historyIndex--;
    }
  }
  
  /**
   * Desfaz última ação
   */
  public undo(): void {
    if (this.historyIndex < 0) {
      console.log('⚠️ Nothing to undo');
      return;
    }
    
    const action = this.actionHistory[this.historyIndex];
    
    switch (action.type) {
      case 'create':
        this.scene.remove(action.object);
        break;
      case 'delete':
        this.scene.add(action.object);
        break;
      case 'move':
        action.object.position.copy(action.data.oldPosition);
        break;
      case 'rotate':
        action.object.rotation.copy(action.data.oldRotation);
        break;
      case 'scale':
        action.object.scale.copy(action.data.oldScale);
        break;
    }
    
    this.historyIndex--;
    console.log('↶ Undo:', action.type);
  }
  
  /**
   * Refaz última ação desfeita
   */
  public redo(): void {
    if (this.historyIndex >= this.actionHistory.length - 1) {
      console.log('⚠️ Nothing to redo');
      return;
    }
    
    this.historyIndex++;
    const action = this.actionHistory[this.historyIndex];
    
    switch (action.type) {
      case 'create':
        this.scene.add(action.object);
        break;
      case 'delete':
        this.scene.remove(action.object);
        break;
      case 'move':
        action.object.position.copy(action.data.newPosition);
        break;
      case 'rotate':
        action.object.rotation.copy(action.data.newRotation);
        break;
      case 'scale':
        action.object.scale.copy(action.data.newScale);
        break;
    }
    
    console.log('↷ Redo:', action.type);
  }
  
  /**
   * Toggle snap to grid
   */
  public toggleSnap(): void {
    this.snapEnabled = !this.snapEnabled;
    console.log('🔲 Snap to grid:', this.snapEnabled ? 'enabled' : 'disabled');
  }
  
  /**
   * Define tamanho do grid
   */
  public setGridSize(size: number): void {
    this.gridSize = size;
    console.log('📏 Grid size:', size);
  }
  
  /**
   * Retorna se snap está ativo
   */
  public getSnapEnabled(): boolean {
    return this.snapEnabled;
  }
  
  /**
   * Retorna tamanho do grid
   */
  public getGridSize(): number {
    return this.gridSize;
  }
  
  /**
   * Dispose
   */
  public dispose(): void {
    this.clearPreview();
    this.previewMaterial.dispose();
    this.actionHistory = [];
  }
}
