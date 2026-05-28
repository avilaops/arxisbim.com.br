import { EngineSystem } from '../core/EngineLoop';
import { RenderOptimizer } from '../optimization';

/**
 * RenderOptimizerSystem - Otimiza qualidade de renderização dinamicamente
 */
export class RenderOptimizerSystem implements EngineSystem {
  readonly name = 'RenderOptimizerSystem';
  enabled = true;

  constructor(private optimizer: RenderOptimizer | null) {}

  update(_dt: number): void {
    if (this.optimizer) {
      this.optimizer.update();
    }
  }

  getFPS(): number {
    return this.optimizer?.getFPS() || 60;
  }

  dispose(): void {
    // RenderOptimizer não precisa dispose específico
  }
}
