/**
 * ClippingPlane (S10) — corte transversal navegável (THREE.Plane) + serialização.
 *
 * A serialização (normal+constant) é pura/testável; o THREE.Plane é detalhe de
 * render. O slider da UI move `constant` ao longo da normal. Estado entra no
 * VisibilityState (cenários S12 restauram o corte).
 */
import * as THREE from 'three';
import type { VisibilityState } from './VisibilityState';

export type ClippingPlaneState = NonNullable<VisibilityState['clippingPlane']>;

export class ClippingPlane {
  readonly plane: THREE.Plane;

  constructor(normal: [number, number, number] = [0, -1, 0], constant = 0) {
    this.plane = new THREE.Plane(new THREE.Vector3(...normal).normalize(), constant);
  }

  /** Move o corte ao longo da normal (slider da UI). */
  setConstant(constant: number): void { this.plane.constant = constant; }

  setNormal(normal: [number, number, number]): void {
    this.plane.normal.set(normal[0], normal[1], normal[2]).normalize();
  }

  getState(): ClippingPlaneState {
    const n = this.plane.normal;
    return { normal: [n.x, n.y, n.z], constant: this.plane.constant };
  }

  setState(s: ClippingPlaneState | null): void {
    if (!s) return;
    this.setNormal(s.normal);
    this.plane.constant = s.constant;
  }

  static fromState(s: ClippingPlaneState): ClippingPlane {
    return new ClippingPlane(s.normal, s.constant);
  }
}
