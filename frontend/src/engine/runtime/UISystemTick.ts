import { EngineSystem } from '../core/EngineLoop';
import { UI } from '../../ui/UI';

/**
 * UISystemTick - Atualiza sistema de UI
 */
export class UISystemTick implements EngineSystem {
  readonly name = 'UISystemTick';
  enabled = true;

  constructor(private ui: UI) {}

  update(_dt: number): void {
    this.ui.update();
  }

  dispose(): void {
    // UI tem seu próprio lifecycle
  }
}
