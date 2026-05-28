import { EngineSystem } from '../core/EngineLoop';
import { assetManager } from '../streaming';

/**
 * AssetStreamingSystem - Gerencia streaming de assets com LOD
 */
export class AssetStreamingSystem implements EngineSystem {
  readonly name = 'AssetStreamingSystem';
  enabled = true;

  private currentFPS: number = 60;

  setCurrentFPS(fps: number): void {
    this.currentFPS = fps;
  }

  update(_dt: number): void {
    assetManager.update(this.currentFPS);
  }
}
