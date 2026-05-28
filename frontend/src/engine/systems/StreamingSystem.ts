import { EngineSystem } from "../EngineLoop";

export class StreamingSystem implements EngineSystem {
  name = "StreamingSystem";
  enabled = true;

  constructor(private assetManager: any) {}

  update(dt: number): void {
    if (this.assetManager?.update) this.assetManager.update(dt);
  }
}