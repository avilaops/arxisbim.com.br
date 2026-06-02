/**
 * IFCModelCache — Cache de modelos IFC em IndexedDB
 *
 * Evita re-processar o mesmo arquivo IFC a cada reload.
 * Armazena: arquivo binário + metadados (hash, nome, tamanho, última modificação)
 *
 * Estratégia:
 *   - Chave = SHA-256 do conteúdo do arquivo (content-hash)
 *   - Se hash já existe no cache → retorna ArrayBuffer direto, sem re-upload
 *   - Cache tem TTL de 7 dias por entrada
 *   - Tamanho máximo: 500MB total (limpa entradas antigas se exceder)
 */

const DB_NAME    = 'arxisvr-ifc-cache';
const DB_VERSION = 1;
const STORE_NAME = 'models';
const MAX_SIZE_MB = 500;
const TTL_MS     = 7 * 24 * 60 * 60 * 1000; // 7 dias

export interface IFCCacheEntry {
  hash:      string;
  name:      string;
  size:      number;
  data:      ArrayBuffer;
  cachedAt:  number;
}

export class IFCModelCache {
  private db: IDBDatabase | null = null;
  private ready: Promise<void>;

  constructor() {
    this.ready = this.openDB();
  }

  private openDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'hash' });
          store.createIndex('cachedAt', 'cachedAt');
          store.createIndex('size',     'size');
        }
      };

      req.onsuccess = (e) => {
        this.db = (e.target as IDBOpenDBRequest).result;
        console.log('💾 IFCModelCache: IndexedDB aberto');
        resolve();
      };

      req.onerror = () => {
        console.warn('⚠️ IFCModelCache: falha ao abrir IndexedDB — cache desabilitado');
        resolve(); // não quebrar o app se cache falhar
      };
    });
  }

  /**
   * Calcula SHA-256 do ArrayBuffer do arquivo
   */
  async hash(buffer: ArrayBuffer): Promise<string> {
    const bytes  = await crypto.subtle.digest('SHA-256', buffer);
    const arr    = Array.from(new Uint8Array(bytes));
    return arr.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Busca modelo no cache pelo hash do conteúdo
   * Retorna null se não encontrado ou expirado
   */
  async get(hash: string): Promise<IFCCacheEntry | null> {
    await this.ready;
    if (!this.db) return null;

    return new Promise((resolve) => {
      const tx    = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req   = store.get(hash);

      req.onsuccess = () => {
        const entry = req.result as IFCCacheEntry | undefined;
        if (!entry) { resolve(null); return; }

        // Verificar TTL
        if (Date.now() - entry.cachedAt > TTL_MS) {
          this.delete(hash);
          resolve(null);
          return;
        }

        console.log(`💾 IFC cache HIT: ${entry.name} (${(entry.size / 1024 / 1024).toFixed(1)}MB)`);
        resolve(entry);
      };

      req.onerror = () => resolve(null);
    });
  }

  /**
   * Salva modelo no cache
   */
  async set(entry: IFCCacheEntry): Promise<void> {
    await this.ready;
    if (!this.db) return;

    // Verificar espaço antes de salvar
    await this.evictIfNeeded(entry.size);

    return new Promise((resolve) => {
      const tx    = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(entry);
      tx.oncomplete = () => {
        console.log(`💾 IFC cache SET: ${entry.name} (${(entry.size / 1024 / 1024).toFixed(1)}MB)`);
        resolve();
      };
      tx.onerror = () => resolve();
    });
  }

  /**
   * Remove entrada expirada ou por hash
   */
  async delete(hash: string): Promise<void> {
    await this.ready;
    if (!this.db) return;

    return new Promise((resolve) => {
      const tx    = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(hash);
      tx.oncomplete = () => resolve();
      tx.onerror    = () => resolve();
    });
  }

  /**
   * Remove entradas antigas se total exceder MAX_SIZE_MB
   */
  private async evictIfNeeded(incoming: number): Promise<void> {
    if (!this.db) return;

    const entries = await this.getAllEntries();
    const totalBytes = entries.reduce((s, e) => s + e.size, 0) + incoming;
    const maxBytes   = MAX_SIZE_MB * 1024 * 1024;

    if (totalBytes <= maxBytes) return;

    // Remover as entradas mais antigas primeiro (LRU)
    const sorted = [...entries].sort((a, b) => a.cachedAt - b.cachedAt);
    let freed = 0;
    const target = totalBytes - maxBytes;

    for (const entry of sorted) {
      if (freed >= target) break;
      await this.delete(entry.hash);
      freed += entry.size;
      console.log(`💾 IFC cache EVICT: ${entry.name} (${(entry.size / 1024 / 1024).toFixed(1)}MB)`);
    }
  }

  private getAllEntries(): Promise<IFCCacheEntry[]> {
    return new Promise((resolve) => {
      if (!this.db) { resolve([]); return; }
      const tx    = this.db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req   = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror   = () => resolve([]);
    });
  }

  /**
   * Estatísticas do cache (para debug/UI)
   */
  async getStats(): Promise<{ entries: number; totalMB: number; oldestDays: number }> {
    const entries = await this.getAllEntries();
    const totalBytes = entries.reduce((s, e) => s + e.size, 0);
    const oldest = entries.reduce((m, e) => Math.min(m, e.cachedAt), Date.now());
    return {
      entries:    entries.length,
      totalMB:    Math.round(totalBytes / 1024 / 1024 * 10) / 10,
      oldestDays: Math.round((Date.now() - oldest) / 86400000),
    };
  }

  /**
   * Limpa todo o cache
   */
  async clear(): Promise<void> {
    await this.ready;
    if (!this.db) return;
    return new Promise((resolve) => {
      const tx    = this.db!.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => { console.log('💾 IFC cache CLEARED'); resolve(); };
      tx.onerror    = () => resolve();
    });
  }
}

// Singleton global
export const ifcModelCache = new IFCModelCache();
