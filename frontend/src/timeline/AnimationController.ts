export interface AnimationControllerOptions {
  totalFrames: number;
  fps?: number; // frames per simulated day
  speed?: number; // multiplier (e.g. 1 means 1 day per second)
  onFrame: (frameIndex: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
}

export class AnimationController {
  private totalFrames: number;
  private fps: number;
  private speed: number;
  
  private currentFrame = 0;
  private isPlaying = false;
  private lastTime = 0;
  private accumulatedTime = 0;
  private animationId: number | null = null;

  private onFrameCallback: (frameIndex: number) => void;
  private onPlayCallback?: () => void;
  private onPauseCallback?: () => void;

  constructor(options: AnimationControllerOptions) {
    this.totalFrames = options.totalFrames;
    this.fps = options.fps ?? 1;
    this.speed = options.speed ?? 1.0;
    this.onFrameCallback = options.onFrame;
    this.onPlayCallback = options.onPlay;
    this.onPauseCallback = options.onPause;
  }

  public play(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastTime = performance.now();
    this.accumulatedTime = 0;

    if (this.currentFrame >= this.totalFrames) {
      this.currentFrame = 0;
    }

    if (this.onPlayCallback) this.onPlayCallback();

    const loop = (now: number) => {
      if (!this.isPlaying) return;

      const deltaMs = now - this.lastTime;
      this.lastTime = now;

      // 1x speed means 1 day (1 frame if fps=1) per second.
      // So at speed S, we want to advance S days per second => S * fps frames per second.
      // Frame duration in ms = 1000 / (speed * fps)
      const frameDurationMs = 1000 / (this.speed * this.fps);

      this.accumulatedTime += deltaMs;

      let frameChanged = false;
      while (this.accumulatedTime >= frameDurationMs) {
        this.currentFrame++;
        this.accumulatedTime -= frameDurationMs;
        frameChanged = true;

        if (this.currentFrame >= this.totalFrames) {
          this.currentFrame = this.totalFrames;
          this.pause();
          break;
        }
      }

      if (frameChanged) {
        this.onFrameCallback(this.currentFrame);
      }

      this.animationId = requestAnimationFrame(loop);
    };

    this.animationId = requestAnimationFrame(loop);
  }

  public pause(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.onPauseCallback) this.onPauseCallback();
  }

  public seek(frameIndex: number): void {
    this.currentFrame = Math.max(0, Math.min(this.totalFrames, frameIndex));
    this.accumulatedTime = 0;
    this.onFrameCallback(this.currentFrame);
  }

  public setSpeed(speed: number): void {
    this.speed = Math.max(0.1, Math.min(100, speed));
    this.accumulatedTime = 0;
  }

  public getSpeed(): number {
    return this.speed;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentFrame(): number {
    return this.currentFrame;
  }

  public setTotalFrames(totalFrames: number): void {
    this.totalFrames = totalFrames;
    if (this.currentFrame > this.totalFrames) {
      this.currentFrame = this.totalFrames;
    }
  }

  public destroy(): void {
    this.pause();
  }
}
