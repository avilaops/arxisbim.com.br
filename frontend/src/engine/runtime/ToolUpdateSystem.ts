import { EngineSystem } from '../core/EngineLoop';
import { appController } from '../../app/AppController';

/**
 * ToolUpdateSystem - Atualiza a ferramenta ativa
 */
export class ToolUpdateSystem implements EngineSystem {
  readonly name = 'ToolUpdateSystem';
  enabled = true;

  update(dt: number): void {
    const activeTool = appController.toolManager.getActiveTool();
    if (activeTool && typeof activeTool.update === 'function') {
      activeTool.update(dt);
    }
  }
}
