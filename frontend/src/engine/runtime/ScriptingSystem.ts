import { EngineSystem } from '../core/EngineLoop';
import { scriptManager } from '../../scripting';

/**
 * ScriptingSystem - Execução de scripts em runtime
 */
export class ScriptingSystem implements EngineSystem {
  readonly name = 'ScriptingSystem';
  enabled = true;

  update(dt: number): void {
    scriptManager.update(dt);
  }

  dispose(): void {
    // ScriptManager tem seu próprio lifecycle
  }
}
