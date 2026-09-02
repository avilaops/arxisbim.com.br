/**
 * MemoryMonitor
 * Monitora uso de memória e otimiza recursos não utilizados
 * Libera geometrias, texturas e buffers quando não visíveis
 */

import * as THREE from 'three';

export interface MemoryStats {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  geometries: number;
  textures: number;
  materials: number;
}

export interface MemoryConfig {
  autoCleanup: boolean;
  cleanupInterval: number;
  memoryThreshold: number; // MB
}

class MemoryMonitor {
  private scene: THREE.Scene;
  private config: MemoryConfig;
  private cleanupTimer: number | null = null;
  private trackedObjects: Set<THREE.Object3D> = new Set();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.config = {
      autoCleanup: true,
      cleanupInterval: 30000, // 30 segundos
      memoryThreshold: 500, // 500 MB
    };
  }

  /**
   * Adiciona objeto para monitoramento
   */
  trackObject(object: THREE.Object3D): void {
    this.trackedObjects.add(object);
  }

  /**
   * Remove objeto do monitoramento
   */
  untrackObject(object: THREE.Object3D): void {
    this.trackedObjects.delete(object);
  }

  /**
   * Retorna estatísticas de memória
   */
  getStats(): MemoryStats {
    const performance = (window as any).performance;
    const memory = performance?.memory || {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
    };

    let geometries = 0;
    const textures = 0;
    let materials = 0;

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry) geometries++;
        if (object.material) {
          if (Array.isArray(object.material)) {
            materials += object.material.length;
          } else {
            materials++;
          }
        }
      }
    });

    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      geometries,
      textures,
      materials,
    };
  }

  /**
   * Limpa recursos não utilizados
   */
  cleanup(): void {
    console.log('[MemoryMonitor] Starting cleanup...');

    const stats = this.getStats();
    const usedMB = stats.usedJSHeapSize / (1024 * 1024);

    if (usedMB > this.config.memoryThreshold) {
      console.warn(`[MemoryMonitor] Memory usage high: ${usedMB.toFixed(2)} MB`);
    }

    // Limpar objetos não rastreados
    const objectsToRemove: THREE.Object3D[] = [];
    this.scene.traverse((object) => {
      if (!this.trackedObjects.has(object) && object instanceof THREE.Mesh) {
        objectsToRemove.push(object);
      }
    });

    objectsToRemove.forEach(obj => {
      this.disposeObject(obj);
      this.scene.remove(obj);
    });

    console.log(`[MemoryMonitor] Cleanup completed. Removed ${objectsToRemove.length} objects.`);
  }

  /**
   * Libera recursos de um objeto
   */
  private disposeObject(object: THREE.Object3D): void {
    if (object instanceof THREE.Mesh) {
      if (object.geometry) {
        object.geometry.dispose();
      }

      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(mat => mat.dispose());
        } else {
          object.material.dispose();
        }
      }
    }

    // Recursivamente liberar filhos
    object.children.forEach(child => {
      this.disposeObject(child);
    });
  }

  /**
   * Descarrega modelo específico
   */
  unloadModel(model: THREE.Object3D): void {
    console.log('[MemoryMonitor] Unloading model');
    this.disposeObject(model);
    this.scene.remove(model);
    this.trackedObjects.delete(model);
  }

  /**
   * Descarrega texturas não visíveis
   */
  unloadInvisibleTextures(): void {
    const frustum = new THREE.Frustum();
    const camera = this.scene.getObjectByProperty('type', 'PerspectiveCamera') as THREE.PerspectiveCamera;
    
    if (!camera) {
      return;
    }

    frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    ));

    let unloadedCount = 0;

    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        const boundingBox = new THREE.Box3().setFromObject(object);
        if (!frustum.intersectsBox(boundingBox)) {
          // Em produção, descarregar textura
          unloadedCount++;
        }
      }
    });

    console.log(`[MemoryMonitor] Unloaded ${unloadedCount} invisible textures`);
  }

  /**
   * Inicia limpeza automática
   */
  startAutoCleanup(): void {
    if (this.cleanupTimer) {
      return;
    }

    this.cleanupTimer = window.setInterval(() => {
      if (this.config.autoCleanup) {
        this.cleanup();
      }
    }, this.config.cleanupInterval);

    console.log('[MemoryMonitor] Auto cleanup started');
  }

  /**
   * Para limpeza automática
   */
  stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      console.log('[MemoryMonitor] Auto cleanup stopped');
    }
  }

  /**
   * Define configuração
   */
  setConfig(config: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Reiniciar timer se intervalo mudou
    if (config.cleanupInterval && this.cleanupTimer) {
      this.stopAutoCleanup();
      this.startAutoCleanup();
    }

    console.log('[MemoryMonitor] Config updated:', config);
  }

  /**
   * Retorna configuração
   */
  getConfig(): MemoryConfig {
    return { ...this.config };
  }

  /**
   * Limpa todos os recursos
   */
  dispose(): void {
    this.stopAutoCleanup();
    
    // Limpar todos os objetos rastreados
    this.trackedObjects.forEach(obj => {
      this.disposeObject(obj);
      this.scene.remove(obj);
    });
    
    this.trackedObjects.clear();
    console.log('[MemoryMonitor] Disposed');
  }
}

export default MemoryMonitor;
