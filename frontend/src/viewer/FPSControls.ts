import * as THREE from 'three';

/**
 * FPSControls - Controles 3D estilo FPS + Navegação livre
 *
 * Movimento:
 *   WASD: Horizontal (Forward, Left, Back, Right)
 *   Q: Subir no eixo Y e ativar fly mode (mantém altura ao soltar)
 *   E: Descer no eixo Y; ao tocar o chão, sai do fly mode e gravidade volta a atuar
 *   Space: Pular quando gravity estiver ativa; subir em modo fly/no-gravity
 *   C: Descer em modo fly/no-gravity
 *   Shift: Velocidade boost (2.5x)
 *   Ctrl: Velocidade lenta (0.4x)
 *
 * Rotação:
 *   Setas ↑↓: Pitch (olhar cima/baixo)
 *   Setas ←→: Yaw (girar esquerda/direita)
 *   Shift+←/→: Snap 180° instantâneo
 *
 * Física:
 *   - Velocidade normalizada (W+D = mesma velocidade que W)
 *   - Movimento horizontal no plano XZ (ignora pitch da câmera)
 *   - Gravity regulável para navegação estilo Counter-Strike
 */
export class FPSControls {
  private camera: THREE.Camera;
  private domElement: HTMLElement;
  
  // Estado das teclas
  private keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,          // Space - Subir
    down: false,        // C - Descer
    flyUp: false,       // Q - Subir (sempre, ignora gravidade)
    flyDown: false,     // E - Descer (sempre, ignora gravidade)
    rotateUp: false,
    rotateDown: false,
    rotateLeft: false,
    rotateRight: false,
    speedBoost: false,  // Shift
    speedSlow: false    // Ctrl
  };

  // Edge triggers para rotação 180° (evitar repetição)
  private snap180Triggered = {
    left: false,
    right: false
  };

  // Configurações
  public moveSpeed = 5.0; // unidades por segundo (base)
  public moveSpeedBoost = 2.5; // multiplicador com Shift
  public moveSpeedSlow = 0.4; // multiplicador com Ctrl
  public rotateSpeed = 1.6; // radianos por segundo
  public mouseSensitivity = 0.002; // Sensibilidade do mouse (rad/pixel)
  public gravity = 9.8; // unidades por segundo²
  public gravityEnabled = true;
  public jumpSpeed = 5.5; // impulso vertical do pulo
  public eyeHeight = 1.7; // altura da câmera em relação ao plano/chão
  public groundY = 0; // plano de navegação
  public enabled = true;
  public pointerLockEnabled = false; // Mouse look ativo?

  // Vetor de movimento
  private velocity = new THREE.Vector3();
  private verticalVelocity = 0;
  private isGrounded = false;
  // Ativado por Q/E: suspende gravidade até o usuário pousar (E até o chão) ou alternar gravity
  private flyMode = false;

  // Vetores reutilizáveis para evitar GC pressure em cenas BIM grandes
  private readonly _forward = new THREE.Vector3();
  private readonly _right = new THREE.Vector3();
  private readonly _direction = new THREE.Vector3();
  private readonly _worldUp = new THREE.Vector3(0, 1, 0);
  
  // Euler para rotação
  private euler = new THREE.Euler(0, 0, 0, 'YXZ');

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
    
    console.log('🎮 FPS Controls initialized');
    console.log('  WASD: Move horizontal (Shift=fast, Ctrl=slow)');
    console.log('  Q/E: Up/Down (Y-axis, ignora gravidade)');
    console.log('  Space: Jump (Gravity ON) / Up (Gravity OFF)');
    console.log('  Arrows: Rotate camera (Pitch/Yaw)');
    console.log('  Shift+←/→: Snap 180°');
    console.log('  Click canvas: Ativar mouse look (ESC para sair)');
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', this.keyDownHandler);
    document.addEventListener('keyup', this.keyUpHandler);
    document.addEventListener('mousemove', this.mouseMoveHandler);
    document.addEventListener('pointerlockchange', this.pointerLockChangeHandler);
    this.domElement.addEventListener('click', this.clickHandler);
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;

    // Verificar se está digitando em input
    const activeElement = document.activeElement;
    const isTyping = activeElement && 
                     (activeElement.tagName.toLowerCase() === 'input' || 
                      activeElement.tagName.toLowerCase() === 'textarea');
    
    if (isTyping) return;

    switch (event.code) {
      // WASD Movement
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

      // Vertical Movement (Eixo Y)
      case 'Space':
        this.keys.up = true;
        if (this.gravityEnabled && this.isGrounded) {
          this.verticalVelocity = this.jumpSpeed;
          this.isGrounded = false;
        }
        event.preventDefault();
        break;
      case 'KeyC':
        this.keys.down = true;
        break;

      // Q/E vertical (Y) movement
      case 'KeyQ':
        this.keys.flyUp = true;
        break;
      case 'KeyE':
        this.keys.flyDown = true;
        break;

      // Speed modifiers
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.speedBoost = true;
        break;
      case 'ControlLeft':
      case 'ControlRight':
        this.keys.speedSlow = true;
        break;

      // Arrow Keys Rotation
      case 'ArrowUp':
        this.keys.rotateUp = true;
        event.preventDefault();
        break;
      case 'ArrowDown':
        this.keys.rotateDown = true;
        event.preventDefault();
        break;
      case 'ArrowLeft':
        // Shift + ← = Snap 180° esquerda (uma vez)
        if (event.shiftKey && !this.snap180Triggered.left) {
          this.snapRotate180(-1);
          this.snap180Triggered.left = true;
        } else {
          this.keys.rotateLeft = true;
        }
        event.preventDefault();
        break;
      case 'ArrowRight':
        // Shift + → = Snap 180° direita (uma vez)
        if (event.shiftKey && !this.snap180Triggered.right) {
          this.snapRotate180(1);
          this.snap180Triggered.right = true;
        } else {
          this.keys.rotateRight = true;
        }
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
      
      // Vertical Movement
      case 'Space':
        this.keys.up = false;
        break;
      case 'KeyC':
        this.keys.down = false;
        break;
      
      // Q/E vertical (Y) movement
      case 'KeyQ':
        this.keys.flyUp = false;
        break;
      case 'KeyE':
        this.keys.flyDown = false;
        break;
      
      // Speed modifiers
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
        this.snap180Triggered.left = false; // Reset edge trigger
        break;
      case 'ArrowRight':
        this.keys.rotateRight = false;
        this.snap180Triggered.right = false; // Reset edge trigger
        break;
    }
  }

  /**
   * Update deve ser chamado no loop de animação
   */
  public update(delta: number): void {
    if (!this.enabled) return;

    // Atualizar rotação baseado nas setas (sempre)
    this.updateRotation(delta);

    // Atualizar movimento baseado no WASD
    this.updateMovement(delta);
  }

  /**
   * Mouse move para pointer lock (look around)
   */
  private onMouseMove(event: MouseEvent): void {
    if (!this.pointerLockEnabled || !this.enabled) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    // Obter rotação atual
    this.euler.setFromQuaternion(this.camera.quaternion);

    // Aplicar rotação do mouse
    this.euler.y -= movementX * this.mouseSensitivity; // Yaw (horizontal)
    this.euler.x -= movementY * this.mouseSensitivity; // Pitch (vertical)

    // Limitar pitch (-85° a +85°)
    const maxPitch = (85 * Math.PI) / 180;
    this.euler.x = Math.max(-maxPitch, Math.min(maxPitch, this.euler.x));

    // Aplicar
    this.camera.quaternion.setFromEuler(this.euler);
  }

  /**
   * Pointer lock change event
   */
  private onPointerLockChange(): void {
    this.pointerLockEnabled = document.pointerLockElement === this.domElement;
    
    if (this.pointerLockEnabled) {
      console.log('🖱️ Mouse look ativado (ESC para sair)');
    } else {
      console.log('⌨️ Mouse look desativado (use setas ou clique no canvas)');
    }
  }

  /**
   * Solicita pointer lock
   */
  private requestPointerLock(): void {
    try {
      const pointerLockRequest = this.domElement.requestPointerLock();
      if (pointerLockRequest && typeof pointerLockRequest.catch === 'function') {
        pointerLockRequest.catch((error) => {
          console.warn('⚠️ Pointer lock indisponível neste contexto:', error?.message || error);
        });
      }
    } catch (error) {
      console.warn('⚠️ Pointer lock indisponível neste contexto:', error);
    }
  }

  /**
   * Libera pointer lock
   */
  public exitPointerLock(): void {
    if (this.pointerLockEnabled) {
      document.exitPointerLock();
    }
  }

  private updateRotation(delta: number): void {
    const rotationAmount = this.rotateSpeed * delta;

    // Obter rotação atual da câmera
    this.euler.setFromQuaternion(this.camera.quaternion);

    let rotationChanged = false;

    // Rotação vertical (pitch) - Setas Up/Down
    if (this.keys.rotateUp) {
      this.euler.x += rotationAmount;
      rotationChanged = true;
    }
    if (this.keys.rotateDown) {
      this.euler.x -= rotationAmount;
      rotationChanged = true;
    }

    // Rotação horizontal (yaw) - Setas Left/Right (sem Shift)
    if (this.keys.rotateLeft) {
      this.euler.y += rotationAmount;
      rotationChanged = true;
    }
    if (this.keys.rotateRight) {
      this.euler.y -= rotationAmount;
      rotationChanged = true;
    }

    // Limitar pitch para evitar gimbal lock (-85° a +85°)
    const maxPitch = (85 * Math.PI) / 180;
    this.euler.x = Math.max(-maxPitch, Math.min(maxPitch, this.euler.x));

    // Aplicar rotação SOMENTE se houve mudança
    if (rotationChanged) {
      this.camera.quaternion.setFromEuler(this.euler);
      
      // Debug temporário
      if (this.keys.rotateUp || this.keys.rotateDown) {
        console.log('🎯 Pitch aplicado:', (this.euler.x * 180 / Math.PI).toFixed(1) + '°');
      }
    }
  }

  private updateMovement(delta: number): void {
    // Calcular velocidade atual com modificadores
    let currentSpeed = this.moveSpeed;
    if (this.keys.speedBoost) {
      currentSpeed *= this.moveSpeedBoost;
    } else if (this.keys.speedSlow) {
      currentSpeed *= this.moveSpeedSlow;
    }

    // Resetar velocidade
    this.velocity.set(0, 0, 0);

    // Direções da câmera (reusa vetores, sem alocação por frame)
    const forward = this._forward;
    const right = this._right;
    const up = this._worldUp; // Eixo Y global

    this.camera.getWorldDirection(forward);
    forward.y = 0; // Projeta no plano XZ (movimento horizontal)
    forward.normalize();

    // Right = forward × up (right-handed: aponta para a direita real da câmera)
    right.crossVectors(forward, up).normalize();

    // Acumular direções
    const direction = this._direction.set(0, 0, 0);

    if (this.keys.forward) {
      direction.add(forward);
    }
    if (this.keys.backward) {
      direction.addScaledVector(forward, -1);
    }
    if (this.keys.left) {
      direction.addScaledVector(right, -1);
    }
    if (this.keys.right) {
      direction.add(right);
    }

    // Movimento vertical livre somente quando Gravity está desligada.
    // Com Gravity ligada, Space vira pulo e a queda é aplicada em applyGravity().
    if (!this.gravityEnabled && this.keys.up) {
      direction.add(up);
    }
    if (!this.gravityEnabled && this.keys.down) {
      direction.addScaledVector(up, -1);
    }

    // Q/E fly vertical: sempre ativo, ignora gravidade.
    if (this.keys.flyUp) {
      direction.add(up);
    }
    if (this.keys.flyDown) {
      direction.addScaledVector(up, -1);
    }

    // Normalizar para velocidade igual na diagonal (W+D = W)
    if (direction.lengthSq() > 0) {
      direction.normalize();
      this.velocity.copy(direction).multiplyScalar(currentSpeed * delta);
      this.camera.position.add(this.velocity);
    }

    this.applyGravity(delta);
  }

  private applyGravity(delta: number): void {
    if (!this.gravityEnabled) {
      this.isGrounded = false;
      return;
    }

    // Q ativa flyMode (modo voo). Mantém suspensão até o usuário pousar com E.
    if (this.keys.flyUp) {
      this.flyMode = true;
    }

    const floorY = this.groundY + this.eyeHeight;

    // Em flyMode (após Q/E): mantém altura, gravidade não atua.
    if (this.flyMode) {
      this.verticalVelocity = 0;
      this.isGrounded = false;
      // Pousou usando E até atingir o chão → desativa flyMode e retoma física normal.
      if (this.keys.flyDown && this.camera.position.y <= floorY) {
        this.camera.position.y = floorY;
        this.flyMode = false;
        this.isGrounded = true;
      }
      return;
    }

    this.verticalVelocity -= this.gravity * delta;
    this.camera.position.y += this.verticalVelocity * delta;

    if (this.camera.position.y <= floorY) {
      this.camera.position.y = floorY;
      this.verticalVelocity = Math.max(0, this.verticalVelocity);
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }
  }

  public setGravity(value: number): void {
    this.gravity = Math.max(0, Math.min(60, Number(value) || 0));
  }

  public setGravityEnabled(enabled: boolean): void {
    this.gravityEnabled = enabled;
    this.verticalVelocity = 0;
    this.flyMode = false;
    if (enabled && this.camera.position.y < this.groundY + this.eyeHeight) {
      this.camera.position.y = this.groundY + this.eyeHeight;
    }
  }

  public setGroundY(value: number): void {
    this.groundY = Number(value) || 0;
    if (this.gravityEnabled && this.camera.position.y < this.groundY + this.eyeHeight) {
      this.camera.position.y = this.groundY + this.eyeHeight;
    }
  }

  public getNavigationState(): {
    gravity: number;
    gravityEnabled: boolean;
    isGrounded: boolean;
    groundY: number;
    eyeHeight: number;
    moveSpeed: number;
  } {
    return {
      gravity: this.gravity,
      gravityEnabled: this.gravityEnabled,
      isGrounded: this.isGrounded,
      groundY: this.groundY,
      eyeHeight: this.eyeHeight,
      moveSpeed: this.moveSpeed,
    };
  }

  /**
   * Rotação instantânea de 180 graus (snap)
   * @param direction -1 para esquerda, +1 para direita
   */
  private snapRotate180(direction: number): void {
    this.euler.setFromQuaternion(this.camera.quaternion);
    this.euler.y += direction * Math.PI; // 180 graus em radianos
    this.camera.quaternion.setFromEuler(this.euler);
    
    console.log(`🔄 Snap 180° ${direction > 0 ? 'direita' : 'esquerda'}`);
  }

  /**
   * Rotação instantânea de 180 graus (API pública)
   */
  public rotate180(): void {
    this.snapRotate180(1);
  }

  /**
   * Ativar/desativar controles
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    if (!enabled) {
      // Resetar estado das teclas
      Object.keys(this.keys).forEach(key => {
        (this.keys as any)[key] = false;
      });
      
      // Sair do pointer lock
      this.exitPointerLock();
    }
  }

  /**
   * Dispose
   */
  public dispose(): void {
    document.removeEventListener('keydown', this.keyDownHandler);
    document.removeEventListener('keyup', this.keyUpHandler);
    document.removeEventListener('mousemove', this.mouseMoveHandler);
    document.removeEventListener('pointerlockchange', this.pointerLockChangeHandler);
    this.domElement.removeEventListener('click', this.clickHandler);
    
    // Sair do pointer lock
    this.exitPointerLock();
    
    console.log('🎮 FPS Controls disposed');
  }
}
