import { describe, it, expect, vi } from 'vitest';
import { CAMERA_STATE_VERSION, isCameraState, cameraStatesEqual, type CameraState } from './CameraState';
import { presetCameraState, resetCameraState, boundsRadius, type BoundingBoxLike } from './CameraPresets';
import { Selection } from './Selection';

const unitBox: BoundingBoxLike = { min: [-1, -1, -1], max: [1, 1, 1] };

describe('CameraState', () => {
  it('isCameraState valida forma + versão; JSON.stringify roundtrip', () => {
    const s = presetCameraState(unitBox, 'iso');
    const round = JSON.parse(JSON.stringify(s)) as CameraState;
    expect(isCameraState(round)).toBe(true);
    expect(cameraStatesEqual(s, round)).toBe(true);
    expect(isCameraState({ version: 2, position: [0, 0, 0], target: [0, 0, 0], fov: 1, near: 1, far: 1 })).toBe(false);
    expect(isCameraState({ position: [0, 0, 0] })).toBe(false);
  });
});

describe('CameraPresets', () => {
  it('preset deriva do bbox: target = centro, câmera afastada, version fixa', () => {
    const s = presetCameraState(unitBox, 'front');
    expect(s.version).toBe(CAMERA_STATE_VERSION);
    expect(s.target).toEqual([0, 0, 0]);
    // front → câmera em +Z, afastada o suficiente p/ enquadrar.
    expect(s.position[2]).toBeGreaterThan(0);
    expect(Math.abs(s.position[0])).toBeLessThan(1e-9);
    expect(s.near).toBeGreaterThan(0);
    expect(s.far).toBeGreaterThan(s.near);
  });

  it('ESCALA: modelo maior → câmera proporcionalmente mais longe', () => {
    const small = presetCameraState({ min: [0, 0, 0], max: [1, 1, 1] }, 'iso');
    const big = presetCameraState({ min: [0, 0, 0], max: [400, 400, 400] }, 'iso');
    const dSmall = Math.hypot(...small.position.map((p, i) => p - small.target[i]) as [number, number, number]);
    const dBig = Math.hypot(...big.position.map((p, i) => p - big.target[i]) as [number, number, number]);
    expect(dBig).toBeGreaterThan(dSmall * 100); // ~400x maior
  });

  it('top olha de cima; iso é diagonal; reset = iso', () => {
    const top = presetCameraState(unitBox, 'top');
    expect(top.position[1]).toBeGreaterThan(0);
    expect(Math.abs(top.position[0])).toBeLessThan(1e-9);
    const iso = presetCameraState(unitBox, 'iso');
    expect(iso.position.every((c) => Math.abs(c) > 1e-6)).toBe(true);
    expect(resetCameraState(unitBox)).toEqual(iso);
  });

  it('boundsRadius = meia-diagonal', () => {
    expect(boundsRadius({ min: [0, 0, 0], max: [2, 0, 0] })).toBeCloseTo(1, 9);
  });
});

describe('Selection', () => {
  it('select/clear/toggle disparam onSelect; hover não mexe na seleção', () => {
    const sel = new Selection();
    const onSel = vi.fn(); const onHov = vi.fn();
    sel.onSelect(onSel); sel.onHover(onHov);

    sel.select(42);
    expect(sel.getSelected()).toBe(42);
    sel.select(42); // idempotente
    expect(onSel).toHaveBeenCalledTimes(1);

    sel.hover(7);
    expect(sel.getHovered()).toBe(7);
    expect(sel.getSelected()).toBe(42); // hover não altera seleção
    expect(onHov).toHaveBeenCalledWith(7);

    sel.toggle(42); // clicar no selecionado → limpa
    expect(sel.getSelected()).toBeNull();
    expect(onSel).toHaveBeenLastCalledWith(null);
  });

  it('unsubscribe para de receber', () => {
    const sel = new Selection();
    const cb = vi.fn();
    const off = sel.onSelect(cb);
    sel.select(1); off(); sel.select(2);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
