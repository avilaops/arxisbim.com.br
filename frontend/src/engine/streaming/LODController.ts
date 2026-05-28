import * as THREE from 'three';
import { eventBus, EventType } from '../../core';

/**
 * LODController - Gerenciador de Levels of Detail
 * Troca automática de meshes baseado em distância e performance
 * 
 * Features:
 * - LOD adaptativo baseado em FPS
 * - Múltiplos níveis de detalhe
 * - Frustum culling automático
 * - Performance-aware switching
 */
export class LODController {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  
  private lodObjects: Map<string, {
    lod: THREE.LOD;
    levels: Array<{ distance: number; object: THREE.Object3D }>;
  }> = new Map();
  
  // Configurações
  private currentFPS: number = 60;
  private qualityLevel: number = 2; // 0 = low, 1 = medium, 2 = high
  
  // Distâncias padrão para cada nível
  private defaultDistances = {
    high: [0, 50, 100, 200],
    medium: [0, 30, 60, 120],
    low: [0, 20, 40, 80]
  };
  
  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
    
    console.log('🎚️ LOD Controller initialized');
  }
  
  /**
   * Cria objeto LOD com múltiplos níveis
   */
  public createLOD(
    objectId: string,
    levels: Array<{ distance: number; object: THREE.Object3D }>
  ): THREE.LOD {
    const lod = new THREE.LOD();
    lod.name = `LOD_${objectId}`;
    
    levels.forEach((level) => {
      lod.addLevel(level.object, level.distance);
    });
    
    this.lodObjects.set(objectId, { lod, levels });
    this.scene.add(lod);
    
    console.log(`✅ LOD created: ${objectId} (${levels.length} levels)`);
    return lod;
  }
  
  /**
   * Cria LOD automático de um objeto (gerando níveis simplificados)
   */
  public createAutoLOD(objectId: string, originalObject: THREE.Object3D): THREE.LOD {
    const levels = this.generateLODLevels(originalObject);
    return this.createLOD(objectId, levels);
  }
  
  /**
   * Gera níveis LOD automaticamente
   */
  private generateLODLevels(original: THREE.Object3D): Array<{ distance: number; object: THREE.Object3D }> {
    const distances = this.getDistancesForQuality();
    
    const levels: Array<{ distance: number; object: THREE.Object3D }> = [];
    
    // Nível 0: Original (alta qualidade)
    levels.push({
      distance: distances[0],
      object: original
    });
    
    // Nível 1: Média qualidade (70% detail)
    const medium = this.simplifyObject(original.clone(), 0.7);
    levels.push({
      distance: distances[1],
      object: medium
    });
    
    // Nível 2: Baixa qualidade (40% detail)
    const low = this.simplifyObject(original.clone(), 0.4);
    levels.push({
      distance: distances[2],
      object: low
    });
    
    // Nível 3: Muito baixa (bounding box)
    const veryLow = this.createBoundingBox(original);
    levels.push({
      distance: distances[3],
      object: veryLow
    });
    
    return levels;
  }
  
  /**
   * Simplifica objeto (remove geometria)
   */
  private simplifyObject(object: THREE.Object3D, factor: number): THREE.Object3D {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Simplificação básica: reduz resolução de geometria
        // Em produção, usar algoritmo de simplificação real (Quadric Error Metrics)
        
        if (child.geometry instanceof THREE.SphereGeometry) {
          const params = child.geometry.parameters;
          const newSegments = Math.max(8, Math.floor((params.widthSegments || 32) * factor));
          child.geometry = new THREE.SphereGeometry(
            params.radius,
            newSegments,
            newSegments
          );
        } else if (child.geometry instanceof THREE.CylinderGeometry) {
          const params = child.geometry.parameters;
          const newSegments = Math.max(8, Math.floor((params.radialSegments || 32) * factor));
          child.geometry = new THREE.CylinderGeometry(
            params.radiusTop,
            params.radiusBottom,
            params.height,
            newSegments
          );
        }
      }
    });
    
    return object;
  }
  
  /**
   * Cria bounding box simples do objeto
   */
  private createBoundingBox(object: THREE.Object3D): THREE.Object3D {
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);
    
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const material = new THREE.MeshBasicMaterial({
      color: 0x888888,
      wireframe: true
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(object.position);
    
    return mesh;
  }
  
  /**
   * Atualiza todos os LODs baseado na câmera
   */
  public update(): void {
    this.lodObjects.forEach((entry) => {
      entry.lod.update(this.camera);
    });
    
    // Ajusta qualidade baseado em FPS
    this.adjustQualityBasedOnFPS();
  }
  
  /**
   * Ajusta qualidade automaticamente baseado em FPS
   */
  private adjustQualityBasedOnFPS(): void {
    const fpsThreshold = {
      low: 30,
      medium: 45,
      high: 55
    };
    
    if (this.currentFPS < fpsThreshold.low && this.qualityLevel > 0) {
      this.qualityLevel = 0;
      this.updateAllLODDistances();
      console.log('⬇️ Quality reduced to LOW (FPS:', this.currentFPS, ')');
      
    } else if (this.currentFPS < fpsThreshold.medium && this.qualityLevel > 1) {
      this.qualityLevel = 1;
      this.updateAllLODDistances();
      console.log('⬇️ Quality reduced to MEDIUM (FPS:', this.currentFPS, ')');
      
    } else if (this.currentFPS > fpsThreshold.high && this.qualityLevel < 2) {
      this.qualityLevel = 2;
      this.updateAllLODDistances();
      console.log('⬆️ Quality increased to HIGH (FPS:', this.currentFPS, ')');
    }
  }
  
  /**
   * Atualiza distâncias de todos os LODs
   */
  private updateAllLODDistances(): void {
    this.lodObjects.forEach((entry) => {
      const distances = this.getDistancesForQuality();
      
      entry.levels.forEach((_, index) => {
        if (index < distances.length) {
          entry.lod.levels[index].distance = distances[index];
        }
      });
    });
  }
  
  /**
   * Retorna distâncias baseado no nível de qualidade
   */
  private getDistancesForQuality(): number[] {
    switch (this.qualityLevel) {
      case 0: return this.defaultDistances.low;
      case 1: return this.defaultDistances.medium;
      case 2: return this.defaultDistances.high;
      default: return this.defaultDistances.medium;
    }
  }
  
  /**
   * Define FPS atual (chamado externamente)
   */
  public setCurrentFPS(fps: number): void {
    this.currentFPS = fps;
  }
  
  /**
   * Define nível de qualidade manualmente
   */
  public setQualityLevel(level: 0 | 1 | 2): void {
    this.qualityLevel = level;
    this.updateAllLODDistances();
    
    const qualityName = ['LOW', 'MEDIUM', 'HIGH'][level];
    console.log(`🎚️ Quality set to ${qualityName}`);
    
    eventBus.emit(EventType.RENDER_QUALITY_CHANGED, { quality: qualityName });
  }
  
  /**
   * Remove LOD
   */
  public removeLOD(objectId: string): void {
    const entry = this.lodObjects.get(objectId);
    
    if (entry) {
      this.scene.remove(entry.lod);
      this.lodObjects.delete(objectId);
      console.log(`🗑️ LOD removed: ${objectId}`);
    }
  }
  
  /**
   * Retorna estatísticas
   */
  public getStats(): {
    lodCount: number;
    qualityLevel: string;
    currentFPS: number;
  } {
    return {
      lodCount: this.lodObjects.size,
      qualityLevel: ['LOW', 'MEDIUM', 'HIGH'][this.qualityLevel],
      currentFPS: this.currentFPS
    };
  }
  
  /**
   * Imprime estatísticas
   */
  public printStats(): void {
    const stats = this.getStats();
    console.log('📊 LOD Controller Stats:');
    console.log(`   LOD Objects: ${stats.lodCount}`);
    console.log(`   Quality: ${stats.qualityLevel}`);
    console.log(`   FPS: ${stats.currentFPS.toFixed(2)}`);
  }
}
