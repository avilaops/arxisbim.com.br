/**
 * VideoTexture3D - Renderiza stream de vídeo como textura 3D no viewer
 */

import * as THREE from 'three';

export interface VideoPlaneConfig {
  width?: number;
  height?: number;
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
}

export class VideoTexture3D {
  private videoElement: HTMLVideoElement;
  private texture: THREE.VideoTexture;
  private material: THREE.MeshBasicMaterial;
  private plane: THREE.Mesh;
  
  private stream?: MediaStream;
  private userId: string;
  
  constructor(
    userId: string,
    stream: MediaStream,
    scene: THREE.Scene,
    config: VideoPlaneConfig = {}
  ) {
    this.userId = userId;
    this.stream = stream;
    
    // Criar elemento de vídeo
    this.videoElement = document.createElement('video');
    this.videoElement.srcObject = stream;
    this.videoElement.autoplay = true;
    this.videoElement.muted = true; // Visual não precisa de áudio
    this.videoElement.playsInline = true;
    this.videoElement.style.display = 'none';
    document.body.appendChild(this.videoElement);
    
    // Criar textura de vídeo
    this.texture = new THREE.VideoTexture(this.videoElement);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.format = THREE.RGBAFormat;
    this.texture.colorSpace = THREE.SRGBColorSpace;
    
    // Criar material
    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      side: THREE.DoubleSide,
      transparent: false
    });
    
    // Criar plano 3D
    const width = config.width || 1.6; // 16:9 aspect ratio
    const height = config.height || 0.9;
    const geometry = new THREE.PlaneGeometry(width, height);
    
    this.plane = new THREE.Mesh(geometry, this.material);
    this.plane.position.copy(config.position || new THREE.Vector3(0, 2, -3));
    if (config.rotation) {
      this.plane.rotation.copy(config.rotation);
    }
    
    // UserData para identificação
    this.plane.userData.isVideoPlane = true;
    this.plane.userData.userId = userId;
    
    scene.add(this.plane);
    
    console.log(`📺 VideoTexture3D criado para ${userId}`);
  }

  /**
   * Atualiza stream de vídeo
   */
  public updateStream(stream: MediaStream): void {
    this.stream = stream;
    this.videoElement.srcObject = stream;
    console.log(`📺 Stream atualizado para ${this.userId}`);
  }

  /**
   * Define posição do plano
   */
  public setPosition(x: number, y: number, z: number): void {
    this.plane.position.set(x, y, z);
  }

  /**
   * Define rotação do plano
   */
  public setRotation(x: number, y: number, z: number): void {
    this.plane.rotation.set(x, y, z);
  }

  /**
   * Define escala do plano
   */
  public setScale(scale: number): void {
    this.plane.scale.set(scale, scale, 1);
  }

  /**
   * Posiciona acima do avatar
   */
  public attachToAvatar(avatarPosition: THREE.Vector3): void {
    this.plane.position.set(
      avatarPosition.x,
      avatarPosition.y + 2.5, // Acima da cabeça
      avatarPosition.z
    );
  }

  /**
   * Toggle visibilidade
   */
  public setVisible(visible: boolean): void {
    this.plane.visible = visible;
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    // Para vídeo
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
      if (this.videoElement.parentElement) {
        this.videoElement.parentElement.removeChild(this.videoElement);
      }
    }
    
    // Dispose texture
    if (this.texture) {
      this.texture.dispose();
    }
    
    // Dispose material
    if (this.material) {
      this.material.dispose();
    }
    
    // Remove da cena
    if (this.plane.parent) {
      this.plane.parent.remove(this.plane);
    }
    
    // Dispose geometry
    if (this.plane.geometry) {
      this.plane.geometry.dispose();
    }
    
    console.log(`📺 VideoTexture3D disposed para ${this.userId}`);
  }

  /**
   * Getters
   */
  public getUserId(): string {
    return this.userId;
  }

  public getPlane(): THREE.Mesh {
    return this.plane;
  }

  public getVideoElement(): HTMLVideoElement {
    return this.videoElement;
  }
}

/**
 * ScreenSharePlane - Plano maior para apresentações
 */
export class ScreenSharePlane extends VideoTexture3D {
  constructor(
    userId: string,
    stream: MediaStream,
    scene: THREE.Scene
  ) {
    super(userId, stream, scene, {
      width: 4.0,  // Maior para screen share
      height: 2.25,
      position: new THREE.Vector3(0, 2, -5),
      rotation: new THREE.Euler(0, 0, 0)
    });
    
    // Adiciona borda/frame
    const frame = this.createFrame();
    this.getPlane().add(frame);
  }

  /**
   * Cria moldura ao redor da tela
   */
  private createFrame(): THREE.LineSegments {
    const geometry = new THREE.EdgesGeometry(this.getPlane().geometry);
    const material = new THREE.LineBasicMaterial({ 
      color: 0x4A90E2,
      linewidth: 2
    });
    const frame = new THREE.LineSegments(geometry, material);
    frame.position.z = 0.01; // Levemente à frente
    return frame;
  }

  /**
   * Posiciona para apresentação central
   */
  public positionForPresentation(camera: THREE.Camera): void {
    // Calcula posição na frente da câmera
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    
    const distance = 5;
    const position = new THREE.Vector3()
      .copy(camera.position)
      .add(direction.multiplyScalar(distance));
    
    position.y = 2; // Altura fixa
    
    this.setPosition(position.x, position.y, position.z);
    
    // Rotaciona para olhar para câmera
    this.getPlane().lookAt(camera.position);
  }
}
