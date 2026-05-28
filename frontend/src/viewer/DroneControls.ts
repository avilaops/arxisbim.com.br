import * as THREE from 'three';

/**
 * DroneControls - navegação aérea BIM com WASD horizontal.
 *
 * Movimento:
 *   WASD: deslocamento horizontal relativo à câmera
 *   Space/C: subir/descer
 *   Shift/Ctrl: rápido/devagar
 *   Mouse/Setas: olhar livre
 */
export class DroneControls {
  private camera: THREE.Camera;
  private domElement: HTMLElement;

  private keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    rotateUp: false,
    rotateDown: false,
    rotateLeft: false,
    rotateRight: false,
    speedBoost: false,
    speedSlow: false,
  };

  private velocity = new THREE.Vector3();
  private targetVelocity = new THREE.Vector3();
  private euler = new THREE.Euler(0, 0, 0, 'YXZ');

  public enabled = false;
  public pointerLockEnabled = false;
  public moveSpeed = 8.0;
  public moveSpeedBoost = 3.0;
  public moveSpeedSlow = 0.35;
  public rotateSpeed = 1.7;
  public mouseSensitivity = 0.002;
  public damping = 10;

  private readonly keyDownHandler = (event: KeyboardEvent) => this.onKeyDown(event);
  private readonly keyUpHandler = (event: KeyboardEvent) => this.onKeyUp(event);
  private readonly mouseMoveHandler = (event: MouseEvent) => this.onMouseMove(event);
  private readonly pointerLockChangeHandler = () => this.onPointerLockChange();
  private readonly clickHandler = () => {
    if (this.enabled && !this.pointerLockEnabled) {
      this.requestPointerLock();
    }
  };

  constructor(camera: THREE.Camera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.setupEventListeners();
    console.log('🚁 Drone Controls initialized');
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', this.keyDownHandler);
    document.addEventListener('keyup', this.keyUpHandler);
    document.addEventListener('mousemove', this.mouseMoveHandler);
    document.addEventListener('pointerlockchange', this.pointerLockChangeHandler);
    this.domElement.addEventListener('click', this.clickHandler);
  }

  private isTypingInInput(): boolean {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    const tagName = activeElement.tagName.toLowerCase();
    return tagName === 'input' || tagName === 'textarea' || (activeElement as HTMLElement).isContentEditable;
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (!this.enabled || this.isTypingInInput()) return;

    switch (event.code) {
      case 'KeyW':
        this.keys.forward = true;
        break;
      case 'KeyS':
        this.keys.backward = true;
        break;
      case 'KeyA':
        this.keys.left = true;
        break;
      case 'KeyD':
        this.keys.right = true;
        break;
      case 'Space':
        this.keys.up = true;
        event.preventDefault();
        break;
      case 'KeyC':
        this.keys.down = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.speedBoost = true;
        break;
      case 'ControlLeft':
      case 'ControlRight':
        this.keys.speedSlow = true;
        break;
      case 'ArrowUp':
        this.keys.rotateUp = true;
        event.preventDefault();
        break;
      case 'ArrowDown':
        this.keys.rotateDown = true;
        event.preventDefault();
        break;
      case 'ArrowLeft':
        this.keys.rotateLeft = true;
        event.preventDefault();
        break;
      case 'ArrowRight':
        this.keys.rotateRight = true;
        event.preventDefault();
        break;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case 'KeyW':
        this.keys.forward = false;
        break;
      case 'KeyS':
        this.keys.backward = false;
        break;
      case 'KeyA':
        this.keys.left = false;
        break;
      case 'KeyD':
        this.keys.right = false;
        break;
      case 'Space':
        this.keys.up = false;
        break;
      case 'KeyC':
        this.keys.down = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.speedBoost = false;
        break;
      case 'ControlLeft':
      case 'ControlRight':
        this.keys.speedSlow = false;
        break;
      case 'ArrowUp':
        this.keys.rotateUp = false;
        break;
      case 'ArrowDown':
        this.keys.rotateDown = false;
        break;
      case 'ArrowLeft':
        this.keys.rotateLeft = false;
        break;
      case 'ArrowRight':
        this.keys.rotateRight = false;
        break;
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.enabled || !this.pointerLockEnabled) return;

    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y -= (event.movementX || 0) * this.mouseSensitivity;
    this.euler.x -= (event.movementY || 0) * this.mouseSensitivity;
    this.clampPitch();
    this.camera.quaternion.setFromEuler(this.euler);
  }

  private onPointerLockChange(): void {
    this.pointerLockEnabled = document.pointerLockElement === this.domElement;
  }

  private requestPointerLock(): void {
    try {
      const pointerLockRequest = this.domElement.requestPointerLock();
      if (pointerLockRequest && typeof pointerLockRequest.catch === 'function') {
        pointerLockRequest.catch((error) => {
          console.warn('⚠️ Pointer lock indisponível no modo drone:', error?.message || error);
        });
      }
    } catch (error) {
      console.warn('⚠️ Pointer lock indisponível no modo drone:', error);
    }
  }

  private clampPitch(): void {
    const maxPitch = (88 * Math.PI) / 180;
    this.euler.x = Math.max(-maxPitch, Math.min(maxPitch, this.euler.x));
  }

  public update(delta: number): void {
    if (!this.enabled) return;

    this.updateRotation(delta);
    this.updateMovement(delta);
  }

  private updateRotation(delta: number): void {
    const rotationAmount = this.rotateSpeed * delta;
    this.euler.setFromQuaternion(this.camera.quaternion);

    let changed = false;
    if (this.keys.rotateUp) {
      this.euler.x += rotationAmount;
      changed = true;
    }
    if (this.keys.rotateDown) {
      this.euler.x -= rotationAmount;
      changed = true;
    }
    if (this.keys.rotateLeft) {
      this.euler.y += rotationAmount;
      changed = true;
    }
    if (this.keys.rotateRight) {
      this.euler.y -= rotationAmount;
      changed = true;
    }

    if (changed) {
      this.clampPitch();
      this.camera.quaternion.setFromEuler(this.euler);
    }
  }

  private updateMovement(delta: number): void {
    let currentSpeed = this.moveSpeed;
    if (this.keys.speedBoost) {
      currentSpeed *= this.moveSpeedBoost;
    } else if (this.keys.speedSlow) {
      currentSpeed *= this.moveSpeedSlow;
    }

    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    this.camera.getWorldDirection(forward);

    // Semântica BIM corporativa: WASD navega no plano horizontal do modelo;
    // altitude é controlada explicitamente por Space/C.
    forward.y = 0;
    if (forward.lengthSq() < 0.0001) {
      forward.set(0, 0, -1);
    }
    forward.normalize();

    right.crossVectors(up, forward).normalize();

    const direction = new THREE.Vector3();
    if (this.keys.forward) direction.add(forward);
    if (this.keys.backward) direction.sub(forward);
    if (this.keys.left) direction.add(right);
    if (this.keys.right) direction.sub(right);
    if (this.keys.up) direction.add(up);
    if (this.keys.down) direction.sub(up);

    if (direction.lengthSq() > 0) {
      direction.normalize().multiplyScalar(currentSpeed);
      this.targetVelocity.copy(direction);
    } else {
      this.targetVelocity.set(0, 0, 0);
    }

    const alpha = 1 - Math.exp(-this.damping * delta);
    this.velocity.lerp(this.targetVelocity, alpha);
    this.camera.position.addScaledVector(this.velocity, delta);
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      Object.keys(this.keys).forEach((key) => {
        (this.keys as any)[key] = false;
      });
      this.velocity.set(0, 0, 0);
      this.targetVelocity.set(0, 0, 0);
      this.exitPointerLock();
    }
  }

  public getNavigationState(): {
    moveSpeed: number;
    position: number[];
    pointerLockEnabled: boolean;
  } {
    return {
      moveSpeed: this.moveSpeed,
      position: this.camera.position.toArray(),
      pointerLockEnabled: this.pointerLockEnabled,
    };
  }

  public exitPointerLock(): void {
    if (this.pointerLockEnabled) {
      document.exitPointerLock();
    }
  }

  public dispose(): void {
    document.removeEventListener('keydown', this.keyDownHandler);
    document.removeEventListener('keyup', this.keyUpHandler);
    document.removeEventListener('mousemove', this.mouseMoveHandler);
    document.removeEventListener('pointerlockchange', this.pointerLockChangeHandler);
    this.domElement.removeEventListener('click', this.clickHandler);

    this.exitPointerLock();
    console.log('🚁 Drone Controls disposed');
  }
}