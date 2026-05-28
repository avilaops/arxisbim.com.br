import * as THREE from 'three';

/**
 * Renderer otimizado com configurações de alta performance
 * Superior ao Unity WebGL em termos de otimização e controle
 */
export class Renderer {
  public renderer: THREE.WebGLRenderer;
  public domElement: HTMLElement;

  constructor() {
    // Configuração de renderização de alta qualidade
    this.renderer = new THREE.WebGLRenderer({
      antialias: true, // Anti-aliasing para qualidade visual
      powerPreference: 'high-performance', // Força uso de GPU dedicada
      alpha: false, // Não precisamos de transparência no canvas
      stencil: false, // Desativa stencil buffer se não usado
      depth: true, // Buffer de profundidade essencial
      logarithmicDepthBuffer: false, // Desativado para performance
      precision: 'highp' // Precisão alta para cálculos
    });

    // Configurações de renderização
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limita a 2x para performance

    // Tone mapping para realismo (similar a engines modernas)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Sombras de alta qualidade
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Sombras suaves

    // Color management moderno
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Otimizações
    this.renderer.sortObjects = true; // Ordena objetos para melhor culling
    
    // Adiciona ao DOM
    this.domElement = this.renderer.domElement;
    const container = document.getElementById('canvas-container');
    if (container) {
      container.appendChild(this.domElement);
    }

    // Event listener para resize
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Configura pointer lock para controles FPS
    this.setupPointerLock();
  }

  private setupPointerLock(): void {
    this.domElement.addEventListener('click', () => {
      this.domElement.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === this.domElement) {
        console.log('🎮 Pointer lock ativado - Controles FPS ativos');
      }
    });
  }

  private onWindowResize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.render(scene, camera);
  }

  /**
   * Atualiza configurações de qualidade para otimização dinâmica
   */
  public setQuality(quality: 'low' | 'medium' | 'high' | 'ultra'): void {
    switch (quality) {
      case 'low':
        this.renderer.setPixelRatio(1);
        this.renderer.shadowMap.enabled = false;
        break;
      case 'medium':
        this.renderer.setPixelRatio(1);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        break;
      case 'high':
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        break;
      case 'ultra':
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        break;
    }
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.dispose();
    if (this.domElement.parentElement) {
      this.domElement.parentElement.removeChild(this.domElement);
    }
  }
}
