import { EngineSystem } from "../EngineLoop";
import * as THREE from "three";

export class CullingSystem implements EngineSystem {
  name = "CullingSystem";
  enabled = true;
  private lastObjectCount = 0;

  constructor(
    private frustumCuller: any,
    private camera: THREE.Camera,
    private scene: THREE.Scene
  ) {}

  update(_dt: number): void {
    if (!this.frustumCuller) return;

    // Auto-detect occluders se a cena mudou
    const currentObjectCount = this.getObjectCount(this.scene);
    if (currentObjectCount !== this.lastObjectCount) {
      if (this.frustumCuller.autoDetectOccluders) {
        this.frustumCuller.autoDetectOccluders(this.scene);
      }
      this.lastObjectCount = currentObjectCount;
    }

    if (this.frustumCuller.update) this.frustumCuller.update(this.camera);
    if (this.frustumCuller.cullScene) this.frustumCuller.cullScene(this.scene);
  }

  private getObjectCount(scene: THREE.Scene): number {
    let count = 0;
    scene.traverse(() => count++);
    return count;
  }
}