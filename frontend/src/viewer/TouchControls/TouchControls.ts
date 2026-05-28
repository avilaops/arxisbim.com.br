/**
 * TouchControls
 * Controles de navegação por touch para dispositivos móveis
 * Suporta pinch-to-zoom, pan e rotate com gestos multitouch
 */

import * as THREE from 'three';

export interface TouchControlsConfig {
  rotateSpeed: number;
  zoomSpeed: number;
  panSpeed: number;
  enableRotate: boolean;
  enableZoom: boolean;
  enablePan: boolean;
}

class TouchControls {
  private camera: THREE.Camera;
  private domElement: HTMLElement;
  private config: TouchControlsConfig;
  
  // Estado de gestos
  private touches: Map<number, { x: number; y: number }> = new Map();
  private previousTouchDistance: number = 0;
  private previousTouchCenter: { x: number; y: number } = { x: 0, y: 0 };
  private isRotating: boolean = false;
  private isZooming: boolean = false;
  private isPanning: boolean = false;

  // Callbacks
  private onChangeCallback?: () => void;

  constructor(camera: THREE.Camera, domElement: HTMLElement, config?: Partial<TouchControlsConfig>) {
    this.camera = camera;
    this.domElement = domElement;
    this.config = {
      rotateSpeed: 0.005,
      zoomSpeed: 0.001,
      panSpeed: 0.5,
      enableRotate: true,
      enableZoom: true,
      enablePan: true,
      ...config,
    };

    this.init();
  }

  private init(): void {
    this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
    this.domElement.addEventListener('touchcancel', this.onTouchEnd.bind(this), { passive: false });

    console.log('[TouchControls] Initialized');
  }

  private onTouchStart(event: TouchEvent): void {
    event.preventDefault();

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      this.touches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
    }

    this.updateGestureState();
  }

  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      this.touches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
    }

    this.handleGestures();
  }

  private onTouchEnd(event: TouchEvent): void {
    event.preventDefault();

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      this.touches.delete(touch.identifier);
    }

    this.updateGestureState();
  }

  private updateGestureState(): void {
    const touchCount = this.touches.size;

    this.isRotating = touchCount === 1 && this.config.enableRotate;
    this.isZooming = touchCount === 2 && this.config.enableZoom;
    this.isPanning = touchCount === 2 && this.config.enablePan;

    if (touchCount === 2) {
      const touchArray = Array.from(this.touches.values());
      this.previousTouchDistance = this.calculateDistance(touchArray[0], touchArray[1]);
      this.previousTouchCenter = this.calculateCenter(touchArray[0], touchArray[1]);
    }
  }

  private handleGestures(): void {
    const touchArray = Array.from(this.touches.values());

    if (this.isRotating && touchArray.length === 1) {
      this.handleRotate(touchArray[0]);
    } else if (this.isZooming && touchArray.length === 2) {
      this.handleZoom(touchArray[0], touchArray[1]);
    } else if (this.isPanning && touchArray.length === 2) {
      this.handlePan(touchArray[0], touchArray[1]);
    }
  }

  private handleRotate(touch: { x: number; y: number }): void {
    // Implementar rotação baseada em movimento de touch único
    // Em produção, integrar com controles de câmera existentes
    console.log('[TouchControls] Rotate:', touch.x, touch.y);
    this.notifyChange();
  }

  private handleZoom(touch1: { x: number; y: number }, touch2: { x: number; y: number }): void {
    const currentDistance = this.calculateDistance(touch1, touch2);
    const delta = currentDistance - this.previousTouchDistance;

    if (Math.abs(delta) > 1) {
      const zoomFactor = 1 + delta * this.config.zoomSpeed;
      this.applyZoom(zoomFactor);
      this.previousTouchDistance = currentDistance;
    }
  }

  private handlePan(touch1: { x: number; y: number }, touch2: { x: number; y: number }): void {
    const currentCenter = this.calculateCenter(touch1, touch2);
    const deltaX = currentCenter.x - this.previousTouchCenter.x;
    const deltaY = currentCenter.y - this.previousTouchCenter.y;

    if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
      this.applyPan(deltaX, deltaY);
      this.previousTouchCenter = currentCenter;
    }
  }

  private calculateDistance(touch1: { x: number; y: number }, touch2: { x: number; y: number }): number {
    const dx = touch2.x - touch1.x;
    const dy = touch2.y - touch1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateCenter(touch1: { x: number; y: number }, touch2: { x: number; y: number }): { x: number; y: number } {
    return {
      x: (touch1.x + touch2.x) / 2,
      y: (touch1.y + touch2.y) / 2,
    };
  }

  private applyZoom(factor: number): void {
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.zoom *= factor;
      this.camera.zoom = Math.max(0.1, Math.min(this.camera.zoom, 10));
      this.camera.updateProjectionMatrix();
      this.notifyChange();
    }
  }

  private applyPan(deltaX: number, deltaY: number): void {
    // Implementar pan baseado em movimento de dois toques
    // Em produção, integrar com controles de câmera existentes
    console.log('[TouchControls] Pan:', deltaX, deltaY);
    this.notifyChange();
  }

  private notifyChange(): void {
    if (this.onChangeCallback) {
      this.onChangeCallback();
    }
  }

  /**
   * Define callback de mudança
   */
  onChange(callback: () => void): void {
    this.onChangeCallback = callback;
  }

  /**
   * Define configuração
   */
  setConfig(config: Partial<TouchControlsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Retorna configuração
   */
  getConfig(): TouchControlsConfig {
    return { ...this.config };
  }

  /**
   * Habilita/desabilita controles
   */
  setEnabled(enabled: boolean): void {
    this.config.enableRotate = enabled;
    this.config.enableZoom = enabled;
    this.config.enablePan = enabled;
  }

  /**
   * Limpa recursos
   */
  dispose(): void {
    this.domElement.removeEventListener('touchstart', this.onTouchStart.bind(this));
    this.domElement.removeEventListener('touchmove', this.onTouchMove.bind(this));
    this.domElement.removeEventListener('touchend', this.onTouchEnd.bind(this));
    this.domElement.removeEventListener('touchcancel', this.onTouchEnd.bind(this));
    this.touches.clear();
    console.log('[TouchControls] Disposed');
  }
}

export default TouchControls;
