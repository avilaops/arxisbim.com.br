import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { estimateAssetSize, formatBytes } from './AssetUtils';
import { eventBus, EventType } from '../../core';
import { AssetStreamingConfig } from './AssetConfig';

/**
 * AssetStreamer - Loader de múltiplos formatos com Web Workers
 * Suporta GLTF, GLB, FBX, OBJ e IFC (via IFCLoader)
 *
 * Features:
 * - Carregamento assíncrono com Web Workers
 * - Suporte a múltiplos workers
 * - Progress tracking
 * - Error handling robusto
 */
export class AssetStreamer {
  private gltfLoader: GLTFLoader;
  private fbxLoader: FBXLoader;
  private objLoader: OBJLoader;

  private loadingAssets: Map<string, Promise<any>> = new Map();
  private workers: Map<string, Worker> = new Map();
  private config: AssetStreamingConfig;

  constructor(config: AssetStreamingConfig) {
    this.config = config;
    this.gltfLoader = new GLTFLoader();
    this.fbxLoader = new FBXLoader();
    this.objLoader = new OBJLoader();

    if (this.config.enableWebWorkers) {
      this.initializeWorkers();
    }
  }

  /**
   * Inicializa Web Workers
   */
  private initializeWorkers(): void {
    for (let i = 0; i < this.config.workerCount; i++) {
      // IFC Worker
      const ifcWorker = new Worker('./workers/ifc-worker.ts', { type: 'module' });
      this.setupWorker(ifcWorker, `ifc-${i}`);

      // Geometry Worker
      const geomWorker = new Worker('./workers/geometry-worker.ts', { type: 'module' });
      this.setupWorker(geomWorker, `geom-${i}`);
    }
  }

  /**
   * Configura worker com event listeners
   */
  private setupWorker(worker: Worker, id: string): void {
    worker.onmessage = (event) => {
      const { type, data, id: assetId } = event.data;

      switch (type) {
        case 'progress':
          eventBus.emit(EventType.MODEL_LOAD_PROGRESS, {
            fileName: assetId,
            progress: data.progress * 100,
            message: data.message,
          });
          break;
        case 'complete':
          // Resolver promise do asset
          this.resolveAsset(assetId, data);
          break;
        case 'error':
          console.error(`Worker ${id} error:`, data.error);
          eventBus.emit(EventType.MODEL_LOAD_FAILED, {
            fileName: assetId,
            error: data.error,
          });
          break;
      }
    };

    worker.onerror = (error) => {
      console.error(`Worker ${id} error:`, error);
    };

    this.workers.set(id, worker);
  }

  /**
   * Carrega IFC usando Web Worker
   */
  private async loadIFCWithWorker(url: string, assetId: string): Promise<THREE.Object3D> {
    // Era `new Promise(async ...)` envolvendo outra promise só para
    // reencaminhar o resultado. Executor `async` esconde rejeição, e o wrapper
    // não acrescentava nada: o método já é async, então basta aguardar.
    // Buscar arquivo como ArrayBuffer
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();

    // Encontrar worker IFC disponível
    const ifcWorker = Array.from(this.workers.values()).find((w) => w.name?.startsWith('ifc-'));
    if (!ifcWorker) {
      throw new Error('No IFC worker available');
    }

    // Configurar promise de resolução
    const promise = new Promise<THREE.Object3D>((res, rej) => {
      const originalOnMessage = ifcWorker.onmessage;
      ifcWorker.onmessage = (event) => {
        const { type, data, id } = event.data;
        if (id === assetId) {
          if (type === 'complete') {
            // Criar THREE.Object3D a partir dos dados
            const object3D = this.createObject3DFromGeometryData(data);
            res(object3D);
          } else if (type === 'error') {
            rej(new Error(data.error));
          }
        }
        // Chamar original se necessário
        if (originalOnMessage) originalOnMessage.call(ifcWorker, event);
      };
    });

    // Enviar para worker
    ifcWorker.postMessage(
      {
        type: 'parse',
        data: buffer,
        id: assetId,
      },
      [buffer]
    );

    return await promise;
  }

  /**
   * Fallback para carregamento IFC sem worker
   */
  private async loadIFCFallback(url: string): Promise<THREE.Object3D> {
    // Usar IFCLoader existente como fallback
    const { IFCLoader } = await import('../../loaders/IFCLoader');
    // Placeholder - precisaria instanciar IFCLoader
    throw new Error('IFC fallback not implemented');
  }

  /**
   * Cria THREE.Object3D a partir dos dados de geometria processados
   */
  private createObject3DFromGeometryData(geometryData: any[]): THREE.Object3D {
    const group = new THREE.Group();

    geometryData.forEach((geom) => {
      const geometry = new THREE.BufferGeometry();

      if (geom.position) {
        geometry.setAttribute('position', new THREE.BufferAttribute(geom.position, 3));
      }
      if (geom.normal) {
        geometry.setAttribute('normal', new THREE.BufferAttribute(geom.normal, 3));
      }
      if (geom.index) {
        geometry.setIndex(new THREE.BufferAttribute(geom.index, 1));
      }

      const material = new THREE.MeshLambertMaterial({
        color: geom.material?.color || 0xcccccc,
        transparent: geom.material?.transparent,
        opacity: geom.material?.opacity,
      });

      const mesh = new THREE.Mesh(geometry, material);
      if (geom.matrix) {
        mesh.matrix.fromArray(geom.matrix);
        mesh.matrix.decompose(mesh.position, mesh.rotation, mesh.scale);
      }

      group.add(mesh);
    });

    return group;
  }

  /**
   * Carrega asset baseado na extensão
   */
  public async loadAsset(url: string, assetId?: string): Promise<THREE.Object3D> {
    const id = assetId || url;
    const startTime = Date.now();

    // Se já está carregando, retorna a promise existente
    if (this.loadingAssets.has(id)) {
      console.log(`⏳ Already loading: ${id}`);
      return this.loadingAssets.get(id)!;
    }

    // Emite evento de início de carregamento
    eventBus.emit(EventType.MODEL_LOADING, { fileName: id });

    const extension = this.getFileExtension(url);

    let loadPromise: Promise<THREE.Object3D>;

    switch (extension) {
      case 'gltf':
      case 'glb':
        loadPromise = this.loadGLTF(url);
        break;

      case 'fbx':
        loadPromise = this.loadFBX(url);
        break;

      case 'obj':
        loadPromise = this.loadOBJ(url);
        break;

      case 'ifc':
        if (this.config.enableWebWorkers) {
          loadPromise = this.loadIFCWithWorker(url, id);
        } else {
          loadPromise = this.loadIFCFallback(url);
        }
        break;

      default:
        loadPromise = Promise.reject(new Error(`Unsupported format: ${extension}`));
    }

    this.loadingAssets.set(id, loadPromise);

    try {
      const asset = await loadPromise;
      const duration = Date.now() - startTime;
      const size = estimateAssetSize(asset);

      // Emite evento de sucesso
      eventBus.emit(EventType.MODEL_LOADED, {
        object: asset,
        fileName: id,
      });

      console.log(`✅ Loaded: ${id} (${duration}ms, ${formatBytes(size)})`);

      this.loadingAssets.delete(id);
      return asset;
    } catch (error) {
      // Emite evento de erro
      eventBus.emit(EventType.MODEL_ERROR, {
        error: error as Error,
        fileName: id,
      });

      console.error(`❌ Failed to load: ${id}`, error);

      this.loadingAssets.delete(id);
      throw error;
    }
  }

  /**
   * Carrega GLTF/GLB
   */
  private loadGLTF(url: string): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          resolve(gltf.scene);
        },
        (progress) => {
          const percent = (progress.loaded / progress.total) * 100;
          console.log(`📥 Loading: ${percent.toFixed(2)}%`);
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  /**
   * Carrega FBX
   */
  private loadFBX(url: string): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
      this.fbxLoader.load(
        url,
        (fbx) => {
          resolve(fbx);
        },
        (progress) => {
          const percent = (progress.loaded / progress.total) * 100;
          console.log(`📥 Loading: ${percent.toFixed(2)}%`);
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  /**
   * Carrega OBJ
   */
  private loadOBJ(url: string): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
      this.objLoader.load(
        url,
        (obj) => {
          resolve(obj);
        },
        (progress) => {
          const percent = (progress.loaded / progress.total) * 100;
          console.log(`📥 Loading: ${percent.toFixed(2)}%`);
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  /**
   * Carrega múltiplos assets em paralelo
   */
  public async loadMultiple(urls: string[]): Promise<THREE.Object3D[]> {
    console.log(`📦 Loading ${urls.length} assets in parallel...`);

    const promises = urls.map((url) => this.loadAsset(url));
    return Promise.all(promises);
  }

  /**
   * Carrega múltiplos assets sequencialmente
   */
  public async loadSequential(urls: string[]): Promise<THREE.Object3D[]> {
    console.log(`📦 Loading ${urls.length} assets sequentially...`);

    const results: THREE.Object3D[] = [];

    for (const url of urls) {
      const asset = await this.loadAsset(url);
      results.push(asset);
    }

    return results;
  }

  /**
   * Retorna extensão do arquivo
   */
  private getFileExtension(url: string): string {
    const match = url.match(/\.(\w+)(\?|$)/);
    return match ? match[1].toLowerCase() : '';
  }

  /**
   * Cancela carregamento de asset
   */
  public cancelLoad(assetId: string): void {
    if (this.loadingAssets.has(assetId)) {
      this.loadingAssets.delete(assetId);
      console.log(`🚫 Cancelled loading: ${assetId}`);
    }
  }

  /**
   * Retorna se asset está sendo carregado
   */
  public isLoading(assetId: string): boolean {
    return this.loadingAssets.has(assetId);
  }

  /**
   * Retorna lista de assets sendo carregados
   */
  public getLoadingAssets(): string[] {
    return Array.from(this.loadingAssets.keys());
  }
}
