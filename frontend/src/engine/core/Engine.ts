import { ISystem, EngineContext } from "./types";
import { Time } from "./Time";

export class Engine {
  private readonly systems: ISystem[] = [];
  private readonly time = new Time();
  private running = false;

  constructor(private readonly ctx: EngineContext) {}

  addSystem(system: ISystem): this {
    this.systems.push(system);
    return this;
  }

  init(): void {
    for (const s of this.systems) if (s.enabled && s.init) s.init(this.ctx);
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    for (const s of this.systems) if (s.enabled && s.start) s.start(this.ctx);

    // Throttle to 30 FPS when tab is hidden (background) to avoid blocking the event loop.
    // This keeps async callbacks (WebSocket, fetch, setTimeout) responsive even when the
    // tab is not focused.
    const TARGET_INTERVAL_BG = 1000 / 30; // 30 fps background cap
    let lastFrameTime = 0;

    const loop = (now: number) => {
      if (!this.running) return;

      const isHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
      if (isHidden && now - lastFrameTime < TARGET_INTERVAL_BG) {
        requestAnimationFrame(loop);
        return;
      }
      lastFrameTime = now;

      const dt = this.time.tick();

      for (const s of this.systems) if (s.enabled && s.update) s.update(this.ctx, dt);
      for (const s of this.systems) if (s.enabled && s.lateUpdate) s.lateUpdate(this.ctx, dt);

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
  }

  dispose(): void {
    this.stop();
    for (const s of this.systems) if (s.dispose) s.dispose(this.ctx);
  }

  getTime(): Time {
    return this.time;
  }
}
