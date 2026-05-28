import * as THREE from 'three';
import { eventBus, EventType, appState } from '../core';

/**
 * ScriptAPI - API pública para scripts
 * Acesso controlado ao ArxisVR
 * 
 * Features:
 * - Scene manipulation
 * - Object creation/modification
 * - Event listening
 * - State access
 * - Tool activation
 * - Network communication (futuro)
 */
export class ScriptAPI {
private scene: THREE.Scene;
private camera: THREE.Camera;
  
  constructor(scene: THREE.Scene, camera: THREE.Camera, _renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
  }
  
  // ========== SCENE ==========
  
  /**
   * Adiciona objeto à cena
   */
  public addObject(object: THREE.Object3D): void {
    this.scene.add(object);
    console.log(`➕ Object added: ${object.name || 'unnamed'}`);
  }
  
  /**
   * Remove objeto da cena
   */
  public removeObject(object: THREE.Object3D): void {
    this.scene.remove(object);
    console.log(`➖ Object removed: ${object.name || 'unnamed'}`);
  }
  
  /**
   * Encontra objeto por nome
   */
  public findObjectByName(name: string): THREE.Object3D | undefined {
    return this.scene.getObjectByName(name);
  }
  
  /**
   * Retorna todos os objetos
   */
  public getAllObjects(): THREE.Object3D[] {
    const objects: THREE.Object3D[] = [];
    this.scene.traverse((obj) => objects.push(obj));
    return objects;
  }
  
  // ========== PRIMITIVES ==========
  
  /**
   * Cria cubo
   */
  public createCube(size: number = 1, color: number = 0x44aa88): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(size, size, size);
    const material = new THREE.MeshStandardMaterial({ color });
    return new THREE.Mesh(geometry, material);
  }
  
  /**
   * Cria esfera
   */
  public createSphere(radius: number = 1, color: number = 0x44aa88): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color });
    return new THREE.Mesh(geometry, material);
  }
  
  /**
   * Cria cilindro
   */
  public createCylinder(radius: number = 1, height: number = 2, color: number = 0x44aa88): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 32);
    const material = new THREE.MeshStandardMaterial({ color });
    return new THREE.Mesh(geometry, material);
  }
  
  /**
   * Cria plano
   */
  public createPlane(width: number = 1, height: number = 1, color: number = 0x44aa88): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide });
    return new THREE.Mesh(geometry, material);
  }
  
  // ========== LIGHTS ==========
  
  /**
   * Adiciona luz direcional
   */
  public addDirectionalLight(color: number = 0xffffff, intensity: number = 1): THREE.DirectionalLight {
    const light = new THREE.DirectionalLight(color, intensity);
    this.scene.add(light);
    return light;
  }
  
  /**
   * Adiciona luz pontual
   */
  public addPointLight(color: number = 0xffffff, intensity: number = 1, distance: number = 0): THREE.PointLight {
    const light = new THREE.PointLight(color, intensity, distance);
    this.scene.add(light);
    return light;
  }
  
  /**
   * Adiciona luz ambiente
   */
  public addAmbientLight(color: number = 0xffffff, intensity: number = 0.5): THREE.AmbientLight {
    const light = new THREE.AmbientLight(color, intensity);
    this.scene.add(light);
    return light;
  }
  
  // ========== CAMERA ==========
  
  /**
   * Define posição da câmera
   */
  public setCameraPosition(x: number, y: number, z: number): void {
    this.camera.position.set(x, y, z);
  }
  
  /**
   * Faz câmera olhar para ponto
   */
  public setCameraLookAt(x: number, y: number, z: number): void {
    this.camera.lookAt(x, y, z);
  }
  
  /**
   * Retorna posição da câmera
   */
  public getCameraPosition(): THREE.Vector3 {
    return this.camera.position.clone();
  }
  
  // ========== EVENTS ==========
  
  /**
   * Registra evento
   */
  public on(event: string, _callback: (data: any) => void): void {
    // Em produção, usar sistema de eventos apropriado
    console.log(`📡 Event listener registered: ${event}`);
  }
  
  /**
   * Emite evento
   */
  public emit(event: string, data: any): void {
    eventBus.emit(EventType.TOOL_ACTIVATED, {
      toolType: `Script:${event}`,
      ...data
    });
  }
  
  // ========== STATE ==========
  
  /**
   * Acessa AppState
   */
  public getState(): typeof appState {
    return appState;
  }
  
  /**
   * Define valor no state
   */
  public setState(key: string, value: any): void {
    (appState as any)[key] = value;
  }
  
  // ========== UTILS ==========
  
  /**
   * Log no console
   */
  public log(...args: any[]): void {
    console.log('[Script]', ...args);
  }
  
  /**
   * Aguarda tempo
   */
  public async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  
  /**
   * Retorna tempo atual
   */
  public getTime(): number {
    return Date.now();
  }
  
  /**
   * Gera número aleatório
   */
  public random(min: number = 0, max: number = 1): number {
    return Math.random() * (max - min) + min;
  }
  
  // ========== MATH ==========
  
  /**
   * Cria vetor 3D
   */
  public vector3(x: number, y: number, z: number): THREE.Vector3 {
    return new THREE.Vector3(x, y, z);
  }
  
  /**
   * Cria cor
   */
  public color(hex: number): THREE.Color {
    return new THREE.Color(hex);
  }
  
  /**
   * Converte graus para radianos
   */
  public degToRad(degrees: number): number {
    return THREE.MathUtils.degToRad(degrees);
  }
  
  /**
   * Converte radianos para graus
   */
  public radToDeg(radians: number): number {
    return THREE.MathUtils.radToDeg(radians);
  }
  
  // ========== ANIMATION ==========
  
  /**
   * Anima objeto (simplificado)
   */
  public animate(object: THREE.Object3D, property: string, from: number, to: number, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const value = from + (to - from) * progress;
        (object as any)[property] = value;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      animate();
    });
  }
}
