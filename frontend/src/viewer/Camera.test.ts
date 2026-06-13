// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { Camera } from './Camera';
import { cameraStatesEqual, isCameraState } from './CameraState';
import type { BoundingBoxLike } from './CameraPresets';

const box: BoundingBoxLike = { min: [0, 0, 0], max: [10, 4, 8] };

describe('Camera (Three wrapper)', () => {
  it('getState → setState restaura a câmera idêntica', () => {
    const cam = new Camera(16 / 9);
    cam.setPreset(box, 'front');
    const a = cam.getState();
    expect(isCameraState(a)).toBe(true);

    // Bagunça a câmera, depois restaura.
    cam.setPreset(box, 'top');
    expect(cameraStatesEqual(cam.getState(), a)).toBe(false);

    cam.setState(a);
    expect(cameraStatesEqual(cam.getState(), a)).toBe(true);
  });

  it('getState é serializável (JSON roundtrip estável)', () => {
    const cam = new Camera();
    cam.setPreset(box, 'iso');
    const s = cam.getState();
    const round = JSON.parse(JSON.stringify(s));
    expect(round).toEqual(s);
    expect(cam.three.position.length()).toBeGreaterThan(0);
  });

  it('reset é determinístico (mesmo bbox → mesmo estado)', () => {
    const cam = new Camera();
    const r1 = cam.reset(box);
    cam.setPreset(box, 'left');
    const r2 = cam.reset(box);
    expect(cameraStatesEqual(r1, r2)).toBe(true);
  });

  it('setState aplica target via lookAt (câmera olha pro alvo)', () => {
    const cam = new Camera();
    cam.setState({ version: 1, position: [0, 0, 10], target: [0, 0, 0], fov: 50, near: 0.1, far: 100 });
    expect(cam.getTarget()).toEqual([0, 0, 0]);
    expect(cam.three.near).toBe(0.1);
  });
});
