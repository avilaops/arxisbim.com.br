import { EngineSystem } from "../EngineLoop";

export class AISystem implements EngineSystem {
  name = "AISystem";
  enabled = true;

  constructor(private aiManager: any) {}

  update(dt: number): void {
    if (this.aiManager?.update) this.aiManager.update(dt);
  }
}
