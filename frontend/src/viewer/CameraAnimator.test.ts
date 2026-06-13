import { describe, it, expect, vi } from 'vitest';
import {
  CameraAnimator, interpolateCameraState, easeInOutCubic, DEFAULT_DURATION_MS,
} from './CameraAnimator';
import type { CameraState } from './CameraState';

const A: CameraState = { version: 1, position: [0, 0, 0], target: [0, 0, 0], fov: 50, near: 0.1, far: 100 };
const B: CameraState = { version: 1, position: [10, 0, 0], target: [2, 0, 0], fov: 50, near: 0.1, far: 100 };

describe('CameraAnimator', () => {
  it('easeInOutCubic: 0→0, 0.5→0.5, 1→1', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 9);
    expect(easeInOutCubic(1)).toBe(1);
  });

  it('interpola endpoints exatos e meio com easing', () => {
    expect(interpolateCameraState(A, B, 0).position).toEqual([0, 0, 0]);
    expect(interpolateCameraState(A, B, 1).position).toEqual([10, 0, 0]);
    // progress 0.5 → eased 0.5 → meio do caminho.
    expect(interpolateCameraState(A, B, 0.5).position[0]).toBeCloseTo(5, 6);
    // clamp fora de 0..1
    expect(interpolateCameraState(A, B, 2).position).toEqual([10, 0, 0]);
  });

  it('anima de A a B e termina EXATO em B dentro da duração (300ms)', () => {
    const frames: CameraState[] = [];
    const anim = new CameraAnimator((s) => frames.push(s));
    const done = vi.fn();
    anim.start(A, B, 1000, DEFAULT_DURATION_MS, done);
    expect(anim.isAnimating).toBe(true);

    anim.tick(1000);                    // t=0
    anim.tick(1000 + 150);              // meio
    anim.tick(1000 + DEFAULT_DURATION_MS); // fim (300ms)

    const last = frames[frames.length - 1];
    expect(last.position).toEqual([10, 0, 0]); // chega exato em B
    expect(last.target).toEqual([2, 0, 0]);
    expect(anim.isAnimating).toBe(false);       // terminou
    expect(done).toHaveBeenCalledOnce();
    expect(DEFAULT_DURATION_MS).toBe(300);      // critério S09
  });

  it('cancel para a animação sem chamar onDone', () => {
    const done = vi.fn();
    const anim = new CameraAnimator(() => {});
    anim.start(A, B, 0, 300, done);
    anim.cancel();
    anim.tick(500);
    expect(anim.isAnimating).toBe(false);
    expect(done).not.toHaveBeenCalled();
  });
});
