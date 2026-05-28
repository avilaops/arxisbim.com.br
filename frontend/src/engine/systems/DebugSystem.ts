import { EngineSystem } from "../EngineLoop";

export class DebugSystem implements EngineSystem {
  name = "DebugSystem";
  enabled = true;

  private fps = 0;
  private acc = 0;
  private count = 0;
  private statsPanel!: HTMLDivElement;

  constructor(private appController: any) {
    this.createStatsPanel();
  }

  update(dt: number): void {
    this.acc += dt;
    this.count += 1;

    if (this.acc >= 0.5) {
      this.fps = Math.round(this.count / this.acc);
      this.acc = 0;
      this.count = 0;

      if (this.appController?.updateFPS) this.appController.updateFPS(this.fps);

      const el = document.getElementById("fps-counter");
      if (el) el.textContent = `${this.fps} FPS`;

      // Update stats panel
      if (this.statsPanel) {
        this.statsPanel.textContent = `FPS: ${this.fps}`;
      }
    }
  }

  private createStatsPanel(): void {
    this.statsPanel = document.createElement("div");
    this.statsPanel.style.position = "fixed";
    this.statsPanel.style.top = "10px";
    this.statsPanel.style.right = "10px";
    this.statsPanel.style.background = "rgba(0, 0, 0, 0.7)";
    this.statsPanel.style.color = "#0f0";
    this.statsPanel.style.padding = "8px";
    this.statsPanel.style.fontFamily = "monospace";
    this.statsPanel.style.fontSize = "12px";
    this.statsPanel.style.zIndex = "10000";
    this.statsPanel.style.borderRadius = "4px";
    document.body.appendChild(this.statsPanel);
  }
}
