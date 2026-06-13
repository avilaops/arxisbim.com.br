/**
 * Camera (S09) — wrapper de THREE.PerspectiveCamera com serialização exata.
 *
 * É a ÚNICA coisa que toca PerspectiveCamera; consumers usam só CameraState.
 * getState→setState restaura a câmera idêntica (critério de aceite). Presets e
 * reset derivam do bounding box (CameraPresets). Sem WebGL — câmera é matemática.
 */
import * as THREE from 'three';
import {
  CAMERA_STATE_VERSION, type CameraState, type Vec3,
} from './CameraState';
import {
  presetCameraState, resetCameraState, type BoundingBoxLike, type CameraPreset,
} from './CameraPresets';

export class Camera {
  readonly three: THREE.PerspectiveCamera;
  private target = new THREE.Vector3(0, 0, 0);

  constructor(aspect = 1) {
    this.three = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);
  }

  /** Estado serializável (JSON.stringify funciona). */
  getState(): CameraState {
    const p = this.three.position;
    return {
      version: CAMERA_STATE_VERSION,
      position: [p.x, p.y, p.z],
      target: [this.target.x, this.target.y, this.target.z],
      fov: this.three.fov,
      near: this.three.near,
      far: this.three.far,
    };
  }

  /** Restaura a câmera exata a partir de um CameraState. */
  setState(s: CameraState): void {
    this.three.position.set(s.position[0], s.position[1], s.position[2]);
    this.target.set(s.target[0], s.target[1], s.target[2]);
    this.three.fov = s.fov;
    this.three.near = s.near;
    this.three.far = s.far;
    this.three.lookAt(this.target);
    this.three.updateProjectionMatrix();
  }

  getTarget(): Vec3 { return [this.target.x, this.target.y, this.target.z]; }

  setAspect(aspect: number): void {
    this.three.aspect = aspect;
    this.three.updateProjectionMatrix();
  }

  /** Enquadra o modelo no preset (deriva do bbox). */
  setPreset(bounds: BoundingBoxLike, preset: CameraPreset = 'iso'): CameraState {
    const state = presetCameraState(bounds, preset, this.three.fov);
    this.setState(state);
    return state;
  }

  /** Reset determinístico: iso recalculado do bbox atual. */
  reset(bounds: BoundingBoxLike): CameraState {
    const state = resetCameraState(bounds, this.three.fov);
    this.setState(state);
    return state;
  }
}
