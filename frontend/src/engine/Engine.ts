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

    const loop = () => {
      if (!this.running) return;

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
