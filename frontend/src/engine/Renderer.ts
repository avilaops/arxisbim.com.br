import * as THREE from 'three';
import { PostProcessingPipeline, PostProcessQuality } from './PostProcessingPipeline.js';

/**
 * Renderer com pipeline de post-processing AAA
 * SSAO + Unreal Bloom + SMAA + Film Grain + Vignette
 */
export class Renderer {
  public renderer:    THREE.WebGLRenderer;
  public domElement:  HTMLElement;
  private postProcess: PostProcessingPipeline | null = null;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,           // SMAA é melhor — desligar MSAA nativo
      powerPreference: 'high-performance',
      alpha: false,
      stencil: true,              // SSAOPass precisa de stencil
      depth: true,
      logarithmicDepthBuffer: false,
      precision: 'highp',
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // HDR pipeline — tone mapping aplicado pelo OutputPass do composer
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.46;

    // Sombras
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;

    // Color space correto
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.sortObjects = true;

    this.domElement = this.renderer.domElement;
    const container = document.getElementById('canvas-container');
    if (container) container.appendChild(this.domElement);

    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.setupPointerLock();
  }

  /**
   * Inicializa o post-processing pipeline.
   * Deve ser chamado APÓS a cena e câmera estarem prontas.
   */
  public initPostProcessing(
    scene:   THREE.Scene,
    camera:  THREE.PerspectiveCamera,
    quality: PostProcessQuality = 'high',
  ): void {
    if (this.postProcess) {
      this.postProcess.dispose();
    }
    this.postProcess = new PostProcessingPipeline(this.renderer, scene, camera, quality);
    console.log(`✨ Post-processing pipeline ativo [${quality}]`);
  }

  private setupPointerLock(): void {
    this.domElement.addEventListener('click', () => {
      this.domElement.requestPointerLock();
    });
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === this.domElement) {
        console.log('🎮 Pointer lock ativado');
      }
    });
  }

  private onWindowResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.postProcess?.setSize(w, h);
  }

  /**
   * Renderiza a cena — usa post-processing se disponível
   */
  public render(scene: THREE.Scene, camera: THREE.Camera): void {
    if (this.postProcess) {
      this.postProcess.render();
    } else {
      this.renderer.render(scene, camera);
    }
  }

  /**
   * Troca preset de qualidade (low / medium / high / ultra)
   */
  public setQuality(quality: PostProcessQuality): void {
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
    this.postProcess?.setQuality(quality);
  }

  /** Acesso direto ao pipeline para ajustes em runtime */
  public getPostProcess(): PostProcessingPipeline | null {
    return this.postProcess;
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.postProcess?.dispose();
    this.renderer.dispose();
    if (this.domElement.parentElement) {
      this.domElement.parentElement.removeChild(this.domElement);
    }
  }
}
