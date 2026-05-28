import { EngineSystem } from "../EngineLoop";
import { GPUInstancingSystem } from "../optimization/GPUInstancingSystem";
import * as THREE from "three";

export class InstancingSystem implements EngineSystem {
  name = "InstancingSystem";
  enabled = true;

  private instancingSystem: GPUInstancingSystem;
  private scene: THREE.Scene;
  private needsUpdate = false;

  constructor(scene: THREE.Scene, entityManager: any) {
    this.scene = scene;
    this.instancingSystem = new GPUInstancingSystem(entityManager);
  }

  update(dt: number): void {
    if (this.needsUpdate) {
      this.instancingSystem.updateInstances();
      this.needsUpdate = false;
    }
  }

  /**
   * Análise inicial e criação de instâncias
   */
  public initializeInstancing(): void {
    console.log('🎯 Initializing GPU Instancing...');
    this.instancingSystem.analyzeAndCreateInstances();
    this.instancingSystem.addToScene(this.scene);

    const stats = this.instancingSystem.getStats();
    console.log(`✅ GPU Instancing ready: ${stats.instancedMeshes} meshes, ${stats.totalInstances} instances, ${stats.savedDrawCalls} draw calls saved`);
  }

  /**
   * Força atualização das instâncias
   */
  public markForUpdate(): void {
    this.needsUpdate = true;
  }

  /**
   * Obtém estatísticas
   */
  public getStats() {
    return this.instancingSystem.getStats();
  }

  dispose(): void {
    this.instancingSystem.removeFromScene(this.scene);
    this.instancingSystem.dispose();
  }
}