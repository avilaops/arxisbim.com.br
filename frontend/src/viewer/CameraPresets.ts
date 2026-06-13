/**
 * CameraPresets (S09) — calcula CameraState a partir do BOUNDING BOX do modelo.
 *
 * Spec S09: presets NUNCA coordenadas fixas. Casa 20m ≠ hospital 400m ≠ ponte 2km.
 * Tudo derivado do bbox → funciona em qualquer escala. Lógica pura (sem Three.js),
 * testável headless. `reset` recalcula do bbox ATUAL (determinístico, sem ambiguidade).
 */
import { CAMERA_STATE_VERSION, type CameraState, type Vec3 } from './CameraState';

export type CameraPreset = 'front' | 'back' | 'top' | 'bottom' | 'left' | 'right' | 'iso';

export interface BoundingBoxLike {
  min: Vec3;
  max: Vec3;
}

const DEFAULT_FOV = 50;
const MARGIN = 1.3; // folga p/ o modelo não encostar nas bordas

// Direção da câmera (do alvo p/ a câmera), em coordenadas Y-up.
const DIRECTIONS: Record<CameraPreset, Vec3> = {
  front: [0, 0, 1],
  back: [0, 0, -1],
  right: [1, 0, 0],
  left: [-1, 0, 0],
  top: [0, 1, 0],
  bottom: [0, -1, 0],
  iso: norm([1, 0.8, 1]),
};

function norm(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function center(b: BoundingBoxLike): Vec3 {
  return [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2];
}

/** Raio da esfera que envolve o bbox (meia-diagonal). */
export function boundsRadius(b: BoundingBoxLike): number {
  const dx = b.max[0] - b.min[0], dy = b.max[1] - b.min[1], dz = b.max[2] - b.min[2];
  return Math.hypot(dx, dy, dz) / 2;
}

/**
 * CameraState p/ enquadrar o modelo no preset dado. Distância calculada p/ a
 * esfera caber no FOV vertical (com margem). near/far derivam do raio → sem
 * z-fighting nem clipping em qualquer escala.
 */
export function presetCameraState(
  bounds: BoundingBoxLike,
  preset: CameraPreset = 'iso',
  fov = DEFAULT_FOV,
): CameraState {
  const c = center(bounds);
  const radius = Math.max(boundsRadius(bounds), 1e-4);
  const halfFov = (fov * Math.PI) / 180 / 2;
  const distance = (radius / Math.sin(halfFov)) * MARGIN;
  const dir = DIRECTIONS[preset];
  const position: Vec3 = [c[0] + dir[0] * distance, c[1] + dir[1] * distance, c[2] + dir[2] * distance];

  return {
    version: CAMERA_STATE_VERSION,
    position,
    target: c,
    fov,
    near: Math.max(radius / 1000, 1e-3),
    far: radius * 1000 + distance,
  };
}

/** Reset = preset iso recalculado do bbox atual (determinístico). */
export function resetCameraState(bounds: BoundingBoxLike, fov = DEFAULT_FOV): CameraState {
  return presetCameraState(bounds, 'iso', fov);
}
