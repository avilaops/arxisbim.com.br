/**
 * CameraAnimator (S09) — transição suave entre dois CameraState.
 *
 * Spec S09: presets/voltas de câmera animam em ~300ms (evita corte brusco). A
 * INTERPOLAÇÃO é matemática pura (lerp + easing), testável headless; quem chama
 * `tick(now)` a cada frame é o loop de render. Sem Three.js, sem clock global.
 */
import { CAMERA_STATE_VERSION, type CameraState, type Vec3 } from './CameraState';

export const DEFAULT_DURATION_MS = 300;

/** easeInOutCubic — suave no início e no fim. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function lerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** Interpola dois CameraState num progresso 0..1 (com easing). */
export function interpolateCameraState(from: CameraState, to: CameraState, progress: number): CameraState {
  const t = easeInOutCubic(Math.min(1, Math.max(0, progress)));
  return {
    version: CAMERA_STATE_VERSION,
    position: lerp3(from.position, to.position, t),
    target: lerp3(from.target, to.target, t),
    fov: lerp(from.fov, to.fov, t),
    near: lerp(from.near, to.near, t),
    far: lerp(from.far, to.far, t),
    focusExpressID: to.focusExpressID,
  };
}

export class CameraAnimator {
  private from: CameraState | null = null;
  private to: CameraState | null = null;
  private startMs = 0;
  private durationMs = DEFAULT_DURATION_MS;
  private onUpdate: (s: CameraState) => void;
  private onDone?: () => void;

  constructor(onUpdate: (s: CameraState) => void) { this.onUpdate = onUpdate; }

  get isAnimating(): boolean { return this.to !== null; }

  /** Inicia uma transição. `now` = timestamp atual (ms). */
  start(from: CameraState, to: CameraState, now: number, durationMs = DEFAULT_DURATION_MS, onDone?: () => void): void {
    this.from = from; this.to = to; this.startMs = now;
    this.durationMs = Math.max(1, durationMs); this.onDone = onDone;
  }

  /** Avança a animação. Chamar a cada frame com o timestamp atual. */
  tick(now: number): void {
    if (!this.from || !this.to) return;
    const progress = (now - this.startMs) / this.durationMs;
    if (progress >= 1) {
      this.onUpdate(this.to);
      const done = this.onDone;
      this.from = this.to = null; this.onDone = undefined;
      done?.();
      return;
    }
    this.onUpdate(interpolateCameraState(this.from, this.to, progress));
  }

  cancel(): void { this.from = this.to = null; this.onDone = undefined; }
}
