import { EngineSystem } from "../EngineLoop";

export class ToolSystem implements EngineSystem {
  name = "ToolSystem";
  enabled = true;

  constructor(private toolManager: any) {}

  update(dt: number): void {
    const active = this.toolManager?.activeTool;
    if (active?.update) active.update(dt);
  }
}