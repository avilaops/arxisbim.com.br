// src/engine/Time.ts
export class Time {
  public dt = 0;
  private last = performance.now();

  tick(): number {
    const now = performance.now();
    const raw = (now - this.last) / 1000;
    this.last = now;

    // clamp para evitar spikes (tab change etc.)
    this.dt = Math.min(Math.max(raw, 0), 0.1);
    return this.dt;
  }
}
