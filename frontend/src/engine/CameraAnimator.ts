import * as THREE from 'three';

/**
 * CameraAnimator - Animações suaves de câmera
 * 
 * Focus on selection, Frame all, smooth transitions com easing
 */
export class CameraAnimator {
  private static instance: CameraAnimator;
  
  private camera: THREE.Camera | null = null;
  private isAnimating: boolean = false;
  private animationId: number | null = null;
  
  private constructor() {
    console.log('🎬 CameraAnimator initialized');
  }
  
  public static getInstance(): CameraAnimator {
    if (!CameraAnimator.instance) {
      CameraAnimator.instance = new CameraAnimator();
    }
    return CameraAnimator.instance;
  }
  
  /**
   * Inicializa com câmera
   */
  public initialize(camera: THREE.Camera): void {
    this.camera = camera;
    console.log('✅ CameraAnimator initialized with camera');
  }
  
  /**
   * Foca em objeto(s) selecionado(s)
   */
  public async focusOn(objects: THREE.Object3D[], duration: number = 1000): Promise<void> {
    if (!this.camera || objects.length === 0) return;
    
    // Calcula bounding box dos objetos
    const box = new THREE.Box3();
    objects.forEach(obj => box.expandByObject(obj));
    
    // Centro e tamanho
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Calcula distância ideal
    const fov = (this.camera as THREE.PerspectiveCamera).fov || 75;
    const distance = maxDim / (2 * Math.tan((fov * Math.PI) / 360)) * 1.5;
    
    // Posição target (mantém direção atual)
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    const targetPosition = center.clone().sub(direction.multiplyScalar(distance));
    
    // Anima
    await this.animateToPosition(targetPosition, center, duration);
    
    console.log(`🎯 Focused on ${objects.length} object(s)`);
  }
  
  /**
   * Enquadra todos os objetos da cena
   */
  public async frameAll(scene: THREE.Scene, duration: number = 1500): Promise<void> {
    if (!this.camera) return;
    
    // Calcula bounding box de toda a cena (exceto helpers)
    const box = new THREE.Box3();
    
    scene.traverse(obj => {
      if (obj.type !== 'Scene' && !this.isHelper(obj) && obj.visible) {
        box.expandByObject(obj);
      }
    });
    
    // Verifica se há objetos
    if (box.isEmpty()) {
      console.warn('⚠️ No objects to frame');
      return;
    }
    
    // Centro e tamanho
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Calcula distância ideal
    const fov = (this.camera as THREE.PerspectiveCamera).fov || 75;
    const distance = maxDim / (2 * Math.tan((fov * Math.PI) / 360)) * 1.8;
    
    // Posição isométrica
    const targetPosition = new THREE.Vector3(
      center.x + distance * 0.7,
      center.y + distance * 0.7,
      center.z + distance * 0.7
    );
    
    // Anima
    await this.animateToPosition(targetPosition, center, duration);
    
    console.log('🖼️ Framed all objects');
  }
  
  /**
   * Anima câmera para posição e target
   */
  private async animateToPosition(
    targetPosition: THREE.Vector3,
    targetLookAt: THREE.Vector3,
    duration: number
  ): Promise<void> {
    if (!this.camera || this.isAnimating) return;
    
    this.isAnimating = true;
    
    const startPosition = this.camera.position.clone();
    
    // Calcula lookAt atual
    const startLookAt = new THREE.Vector3();
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    startLookAt.copy(startPosition).add(direction);
    
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing (easeInOutCubic)
        const t = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        
        // Interpola posição
        this.camera!.position.lerpVectors(startPosition, targetPosition, t);
        
        // Interpola lookAt
        const currentLookAt = new THREE.Vector3().lerpVectors(startLookAt, targetLookAt, t);
        this.camera!.lookAt(currentLookAt);
        
        if (progress < 1) {
          this.animationId = requestAnimationFrame(animate);
        } else {
          this.isAnimating = false;
          this.animationId = null;
          resolve();
        }
      };
      
      animate();
    });
  }
  
  /**
   * Para animação atual
   */
  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isAnimating = false;
  }
  
  /**
   * Verifica se é helper
   */
  private isHelper(obj: THREE.Object3D): boolean {
    return obj.type.includes('Helper') || obj.name.includes('Helper') || obj.name.includes('Grid');
  }
  
  /**
   * Verifica se está animando
   */
  public get animating(): boolean {
    return this.isAnimating;
  }
}

// Export singleton
export const cameraAnimator = CameraAnimator.getInstance();

/**
 * Funções de easing para animações
 */
export const Easing = {
  linear: (t: number) => t,
  
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  
  easeInQuart: (t: number) => t * t * t * t,
  easeOutQuart: (t: number) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
  
  easeInExpo: (t: number) => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: (t: number) => {
    if (t === 0 || t === 1) return t;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  }
};
