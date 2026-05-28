import { EngineSystem } from '../EngineLoop';
import { FrustumCuller } from '../optimization';
import * as THREE from 'three';

/**
 * FrustumCullingSystem - Culling de objetos fora do frustum
 */
export class FrustumCullingSystem implements EngineSystem {
  readonly name = 'FrustumCullingSystem';
  enabled = true;

  constructor(
    private culler: FrustumCuller | null,
    private scene: THREE.Scene
  ) {}

  update(_dt: number): void {
    if (this.culler) {
      this.culler.update();
      this.culler.cullScene(this.scene);
    }
  }

  dispose(): void {
    // FrustumCuller não precisa dispose específico
  }
}
