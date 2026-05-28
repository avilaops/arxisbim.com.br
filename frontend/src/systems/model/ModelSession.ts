/**
 * ModelSession - Gerenciador de modelos federados
 * Permite carregar N modelos IFC simultaneamente com performance otimizada
 */

import * as THREE from 'three';
import type { FileHandle, FileLoadResult } from '../file/types';

/**
 * Performance Budget - limites por frame
 */
export interface PerformanceBudget {
  maxTrianglesPerFrame: number;      // 2M triangles = ~30fps
  maxMemoryMB: number;                // 2GB total
  maxDrawCalls: number;               // 1000 draw calls
  targetFPS: number;                  // 60fps ideal, 30fps minimum
  adaptiveQuality: boolean;           // Reduz qualidade se FPS < target
}

/**
 * LOD Strategy - como carregar progressivamente
 */
export enum LODStrategy {
  IMMEDIATE = 'immediate',           // Carrega tudo (só pra modelos pequenos)
  PROGRESSIVE = 'progressive',       // Overview primeiro, detalhe depois
  STREAMING = 'streaming',           // Chunks sob demanda
  ADAPTIVE = 'adaptive'              // Decide baseado em performance
}

/**
 * Loaded Model - referência a modelo carregado
 */
export interface LoadedModel {
  id: string;
  handle: FileHandle;
  loadResult: FileLoadResult;
  
  // Three.js references
  group: THREE.Group;                // Root group na scene
  meshes: THREE.Mesh[];              // Todas as meshes (⚠️ caro para modelos grandes)
  
  // Bounds cacheados (performance crítica)
  boundsLocal: THREE.Box3;           // Bounds em local space (calculado 1x)
  boundsWorld: THREE.Box3;           // Bounds em world space (atualizado se transform mudar)
  boundsNeedsUpdate: boolean;        // Flag para recalcular boundsWorld
  
  // LOD Proxies
  bboxHelper?: THREE.LineSegments;   // Bbox visual para LOD 3
  proxyMesh?: THREE.Mesh;            // Merged proxy para LOD 2 (opcional)
  
  // Transform
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  
  // Visibility/opacity
  visible: boolean;
  opacity: number;
  
  // LOD
  lodLevel: number;                  // 0=full detail, 1=medium, 2=low, 3=bbox only
  lodStrategy: LODStrategy;
  
  // Streaming state
  chunksLoaded: number;
  chunksTotal: number;
  streamingProgress: number;         // 0-1
  
  // Memory tracking
  estimatedMemoryMB: number;
  triangleCount: number;
  
  // Metadata
  metadata: Record<string, any>;
  tags: string[];
  
  // Isolation/clipping
  isolated: boolean;
  clipped: boolean;
  clippingPlanes?: THREE.Plane[];
}

/**
 * Selection State
 */
export interface SelectionState {
  objectIds: Set<string>;            // IDs dos objetos selecionados
  modelIds: Set<string>;             // IDs dos modelos com seleção
  handles: Map<string, THREE.Object3D>; // Object3D handles
}

/**
 * Camera State (para save/restore)
 */
export interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
  up: THREE.Vector3;
  fov: number;
  near: number;
  far: number;
}

/**
 * Model Session - gerencia estado de múltiplos modelos
 * ⚠️ NÃO é singleton - instancie por viewer/canvas
 */
export class ModelSession {
  public readonly id: string;
  public projectId?: string;
  
  // Models
  private models = new Map<string, LoadedModel>();
  private modelLoadOrder: string[] = [];  // Ordem de carregamento
  
  // Scene reference
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  
  // Selection
  private selection: SelectionState = {
    objectIds: new Set(),
    modelIds: new Set(),
    handles: new Map()
  };
  
  // Visibility
  private hiddenObjects = new Set<string>();
  private isolatedObjects = new Set<string>();
  
  // Performance
  private budget: PerformanceBudget;
  private currentTriangles = 0;
  private currentMemoryMB = 0;
  private currentFPS = 60;
  private adaptiveQualityEnabled = true;
  
  // LOD throttle (performance crítica)
  private lastLODUpdate = 0;
  private lodUpdateInterval = 250; // ms - só recalcula LOD a cada 250ms
  private lastCameraPosition = new THREE.Vector3();
  private cameraMovementThreshold = 5; // metros - só recalcula se câmera mover > 5m
  
  // Stats
  private stats = {
    totalModels: 0,
    totalTriangles: 0,
    totalMemoryMB: 0,
    visibleTriangles: 0,
    visibleDrawCalls: 0
  };
  
  constructor(scene: THREE.Scene, camera: THREE.Camera, budget?: Partial<PerformanceBudget>) {
    // ID estável com crypto.randomUUID() (RFC 4122 v4)
    this.id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? `session-${crypto.randomUUID()}`
      : `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    this.scene = scene;
    this.camera = camera;
    
    // Default budget (conservador para funcionar em qualquer hardware)
    this.budget = {
      maxTrianglesPerFrame: 2_000_000,   // 2M triangles
      maxMemoryMB: 2048,                  // 2GB
      maxDrawCalls: 1000,
      targetFPS: 30,                      // Mínimo aceitável
      adaptiveQuality: true,
      ...budget
    };
    
    console.log(`✅ ModelSession created: ${this.id}`);
  }

  /**
   * Adiciona modelo à sessão
   */
  public addModel(handle: FileHandle, loadResult: FileLoadResult, group: THREE.Group): LoadedModel {
    // ID estável com crypto.randomUUID()
    const modelId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? `model-${crypto.randomUUID()}`
      : `model-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    
    // Cacheia bounds UMA VEZ (performance crítica)
    const boundsLocal = new THREE.Box3().setFromObject(group);
    const boundsWorld = boundsLocal.clone();
    
    // Cria bbox helper para LOD 3 (visualização leve)
    const bboxHelper = new THREE.Box3Helper(boundsLocal, 0x00ff88);
    bboxHelper.visible = false; // Começa oculto
    this.scene.add(bboxHelper);
    
    const model: LoadedModel = {
      id: modelId,
      handle,
      loadResult,
      group,
      meshes: this.collectMeshes(group),
      boundsLocal,
      boundsWorld,
      boundsNeedsUpdate: false,
      bboxHelper,
      position: group.position.clone(),
      rotation: group.rotation.clone(),
      scale: group.scale.clone(),
      visible: true,
      opacity: 1,
      lodLevel: 0,
      lodStrategy: this.decideLODStrategy(loadResult),
      chunksLoaded: 1,
      chunksTotal: 1,
      streamingProgress: 1,
      estimatedMemoryMB: loadResult.metrics.estimatedMemoryMB || 0,
      triangleCount: loadResult.metrics.triangles || 0,
      metadata: handle.metadata,
      tags: [],
      isolated: false,
      clipped: false
    };

    this.models.set(model.id, model);
    this.modelLoadOrder.push(model.id);
    
    // Adiciona à scene
    this.scene.add(group);
    
    // Atualiza stats
    this.updateStats();
    
    // Aplica LOD inicial
    this.applyLOD(model);
    
    console.log(`✅ Model added to session: ${handle.displayName} (${model.triangleCount.toLocaleString()} triangles)`);
    
    return model;
  }

  /**
   * Coleta todas as meshes de um group recursivamente
   */
  private collectMeshes(group: THREE.Object3D): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        meshes.push(obj);
      }
    });
    
    return meshes;
  }

  /**
   * Decide estratégia LOD baseado no tamanho do modelo
   */
  private decideLODStrategy(loadResult: FileLoadResult): LODStrategy {
    const triangles = loadResult.metrics.triangles || 0;
    const memoryMB = loadResult.metrics.estimatedMemoryMB || 0;
    
    // Modelo pequeno (< 500k triangles, < 100MB)
    if (triangles < 500_000 && memoryMB < 100) {
      return LODStrategy.IMMEDIATE;
    }
    
    // Modelo médio (< 2M triangles, < 500MB)
    if (triangles < 2_000_000 && memoryMB < 500) {
      return LODStrategy.PROGRESSIVE;
    }
    
    // Modelo grande (> 2M triangles ou > 500MB)
    return LODStrategy.STREAMING;
  }

  /**
   * Remove modelo da sessão
   */
  public removeModel(modelId: string): boolean {
    const model = this.models.get(modelId);
    if (!model) return false;
    
    // Remove da scene
    this.scene.remove(model.group);
    
    // Dispose geometries e materials
    this.disposeModel(model);
    
    // Remove dos maps
    this.models.delete(modelId);
    this.modelLoadOrder = this.modelLoadOrder.filter(id => id !== modelId);
    
    // Atualiza stats
    this.updateStats();
    
    console.log(`🗑️ Model removed: ${model.handle.displayName}`);
    
    return true;
  }

  /**
   * Dispose model resources
   */
  private disposeModel(model: LoadedModel): void {
    model.meshes.forEach(mesh => {
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(mat => mat.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
  }

  /**
   * Obtém modelo por ID
   */
  public getModel(modelId: string): LoadedModel | undefined {
    return this.models.get(modelId);
  }

  /**
   * Lista todos os modelos
   */
  public getAllModels(): LoadedModel[] {
    return Array.from(this.models.values());
  }

  /**
   * Conta total de modelos
   */
  public getModelCount(): number {
    return this.models.size;
  }

  /**
   * Atualiza stats da sessão
   */
  private updateStats(): void {
    let totalTriangles = 0;
    let totalMemory = 0;
    let visibleTriangles = 0;
    let visibleDrawCalls = 0;
    
    this.models.forEach(model => {
      totalTriangles += model.triangleCount;
      totalMemory += model.estimatedMemoryMB;
      
      if (model.visible && model.group) {
        visibleTriangles += model.triangleCount;
        
        // Conta draw calls (meshes visíveis)
        model.group.traverse((obj: any) => {
          if (obj.isMesh && obj.visible) {
            visibleDrawCalls++;
          }
        });
      }
    });
    
    this.stats = {
      totalModels: this.models.size,
      totalTriangles,
      totalMemoryMB: totalMemory,
      visibleTriangles,
      visibleDrawCalls // ✅ Valor real baseado em meshes visíveis
    };
    
    this.currentTriangles = visibleTriangles;
    this.currentMemoryMB = totalMemory;
  }

  /**
   * Aplica LOD a um modelo
   */
  private applyLOD(model: LoadedModel): void {
    const distance = this.getModelDistance(model);
    
    // Define LOD level baseado na distância
    let targetLOD = 0;
    
    if (distance > 100) {
      targetLOD = 3; // Bounding box only
    } else if (distance > 50) {
      targetLOD = 2; // Low detail
    } else if (distance > 20) {
      targetLOD = 1; // Medium detail
    } else {
      targetLOD = 0; // Full detail
    }
    
    // Aplica LOD se mudou
    if (model.lodLevel !== targetLOD) {
      this.setModelLOD(model, targetLOD);
    }
  }

  /**
   * Calcula distância da câmera ao modelo
   */
  private getModelDistance(model: LoadedModel): number {
    const modelCenter = new THREE.Vector3();
    model.group.getWorldPosition(modelCenter);
    
    const cameraPos = this.camera.position;
    return cameraPos.distanceTo(modelCenter);
  }

  /**
   * Define LOD level de um modelo
   */
  private setModelLOD(model: LoadedModel, level: number): void {
    model.lodLevel = level;
    
    // Aplica LOD às meshes
    model.meshes.forEach(mesh => {
      switch (level) {
        case 0: // Full detail
          mesh.visible = true;
          if (mesh.geometry.attributes.position) {
            // Mantém geometria completa
          }
          break;
          
        case 1: // Medium detail (50% triangles)
          mesh.visible = true;
          // TODO: Simplificar geometria
          break;
          
        case 2: // Low detail (25% triangles)
          mesh.visible = true;
          // TODO: Simplificar mais
          break;
          
        case 3: // Bounding box only - mostra só bbox helper
          mesh.visible = false;
          break;
      }
    });
    
    // Controla visibilidade do bbox helper
    if (model.bboxHelper) {
      model.bboxHelper.visible = (level === 3);
    }
  }

  /**
   * Update loop - chama a cada frame
   */
  public update(_deltaTime: number): void {
    // LOD throttled - só roda se tempo passou E câmera se moveu
    const now = performance.now();
    const cameraDist = this.camera.position.distanceTo(this.lastCameraPosition);
    const timeElapsed = now - this.lastLODUpdate;
    
    if (timeElapsed > this.lodUpdateInterval || cameraDist > this.cameraMovementThreshold) {
      // Atualiza LOD de todos os modelos
      this.models.forEach(model => {
        if (model.visible) {
          this.applyLOD(model);
        }
      });
      
      // Atualiza cache
      this.lastLODUpdate = now;
      this.lastCameraPosition.copy(this.camera.position);
    }
    
    // Adaptive quality
    if (this.adaptiveQualityEnabled && this.currentFPS < this.budget.targetFPS) {
      this.reduceQuality();
    }
    
    // Frustum culling
    this.performFrustumCulling();
    
    // Atualiza stats
    this.updateStats();
  }

  /**
   * Reduz qualidade para melhorar FPS
   */
  private reduceQuality(): void {
    // Aumenta LOD level de todos os modelos
    this.models.forEach(model => {
      if (model.lodLevel < 3) {
        this.setModelLOD(model, model.lodLevel + 1);
      }
    });
    
    console.warn(`⚠️ Adaptive quality: reducing LOD (FPS: ${this.currentFPS})`);
  }

  /**
   * Frustum culling - esconde objetos fora da câmera
   */
  private performFrustumCulling(): void {
    const frustum = new THREE.Frustum();
    const projScreenMatrix = new THREE.Matrix4();
    
    if (this.camera instanceof THREE.PerspectiveCamera) {
      projScreenMatrix.multiplyMatrices(
        this.camera.projectionMatrix,
        this.camera.matrixWorldInverse
      );
      frustum.setFromProjectionMatrix(projScreenMatrix);
      
      this.models.forEach(model => {
        if (!model.visible) return;
        
        // Atualiza bounds world se necessário
        if (model.boundsNeedsUpdate) {
          model.boundsWorld.copy(model.boundsLocal).applyMatrix4(model.group.matrixWorld);
          model.boundsNeedsUpdate = false;
        }
        
        // Testa com bounds cached
        const inFrustum = frustum.intersectsBox(model.boundsWorld);
        
        // Esconde/mostra
        model.group.visible = inFrustum;
      });
    }
  }

  /**
   * Define FPS atual (atualizado externamente)
   */
  public setCurrentFPS(fps: number): void {
    this.currentFPS = fps;
  }

  /**
   * Obtém stats da sessão
   */
  public getStats() {
    return {
      ...this.stats,
      currentFPS: this.currentFPS,
      budget: this.budget,
      budgetUsage: {
        triangles: (this.currentTriangles / this.budget.maxTrianglesPerFrame) * 100,
        memory: (this.currentMemoryMB / this.budget.maxMemoryMB) * 100
      }
    };
  }

  /**
   * Salva estado da câmera
   */
  public saveCameraState(): CameraState {
    // Calcula target usando direction vector (camera lookAt)
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    const target = this.camera.position.clone().add(direction.multiplyScalar(10));
    
    if (this.camera instanceof THREE.PerspectiveCamera) {
      return {
        position: this.camera.position.clone(),
        target, // ✅ Target calculado via direction vector
        up: this.camera.up.clone(),
        fov: this.camera.fov,
        near: this.camera.near,
        far: this.camera.far
      };
    }
    
    return {
      position: this.camera.position.clone(),
      target,
      up: this.camera.up.clone(),
      fov: 75,
      near: 0.1,
      far: 1000
    };
  }

  /**
   * Restaura estado da câmera
   */
  public restoreCameraState(state: CameraState): void {
    this.camera.position.copy(state.position);
    this.camera.up.copy(state.up);
    
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.camera.fov = state.fov;
      this.camera.near = state.near;
      this.camera.far = state.far;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Limpa toda a sessão
   */
  public clear(): void {
    // Remove todos os modelos
    const modelIds = Array.from(this.models.keys());
    modelIds.forEach(id => this.removeModel(id));
    
    // Limpa selection
    this.selection.objectIds.clear();
    this.selection.modelIds.clear();
    this.selection.handles.clear();
    
    // Limpa visibility
    this.hiddenObjects.clear();
    this.isolatedObjects.clear();
    
    console.log('🧹 Session cleared');
  }

  /**
   * Obtém info resumida da sessão
   */
  public getInfo() {
    return {
      id: this.id,
      projectId: this.projectId,
      modelCount: this.models.size,
      models: Array.from(this.models.values()).map(m => ({
        id: m.id,
        name: m.handle.displayName,
        triangles: m.triangleCount,
        memoryMB: m.estimatedMemoryMB,
        lodLevel: m.lodLevel,
        visible: m.visible
      })),
      stats: this.getStats()
    };
  }
}
