import { EngineSystem } from "../EngineLoop";

export class ScriptingSystem implements EngineSystem {
  name = "ScriptingSystem";
  enabled = true;

  constructor(private scriptManager: any) {}

  update(dt: number): void {
    if (this.scriptManager?.update) this.scriptManager.update(dt);
  }
}