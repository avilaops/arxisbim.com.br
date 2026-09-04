/**
 * Sincroniza duas cameras de OrbitControls (S18).
 *
 * Aproveitado quase inteiro de `src/viewer/CameraSync.ts`, que estava orfao
 * (fora do build) desde a arquitetura antiga. Nao tem DOM nem React: so fala
 * com OrbitControls, entao serviu sem reescrita. O que mudou: comentarios em
 * portugues e o `dispose()`, que faltava e o React precisa no cleanup.
 *
 * A guarda `isSyncing` e o que impede o laco infinito: mover A dispara
 * 'change' em B, que dispararia 'change' em A de novo.
 */
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

  /** Solta os listeners. O React chama isto no cleanup do efeito. */
  public dispose(): void {
    this.disable();
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
