import * as THREE from 'three';
import { eventBus, EventType } from '../core';

/**
 * InputSystem - Sistema centralizado de input
 * 
 * Gerencia mouse, teclado e raycasting de forma global.
 * Emite eventos que as ferramentas podem escutar.
 */
export class InputSystem {
  private static instance: InputSystem;
  
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.Camera | null = null;
  private scene: THREE.Scene | null = null;
  private domElement: HTMLElement | null = null;
  
  private isEnabled: boolean = false;
  
  private constructor() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    console.log('🖱️ InputSystem initialized');
  }
  
  public static getInstance(): InputSystem {
    if (!InputSystem.instance) {
      InputSystem.instance = new InputSystem();
    }
    return InputSystem.instance;
  }
  
  /**
   * Inicializa o sistema de input
   */
  public initialize(camera: THREE.Camera, scene: THREE.Scene, domElement: HTMLElement): void {
    this.camera = camera;
    this.scene = scene;
    this.domElement = domElement;
    
    this.setupEventListeners();
    this.isEnabled = true;
    
    console.log('✅ InputSystem initialized with camera and scene');
  }
  
  /**
   * Configura event listeners
   */
  private setupEventListeners(): void {
    if (!this.domElement) return;
    
    // Mouse move
    this.domElement.addEventListener('pointermove', this.onPointerMove.bind(this));
    
    // Mouse down
    this.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));
    
    // Mouse up
    this.domElement.addEventListener('pointerup', this.onPointerUp.bind(this));
    
    // Context menu (right click)
    this.domElement.addEventListener('contextmenu', this.onContextMenu.bind(this));
  }
  
  /**
   * Handler de pointer move
   */
  private onPointerMove(event: PointerEvent): void {
    if (!this.isEnabled || !this.camera || !this.scene) return;
    
    // Atualiza posição do mouse
    this.updateMousePosition(event);
    
    // Emite evento de pointer move com raycaster
    eventBus.emit(EventType.INPUT_POINTER_MOVE, {
      event,
      raycaster: this.raycaster,
      mouse: this.mouse.clone()
    });
  }
  
  /**
   * Handler de pointer down
   */
  private onPointerDown(event: PointerEvent): void {
    if (!this.isEnabled || !this.camera || !this.scene) return;
    
    // Atualiza posição do mouse
    this.updateMousePosition(event);
    
    // Emite evento de pointer down com raycaster
    eventBus.emit(EventType.INPUT_POINTER_DOWN, {
      event,
      raycaster: this.raycaster,
      mouse: this.mouse.clone(),
      button: event.button
    });
  }
  
  /**
   * Handler de pointer up
   */
  private onPointerUp(event: PointerEvent): void {
    if (!this.isEnabled || !this.camera || !this.scene) return;
    
    // Emite evento de pointer up
    eventBus.emit(EventType.INPUT_POINTER_UP, {
      event,
      button: event.button
    });
  }
  
  /**
   * Handler de context menu
   */
  private onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    
    if (!this.isEnabled || !this.camera || !this.scene) return;
    
    // Atualiza posição do mouse
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Emite evento de context menu com raycaster
    eventBus.emit(EventType.INPUT_CONTEXT_MENU, {
      event,
      raycaster: this.raycaster,
      mouse: this.mouse.clone()
    });
  }
  
  /**
   * Atualiza posição do mouse e raycaster
   */
  private updateMousePosition(event: PointerEvent): void {
    if (!this.camera || !this.scene) return;
    
    // Normaliza coordenadas do mouse para [-1, 1]
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Atualiza raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);
  }
  
  /**
   * Retorna intersecções com a cena
   */
  public getIntersections(recursive: boolean = true): THREE.Intersection[] {
    if (!this.scene) return [];
    
    return this.raycaster.intersectObjects(this.scene.children, recursive);
  }
  
  /**
   * Retorna intersecções filtradas por condição
   */
  public getFilteredIntersections(
    filter: (obj: THREE.Object3D) => boolean,
    recursive: boolean = true
  ): THREE.Intersection[] {
    const intersections = this.getIntersections(recursive);
    return intersections.filter(intersection => filter(intersection.object));
  }
  
  /**
   * Retorna raycaster
   */
  public getRaycaster(): THREE.Raycaster {
    return this.raycaster;
  }
  
  /**
   * Retorna posição do mouse normalizada
   */
  public getMousePosition(): THREE.Vector2 {
    return this.mouse.clone();
  }
  
  /**
   * Habilita/desabilita o sistema
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
  
  /**
   * Verifica se está habilitado
   */
  public get enabled(): boolean {
    return this.isEnabled;
  }
  
  /**
   * Cleanup
   */
  public dispose(): void {
    if (this.domElement) {
      this.domElement.removeEventListener('pointermove', this.onPointerMove.bind(this));
      this.domElement.removeEventListener('pointerdown', this.onPointerDown.bind(this));
      this.domElement.removeEventListener('pointerup', this.onPointerUp.bind(this));
      this.domElement.removeEventListener('contextmenu', this.onContextMenu.bind(this));
    }
    
    this.camera = null;
    this.scene = null;
    this.domElement = null;
    this.isEnabled = false;
    
    console.log('🖱️ InputSystem disposed');
  }
}

// Export singleton instance
export const inputSystem = InputSystem.getInstance();
