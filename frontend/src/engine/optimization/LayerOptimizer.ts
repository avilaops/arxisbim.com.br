import * as THREE from 'three';
import { Layer } from '../../core/types';

/**
 * LayerOptimizer - Otimizações por layer
 * Integra com o sistema de layers para aplicar otimizações específicas
 * 
 * Features:
 * - Culling por layer
 * - LOD por layer
 * - Controle de renderização por layer
 * - Estatísticas por layer
 */
export class LayerOptimizer {
  private scene: THREE.Scene;
  
  // Configurações por layer
  private layerCulling: Map<string, boolean> = new Map();
  private layerLOD: Map<string, { near: number; mid: number; far: number }> = new Map();
  private layerMaxDistance: Map<string, number> = new Map();
  
  // Estatísticas
  private culledObjectsByLayer: Map<string, number> = new Map();
  private visibleObjectsByLayer: Map<string, number> = new Map();
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    console.log('🎭 Layer Optimizer initialized');
  }
  
  /**
   * Define culling para um layer específico
   */
  public setLayerCulling(layerId: string, enabled: boolean): void {
    this.layerCulling.set(layerId, enabled);
    console.log(`🎭 Layer ${layerId} culling: ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Define distâncias LOD para um layer
   */
  public setLayerLOD(
    layerId: string, 
    distances: { near: number; mid: number; far: number }
  ): void {
    this.layerLOD.set(layerId, distances);
    console.log(`🎭 Layer ${layerId} LOD: ${JSON.stringify(distances)}`);
  }
  
  /**
   * Define distância máxima de renderização para um layer
   */
  public setLayerMaxDistance(layerId: string, maxDistance: number): void {
    this.layerMaxDistance.set(layerId, maxDistance);
    console.log(`🎭 Layer ${layerId} max distance: ${maxDistance}m`);
  }
  
  /**
   * Aplica culling baseado em layers
   */
  public applyLayerCulling(camera: THREE.Camera, layers: Layer[]): void {
    // Reseta estatísticas
    this.culledObjectsByLayer.clear();
    this.visibleObjectsByLayer.clear();
    
    this.scene.traverse((object: THREE.Object3D) => {
      if (!(object as THREE.Mesh).isMesh) return;
      
      const mesh = object as THREE.Mesh;
      const layerId = (mesh.userData as { layerId?: string }).layerId;
      
      if (!layerId) return;
      
      // Verifica se o layer está visível
      const layer = layers.find(l => l.id === layerId);
      if (!layer || !layer.visible) {
        mesh.visible = false;
        this.culledObjectsByLayer.set(
          layerId, 
          (this.culledObjectsByLayer.get(layerId) || 0) + 1
        );
        return;
      }
      
      // Aplica culling por distância se configurado
      const maxDistance = this.layerMaxDistance.get(layerId);
      if (maxDistance) {
        const distance = camera.position.distanceTo(mesh.position);
        
        if (distance > maxDistance) {
          mesh.visible = false;
          this.culledObjectsByLayer.set(
            layerId, 
            (this.culledObjectsByLayer.get(layerId) || 0) + 1
          );
          return;
        }
      }
      
      // Aplica LOD por layer
      const lodDistances = this.layerLOD.get(layerId);
      if (lodDistances) {
        this.applyObjectLOD(mesh, camera, lodDistances);
      }
      
      mesh.visible = true;
      this.visibleObjectsByLayer.set(
        layerId, 
        (this.visibleObjectsByLayer.get(layerId) || 0) + 1
      );
    });
  }
  
  /**
   * Aplica LOD a um objeto específico
   */
  private applyObjectLOD(
    mesh: THREE.Mesh,
    camera: THREE.Camera,
    distances: { near: number; mid: number; far: number }
  ): void {
    const distance = camera.position.distanceTo(mesh.position);
    
    // LOD Near: máxima qualidade
    if (distance < distances.near) {
      mesh.frustumCulled = true;
      mesh.renderOrder = 0;
      
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat: THREE.Material) => {
          if (mat instanceof THREE.MeshStandardMaterial || 
              mat instanceof THREE.MeshPhysicalMaterial) {
            mat.needsUpdate = true;
          }
        });
      } else if (mesh.material instanceof THREE.MeshStandardMaterial || 
                 mesh.material instanceof THREE.MeshPhysicalMaterial) {
        mesh.material.needsUpdate = true;
      }
    }
    // LOD Mid: qualidade média
    else if (distance < distances.mid) {
      mesh.frustumCulled = true;
      mesh.renderOrder = 1;
      
      // Reduz complexidade de materiais
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat: THREE.Material) => {
          if (mat instanceof THREE.MeshStandardMaterial || 
              mat instanceof THREE.MeshPhysicalMaterial) {
            mat.needsUpdate = false;
          }
        });
      } else if (mesh.material instanceof THREE.MeshStandardMaterial || 
                 mesh.material instanceof THREE.MeshPhysicalMaterial) {
        mesh.material.needsUpdate = false;
      }
    }
    // LOD Far: baixa qualidade ou culling
    else if (distance < distances.far) {
      mesh.frustumCulled = true;
      mesh.renderOrder = 2;
      
      // Simplifica material para MeshBasicMaterial
      if (!mesh.userData.originalMaterial) {
        mesh.userData.originalMaterial = mesh.material;
      }
    }
    else {
      // Além da distância máxima
      mesh.visible = false;
    }
  }
  
  /**
   * Define LOD para um objeto específico
   */
  public setObjectLOD(
    object: THREE.Object3D,
    levels: Array<{ distance: number; object: THREE.Object3D }>
  ): void {
    const lod = new THREE.LOD();
    
    levels.forEach(level => {
      lod.addLevel(level.object, level.distance);
    });
    
    // Substitui objeto por LOD
    if (object.parent) {
      const parent = object.parent;
      const index = parent.children.indexOf(object);
      
      parent.remove(object);
      parent.children.splice(index, 0, lod);
    }
    
    console.log(`🎭 LOD set for object with ${levels.length} levels`);
  }
  
  /**
   * Retorna estatísticas de otimização
   */
  public getStats(): {
    totalCulled: number;
    totalVisible: number;
    byLayer: Map<string, { culled: number; visible: number; ratio: number }>;
  } {
    let totalCulled = 0;
    let totalVisible = 0;
    
    const byLayer = new Map<string, { culled: number; visible: number; ratio: number }>();
    
    // Calcula totais
    this.culledObjectsByLayer.forEach((count, layerId) => {
      totalCulled += count;
      const visible = this.visibleObjectsByLayer.get(layerId) || 0;
      const total = count + visible;
      const ratio = total > 0 ? (count / total) * 100 : 0;
      
      byLayer.set(layerId, {
        culled: count,
        visible,
        ratio: Math.round(ratio * 100) / 100
      });
    });
    
    this.visibleObjectsByLayer.forEach((count, layerId) => {
      if (!byLayer.has(layerId)) {
        totalVisible += count;
        byLayer.set(layerId, {
          culled: 0,
          visible: count,
          ratio: 0
        });
      } else {
        totalVisible += count;
      }
    });
    
    return { totalCulled, totalVisible, byLayer };
  }
  
  /**
   * Imprime estatísticas
   */
  public printStats(): void {
    const stats = this.getStats();
    
    console.log('═══════════════════════════════════════');
    console.log('🎭 LAYER OPTIMIZER STATS');
    console.log('═══════════════════════════════════════');
    console.log(`Total Visible: ${stats.totalVisible}`);
    console.log(`Total Culled: ${stats.totalCulled}`);
    console.log('───────────────────────────────────────');
    
    stats.byLayer.forEach((layerStats, layerId) => {
      console.log(`Layer ${layerId}:`);
      console.log(`  Visible: ${layerStats.visible}`);
      console.log(`  Culled: ${layerStats.culled} (${layerStats.ratio}%)`);
    });
    
    console.log('═══════════════════════════════════════');
  }
  
  /**
   * Limpa todas as configurações
   */
  public clear(): void {
    this.layerCulling.clear();
    this.layerLOD.clear();
    this.layerMaxDistance.clear();
    this.culledObjectsByLayer.clear();
    this.visibleObjectsByLayer.clear();
    
    console.log('🎭 Layer optimizer cleared');
  }
}

export interface LayerStats {
  totalCulled: number;
  totalVisible: number;
  byLayer: Map<string, { culled: number; visible: number; ratio: number }>;
}
