import { EngineSystem } from "../EngineLoop";

export class MultiplayerSystem implements EngineSystem {
  name = "MultiplayerSystem";
  enabled = true;

  constructor(private multiplayerSync: any) {}

  update(dt: number): void {
    if (this.multiplayerSync?.update) this.multiplayerSync.update(dt);
  }
}