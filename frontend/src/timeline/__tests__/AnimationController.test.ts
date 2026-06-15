import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnimationController } from '../AnimationController';

describe('AnimationController Unit Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    let mockTime = 0;
    // Stub performance.now to return our controlled mock time
    vi.stubGlobal('performance', {
      now: () => mockTime
    });
    // Mock requestAnimationFrame to advance our mock time and execute the callback
    const mockRaf = (cb: FrameRequestCallback) => {
      return setTimeout(() => {
        mockTime += 16;
        cb(mockTime);
      }, 16) as any;
    };
    const mockCaf = (id: any) => {
      clearTimeout(id);
    };

    vi.stubGlobal('requestAnimationFrame', mockRaf);
    vi.stubGlobal('cancelAnimationFrame', mockCaf);

    if (typeof window !== 'undefined') {
      window.requestAnimationFrame = mockRaf;
      window.cancelAnimationFrame = mockCaf as any;
      Object.defineProperty(window, 'performance', {
        writable: true,
        value: {
          now: () => mockTime
        }
      });
    }
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should initialize with correct default properties', () => {
    const controller = new AnimationController({
      totalFrames: 10,
      onFrame: () => {}
    });

    expect(controller.getCurrentFrame()).toBe(0);
    expect(controller.getIsPlaying()).toBe(false);
    expect(controller.getSpeed()).toBe(1.0);
  });

  it('should transition play and pause states correctly', () => {
    const playSpy = vi.fn();
    const pauseSpy = vi.fn();

    const controller = new AnimationController({
      totalFrames: 10,
      onFrame: () => {},
      onPlay: playSpy,
      onPause: pauseSpy
    });

    controller.play();
    expect(controller.getIsPlaying()).toBe(true);
    expect(playSpy).toHaveBeenCalledOnce();

    controller.pause();
    expect(controller.getIsPlaying()).toBe(false);
    expect(pauseSpy).toHaveBeenCalledOnce();
  });

  it('should progress frames during playback according to speed', async () => {
    const frameSpy = vi.fn();
    const controller = new AnimationController({
      totalFrames: 10,
      fps: 1, // 1 frame per simulated day
      speed: 1.0, // 1 day (1 frame) per second
      onFrame: frameSpy
    });

    controller.play();

    // Advance timer by 1100ms. Since speed is 1.0 and fps is 1, it should advance by 1 frame.
    await vi.advanceTimersByTimeAsync(1100);
    expect(controller.getCurrentFrame()).toBe(1);
    expect(frameSpy).toHaveBeenCalledWith(1);

    // Advance by another 2100ms. Should advance by 2 frames.
    await vi.advanceTimersByTimeAsync(2100);
    expect(controller.getCurrentFrame()).toBe(3);
    expect(frameSpy).toHaveBeenLastCalledWith(3);
    
    controller.pause();
  });

  it('should respect custom speed multipliers', async () => {
    const controller = new AnimationController({
      totalFrames: 20,
      fps: 1,
      speed: 5.0, // 5 days (5 frames) per second (duration = 200ms per frame)
      onFrame: () => {}
    });

    controller.play();

    // Advance by 220ms. Should advance by 1 frame.
    await vi.advanceTimersByTimeAsync(220);
    expect(controller.getCurrentFrame()).toBe(1);

    // Advance by 1100ms. Should advance by 5 frames => total 6.
    await vi.advanceTimersByTimeAsync(1100);
    expect(controller.getCurrentFrame()).toBe(6);

    controller.pause();
  });

  it('should pause playback when reaching totalFrames limit', async () => {
    const pauseSpy = vi.fn();
    const controller = new AnimationController({
      totalFrames: 5,
      fps: 1,
      speed: 1.0,
      onFrame: () => {},
      onPause: pauseSpy
    });

    controller.play();

    // Advance by 10 seconds. Should reach frame 5 and trigger pause automatically.
    await vi.advanceTimersByTimeAsync(10000);
    expect(controller.getCurrentFrame()).toBe(5);
    expect(controller.getIsPlaying()).toBe(false);
    expect(pauseSpy).toHaveBeenCalledOnce();
  });

  it('should seek to specific frames correctly', () => {
    const frameSpy = vi.fn();
    const controller = new AnimationController({
      totalFrames: 10,
      onFrame: frameSpy
    });

    controller.seek(4);
    expect(controller.getCurrentFrame()).toBe(4);
    expect(frameSpy).toHaveBeenCalledWith(4);

    // Clamp seek to bounds
    controller.seek(15);
    expect(controller.getCurrentFrame()).toBe(10);

    controller.seek(-5);
    expect(controller.getCurrentFrame()).toBe(0);
  });
});
