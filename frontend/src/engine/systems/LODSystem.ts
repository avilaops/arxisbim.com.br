import { EngineSystem } from "../EngineLoop";

export class LODSystem implements EngineSystem {
  name = "LODSystem";
  enabled = true;

  constructor(private lodSystem: any) {}

  update(dt: number): void {
    if (this.lodSystem?.update) this.lodSystem.update(dt);
  }
}