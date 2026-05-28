import * as THREE from 'three';

type MovementKey = 'forward' | 'backward' | 'left' | 'right' | 'up' | 'speedBoost' | 'speedSlow';

/**
 * ThirdPersonControls - câmera orbitando avatar em 360°.
 *
 * Movimento:
 *   WASD: move o avatar relativo à direção da câmera
 *   Mouse/Setas: orbita a câmera ao redor do avatar
 *   Space: pulo com gravidade
 *   Shift/Ctrl: rápido/devagar
 */
export class ThirdPersonControls {
  private camera: THREE.Camera;
  private domElement: HTMLElement;
  private scene: THREE.Scene;
  private avatar: THREE.Group;

  private keys: Record<MovementKey, boolean> = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    speedBoost: false,
    speedSlow: false,
  };

  private yaw = Math.PI * 0.25;
  private pitch = 0.22;
  private verticalVelocity = 0;
  private isGrounded = true;

  public enabled = false;
  public pointerLockEnabled = false;
  public moveSpeed = 4.5;
  public moveSpeedBoost = 2.3;
  public moveSpeedSlow = 0.45;
  public mouseSensitivity = 0.0025;
  public rotateSpeed = 1.6;
  public gravity = 9.8;
  public jumpSpeed = 5.2;
  public groundY = 0;
  public avatarHeight = 1.8;
  public cameraDistance = 6;
  public cameraHeight = 1.8;
  public targetHeight = 1.25;

  private readonly keyDownHandler = (event: KeyboardEvent) => this.onKeyDown(event);
  private readonly keyUpHandler = (event: KeyboardEvent) => this.onKeyUp(event);
  private readonly mouseMoveHandler = (event: MouseEvent) => this.onMouseMove(event);
  private readonly pointerLockChangeHandler = () => this.onPointerLockChange();
  private readonly clickHandler = () => {
    if (this.enabled && !this.pointerLockEnabled) {
      this.requestPointerLock();
    }
  };

  constructor(camera: THREE.Camera, domElement: HTMLElement, scene: THREE.Scene) {
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;
    this.avatar = this.createAvatar();
    this.avatar.visible = false;
    this.scene.add(this.avatar);

    this.setupEventListeners();
    console.log('🧍 Third Person Controls initialized');
  }

  private createAvatar(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'third-person-avatar';

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      roughness: 0.65,
      metalness: 0.05,
      transparent: true,
      opacity: 0.92,
    });
    const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.7 });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.1, 8, 16), bodyMaterial);
    body.position.y = 0.95;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16), bodyMaterial);
    head.position.y = 1.72;
    head.castShadow = true;
    group.add(head);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.05), darkMaterial);
    visor.position.set(0, 1.75, -0.24);
    group.add(visor);

    const directionMarker = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.35, 16), darkMaterial);
    directionMarker.rotation.x = Math.PI / 2;
    directionMarker.position.set(0, 0.95, -0.42);
    group.add(directionMarker);

    return group;
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
        if (this.isGrounded) {
          this.verticalVelocity = this.jumpSpeed;
          this.isGrounded = false;
        }
        event.preventDefault();
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.speedBoost = true;
        break;
      case 'ControlLeft':
      case 'ControlRight':
        this.keys.speedSlow = true;
        break;
      case 'ArrowLeft':
        this.yaw += this.rotateSpeed * 0.04;
        event.preventDefault();
        break;
      case 'ArrowRight':
        this.yaw -= this.rotateSpeed * 0.04;
        event.preventDefault();
        break;
      case 'ArrowUp':
        this.pitch += this.rotateSpeed * 0.025;
        this.clampPitch();
        event.preventDefault();
        break;
      case 'ArrowDown':
        this.pitch -= this.rotateSpeed * 0.025;
        this.clampPitch();
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
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.speedBoost = false;
        break;
      case 'ControlLeft':
      case 'ControlRight':
        this.keys.speedSlow = false;
        break;
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.enabled || !this.pointerLockEnabled) return;

    this.yaw -= (event.movementX || 0) * this.mouseSensitivity;
    this.pitch -= (event.movementY || 0) * this.mouseSensitivity;
    this.clampPitch();
  }

  private onPointerLockChange(): void {
    this.pointerLockEnabled = document.pointerLockElement === this.domElement;
  }

  private requestPointerLock(): void {
    try {
      const pointerLockRequest = this.domElement.requestPointerLock();
      if (pointerLockRequest && typeof pointerLockRequest.catch === 'function') {
        pointerLockRequest.catch((error) => {
          console.warn('⚠️ Pointer lock indisponível no modo terceira pessoa:', error?.message || error);
        });
      }
    } catch (error) {
      console.warn('⚠️ Pointer lock indisponível no modo terceira pessoa:', error);
    }
  }

  private clampPitch(): void {
    const minPitch = -0.55;
    const maxPitch = 0.95;
    this.pitch = Math.max(minPitch, Math.min(maxPitch, this.pitch));
  }

  public syncFromCamera(): void {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    direction.y = 0;
    if (direction.lengthSq() < 0.0001) {
      direction.set(0, 0, -1);
    }
    direction.normalize();

    this.yaw = Math.atan2(-direction.x, -direction.z);
    this.avatar.position.set(this.camera.position.x, this.groundY, this.camera.position.z);
    this.verticalVelocity = 0;
    this.isGrounded = true;
    this.updateCamera();
  }

  public update(delta: number): void {
    if (!this.enabled) return;

    this.updateMovement(delta);
    this.applyGravity(delta);
    this.updateCamera();
  }

  private updateMovement(delta: number): void {
    let currentSpeed = this.moveSpeed;
    if (this.keys.speedBoost) {
      currentSpeed *= this.moveSpeedBoost;
    } else if (this.keys.speedSlow) {
      currentSpeed *= this.moveSpeedSlow;
    }

    const cameraForward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    const cameraRight = new THREE.Vector3(-cameraForward.z, 0, cameraForward.x).normalize();
    const direction = new THREE.Vector3();

    if (this.keys.forward) direction.add(cameraForward);
    if (this.keys.backward) direction.sub(cameraForward);
    if (this.keys.left) direction.sub(cameraRight);
    if (this.keys.right) direction.add(cameraRight);

    if (direction.lengthSq() > 0) {
      direction.normalize();
      this.avatar.position.addScaledVector(direction, currentSpeed * delta);
      this.avatar.rotation.y = Math.atan2(direction.x, direction.z) + Math.PI;
    }
  }

  private applyGravity(delta: number): void {
    this.verticalVelocity -= this.gravity * delta;
    this.avatar.position.y += this.verticalVelocity * delta;

    if (this.avatar.position.y <= this.groundY) {
      this.avatar.position.y = this.groundY;
      this.verticalVelocity = Math.max(0, this.verticalVelocity);
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }
  }

  private updateCamera(): void {
    const target = this.avatar.position.clone().add(new THREE.Vector3(0, this.targetHeight, 0));
    const horizontalDistance = this.cameraDistance * Math.cos(this.pitch);
    const offset = new THREE.Vector3(
      Math.sin(this.yaw) * horizontalDistance,
      this.cameraHeight + Math.sin(this.pitch) * this.cameraDistance,
      Math.cos(this.yaw) * horizontalDistance
    );

    this.camera.position.copy(target).add(offset);
    this.camera.lookAt(target);
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.avatar.visible = enabled;

    if (enabled) {
      this.syncFromCamera();
    } else {
      Object.keys(this.keys).forEach((key) => {
        this.keys[key as MovementKey] = false;
      });
      this.exitPointerLock();
    }
  }

  public setGroundY(value: number): void {
    this.groundY = Number(value) || 0;
    if (this.avatar.position.y < this.groundY) {
      this.avatar.position.y = this.groundY;
    }
  }

  public setGravity(value: number): void {
    this.gravity = Math.max(0, Math.min(60, Number(value) || 0));
  }

  public getAvatarPosition(): THREE.Vector3 {
    return this.avatar.position.clone();
  }

  public getNavigationState(): {
    gravity: number;
    isGrounded: boolean;
    groundY: number;
    moveSpeed: number;
    cameraDistance: number;
  } {
    return {
      gravity: this.gravity,
      isGrounded: this.isGrounded,
      groundY: this.groundY,
      moveSpeed: this.moveSpeed,
      cameraDistance: this.cameraDistance,
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

    this.avatar.traverse((child) => {
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose?.();
      const material = mesh.material;
      if (Array.isArray(material)) {
        material.forEach((item) => item.dispose?.());
      } else {
        material?.dispose?.();
      }
    });
    this.scene.remove(this.avatar);
    console.log('🧍 Third Person Controls disposed');
  }
}