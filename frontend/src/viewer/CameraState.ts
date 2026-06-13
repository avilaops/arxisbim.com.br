/**
 * CameraState (S09) — estado de câmera SERIALIZÁVEL e versionado.
 *
 * Razão de existir: navegação 3D vira estado persistente e reproduzível. Reusado
 * em S12 (Scenario.camera_state), S31 (PresentationKeyframe), S26 (camera_sync).
 * NUNCA referenciar o objeto Three.js direto — só este DTO atravessa as fronteiras.
 * `version` protege contra projectionMode/clippingPlane/cameraType futuros.
 */
export const CAMERA_STATE_VERSION = 1 as const;

export type Vec3 = [number, number, number];

export interface CameraState {
  version: typeof CAMERA_STATE_VERSION;
  position: Vec3;
  target: Vec3;
  fov: number;
  near: number;
  far: number;
  /** Restaura "vista da fachada" mesmo se coords absolutas mudarem entre versões. */
  focusExpressID?: number;
}

/** Estado de visualização (prepara S12/S18/S31 — não persistir ainda). */
export interface ViewerState {
  camera: CameraState;
  selectedExpressId?: number;
}

/** Valida e normaliza um CameraState desserializado (defensivo contra JSON externo). */
export function isCameraState(v: unknown): v is CameraState {
  if (!v || typeof v !== 'object') return false;
  const c = v as Record<string, unknown>;
  return (
    c.version === CAMERA_STATE_VERSION &&
    isVec3(c.position) && isVec3(c.target) &&
    typeof c.fov === 'number' && typeof c.near === 'number' && typeof c.far === 'number'
  );
}

function isVec3(v: unknown): v is Vec3 {
  return Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n));
}

/** Igualdade aproximada (tolerância) — útil p/ testes e detecção de "câmera mudou". */
export function cameraStatesEqual(a: CameraState, b: CameraState, eps = 1e-6): boolean {
  const v = (x: Vec3, y: Vec3) => x.every((n, i) => Math.abs(n - y[i]) <= eps);
  return v(a.position, b.position) && v(a.target, b.target) &&
    Math.abs(a.fov - b.fov) <= eps && Math.abs(a.near - b.near) <= eps && Math.abs(a.far - b.far) <= eps;
}
