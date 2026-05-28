/**
 * Occlusion Culling System
 * Sistema de oclusão que remove objetos bloqueados visualmente da renderização
 * Usa técnica de bounding volume hierarquia + raycasting
 */

import * as THREE from 'three';

export interface OcclusionCullingOptions {
  enabled?: boolean;
  testInterval?: number; // frames entre testes
  maxDistance?: number; // distância máxima para testar
  occluderThreshold?: number; // tamanho mínimo para ser occluder
}

export class OcclusionCullingSystem {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private raycaster: THREE.Raycaster;
  private options: Required<OcclusionCullingOptions>;
  private frameCount: number = 0;
  private occluders: THREE.Object3D[] = [];
  private occludees: Set<THREE.Object3D> = new Set();
  private visibilityCache: Map<string, { visible: boolean; frame: number }> = new Map();
  private octree: THREE.Object3D[] = []; // Simplified spatial structure

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    options: OcclusionCullingOptions = {}
  ) {
    this.scene = scene;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.options = {
      enabled: options.enabled ?? true,
      testInterval: options.testInterval ?? 2, // testa a cada 2 frames
      maxDistance: options.maxDistance ?? 100,
      occluderThreshold: options.occluderThreshold ?? 5, // objetos > 5m² podem ocluir
    };

    this.buildOccluderList();
  }

  /**
   * Identifica objetos grandes o suficiente para serem occluders
   */
  private buildOccluderList(): void {
    this.occluders = [];
    
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.visible) {
        const bbox = new THREE.Box3().setFromObject(object);
        const size = bbox.getSize(new THREE.Vector3());
        const area = size.x * size.y + size.y * size.z + size.x * size.z;
        
        if (area >= this.options.occluderThreshold) {
          this.occluders.push(object);
        } else {
          this.occludees.add(object);
        }
      }
    });

    console.log(`🔍 Occlusion Culling: ${this.occluders.length} occluders, ${this.occludees.size} occludees`);
  }

  /**
   * Atualiza a lista de occluders dinamicamente
   */
  public updateOccluders(): void {
    this.buildOccluderList();
  }

  /**
   * Testa se um objeto está visível ou ocluído
   */
  private testVisibility(object: THREE.Object3D): boolean {
    // Skip if camera too far
    const distance = this.camera.position.distanceTo(object.position);
    if (distance > this.options.maxDistance) {
      return false; // muito longe, considera invisível
    }

    // Get object center
    const bbox = new THREE.Box3().setFromObject(object);
    const center = bbox.getCenter(new THREE.Vector3());

    // Raycast from camera to object
    const direction = center.clone().sub(this.camera.position).normalize();
    this.raycaster.set(this.camera.position, direction);
    this.raycaster.far = distance;

    // Test intersection with occluders
    const intersects = this.raycaster.intersectObjects(this.occluders, false);

    if (intersects.length > 0) {
      // Check if first intersection is before our object
      const firstIntersect = intersects[0];
      const intersectDistance = firstIntersect.distance;
      
      if (intersectDistance < distance - 0.1) {
        // Something is blocking, object is occluded
        return false;
      }
    }

    return true;
  }

  /**
   * Update - roda a cada frame
   */
  public update(): void {
    if (!this.options.enabled) return;

    this.frameCount++;

    // Só testa a cada N frames
    if (this.frameCount % this.options.testInterval !== 0) {
      return;
    }

    let culled = 0;
    let visible = 0;

    this.occludees.forEach((object) => {
      const uuid = object.uuid;
      
      // Check cache first
      const cached = this.visibilityCache.get(uuid);
      if (cached && (this.frameCount - cached.frame) < 30) {
        // Use cached result for 30 frames
        if (!cached.visible && object.visible) {
          object.visible = false;
          culled++;
        } else if (cached.visible && !object.visible) {
          object.visible = true;
          visible++;
        }
        return;
      }

      // Test visibility
      const isVisible = this.testVisibility(object);
      
      // Update cache
      this.visibilityCache.set(uuid, {
        visible: isVisible,
        frame: this.frameCount
      });

      // Apply visibility
      if (isVisible && !object.visible) {
        object.visible = true;
        visible++;
      } else if (!isVisible && object.visible) {
        object.visible = false;
        culled++;
      }
    });

    if (culled > 0 || visible > 0) {
      console.log(`🔍 Occlusion: ${culled} culled, ${visible} revealed`);
    }
  }

  /**
   * Limpa cache antigo
   */
  public clearOldCache(): void {
    const maxAge = 60; // frames
    this.visibilityCache.forEach((value, key) => {
      if (this.frameCount - value.frame > maxAge) {
        this.visibilityCache.delete(key);
      }
    });
  }

  /**
   * Estatísticas
   */
  public getStats(): {
    occluders: number;
    occludees: number;
    cached: number;
    culledCount: number;
  } {
    let culledCount = 0;
    this.occludees.forEach((obj) => {
      if (!obj.visible) culledCount++;
    });

    return {
      occluders: this.occluders.length,
      occludees: this.occludees.size,
      cached: this.visibilityCache.size,
      culledCount
    };
  }

  /**
   * Habilita/desabilita o sistema
   */
  public setEnabled(enabled: boolean): void {
    this.options.enabled = enabled;
    
    if (!enabled) {
      // Restore all visibility
      this.occludees.forEach((obj) => {
        obj.visible = true;
      });
    }
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    this.occluders = [];
    this.occludees.clear();
    this.visibilityCache.clear();
  }
}
