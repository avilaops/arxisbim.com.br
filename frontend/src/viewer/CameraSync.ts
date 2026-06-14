import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class CameraSync {
  private controlsA: OrbitControls;
  private controlsB: OrbitControls;
  private isSyncing = false;
  private isLocked = true;

  private onAChangeBind: () => void;
  private onBChangeBind: () => void;

  constructor(controlsA: OrbitControls, controlsB: OrbitControls) {
    this.controlsA = controlsA;
    this.controlsB = controlsB;

    this.onAChangeBind = this.onAChange.bind(this);
    this.onBChangeBind = this.onBChange.bind(this);

    this.enable();
  }

  public enable(): void {
    this.controlsA.addEventListener('change', this.onAChangeBind);
    this.controlsB.addEventListener('change', this.onBChangeBind);
  }

  public disable(): void {
    this.controlsA.removeEventListener('change', this.onAChangeBind);
    this.controlsB.removeEventListener('change', this.onBChangeBind);
  }

  public setLocked(locked: boolean): void {
    this.isLocked = locked;
    if (locked) {
      this.sync(this.controlsA, this.controlsB);
    }
  }

  public getLocked(): boolean {
    return this.isLocked;
  }

  private onAChange(): void {
    if (!this.isLocked || this.isSyncing) return;
    this.sync(this.controlsA, this.controlsB);
  }

  private onBChange(): void {
    if (!this.isLocked || this.isSyncing) return;
    this.sync(this.controlsB, this.controlsA);
  }

  private sync(source: OrbitControls, target: OrbitControls): void {
    this.isSyncing = true;
    
    // Copy camera position & rotation
    target.object.position.copy(source.object.position);
    target.object.rotation.copy(source.object.rotation);
    
    // Copy controls target
    target.target.copy(source.target);
    
    // Update target controls
    target.update();
    
    this.isSyncing = false;
  }
}
