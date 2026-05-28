import { EngineSystem } from "../EngineLoop";

export class VRSystem implements EngineSystem {
  name = "VRSystem";
  enabled = true;

  constructor(private vrInputManager: any) {}

  update(dt: number): void {
    if (this.vrInputManager?.update) this.vrInputManager.update(dt);
  }
}