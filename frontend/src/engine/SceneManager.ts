import * as THREE from 'three';
import { eventBus, EventType } from '../core';

/**
 * SceneManager - Gerenciador da cena 3D (refatorado de Scene.ts)
 * Comunica via EventBus, sem conhecimento de UI
 */
export class SceneManager {
  public scene: THREE.Scene;
  private fog: THREE.Fog;
  private gridHelper: THREE.GridHelper | null = null;
  private axesHelper: THREE.AxesHelper | null = null;
  private gridVisible: boolean = true;
  private axesVisible: boolean = true;

  constructor() {
    // Cria cena
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    // Fog para profundidade e atmosfera
    this.fog = new THREE.Fog(0x87ceeb, 50, 500);
    this.scene.fog = this.fog;
    
    // Adiciona Grid e Axes por padrão
    this.initializeHelpers();
    
    // Event listeners
    this.setupEventListeners();

    console.log('✅ SceneManager initialized');
  }
  
  /**
   * Inicializa helpers (Grid, Axes)
   */
  private initializeHelpers(): void {
    // Grid helper
    this.gridHelper = new THREE.GridHelper(100, 100, 0x888888, 0x444444);
    this.scene.add(this.gridHelper);
    
    // Axes helper
    this.axesHelper = new THREE.AxesHelper(10);
    this.scene.add(this.axesHelper);
  }
  
  /**
   * Configura event listeners
   */
  private setupEventListeners(): void {
    eventBus.on(EventType.VIEW_TOGGLE_GRID, () => {
      this.toggleGrid();
    });
    
    eventBus.on(EventType.VIEW_TOGGLE_AXES, () => {
      this.toggleAxes();
    });
  }

  /**
   * Define distância do fog
   */
  public setFogDistance(near: number, far: number): void {
    this.fog.near = near;
    this.fog.far = far;
  }

  /**
   * Define cor de fundo
   */
  public setBackgroundColor(color: number): void {
    this.scene.background = new THREE.Color(color);
    this.fog.color.set(color);
  }

  /**
   * Adiciona objeto à cena
   */
  public add(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  /**
   * Remove objeto da cena
   */
  public remove(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  /**
   * Retorna a cena THREE.js
   */
  public getScene(): THREE.Scene {
    return this.scene;
  }
  
  /**
   * Toggle Grid visibility
   */
  public toggleGrid(): void {
    this.gridVisible = !this.gridVisible;
    if (this.gridHelper) {
      this.gridHelper.visible = this.gridVisible;
    }
    console.log(`#️⃣ Grid ${this.gridVisible ? 'shown' : 'hidden'}`);
  }
  
  /**
   * Toggle Axes visibility
   */
  public toggleAxes(): void {
    this.axesVisible = !this.axesVisible;
    if (this.axesHelper) {
      this.axesHelper.visible = this.axesVisible;
    }
    console.log(`📍 Axes ${this.axesVisible ? 'shown' : 'hidden'}`);
  }
  
  /**
   * Retorna estado do grid
   */
  public isGridVisible(): boolean {
    return this.gridVisible;
  }
  
  /**
   * Retorna estado dos axes
   */
  public isAxesVisible(): boolean {
    return this.axesVisible;
  }

  /**
   * Limpa todos os recursos
   */
  public dispose(): void {
    // Limpa recursos da cena
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }
}
