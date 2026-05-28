import { EngineSystem } from '../core/EngineLoop';
import { aiManager } from '../../ai';

/**
 * AISystem - Sistema de Inteligência Artificial
 */
export class AISystem implements EngineSystem {
  readonly name = 'AISystem';
  enabled = true;

  update(dt: number): void {
    aiManager.update(dt);
  }

  dispose(): void {
    // AIManager tem seu próprio lifecycle
  }
}
