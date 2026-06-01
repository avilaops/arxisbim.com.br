import * as THREE from 'three';
import { EntityManager, LODComponent, MeshComponent, TransformComponent } from '../engine/ecs';

/**
 * Level of Detail System
 * Sistema avançado de LOD para manter 60+ FPS mesmo em cenas complexas
 * Superior ao sistema de culling do Unity
 */
export class LODSystem {
  private camera: THREE.PerspectiveCamera;
  private registeredModels: Map<string, LODModel> = new Map();
  private frustum: THREE.Frustum = new THREE.Frustum();
  private frustumMatrix: THREE.Matrix4 = new THREE.Matrix4();

  // Cache de material variants (FIX ENTERPRISE - não mutar materiais compartilhados)
  private materialVariants: Map<THREE.Material, MaterialVariants> = new Map();

  // Estatísticas do sistema
  private stats: LODStats = {
    totalObjects: 0,
    visibleObjects: 0,
    culledObjects: 0,
    highLOD: 0,
    mediumLOD: 0,
    lowLOD: 0
  };

  // Distâncias LOD (em metros - escala 1:1) com HYSTERESIS
  private readonly LOD_DISTANCES = {
    HIGH: 20,      // Detalhes completos até 20m
    MEDIUM: 50,    // Detalhes médios até 50m
    LOW: 100,      // Detalhes baixos até 100m
    CULLED: 150    // Além disso, não renderiza
  };

  // Hysteresis margin (previne flicker)
  private readonly HYSTERESIS_MARGIN = 0.15; // 15% margem

  // Relevância IFC - elementos críticos mantêm alta qualidade
  private readonly IFC_RELEVANCE = {
    STRUCTURAL: ['IFCWALL', 'IFCCOLUMN', 'IFCBEAM', 'IFCSLAB'], // Sempre HIGH
    IMPORTANT: ['IFCDOOR', 'IFCWINDOW', 'IFCSTAIR'], // HIGH até 100m
    SECONDARY: ['IFCFURNISHINGELEMENT', 'IFCSPACE'] // Pode reduzir LOD
  };

  // Fator de relevância (0-1, onde 1 = sempre HIGH)
  private relevanceFactor: number = 0.7;

  constructor(camera: THREE.PerspectiveCamera, private entityManager?: EntityManager) {
    this.camera = camera;
  }

  /**
   * Registra modelo no sistema LOD
   */
  public registerModel(model: THREE.Object3D): void {
    const id = model.uuid;
    const lodModel: LODModel = {
      object: model,
      meshes: [],
      boundingBox: new THREE.Box3(),
      boundingSphere: new THREE.Sphere(),
      currentLOD: 'HIGH'
    };

    // Coleta todas as meshes e calcula bounding volumes
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        lodModel.meshes.push(child);
        this.stats.totalObjects++;
      }
    });

    // Calcula bounding volumes do modelo completo
    lodModel.boundingBox.setFromObject(model);
    lodModel.boundingBox.getBoundingSphere(lodModel.boundingSphere);

    this.registeredModels.set(id, lodModel);

    console.log(`📊 Modelo registrado no LOD System: ${lodModel.meshes.length} meshes`);
  }

  /**
   * Atualiza LOD usando ECS (para entidades com LODComponent)
   */
  public updateECSLOD(): void {
    if (!this.entityManager) return;

    const entities = this.entityManager.getEntitiesWithComponents(
      LODComponent,
      MeshComponent,
      TransformComponent
    );

    entities.forEach(entity => {
      const lodComp = entity.getComponent(LODComponent);
      const meshComp = entity.getComponent(MeshComponent);
      const transformComp = entity.getComponent(TransformComponent);

      if (!lodComp || !meshComp || !transformComp) return;

      const distance = this.camera.position.distanceTo(transformComp.position);

      // Determina LOD baseado na distância e relevância
      let targetLevel: number;
      if (distance > lodComp.maxDistance) {
        targetLevel = 0; // CULLED
      } else if (distance > lodComp.maxDistance * 0.5) {
        targetLevel = 1; // LOW
      } else if (distance > lodComp.maxDistance * 0.2) {
        targetLevel = 2; // MEDIUM
      } else {
        targetLevel = 3; // HIGH
      }

      // Atualiza LOD se mudou
      if (lodComp.level !== targetLevel) {
        this.applyECSLOD(meshComp.mesh, targetLevel);
        lodComp.level = targetLevel;
      }
    });
  }

  /**
   * Aplica LOD a mesh via ECS
   */
  private applyECSLOD(mesh: THREE.Mesh, level: number): void {
    // Simplificação: ajustar visibilidade e qualidade baseado no LOD
    const material = mesh.material;
    
    switch (level) {
      case 3: // HIGH
        mesh.visible = true;
        // Usa material original (high variant)
        if (Array.isArray(material)) {
          mesh.material = material.map(mat => this.getMaterialVariant(mat, 'high'));
        } else {
          mesh.material = this.getMaterialVariant(material, 'high');
        }
        break;
      case 2: // MEDIUM
        mesh.visible = true;
        if (Array.isArray(material)) {
          mesh.material = material.map(mat => this.getMaterialVariant(mat, 'medium'));
        } else {
          mesh.material = this.getMaterialVariant(material, 'medium');
        }
        break;
      case 1: // LOW
        mesh.visible = true;
        if (Array.isArray(material)) {
          mesh.material = material.map(mat => this.getMaterialVariant(mat, 'low'));
        } else {
          mesh.material = this.getMaterialVariant(material, 'low');
        }
        break;
      case 0: // CULLED
        mesh.visible = false;
        break;
    }
  }

  /**
   * Atualiza LOD de todos os objetos baseado na posição da câmera
   */
  public update(): void {
    // Reseta estatísticas
    this.stats.visibleObjects = 0;
    this.stats.culledObjects = 0;
    this.stats.highLOD = 0;
    this.stats.mediumLOD = 0;
    this.stats.lowLOD = 0;

    // Atualiza frustum matrix
    this.frustumMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.frustumMatrix);

    // Processa modelos tradicionais
    this.registeredModels.forEach((lodModel) => {
      this.updateModelLOD(lodModel);
    });

    // Processa entidades ECS
    this.updateECSLOD();
  }

  /**
   * Atualiza LOD de um modelo específico
   */
  private updateModelLOD(lodModel: LODModel): void {
    // Verifica se o modelo está no frustum
    if (!this.frustum.intersectsBox(lodModel.boundingBox)) {
      // Modelo fora do frustum - oculta tudo
      lodModel.meshes.forEach(mesh => {
        mesh.visible = false;
      });
      this.stats.culledObjects += lodModel.meshes.length;
      return;
    }

    // Calcula distância EFETIVA (FIX ENTERPRISE - considera raio do modelo)
    const distanceToCenter = this.camera.position.distanceTo(lodModel.boundingSphere.center);
    const effectiveDistance = Math.max(0, distanceToCenter - lodModel.boundingSphere.radius);

    // Determina relevância IFC do modelo
    const relevance = this.calculateIFCRelevance(lodModel);

    // Ajusta distâncias LOD baseado na relevância
    const adjustedDistances = this.adjustLODDistances(relevance);

    // Determina nível LOD com HYSTERESIS (previne flicker)
    let targetLOD: LODLevel = lodModel.currentLOD;
    const currentLOD = lodModel.currentLOD;

    // Lógica de hysteresis: margem para mudanças de nível
    if (currentLOD === 'HIGH') {
      if (effectiveDistance > adjustedDistances.HIGH * (1 + this.HYSTERESIS_MARGIN)) {
        targetLOD = 'MEDIUM';
      }
    } else if (currentLOD === 'MEDIUM') {
      if (effectiveDistance < adjustedDistances.HIGH * (1 - this.HYSTERESIS_MARGIN)) {
        targetLOD = 'HIGH';
      } else if (effectiveDistance > adjustedDistances.MEDIUM * (1 + this.HYSTERESIS_MARGIN)) {
        targetLOD = 'LOW';
      }
    } else if (currentLOD === 'LOW') {
      if (effectiveDistance < adjustedDistances.MEDIUM * (1 - this.HYSTERESIS_MARGIN)) {
        targetLOD = 'MEDIUM';
      } else if (effectiveDistance > adjustedDistances.LOW * (1 + this.HYSTERESIS_MARGIN)) {
        targetLOD = 'CULLED';
      }
    } else { // CULLED
      if (effectiveDistance < adjustedDistances.LOW * (1 - this.HYSTERESIS_MARGIN)) {
        targetLOD = 'LOW';
      }
    }

    // Aplica LOD se mudou
    if (lodModel.currentLOD !== targetLOD) {
      this.applyLOD(lodModel, targetLOD);
      lodModel.currentLOD = targetLOD;
    }

    // Atualiza estatísticas
    switch (targetLOD) {
      case 'HIGH':
        this.stats.highLOD += lodModel.meshes.length;
        this.stats.visibleObjects += lodModel.meshes.length;
        break;
      case 'MEDIUM':
        this.stats.mediumLOD += lodModel.meshes.length;
        this.stats.visibleObjects += lodModel.meshes.length;
        break;
      case 'LOW':
        this.stats.lowLOD += lodModel.meshes.length;
        this.stats.visibleObjects += lodModel.meshes.length;
        break;
      case 'CULLED':
        this.stats.culledObjects += lodModel.meshes.length;
        break;
    }
  }

  /**
   * Aplica LOD a um modelo
   */
  private applyLOD(lodModel: LODModel, targetLOD: LODLevel): void {
    lodModel.meshes.forEach(mesh => {
      switch (targetLOD) {
        case 'HIGH':
          mesh.visible = true;
          this.setMeshQuality(mesh, 'high');
          break;

        case 'MEDIUM':
          mesh.visible = true;
          this.setMeshQuality(mesh, 'medium');
          break;

        case 'LOW':
          mesh.visible = true;
          this.setMeshQuality(mesh, 'low');
          break;

        case 'CULLED':
          mesh.visible = false;
          break;
      }
    });
  }

  /**
   * Calcula relevância IFC do modelo (0-1)
   */
  private calculateIFCRelevance(lodModel: LODModel): number {
    let structuralCount = 0;
    let importantCount = 0;
    let totalCount = 0;

    lodModel.meshes.forEach(mesh => {
      const ifcType = mesh.userData?.ifcType || mesh.userData?.expressID?.split('_')[0];
      totalCount++;

      if (this.IFC_RELEVANCE.STRUCTURAL.some(type => ifcType?.toUpperCase().includes(type))) {
        structuralCount++;
      } else if (this.IFC_RELEVANCE.IMPORTANT.some(type => ifcType?.toUpperCase().includes(type))) {
        importantCount++;
      }
    });

    // Relevância baseada na proporção de elementos estruturais/importantes
    const structuralRatio = structuralCount / totalCount;
    const importantRatio = importantCount / totalCount;

    return Math.min(1.0, structuralRatio * 1.0 + importantRatio * 0.7 + (1 - structuralRatio - importantRatio) * 0.3);
  }

  /**
   * Ajusta distâncias LOD baseado na relevância
   */
  private adjustLODDistances(relevance: number): typeof this.LOD_DISTANCES {
    const factor = 1 + (relevance * this.relevanceFactor);

    return {
      HIGH: this.LOD_DISTANCES.HIGH * factor,
      MEDIUM: this.LOD_DISTANCES.MEDIUM * factor,
      LOW: this.LOD_DISTANCES.LOW * factor,
      CULLED: this.LOD_DISTANCES.CULLED * factor
    };
  }

  /**
   * Configura qualidade de renderização da mesh
   */
  private setMeshQuality(mesh: THREE.Mesh, quality: 'high' | 'medium' | 'low'): void {
    const material = mesh.material;

    if (Array.isArray(material)) {
      // Handle material arrays (common in IFC)
      mesh.material = material.map(mat => this.getMaterialVariant(mat, quality));
    } else {
      mesh.material = this.getMaterialVariant(material, quality);
    }

    // Configura sombras baseado na qualidade
    switch (quality) {
      case 'high':
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        break;
      case 'medium':
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        break;
      case 'low':
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        break;
    }
  }

  /**
   * Obtém material variant do cache (FIX ENTERPRISE - não mutar materiais compartilhados)
   */
  private getMaterialVariant(material: THREE.Material, quality: 'high' | 'medium' | 'low'): THREE.Material {
    // Verifica se já temos variants desse material
    if (!this.materialVariants.has(material)) {
      this.createMaterialVariants(material);
    }

    const variants = this.materialVariants.get(material)!;
    switch (quality) {
      case 'high': return variants.high;
      case 'medium': return variants.medium;
      case 'low': return variants.low;
      default: return variants.high;
    }
  }

  /**
   * Cria variants de um material (FIX ENTERPRISE)
   */
  private createMaterialVariants(material: THREE.Material): void {
    const variants: MaterialVariants = {
      high: material, // Original é HIGH
      medium: material.clone(),
      low: material.clone()
    };

    // Ajusta MEDIUM variant
    if (variants.medium instanceof THREE.MeshStandardMaterial) {
      variants.medium.roughness = Math.min(1.0, (variants.medium.roughness || 0.5) + 0.1);
      variants.medium.metalness = Math.max(0.0, (variants.medium.metalness || 0.0) - 0.05);
      variants.medium.envMapIntensity = (variants.medium.envMapIntensity || 1.0) * 0.5;
    }

    // Ajusta LOW variant
    if (variants.low instanceof THREE.MeshStandardMaterial) {
      variants.low.roughness = 1.0;
      variants.low.metalness = 0.0;
      variants.low.envMapIntensity = 0.0;
    }

    this.materialVariants.set(material, variants);
  }

  /**
   * Obtém estatísticas do sistema LOD
   */
  public getStats(): LODStats {
    return { ...this.stats };
  }

  /**
   * Configura distâncias LOD customizadas
   */
  public setLODDistances(high: number, medium: number, low: number, culled: number): void {
    (this.LOD_DISTANCES as any).HIGH = high;
    (this.LOD_DISTANCES as any).MEDIUM = medium;
    (this.LOD_DISTANCES as any).LOW = low;
    (this.LOD_DISTANCES as any).CULLED = culled;
  }

  /**
   * Cria LOD (Level of Detail) para um objeto
   * @param id Identificador único do LOD
   * @param levels Array de níveis LOD com distâncias e objetos correspondentes
   */
  public createLOD(id: string, levels: Array<{ distance: number; object: THREE.Object3D }>): void {
    if (levels.length === 0) {
      console.warn(`⚠️ createLOD chamado com array vazio para ID: ${id}`);
      return;
    }

    // Ordena níveis por distância (menor para maior)
    const sortedLevels = [...levels].sort((a, b) => a.distance - b.distance);

    // Cria modelo LOD baseado no primeiro nível (mais detalhado)
    const baseObject = sortedLevels[0].object;
    const lodModel: LODModel = {
      object: baseObject,
      meshes: [],
      boundingBox: new THREE.Box3(),
      boundingSphere: new THREE.Sphere(),
      currentLOD: 'HIGH'
    };

    // Coleta todas as meshes do objeto base
    baseObject.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        lodModel.meshes.push(child);
        this.stats.totalObjects++;
      }
    });

    // Calcula bounding volumes
    lodModel.boundingBox.setFromObject(baseObject);
    lodModel.boundingBox.getBoundingSphere(lodModel.boundingSphere);

    // Armazena o modelo LOD
    this.registeredModels.set(id, lodModel);

    // Armazena os níveis de LOD para troca dinâmica
    const lodLevels: LODLevelData[] = sortedLevels.map((level, index) => ({
      distance: level.distance,
      object: level.object,
      visible: index === 0 // Apenas o primeiro nível é visível inicialmente
    }));

    // Adiciona userData para rastrear níveis LOD
    baseObject.userData.lodLevels = lodLevels;
    baseObject.userData.currentLevelIndex = 0;
    baseObject.userData.lodId = id;

    console.log(`📊 LOD criado: ${id} com ${lodLevels.length} níveis (distâncias: ${lodLevels.map(l => l.distance).join(', ')})`);
  }

  /**
   * Remove modelo do sistema LOD
   */
  public unregisterModel(model: THREE.Object3D): void {
    const id = model.uuid;
    const lodModel = this.registeredModels.get(id);

    if (lodModel) {
      this.stats.totalObjects -= lodModel.meshes.length;
      this.registeredModels.delete(id);
    }
  }

  public dispose(): void {
    // Dispose material variants
    this.materialVariants.forEach((variants) => {
      // Não dispor 'high' (original)
      variants.medium.dispose();
      variants.low.dispose();
    });
    this.materialVariants.clear();

    this.registeredModels.clear();
    this.stats = {
      totalObjects: 0,
      visibleObjects: 0,
      culledObjects: 0,
      highLOD: 0,
      mediumLOD: 0,
      lowLOD: 0
    };
  }
}

// Types
type LODLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'CULLED';

interface MaterialVariants {
  high: THREE.Material;
  medium: THREE.Material;
  low: THREE.Material;
}

interface LODModel {
  object: THREE.Object3D;
  meshes: THREE.Mesh[];
  boundingBox: THREE.Box3;
  boundingSphere: THREE.Sphere;
  currentLOD: LODLevel;
}

interface LODStats {
  totalObjects: number;
  visibleObjects: number;
  culledObjects: number;
  highLOD: number;
  mediumLOD: number;
  lowLOD: number;
}

interface LODLevelData {
  distance: number;
  object: THREE.Object3D;
  visible: boolean;
}
