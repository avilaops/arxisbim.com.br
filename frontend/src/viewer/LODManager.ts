/**
 * LODManager
 * Gerencia níveis de detalhe (LOD) e streaming de geometria
 * Otimiza performance carregando geometria sob demanda
 */

import * as THREE from 'three';

export type LODLevel = 'lod0' | 'lod1' | 'lod2' | 'auto';

export interface LODConfig {
  distanceThreshold: number;
  enabled: boolean;
  autoMode: boolean;
}

export interface LODSection {
  id: string;
  boundingBox: THREE.Box3;
  loaded: boolean;
  currentLOD: LODLevel;
  geometries: Map<LODLevel, THREE.BufferGeometry>;
}

class LODManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private sections: Map<string, LODSection> = new Map();
  private config: LODConfig;
  private updateInterval: number = 1000; // 1 segundo
  private updateTimer: number | null = null;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    this.config = {
      distanceThreshold: 100,
      enabled: true,
      autoMode: true,
    };
  }

  /**
   * Adiciona seção com múltiplos LODs
   */
  addSection(id: string, boundingBox: THREE.Box3, geometries: Map<LODLevel, THREE.BufferGeometry>): void {
    const section: LODSection = {
      id,
      boundingBox,
      loaded: false,
      currentLOD: 'lod0',
      geometries,
    };

    this.sections.set(id, section);
    console.log('[LODManager] Section added:', id);
  }

  /**
   * Remove seção
   */
  removeSection(id: string): void {
    const section = this.sections.get(id);
    if (section) {
      // Descarregar geometrias
      section.geometries.forEach(geo => geo.dispose());
      this.sections.delete(id);
      console.log('[LODManager] Section removed:', id);
    }
  }

  /**
   * Carrega seção específica
   */
  loadSection(id: string, lodLevel: LODLevel = 'lod2'): void {
    const section = this.sections.get(id);
    if (!section) {
      return;
    }

    console.log('[LODManager] Loading section:', id, 'with LOD:', lodLevel);

    // Em produção, carregar geometria do LOD especificado
    section.loaded = true;
    section.currentLOD = lodLevel;
  }

  /**
   * Descarrega seção
   */
  unloadSection(id: string): void {
    const section = this.sections.get(id);
    if (!section) {
      return;
    }

    console.log('[LODManager] Unloading section:', id);
    section.loaded = false;
  }

  /**
   * Define nível de LOD
   */
  setLOD(level: LODLevel): void {
    this.config.autoMode = level === 'auto';
    
    if (!this.config.autoMode) {
      // Aplicar LOD manual a todas as seções
      this.sections.forEach(section => {
        if (section.loaded) {
          this.loadSection(section.id, level);
        }
      });
    }

    console.log('[LODManager] LOD set to:', level);
  }

  /**
   * Atualiza LODs baseado na posição da câmera
   */
  updateLODs(): void {
    if (!this.config.enabled || !this.config.autoMode) {
      return;
    }

    const cameraPosition = new THREE.Vector3();
    this.camera.getWorldPosition(cameraPosition);

    this.sections.forEach(section => {
      if (!section.loaded) {
        return;
      }

      const center = new THREE.Vector3();
      section.boundingBox.getCenter(center);
      const distance = cameraPosition.distanceTo(center);

      // Determinar LOD baseado na distância
      let targetLOD: LODLevel = 'lod2';
      if (distance > this.config.distanceThreshold * 2) {
        targetLOD = 'lod0'; // Bounding box apenas
      } else if (distance > this.config.distanceThreshold) {
        targetLOD = 'lod1'; // Geometria simplificada
      } else {
        targetLOD = 'lod2'; // Geometria completa
      }

      // Atualizar se necessário
      if (section.currentLOD !== targetLOD) {
        this.loadSection(section.id, targetLOD);
      }
    });
  }

  /**
   * Inicia atualização automática
   */
  startAutoUpdate(): void {
    if (this.updateTimer) {
      return;
    }

    this.updateTimer = window.setInterval(() => {
      this.updateLODs();
    }, this.updateInterval);

    console.log('[LODManager] Auto update started');
  }

  /**
   * Para atualização automática
   */
  stopAutoUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
      console.log('[LODManager] Auto update stopped');
    }
  }

  /**
   * Define configuração
   */
  setConfig(config: Partial<LODConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[LODManager] Config updated:', config);
  }

  /**
   * Retorna configuração
   */
  getConfig(): LODConfig {
    return { ...this.config };
  }

  /**
   * Retorna estatísticas
   */
  getStats(): Record<string, number> {
    const sections = Array.from(this.sections.values());
    return {
      total: sections.length,
      loaded: sections.filter(s => s.loaded).length,
      lod0: sections.filter(s => s.currentLOD === 'lod0').length,
      lod1: sections.filter(s => s.currentLOD === 'lod1').length,
      lod2: sections.filter(s => s.currentLOD === 'lod2').length,
    };
  }

  /**
   * Limpa todos os recursos
   */
  dispose(): void {
    this.stopAutoUpdate();
    this.sections.forEach(section => {
      section.geometries.forEach(geo => geo.dispose());
    });
    this.sections.clear();
    console.log('[LODManager] Disposed');
  }
}

export default LODManager;
