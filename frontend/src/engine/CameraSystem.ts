import * as THREE from 'three';
import { eventBus, EventType } from '../core';

/**
 * CameraSystem - Sistema de câmera desacoplado
 * Gerencia câmera perspectiva e responde a eventos
 */
export class CameraSystem {
  public camera: THREE.PerspectiveCamera;

  constructor() {
    // Configura câmera com FOV realista
    this.camera = new THREE.PerspectiveCamera(
      75, // FOV similar a visão humana
      window.innerWidth / window.innerHeight,
      0.1, // Near plane - importante para escala 1:1
      1000 // Far plane - 1km de distância
    );

    // Posição inicial
    this.camera.position.set(0, 5, 10);

    // Event listener para resize
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Listener para mudanças de modo de câmera
    this.setupEventListeners();

    console.log('✅ CameraSystem initialized');
  }

  /**
   * Configura event listeners
   */
  private setupEventListeners(): void {
    eventBus.on(EventType.CAMERA_MODE_CHANGED, ({ mode }) => {
      console.log(`📷 Camera mode changed: ${mode}`);
      // Pode ajustar configurações da câmera baseado no modo
    });
    
    // View change commands
    eventBus.on(EventType.CAMERA_VIEW_CHANGE, ({ view }) => {
      this.setView(view);
    });
    
    // Focus/Frame commands
    eventBus.on(EventType.CAMERA_FOCUS_SELECTION, () => {
      console.log('🎯 Focus selection - TODO: implement');
      // TODO: Focus on selected objects
    });
    
    eventBus.on(EventType.CAMERA_FRAME_ALL, () => {
      console.log('🖼️ Frame all - TODO: implement');
      // TODO: Frame all objects in scene
    });
  }

  /**
   * Handler de resize
   */
  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Define posição da câmera
   */
  public setPosition(x: number, y: number, z: number): void {
    this.camera.position.set(x, y, z);
  }

  /**
   * Define rotação da câmera
   */
  public setRotation(x: number, y: number, z: number): void {
    this.camera.rotation.set(x, y, z);
  }

  /**
   * Retorna a câmera THREE.js
   */
  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * Define FOV
   */
  public setFOV(fov: number): void {
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }
  
  /**
   * Define view presets (Top, Front, Side, Isometric)
   */
  public setView(view: string): void {
    const distance = 20; // Distância padrão da origem
    
    switch (view.toLowerCase()) {
      case 'top':
        this.camera.position.set(0, distance, 0);
        this.camera.lookAt(0, 0, 0);
        console.log('⬆️ Top view set');
        break;
        
      case 'front':
        this.camera.position.set(0, 0, distance);
        this.camera.lookAt(0, 0, 0);
        console.log('➡️ Front view set');
        break;
        
      case 'side':
        this.camera.position.set(distance, 0, 0);
        this.camera.lookAt(0, 0, 0);
        console.log('⬅️ Side view set');
        break;
        
      case 'isometric':
        this.camera.position.set(distance, distance, distance);
        this.camera.lookAt(0, 0, 0);
        console.log('📐 Isometric view set');
        break;
        
      default:
        console.warn(`Unknown view: ${view}`);
    }
    
    eventBus.emit(EventType.CAMERA_POSITION_CHANGED, {
      position: this.camera.position.clone(),
      rotation: this.camera.rotation.clone()
    });
  }

  /**
   * Limpa todos os recursos
   */
  public dispose(): void {
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}
