import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class CameraFollower {
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  
  public enabled = true;
  private lastTarget = new THREE.Vector3();
  private isLerping = false;
  private lerpProgress = 0;
  private lerpDuration = 45; // number of frames to complete lerp
  
  private startTarget = new THREE.Vector3();
  private endTarget = new THREE.Vector3();
  private startCameraPos = new THREE.Vector3();
  private endCameraPos = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, controls: OrbitControls) {
    this.camera = camera;
    this.controls = controls;
    this.lastTarget.copy(controls.target);
  }

  /**
   * Focuses the camera on a set of meshes by smoothly animating the controls target and camera position
   */
  public updateFocus(activeMeshes: THREE.Mesh[]): void {
    if (!this.enabled || activeMeshes.length === 0) return;

    // 1. Calculate bounding box of active meshes
    const box = new THREE.Box3();
    let valid = false;

    for (const mesh of activeMeshes) {
      if (!mesh.geometry) continue;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      
      const meshBox = mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld);
      if (!valid) {
        box.copy(meshBox);
        valid = true;
      } else {
        box.union(meshBox);
      }
    }

    if (!valid) return;

    const center = new THREE.Vector3();
    box.getCenter(center);

    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Comfort distance based on field of view and size
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraDistance = Math.abs(maxDim / Math.sin(fov / 2));
    // Clamp distance to a reasonable range
    cameraDistance = Math.max(10, Math.min(100, cameraDistance));

    // If target center has moved significantly (more than 1 unit), trigger transition
    if (center.distanceTo(this.endTarget) > 1.5) {
      this.startTarget.copy(this.controls.target);
      this.endTarget.copy(center);

      this.startCameraPos.copy(this.camera.position);
      
      // Keep the current camera viewing angle, but offset from the new target center
      const viewDirection = new THREE.Vector3()
        .subVectors(this.camera.position, this.controls.target)
        .normalize();
      
      this.endCameraPos.copy(center).addScaledVector(viewDirection, cameraDistance);
      
      this.isLerping = true;
      this.lerpProgress = 0;
    }

    // 2. Perform smooth interpolation
    if (this.isLerping) {
      this.lerpProgress += 1;
      const t = Math.min(1, this.lerpProgress / this.lerpDuration);
      
      // Smooth step easing
      const ease = t * t * (3 - 2 * t);

      this.controls.target.lerpVectors(this.startTarget, this.endTarget, ease);
      this.camera.position.lerpVectors(this.startCameraPos, this.endCameraPos, ease);
      this.camera.updateProjectionMatrix();

      if (t >= 1) {
        this.isLerping = false;
      }
    }
  }

  public reset(): void {
    this.isLerping = false;
    this.endTarget.set(0, 0, 0);
  }
}
