/**
 * GeometryCacheService
 * Cache de geometria em IndexedDB para carregamento rápido
 * Armazena geometrias processadas para reutilização
 */

export interface CacheEntry {
  id: string;
  geometry: ArrayBuffer;
  metadata: {
    type: 'ifc' | 'glb';
    size: number;
    timestamp: number;
    version: string;
  };
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  misses: number;
  hits: number;
}

class GeometryCacheService {
  private db: IDBDatabase | null = null;
  private dbName: string = 'ArxisvrGeometryCache';
  private dbVersion: number = 1;
  private storeName: string = 'geometries';
  private maxSize: number = 500 * 1024 * 1024; // 500MB
  private stats: CacheStats = {
    totalEntries: 0,
    totalSize: 0,
    hitRate: 0,
    misses: 0,
    hits: 0,
  };

  /**
   * Inicializa o banco IndexedDB
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('[GeometryCacheService] Failed to open database');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[GeometryCacheService] Database opened');
        this.updateStats();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'metadata.timestamp', { unique: false });
          store.createIndex('type', 'metadata.type', { unique: false });
        }
      };
    });
  }

  /**
   * Armazena geometria no cache
   */
  async put(id: string, geometry: ArrayBuffer, type: 'ifc' | 'glb', version: string = '1.0'): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    const entry: CacheEntry = {
      id,
      geometry,
      metadata: {
        type,
        size: geometry.byteLength,
        timestamp: Date.now(),
        version,
      },
    };

    // Verificar tamanho do cache
    await this.checkCacheSize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(entry);

      request.onsuccess = () => {
        console.log('[GeometryCacheService] Geometry cached:', id);
        this.updateStats();
        resolve();
      };

      request.onerror = () => {
        console.error('[GeometryCacheService] Failed to cache geometry:', id);
        reject(request.error);
      };
    });
  }

  /**
   * Recupera geometria do cache
   */
  async get(id: string): Promise<ArrayBuffer | null> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry | undefined;
        if (entry) {
          this.stats.hits++;
          console.log('[GeometryCacheService] Cache hit:', id);
          resolve(entry.geometry);
        } else {
          this.stats.misses++;
          console.log('[GeometryCacheService] Cache miss:', id);
          resolve(null);
        }
        this.updateHitRate();
      };

      request.onerror = () => {
        console.error('[GeometryCacheService] Failed to get geometry:', id);
        reject(request.error);
      };
    });
  }

  /**
   * Verifica se geometria está no cache
   */
  async has(id: string): Promise<boolean> {
    const geometry = await this.get(id);
    return geometry !== null;
  }

  /**
   * Remove geometria do cache
   */
  async remove(id: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('[GeometryCacheService] Geometry removed:', id);
        this.updateStats();
        resolve();
      };

      request.onerror = () => {
        console.error('[GeometryCacheService] Failed to remove geometry:', id);
        reject(request.error);
      };
    });
  }

  /**
   * Limpa todo o cache
   */
  async clear(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[GeometryCacheService] Cache cleared');
        this.updateStats();
        resolve();
      };

      request.onerror = () => {
        console.error('[GeometryCacheService] Failed to clear cache');
        reject(request.error);
      };
    });
  }

  /**
   * Remove entradas antigas baseado em timestamp
   */
  async removeOldEntries(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    const cutoffTime = Date.now() - maxAge;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));

      let removedCount = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor) {
          cursor.delete();
          removedCount++;
          cursor.continue();
        } else {
          console.log('[GeometryCacheService] Removed old entries:', removedCount);
          this.updateStats();
          resolve();
        }
      };

      request.onerror = () => {
        console.error('[GeometryCacheService] Failed to remove old entries');
        reject(request.error);
      };
    });
  }

  /**
   * Verifica e controla tamanho do cache
   */
  private async checkCacheSize(): Promise<void> {
    const stats = await this.getStats();
    
    if (stats.totalSize > this.maxSize) {
      console.log('[GeometryCacheService] Cache size exceeded, removing old entries');
      await this.removeOldEntries();
    }
  }

  /**
   * Atualiza estatísticas
   */
  private async updateStats(): Promise<void> {
    if (!this.db) {
      return;
    }

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        const keys = request.result as string[];
        this.stats.totalEntries = keys.length;
        
        // Calcular tamanho total
        let totalSize = 0;
        const sizeTransaction = this.db!.transaction([this.storeName], 'readonly');
        const sizeStore = sizeTransaction.objectStore(this.storeName);
        
        keys.forEach(key => {
          const getRequest = sizeStore.get(key);
          getRequest.onsuccess = () => {
            const entry = getRequest.result as CacheEntry;
            if (entry) {
              totalSize += entry.metadata.size;
            }
          };
        });

        sizeTransaction.oncomplete = () => {
          this.stats.totalSize = totalSize;
          resolve();
        };
      };

      request.onerror = () => {
        resolve();
      };
    });
  }

  /**
   * Atualiza taxa de acertos
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Retorna estatísticas
   */
  async getStats(): Promise<CacheStats> {
    await this.updateStats();
    return { ...this.stats };
  }

  /**
   * Define tamanho máximo do cache
   */
  setMaxSize(size: number): void {
    this.maxSize = size;
    console.log('[GeometryCacheService] Max size set:', size);
  }

  /**
   * Retorna tamanho máximo
   */
  getMaxSize(): number {
    return this.maxSize;
  }

  /**
   * Fecha o banco
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('[GeometryCacheService] Database closed');
    }
  }
}

// Singleton instance
let geometryCacheServiceInstance: GeometryCacheService | null = null;

export function getGeometryCacheService(): GeometryCacheService {
  if (!geometryCacheServiceInstance) {
    geometryCacheServiceInstance = new GeometryCacheService();
  }
  return geometryCacheServiceInstance;
}

export default GeometryCacheService;
