import * as THREE from 'three';
import { eventBus, EventType } from '../../core';

/**
 * VREditorCore - Núcleo do Editor VR
 * Permite construção e manipulação de cenas diretamente no headset VR
 * 
 * Revoluciona a forma de criar conteúdo 3D:
 * - Manipulação direta de objetos em 3D
 * - Feedback háptico em tempo real
 * - Workflow imersivo e intuitivo
 */
export class VREditorCore {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private isEnabled: boolean = false;
  private selectedObject: THREE.Object3D | null = null;
  
  // VR Controllers
  private controller1: THREE.XRTargetRaySpace | null = null;
  private controller2: THREE.XRTargetRaySpace | null = null;
  private controllerGrip1: THREE.XRGripSpace | null = null;
  private controllerGrip2: THREE.XRGripSpace | null = null;
  
  // Transform helpers
  private gridHelper: THREE.GridHelper;
  
  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    
    // Create grid helper
    this.gridHelper = new THREE.GridHelper(100, 100);
    this.gridHelper.visible = false;
    this.scene.add(this.gridHelper);
    
    console.log('🎮 VR Editor Core initialized');
  }
  
  /**
   * Habilita o Editor VR
   */
  public enable(): void {
    this.isEnabled = true;
    this.gridHelper.visible = true;
    
    eventBus.emit(EventType.VR_EDITOR_ENABLED, { enabled: true });
    console.log('✅ VR Editor enabled');
  }
  
  /**
   * Desabilita o Editor VR
   */
  public disable(): void {
    this.isEnabled = false;
    this.gridHelper.visible = false;
    this.clearSelection();
    
    eventBus.emit(EventType.VR_EDITOR_ENABLED, { enabled: false });
    console.log('❌ VR Editor disabled');
  }
  
  /**
   * Toggle VR Editor
   */
  public toggle(): void {
    if (this.isEnabled) {
      this.disable();
    } else {
      this.enable();
    }
  }
  
  /**
   * Configura controllers VR
   */
  public setupVRControllers(renderer: THREE.WebGLRenderer): void {
    // Controller 1 (mão direita)
    this.controller1 = renderer.xr.getController(0);
    this.controller1.addEventListener('selectstart', this.onSelectStart.bind(this));
    this.controller1.addEventListener('selectend', this.onSelectEnd.bind(this));
    this.scene.add(this.controller1);
    
    // Controller 2 (mão esquerda)
    this.controller2 = renderer.xr.getController(1);
    this.controller2.addEventListener('selectstart', this.onSelectStart.bind(this));
    this.controller2.addEventListener('selectend', this.onSelectEnd.bind(this));
    this.scene.add(this.controller2);
    
    // Controller grips (para segurar objetos)
    this.controllerGrip1 = renderer.xr.getControllerGrip(0);
    this.scene.add(this.controllerGrip1);
    
    this.controllerGrip2 = renderer.xr.getControllerGrip(1);
    this.scene.add(this.controllerGrip2);
    
    // Adiciona visual dos controllers
    this.addControllerVisuals();
    
    console.log('🎮 VR Controllers configured');
  }
  
  /**
   * Adiciona visuais dos controllers
   */
  private addControllerVisuals(): void {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3));
    
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      blending: THREE.AdditiveBlending
    });
    
    if (this.controller1) {
      const line1 = new THREE.Line(geometry, material);
      line1.name = 'line';
      line1.scale.z = 5;
      this.controller1.add(line1.clone());
    }
    
    if (this.controller2) {
      const line2 = new THREE.Line(geometry, material);
      line2.name = 'line';
      line2.scale.z = 5;
      this.controller2.add(line2.clone());
    }
  }
  
  /**
   * Evento quando controller pressiona botão
   */
  private onSelectStart(event: THREE.Event): void {
    if (!this.isEnabled) return;
    
    const controller = event.target as THREE.XRTargetRaySpace;
    
    // Raycast para detectar objetos
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    
    const raycaster = new THREE.Raycaster();
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    
    const intersects = raycaster.intersectObjects(this.scene.children, true);
    
    if (intersects.length > 0) {
      const object = intersects[0].object;
      this.selectObject(object);
    }
  }
  
  /**
   * Evento quando controller solta botão
   */
  private onSelectEnd(): void {
    if (!this.isEnabled) return;
    // Implementar lógica de soltar objeto
  }
  
  /**
   * Seleciona um objeto para edição
   */
  public selectObject(object: THREE.Object3D): void {
    this.clearSelection();
    
    this.selectedObject = object;
    
    // Cria outline visual
    if (object instanceof THREE.Mesh) {
      const outlineMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        side: THREE.BackSide
      });
      
      const outlineMesh = new THREE.Mesh(object.geometry, outlineMaterial);
      outlineMesh.scale.multiplyScalar(1.05);
      outlineMesh.name = 'outline';
      object.add(outlineMesh);
    }
    
    eventBus.emit(EventType.OBJECT_SELECTED, { object });
    console.log('📦 Object selected:', object.name || object.type);
  }
  
  /**
   * Limpa seleção atual
   */
  public clearSelection(): void {
    if (this.selectedObject) {
      // Remove outline
      const outline = this.selectedObject.getObjectByName('outline');
      if (outline) {
        this.selectedObject.remove(outline);
      }
      
      const obj = this.selectedObject;
      this.selectedObject = null;
      eventBus.emit(EventType.OBJECT_DESELECTED, { object: obj });
    }
  }
  
  /**
   * Cria um objeto primitivo
   */
  public createPrimitive(type: 'box' | 'sphere' | 'cylinder' | 'plane'): THREE.Mesh {
    let geometry: THREE.BufferGeometry;
    
    switch (type) {
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
    
    const material = new THREE.MeshStandardMaterial({
      color: Math.random() * 0xffffff,
      roughness: 0.7,
      metalness: 0.3
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `${type}_${Date.now()}`;
    
    // Posiciona na frente da câmera
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    mesh.position.copy(this.camera.position).add(cameraDirection.multiplyScalar(3));
    
    this.scene.add(mesh);
    this.selectObject(mesh);
    
    eventBus.emit(EventType.OBJECT_CREATED, { object: mesh, type });
    console.log(`📦 Created ${type}:`, mesh.name);
    
    return mesh;
  }
  
  /**
   * Deleta objeto selecionado
   */
  public deleteSelectedObject(): void {
    if (this.selectedObject) {
      this.scene.remove(this.selectedObject);
      
      eventBus.emit(EventType.OBJECT_DELETED, { object: this.selectedObject });
      console.log('🗑️ Object deleted:', this.selectedObject.name);
      
      this.selectedObject = null;
    }
  }
  
  /**
   * Muda modo de edição
   */
  public setEditMode(mode: 'select' | 'move' | 'rotate' | 'scale'): void {
    eventBus.emit(EventType.EDIT_MODE_CHANGED, { mode });
    console.log('✏️ Edit mode:', mode);
  }
  
  /**
   * Atualiza o editor VR (chamado no loop)
   */
  public update(_delta: number): void {
    if (!this.isEnabled) return;
    
    // Atualizar transformações, gizmos, etc
  }
  
  /**
   * Retorna se está habilitado
   */
  public getIsEnabled(): boolean {
    return this.isEnabled;
  }
  
  /**
   * Retorna objeto selecionado
   */
  public getSelectedObject(): THREE.Object3D | null {
    return this.selectedObject;
  }
  
  /**
   * Dispose
   */
  public dispose(): void {
    this.clearSelection();
    this.scene.remove(this.gridHelper);
    this.gridHelper.geometry.dispose();
    (this.gridHelper.material as THREE.Material).dispose();
  }
}
