import * as THREE from 'three';

/**
 * Avatar System - Personagem com física realista
 * Respeita leis da física: gravidade, colisão, fricção
 */
export class Avatar {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  
  // Mesh do avatar
  private avatarGroup!: THREE.Group;
  private bodyMesh!: THREE.Mesh;
  private headMesh!: THREE.Mesh;
  
  // Física
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private acceleration: THREE.Vector3 = new THREE.Vector3();
  private mass: number = 70; // kg (peso médio de uma pessoa)
  private height: number = 1.8; // metros
  private radius: number = 0.3; // raio da cápsula de colisão
  
  // Constantes físicas
  private readonly GRAVITY: number = -9.81; // m/s² (aceleração da gravidade)
  private readonly AIR_RESISTANCE: number = 0.98; // coeficiente de resistência do ar
  private readonly FRICTION: number = 0.9; // coeficiente de atrito
  private readonly MAX_WALK_SPEED: number = 1.4; // m/s (velocidade de caminhada)
  private readonly MAX_RUN_SPEED: number = 5.0; // m/s (velocidade de corrida)
  private readonly JUMP_FORCE: number = 6.0; // m/s (força do pulo)
  
  // Estado
  private isGrounded: boolean = false;
  private isJumping: boolean = false;
  private canDoubleJump: boolean = true;
  
  // Colisão
  private collisionObjects: THREE.Object3D[] = [];
  private raycaster: THREE.Raycaster;
  
  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, position?: THREE.Vector3) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    
    this.createAvatarMesh();
    
    if (position) {
      this.avatarGroup.position.copy(position);
    } else {
      this.avatarGroup.position.set(0, this.height / 2, 0);
    }
    
    this.scene.add(this.avatarGroup);
  }
  
  /**
   * Cria mesh do avatar (corpo + cabeça)
   */
  private createAvatarMesh(): void {
    this.avatarGroup = new THREE.Group();
    
    // Corpo (cilindro)
    const bodyGeometry = new THREE.CylinderGeometry(
      this.radius, // raio topo
      this.radius, // raio base
      this.height * 0.6, // altura do corpo
      16
    );
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x3498db, // azul
      roughness: 0.7,
      metalness: 0.3
    });
    this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.bodyMesh.position.y = this.height * 0.3;
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;
    
    // Cabeça (esfera)
    const headGeometry = new THREE.SphereGeometry(this.radius * 0.8, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xf39c12, // laranja (cor da pele)
      roughness: 0.8,
      metalness: 0.1
    });
    this.headMesh = new THREE.Mesh(headGeometry, headMaterial);
    this.headMesh.position.y = this.height * 0.7;
    this.headMesh.castShadow = true;
    this.headMesh.receiveShadow = true;
    
    // Adiciona ao grupo
    this.avatarGroup.add(this.bodyMesh);
    this.avatarGroup.add(this.headMesh);
    
    // Marca como avatar para identificação
    this.avatarGroup.userData.isAvatar = true;
  }
  
  /**
   * Aplica força ao avatar (F = m * a)
   */
  public applyForce(force: THREE.Vector3): void {
    // F = m * a  =>  a = F / m
    const acc = force.clone().divideScalar(this.mass);
    this.acceleration.add(acc);
  }
  
  /**
   * Move o avatar
   */
  public move(direction: THREE.Vector3, isRunning: boolean = false): void {
    if (direction.length() === 0) return;
    
    // Normaliza direção
    direction.normalize();
    
    // Aplica velocidade máxima
    const maxSpeed = isRunning ? this.MAX_RUN_SPEED : this.MAX_WALK_SPEED;
    const force = direction.multiplyScalar(maxSpeed * this.mass);
    
    // Aplica força apenas no plano horizontal se estiver no chão
    if (this.isGrounded) {
      force.y = 0;
    }
    
    this.applyForce(force);
  }
  
  /**
   * Faz o avatar pular
   */
  public jump(): void {
    if (this.isGrounded) {
      // Pulo normal
      this.velocity.y = this.JUMP_FORCE;
      this.isGrounded = false;
      this.isJumping = true;
      this.canDoubleJump = true;
      console.log('🦘 Pulo!');
    } else if (this.canDoubleJump && !this.isGrounded) {
      // Pulo duplo
      this.velocity.y = this.JUMP_FORCE * 0.8;
      this.canDoubleJump = false;
      console.log('🦘 Pulo duplo!');
    }
  }
  
  /**
   * Detecta colisão com o chão
   */
  private checkGroundCollision(): void {
    // Raycast para baixo
    const origin = this.avatarGroup.position.clone();
    const direction = new THREE.Vector3(0, -1, 0);
    
    this.raycaster.set(origin, direction);
    this.raycaster.far = this.height / 2 + 0.1;
    
    const intersects = this.raycaster.intersectObjects(this.collisionObjects, true);
    
    if (intersects.length > 0) {
      const distance = intersects[0].distance;
      
      // Se está próximo do chão
      if (distance <= this.height / 2 + 0.05) {
        this.isGrounded = true;
        this.isJumping = false;
        
        // Ajusta posição para ficar exatamente no chão
        const groundY = intersects[0].point.y + this.height / 2;
        this.avatarGroup.position.y = groundY;
        
        // Cancela velocidade vertical se estava caindo
        if (this.velocity.y < 0) {
          this.velocity.y = 0;
        }
      } else {
        this.isGrounded = false;
      }
    } else {
      this.isGrounded = false;
    }
  }
  
  /**
   * Detecta colisão com objetos laterais
   */
  private checkLateralCollision(): void {
    const directions = [
      new THREE.Vector3(1, 0, 0),   // direita
      new THREE.Vector3(-1, 0, 0),  // esquerda
      new THREE.Vector3(0, 0, 1),   // frente
      new THREE.Vector3(0, 0, -1)   // trás
    ];
    
    const origin = this.avatarGroup.position.clone();
    origin.y += this.height * 0.3; // meio do corpo
    
    for (const dir of directions) {
      this.raycaster.set(origin, dir);
      this.raycaster.far = this.radius + 0.1;
      
      const intersects = this.raycaster.intersectObjects(this.collisionObjects, true);
      
      if (intersects.length > 0) {
        // Cancela velocidade na direção da colisão
        const dot = this.velocity.dot(dir);
        if (dot > 0) {
          this.velocity.sub(dir.clone().multiplyScalar(dot));
        }
      }
    }
  }
  
  /**
   * Atualiza física do avatar
   */
  public update(delta: number): void {
    // Aplica gravidade se não estiver no chão
    if (!this.isGrounded) {
      this.applyForce(new THREE.Vector3(0, this.GRAVITY * this.mass, 0));
    }
    
    // Atualiza velocidade: v = v + a * dt
    this.velocity.add(this.acceleration.clone().multiplyScalar(delta));
    
    // Aplica resistência do ar
    this.velocity.multiplyScalar(this.AIR_RESISTANCE);
    
    // Aplica atrito se estiver no chão
    if (this.isGrounded) {
      this.velocity.x *= this.FRICTION;
      this.velocity.z *= this.FRICTION;
    }
    
    // Limita velocidade horizontal
    const horizontalSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
    const maxHorizontalSpeed = this.MAX_RUN_SPEED;
    if (horizontalSpeed > maxHorizontalSpeed) {
      const ratio = maxHorizontalSpeed / horizontalSpeed;
      this.velocity.x *= ratio;
      this.velocity.z *= ratio;
    }
    
    // Atualiza posição: p = p + v * dt
    const movement = this.velocity.clone().multiplyScalar(delta);
    this.avatarGroup.position.add(movement);
    
    // Detecta colisões
    this.checkGroundCollision();
    this.checkLateralCollision();
    
    // Atualiza câmera para seguir avatar
    this.updateCamera();
    
    // Reset da aceleração
    this.acceleration.set(0, 0, 0);
  }
  
  /**
   * Atualiza câmera para seguir o avatar (terceira pessoa)
   */
  private updateCamera(): void {
    // Câmera atrás e acima do avatar
    const cameraOffset = new THREE.Vector3(0, 2, 5);
    
    // Aplica rotação do avatar ao offset
    cameraOffset.applyQuaternion(this.avatarGroup.quaternion);
    
    // Posição da câmera
    const targetCameraPosition = this.avatarGroup.position.clone().add(cameraOffset);
    
    // Suaviza movimento da câmera (lerp)
    this.camera.position.lerp(targetCameraPosition, 0.1);
    
    // Câmera olha para o avatar
    const lookAtTarget = this.avatarGroup.position.clone();
    lookAtTarget.y += this.height * 0.5;
    this.camera.lookAt(lookAtTarget);
  }
  
  /**
   * Rotaciona o avatar
   */
  public rotate(angle: number): void {
    this.avatarGroup.rotateY(angle);
  }
  
  /**
   * Define objetos de colisão
   */
  public setCollisionObjects(objects: THREE.Object3D[]): void {
    this.collisionObjects = objects;
  }
  
  /**
   * Adiciona objeto de colisão
   */
  public addCollisionObject(object: THREE.Object3D): void {
    this.collisionObjects.push(object);
  }
  
  /**
   * Obtém posição do avatar
   */
  public getPosition(): THREE.Vector3 {
    return this.avatarGroup.position.clone();
  }
  
  /**
   * Define posição do avatar
   */
  public setPosition(position: THREE.Vector3): void {
    this.avatarGroup.position.copy(position);
  }
  
  /**
   * Verifica se está no chão
   */
  public getIsGrounded(): boolean {
    return this.isGrounded;
  }
  
  /**
   * Obtém velocidade
   */
  public getVelocity(): THREE.Vector3 {
    return this.velocity.clone();
  }
  
  /**
   * Reseta física
   */
  public reset(): void {
    this.velocity.set(0, 0, 0);
    this.acceleration.set(0, 0, 0);
    this.isGrounded = false;
    this.isJumping = false;
    this.canDoubleJump = true;
  }
  
  /**
   * Mostra/esconde avatar
   */
  public setVisible(visible: boolean): void {
    this.avatarGroup.visible = visible;
  }
  
  /**
   * Dispose
   */
  public dispose(): void {
    this.scene.remove(this.avatarGroup);
    this.bodyMesh.geometry.dispose();
    (this.bodyMesh.material as THREE.Material).dispose();
    this.headMesh.geometry.dispose();
    (this.headMesh.material as THREE.Material).dispose();
  }

  /**
   * Retorna se o avatar está pulando
   */
  public getIsJumping(): boolean {
    return this.isJumping;
  }
}
