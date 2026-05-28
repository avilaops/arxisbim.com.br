import * as THREE from 'three';
import { IFCLoader } from '../loaders/IFCLoader';
import { LODSystem } from '../systems/LODSystem';
import { EntityManager } from '../engine/ecs';

/**
 * IFCStreamingLoader - Loader IFC ultra-performático com streaming
 * Carrega arquivos IFC grandes de forma progressiva e eficiente
 */
export class IFCStreamingLoader {
  private scene: THREE.Scene;
  private ifcLoader: IFCLoader;
  private lodSystem: LODSystem;
  private entityManager: EntityManager;

  // Configurações de streaming
  private streamConfig = {
    maxConcurrentLoads: 3,
    preloadDistance: 1000, // metros
    unloadDistance: 2000,  // metros
    chunkSize: 50,         // entidades por chunk
    priorityLevels: 3,     // níveis de prioridade
    enableGeometryReuse: true,
    enableMaterialReuse: true
  };

  // Estado do streaming
  private activeStreams: Map<string, StreamJob> = new Map();
  private loadedChunks: Set<string> = new Set();
  private pendingQueue: StreamJob[] = [];
  private activeLoads: number = 0;

  // Cache de geometria e materiais
  private geometryCache: Map<string, THREE.BufferGeometry> = new Map();
  private materialCache: Map<string, THREE.Material> = new Map();

  // Workers para processamento paralelo
  private workers: Worker[] = [];
  private workerPool: Worker[] = [];

  constructor(scene: THREE.Scene, ifcLoader: IFCLoader, lodSystem: LODSystem, entityManager: EntityManager) {
    this.scene = scene;
    this.ifcLoader = ifcLoader;
    this.lodSystem = lodSystem;
    this.entityManager = entityManager;

    this.initializeWorkers();
  }

  /**
   * Inicializa pool de workers para processamento paralelo
   */
  private initializeWorkers(): void {
    const workerCount = this.streamConfig.maxConcurrentLoads;

    for (let i = 0; i < workerCount; i++) {
      try {
        // Worker para processamento IFC
        const worker = new Worker('./workers/ifc-streaming-worker.ts', { type: 'module' });
        this.setupWorker(worker);
        this.workers.push(worker);
        this.workerPool.push(worker);
      } catch (error) {
        console.warn(`⚠️ Não foi possível criar worker ${i}:`, error);
      }
    }

    console.log(`🔄 IFCStreamingLoader inicializado com ${this.workers.length} workers`);
  }

  /**
   * Configura worker para comunicação
   */
  private setupWorker(worker: Worker): void {
    worker.onmessage = (event) => {
      this.handleWorkerMessage(event.data, worker);
    };

    worker.onerror = (error) => {
      console.error('❌ Erro no worker:', error);
    };
  }

  /**
   * Trata mensagens dos workers
   */
  private handleWorkerMessage(data: any, worker: Worker): void {
    const { type, jobId, result, error } = data;

    if (error) {
      console.error(`❌ Erro no worker para job ${jobId}:`, error);
      return;
    }

    switch (type) {
      case 'chunk_loaded':
        this.handleChunkLoaded(jobId, result);
        break;
      case 'analysis_complete':
        this.handleAnalysisComplete(jobId, result);
        break;
      case 'geometry_processed':
        this.handleGeometryProcessed(jobId, result);
        break;
    }

    // Retorna worker ao pool
    this.workerPool.push(worker);
    this.processQueue();
  }

  /**
   * Carrega arquivo IFC com streaming ultra-performático
   */
  public async streamIFC(file: File, camera: THREE.Camera): Promise<void> {
    console.log(`🚀 Iniciando streaming ultra-performático IFC: ${file.name}`);

    // Cria job de streaming principal
    const mainJob: StreamJob = {
      id: `ifc-stream-${Date.now()}`,
      type: 'ifc_analysis',
      file: file,
      priority: 0,
      status: 'pending',
      camera: camera,
      chunks: [],
      loadedChunks: new Set(),
      startTime: Date.now()
    };

    this.pendingQueue.push(mainJob);
    this.processQueue();

    // Retorna promise que resolve quando streaming estiver completo
    return new Promise((resolve, reject) => {
      mainJob.onComplete = resolve;
      mainJob.onError = reject;
    });
  }

  /**
   * Processa fila de streaming
   */
  private async processQueue(): Promise<void> {
    if (this.activeLoads >= this.streamConfig.maxConcurrentLoads || this.workerPool.length === 0) {
      return;
    }

    const job = this.getNextJob();
    if (!job) return;

    const worker = this.workerPool.shift();
    if (!worker) return;

    this.activeLoads++;
    job.status = 'loading';
    this.activeStreams.set(job.id, job);

    // Envia job para worker
    worker.postMessage({
      type: 'process_job',
      job: job
    });
  }

  /**
   * Obtém próximo job da fila por prioridade
   */
  private getNextJob(): StreamJob | null {
    if (this.pendingQueue.length === 0) return null;

    // Ordena por prioridade (menor número = maior prioridade)
    this.pendingQueue.sort((a, b) => a.priority - b.priority);

    return this.pendingQueue.shift() || null;
  }

  /**
   * Trata chunk carregado pelo worker
   */
  private handleChunkLoaded(jobId: string, result: any): void {
    const job = this.activeStreams.get(jobId);
    if (!job) return;

    const { chunkId, entities, geometries, materials } = result;

    console.log(`📦 Chunk carregado: ${chunkId} (${entities.length} entidades)`);

    // Cache geometrias e materiais
    if (this.streamConfig.enableGeometryReuse) {
      geometries.forEach((geom: any, index: number) => {
        this.geometryCache.set(`${chunkId}-geom-${index}`, this.deserializeGeometry(geom));
      });
    }

    if (this.streamConfig.enableMaterialReuse) {
      materials.forEach((mat: any, index: number) => {
        this.materialCache.set(`${chunkId}-mat-${index}`, this.deserializeMaterial(mat));
      });
    }

    // Cria entidades ECS para as entidades carregadas
    this.createEntitiesFromChunk(entities, chunkId);

    // Marca chunk como carregado
    job.loadedChunks?.add(chunkId);
    this.loadedChunks.add(chunkId);

    // Notifica sistemas sobre novas entidades
    if (this.ifcLoader.onEntitiesCreated) {
      this.ifcLoader.onEntitiesCreated();
    }
  }

  /**
   * Trata análise completa do IFC
   */
  private handleAnalysisComplete(jobId: string, result: any): void {
    const job = this.activeStreams.get(jobId);
    if (!job) return;

    const { totalEntities, boundingBox, entitiesByType, spatialTree } = result;

    console.log(`📊 Análise IFC concluída: ${totalEntities} entidades`);
    console.log(`   Tipos:`, Object.fromEntries(entitiesByType));
    console.log(`   Bounding Box:`, boundingBox);

    // Cria chunks baseado na análise
    const chunks = this.createChunksFromAnalysis(result, job.camera!);
    job.chunks = chunks;

    // Cria jobs para carregar chunks prioritários
    this.createChunkJobs(chunks, job);

    // Job de análise concluído
    this.completeJob(job);
  }

  /**
   * Trata geometria processada
   */
  private handleGeometryProcessed(jobId: string, result: any): void {
    const { geometryId, geometry } = result;

    // Cache da geometria processada
    this.geometryCache.set(geometryId, this.deserializeGeometry(geometry));
  }

  /**
   * Cria chunks baseado na análise do IFC
   */
  private createChunksFromAnalysis(analysis: any, camera: THREE.Camera): IFCChunk[] {
    const chunks: IFCChunk[] = [];
    const { spatialTree, totalEntities } = analysis;

    // Divide baseado na árvore espacial
    if (spatialTree && spatialTree.nodes) {
      spatialTree.nodes.forEach((node: any, index: number) => {
        const chunk: IFCChunk = {
          id: `chunk-${index}`,
          entities: node.entities || [],
          boundingBox: this.deserializeBox3(node.boundingBox),
          priority: this.calculateChunkPriority(node, camera),
          loaded: false,
          data: node
        };
        chunks.push(chunk);
      });
    } else {
      // Fallback: divide linearmente
      const chunkSize = this.streamConfig.chunkSize;
      let entityIndex = 0;
      let chunkIndex = 0;

      while (entityIndex < totalEntities) {
        const endIndex = Math.min(entityIndex + chunkSize, totalEntities);
        const chunk: IFCChunk = {
          id: `chunk-${chunkIndex}`,
          entities: Array.from({ length: endIndex - entityIndex }, (_, i) => `entity-${entityIndex + i}`),
          boundingBox: analysis.boundingBox,
          priority: chunkIndex, // Prioridade baseada na ordem
          loaded: false
        };

        chunks.push(chunk);
        entityIndex = endIndex;
        chunkIndex++;
      }
    }

    // Ordena por prioridade
    chunks.sort((a, b) => a.priority - b.priority);

    console.log(`📦 Criados ${chunks.length} chunks para streaming IFC`);
    return chunks;
  }

  /**
   * Calcula prioridade de um chunk
   */
  private calculateChunkPriority(chunkData: any, camera: THREE.Camera): number {
    const distance = this.calculateDistanceToCamera(chunkData.boundingBox, camera);
    const cameraRange = this.streamConfig.preloadDistance;

    if (distance <= cameraRange * 0.3) return 0; // Alta prioridade - visível
    if (distance <= cameraRange * 0.7) return 1; // Média prioridade - próximo
    if (distance <= cameraRange) return 2; // Baixa prioridade - preload
    return 3; // Muito distante
  }

  /**
   * Calcula distância da câmera para uma bounding box
   */
  private calculateDistanceToCamera(boundingBox: any, camera: THREE.Camera): number {
    const box = this.deserializeBox3(boundingBox);
    const center = box.getCenter(new THREE.Vector3());
    return camera.position.distanceTo(center);
  }

  /**
   * Cria jobs para carregar chunks
   */
  private createChunkJobs(chunks: IFCChunk[], mainJob: StreamJob): void {
    chunks.forEach(chunk => {
      const chunkJob: StreamJob = {
        id: `chunk-${chunk.id}`,
        type: 'chunk_load',
        priority: chunk.priority,
        status: 'pending',
        camera: mainJob.camera,
        chunk: chunk,
        parentJobId: mainJob.id
      };

      this.pendingQueue.push(chunkJob);
    });
  }

  /**
   * Cria entidades ECS a partir de um chunk carregado
   */
  private createEntitiesFromChunk(entities: any[], chunkId: string): void {
    entities.forEach(entityData => {
      // Cria entidade ECS
      const entity = this.entityManager.createEntity();

      // Adiciona componentes
      if (entityData.transform) {
        entity.addComponent(new TransformComponent(
          this.deserializeVector3(entityData.transform.position),
          this.deserializeEuler(entityData.transform.rotation),
          this.deserializeVector3(entityData.transform.scale)
        ));
      }

      if (entityData.mesh) {
        const geometry = this.getCachedGeometry(`${chunkId}-geom-${entityData.mesh.geometryId}`);
        const material = this.getCachedMaterial(`${chunkId}-mat-${entityData.mesh.materialId}`);

        if (geometry && material) {
          const mesh = new THREE.Mesh(geometry, material);
          entity.addComponent(new MeshComponent(mesh));
        }
      }

      if (entityData.lod) {
        entity.addComponent(new LODComponent(entityData.lod.minDistance, entityData.lod.maxDistance));
      }

      console.log(`🆕 Entidade criada do chunk ${chunkId}: ${entityData.id}`);
    });
  }

  /**
   * Conclui um job
   */
  private completeJob(job: StreamJob): void {
    job.status = 'completed';
    this.activeStreams.delete(job.id);
    this.activeLoads--;

    if (job.onComplete) {
      const duration = Date.now() - (job.startTime || 0);
      console.log(`✅ Job ${job.id} concluído em ${duration}ms`);
      job.onComplete();
    }

    // Processa próximo job
    this.processQueue();
  }

  /**
   * Atualiza streaming baseado na posição da câmera
   */
  public update(camera: THREE.Camera): void {
    // Atualiza prioridades baseado na câmera
    this.updateChunkPriorities(camera);

    // Descarrega chunks distantes
    this.unloadDistantChunks(camera);

    // Carrega chunks próximos se houver capacidade
    this.loadNearbyChunks(camera);
  }

  /**
   * Atualiza prioridades dos chunks baseado na câmera
   */
  private updateChunkPriorities(camera: THREE.Camera): void {
    this.pendingQueue.forEach(job => {
      if (job.chunk && job.camera) {
        job.priority = this.calculateChunkPriority(job.chunk.data || job.chunk, camera);
      }
    });

    // Reordena fila
    this.pendingQueue.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Descarrega chunks distantes
   */
  private unloadDistantChunks(camera: THREE.Camera): void {
    const toUnload: string[] = [];

    for (const chunkId of this.loadedChunks) {
      // Simulação - em produção verificaria bounding box real
      const distance = Math.random() * 3000;

      if (distance > this.streamConfig.unloadDistance) {
        toUnload.push(chunkId);
      }
    }

    for (const chunkId of toUnload) {
      this.unloadChunk(chunkId);
    }

    if (toUnload.length > 0) {
      console.log(`🗑️ Descarregados ${toUnload.length} chunks IFC distantes: ${toUnload.length}`);
    }
  }

  /**
   * Carrega chunks próximos
   */
  private loadNearbyChunks(camera: THREE.Camera): void {
    const nearbyJobs = this.pendingQueue.filter(job =>
      job.priority <= 1 && this.activeLoads < this.streamConfig.maxConcurrentLoads
    );

    nearbyJobs.slice(0, this.workerPool.length).forEach(() => {
      this.processQueue();
    });
  }

  /**
   * Descarrega um chunk específico
   */
  private unloadChunk(chunkId: string): void {
    // Remove geometrias e materiais do cache
    const geomKeys = Array.from(this.geometryCache.keys()).filter(key => key.startsWith(`${chunkId}-geom-`));
    const matKeys = Array.from(this.materialCache.keys()).filter(key => key.startsWith(`${chunkId}-mat-`));

    geomKeys.forEach(key => this.geometryCache.delete(key));
    matKeys.forEach(key => this.materialCache.delete(key));

    // Remove entidades ECS associadas (simulação)
    console.log(`🗑️ Chunk IFC descarregado: ${chunkId}`);

    this.loadedChunks.delete(chunkId);
  }

  /**
   * Utilitários para serialização/deserialização
   */
  private deserializeGeometry(data: any): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();

    if (data.attributes) {
      Object.keys(data.attributes).forEach(key => {
        const attr = data.attributes[key];
        geometry.setAttribute(key, new THREE.BufferAttribute(attr.array, attr.itemSize));
      });
    }

    if (data.index) {
      geometry.setIndex(new THREE.BufferAttribute(data.index.array, 1));
    }

    return geometry;
  }

  private deserializeMaterial(data: any): THREE.Material {
    // Simulação - em produção seria mais completo
    return new THREE.MeshStandardMaterial({
      color: data.color || 0xcccccc,
      transparent: data.transparent || false,
      opacity: data.opacity || 1.0
    });
  }

  private deserializeVector3(data: any): THREE.Vector3 {
    return new THREE.Vector3(data.x || 0, data.y || 0, data.z || 0);
  }

  private deserializeEuler(data: any): THREE.Euler {
    return new THREE.Euler(data.x || 0, data.y || 0, data.z || 0);
  }

  private deserializeBox3(data: any): THREE.Box3 {
    return new THREE.Box3(
      this.deserializeVector3(data.min),
      this.deserializeVector3(data.max)
    );
  }

  /**
   * Cache de geometria
   */
  public getCachedGeometry(id: string): THREE.BufferGeometry | null {
    return this.geometryCache.get(id) || null;
  }

  public cacheGeometry(id: string, geometry: THREE.BufferGeometry): void {
    this.geometryCache.set(id, geometry);
  }

  /**
   * Cache de material
   */
  public getCachedMaterial(id: string): THREE.Material | null {
    return this.materialCache.get(id) || null;
  }

  public cacheMaterial(id: string, material: THREE.Material): void {
    this.materialCache.set(id, material);
  }

  /**
   * Obtém estatísticas de streaming
   */
  public getStats(): IFCStreamingStats {
    return {
      activeStreams: this.activeStreams.size,
      loadedChunks: this.loadedChunks.size,
      pendingJobs: this.pendingQueue.length,
      activeLoads: this.activeLoads,
      availableWorkers: this.workerPool.length,
      cacheSize: {
        geometries: this.geometryCache.size,
        materials: this.materialCache.size
      },
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estima uso de memória
   */
  private estimateMemoryUsage(): number {
    // Estimativa simplificada
    const geomMemory = this.geometryCache.size * 1024 * 1024; // ~1MB por geometria
    const matMemory = this.materialCache.size * 512 * 1024;   // ~512KB por material
    return geomMemory + matMemory;
  }

  /**
   * Limpa cache e para streaming
   */
  public dispose(): void {
    // Termina workers
    this.workers.forEach(worker => worker.terminate());
    this.workers.length = 0;
    this.workerPool.length = 0;

    // Limpa estado
    this.activeStreams.clear();
    this.loadedChunks.clear();
    this.pendingQueue.length = 0;

    // Limpa cache
    this.geometryCache.clear();
    this.materialCache.clear();

    console.log('🧹 IFCStreamingLoader disposed');
  }
}

/**
 * Interfaces para streaming IFC
 */
export interface StreamJob {
  id: string;
  type: 'ifc_analysis' | 'chunk_load' | 'geometry_process';
  file?: File;
  priority: number;
  status: 'pending' | 'loading' | 'completed' | 'failed';
  camera?: THREE.Camera;
  chunks?: IFCChunk[];
  loadedChunks?: Set<string>;
  chunk?: IFCChunk;
  parentJobId?: string;
  startTime?: number;
  onComplete?: () => void;
  onError?: (error: any) => void;
}

export interface IFCChunk {
  id: string;
  entities: string[];
  boundingBox: THREE.Box3;
  priority: number;
  loaded: boolean;
  data?: any;
}

export interface IFCStreamingStats {
  activeStreams: number;
  loadedChunks: number;
  pendingJobs: number;
  activeLoads: number;
  availableWorkers: number;
  cacheSize: {
    geometries: number;
    materials: number;
  };
  memoryUsage: number;
}