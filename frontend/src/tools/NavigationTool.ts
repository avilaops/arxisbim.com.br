import * as THREE from 'three';
import { BaseTool } from './Tool';
import { ToolType, NavigationMode } from '../core';
import { appController } from '../app';

/**
 * NavigationTool - Ferramenta de navegação First Person
 * Controles estilo FPS integrado como ferramenta
 */
export class NavigationTool extends BaseTool {
  public readonly name = 'Navigation Tool';
  public readonly type = ToolType.NAVIGATION;

  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;

  // Configurações de movimento
  private moveSpeed: number = 5.0;
  private sprintSpeed: number = 10.0;
  private mouseSensitivity: number = 0.002;
  private keyboardRotationSpeed: number = 2.0;
  private verticalSpeed: number = 5.0;

  // Estado do movimento
  private moveForward: boolean = false;
  private moveBackward: boolean = false;
  private moveLeft: boolean = false;
  private moveRight: boolean = false;
  private moveUp: boolean = false;
  private moveDown: boolean = false;
  private canSprint: boolean = false;

  // Estado da rotação
  private rotateLeft: boolean = false;
  private rotateRight: boolean = false;
  private rotateUp: boolean = false;
  private rotateDown: boolean = false;

  // Rotação e movimento
  private euler: THREE.Euler;
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private direction: THREE.Vector3 = new THREE.Vector3();
  private PI_2: number = Math.PI / 2;

  // Pointer lock
  private isLocked: boolean = false;

  // Bound event handlers
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundPointerLockChange: () => void;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    super();
    this.camera = camera;
    this.domElement = domElement;
    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');

    // Bind event handlers
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundPointerLockChange = this.handlePointerLockChange.bind(this);
  }

  public activate(): void {
    super.activate();
    
    // Add event listeners
    document.addEventListener('keydown', this.boundKeyDown);
    document.addEventListener('keyup', this.boundKeyUp);
    document.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('pointerlockchange', this.boundPointerLockChange);
  }

  public deactivate(): void {
    super.deactivate();
    
    // Remove event listeners
    document.removeEventListener('keydown', this.boundKeyDown);
    document.removeEventListener('keyup', this.boundKeyUp);
    document.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('pointerlockchange', this.boundPointerLockChange);
    
    // Reset movement state
    this.resetMovementState();
  }

  public onKeyDown(event: KeyboardEvent): void {
    this.handleKeyDown(event);
  }

  public onKeyUp(event: KeyboardEvent): void {
    this.handleKeyUp(event);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isActive) return;

    switch (event.code) {
      case 'KeyW': this.moveForward = true; break;
      case 'KeyS': this.moveBackward = true; break;
      case 'KeyA': this.moveLeft = true; break;
      case 'KeyD': this.moveRight = true; break;
      case 'ArrowUp': this.rotateUp = true; break;
      case 'ArrowDown': this.rotateDown = true; break;
      case 'ArrowLeft': this.rotateLeft = true; break;
      case 'ArrowRight': this.rotateRight = true; break;
      case 'Space': this.moveUp = true; break;
      case 'ControlLeft':
      case 'ControlRight': this.moveDown = true; break;
      case 'ShiftLeft':
      case 'ShiftRight': this.canSprint = true; break;
      case 'KeyF': this.toggleFlyMode(); break;
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    if (!this.isActive) return;

    switch (event.code) {
      case 'KeyW': this.moveForward = false; break;
      case 'KeyS': this.moveBackward = false; break;
      case 'KeyA': this.moveLeft = false; break;
      case 'KeyD': this.moveRight = false; break;
      case 'ArrowUp': this.rotateUp = false; break;
      case 'ArrowDown': this.rotateDown = false; break;
      case 'ArrowLeft': this.rotateLeft = false; break;
      case 'ArrowRight': this.rotateRight = false; break;
      case 'Space': this.moveUp = false; break;
      case 'ControlLeft':
      case 'ControlRight': this.moveDown = false; break;
      case 'ShiftLeft':
      case 'ShiftRight': this.canSprint = false; break;
    }
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isActive || !this.isLocked) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y -= movementX * this.mouseSensitivity;
    this.euler.x -= movementY * this.mouseSensitivity;
    this.euler.x = Math.max(-this.PI_2, Math.min(this.PI_2, this.euler.x));

    this.camera.quaternion.setFromEuler(this.euler);
  }

  private handlePointerLockChange(): void {
    this.isLocked = document.pointerLockElement === this.domElement;
  }

  public update(delta: number): void {
    if (!this.isActive) return;

    // Keyboard rotation
    if (this.rotateLeft) this.euler.y += this.keyboardRotationSpeed * delta;
    if (this.rotateRight) this.euler.y -= this.keyboardRotationSpeed * delta;
    if (this.rotateUp) this.euler.x += this.keyboardRotationSpeed * delta;
    if (this.rotateDown) this.euler.x -= this.keyboardRotationSpeed * delta;
    
    this.euler.x = Math.max(-this.PI_2, Math.min(this.PI_2, this.euler.x));
    this.camera.quaternion.setFromEuler(this.euler);

    // Calculate movement direction
    this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
    this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
    this.direction.normalize();

    // Apply speed
    const currentSpeed = this.canSprint ? this.sprintSpeed : this.moveSpeed;
    
    if (this.moveForward || this.moveBackward) {
      this.velocity.z -= this.direction.z * currentSpeed * delta;
    }
    if (this.moveLeft || this.moveRight) {
      this.velocity.x -= this.direction.x * currentSpeed * delta;
    }

    // Vertical movement (fly mode)
    if (appController.getNavigationMode() === NavigationMode.FLY) {
      if (this.moveUp) this.velocity.y += this.verticalSpeed * delta;
      if (this.moveDown) this.velocity.y -= this.verticalSpeed * delta;
    }

    // Apply velocity
    this.camera.position.add(
      this.velocity.clone().applyQuaternion(this.camera.quaternion)
    );

    // Damping
    this.velocity.multiplyScalar(0.9);
  }

  /**
   * Alterna modo de voo
   */
  private toggleFlyMode(): void {
    const currentMode = appController.getNavigationMode();
    
    if (currentMode === NavigationMode.FLY) {
      appController.setNavigationMode(NavigationMode.WALK);
      console.log('🚶 Walk mode enabled');
    } else {
      appController.setNavigationMode(NavigationMode.FLY);
      console.log('🚀 Fly mode enabled');
    }
  }

  /**
   * Reseta estado de movimento
   */
  private resetMovementState(): void {
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.moveUp = false;
    this.moveDown = false;
    this.canSprint = false;
    this.rotateLeft = false;
    this.rotateRight = false;
    this.rotateUp = false;
    this.rotateDown = false;
    this.velocity.set(0, 0, 0);
  }

  /**
   * Request pointer lock
   */
  public async requestPointerLock(): Promise<void> {
    try {
      await this.domElement.requestPointerLock();
    } catch (error: any) {
      // Error handling específico
      if (error.name === 'SecurityError') {
        console.warn('⚠️  Pointer lock denied or cancelled by user');
      } else if (error.name === 'NotSupportedError') {
        console.error('❌ Pointer lock not supported');
      } else {
        console.error('❌ Failed to request pointer lock:', error.message || error);
      }
    }
  }

  /**
   * Exit pointer lock
   */
  public exitPointerLock(): void {
    document.exitPointerLock();
  }

  public dispose(): void {
    super.dispose();
    this.resetMovementState();
  }
}
