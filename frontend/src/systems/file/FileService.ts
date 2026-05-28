/**
 * FileService - Serviço central de gerenciamento de arquivos
 * API única consumida por UI (LoadFileModal, etc)
 */

import {
  FileHandle,
  FileProviderType,
  FileListOptions,
  FileListResult,
  FileLoadResult,
  FileCatalogEntry,
  LoaderProgress,
  LoaderStage
} from './types';
import { IFileProvider, ExamplesProvider, LocalProvider } from './providers';
import { FileCache } from './FileCache';

/**
 * File Service - API única para UI
 */
export class FileService {
  private static instance: FileService;
  
  private providers = new Map<FileProviderType, IFileProvider>();
  private cache: FileCache;
  private catalog = new Map<string, FileCatalogEntry>();
  private recents: FileHandle[] = [];
  private favorites: Set<string> = new Set();
  private modelSession: any | null = null; // ModelSession instance
  
  // ✅ Injeção de dependência: IFCLoader
  private ifcLoader: ((file: File) => Promise<void>) | null = null;
  
  private constructor() {
    this.cache = new FileCache();
    this.registerDefaultProviders();
    this.loadPersistedState();
  }

  public static getInstance(): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService();
    }
    return FileService.instance;
  }

  /**
   * Registra providers padrão
   */
  private registerDefaultProviders(): void {
    this.registerProvider(new ExamplesProvider());
    this.registerProvider(new LocalProvider());
  }

  /**
   * Registra provider
   */
  public registerProvider(provider: IFileProvider): void {
    this.providers.set(provider.type, provider);
    console.log(`✅ Registered file provider: ${provider.name}`);
  }
  
  /**
   * Define IFCLoader (injeção de dependência)
   * Chamado pelo main-simple.ts após inicializar IFCLoader
   */
  public setIfcLoader(loader: (file: File) => Promise<void>): void {
    this.ifcLoader = loader;
    console.log('✅ IFCLoader injected into FileService');
  }

  /**
   * Lista arquivos de um provider
   */
  public async list(providerType: FileProviderType, options?: FileListOptions): Promise<FileListResult> {
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new Error(`Provider not registered: ${providerType}`);
    }

    if (!provider.capabilities.list) {
      throw new Error(`Provider ${provider.name} does not support listing`);
    }

    return provider.list(options);
  }

  /**
   * Busca arquivos em todos os providers
   */
  public async search(query: string, providerTypes?: FileProviderType[]): Promise<FileHandle[]> {
    const providers = providerTypes
      ? providerTypes.map(t => this.providers.get(t)).filter(Boolean) as IFileProvider[]
      : Array.from(this.providers.values()).filter(p => p.capabilities.list);

    const results = await Promise.all(
      providers.map(p => p.list({ query, limit: 50 }))
    );

    return results.flatMap(r => r.items);
  }

  /**
   * Obtém metadados de arquivo
   */
  public async getMetadata(handle: FileHandle): Promise<FileHandle> {
    const provider = this.providers.get(handle.provider);
    if (!provider) {
      throw new Error(`Provider not found: ${handle.provider}`);
    }

    return provider.getMetadata(handle.id);
  }

  /**
   * Abre arquivo (núcleo da API)
   * Retorna { blob, cacheHit } para telemetria correta
   */
  public async open(
    handle: FileHandle,
    onProgress?: (progress: LoaderProgress) => void
  ): Promise<{ blob: Blob; cacheHit: boolean }> {
    onProgress?.({
      stage: LoaderStage.FETCH,
      progress: 0,
      message: `Fetching ${handle.displayName}...`
    });

    // Tenta cache primeiro
    const cached = await this.cache.get(handle.hash);
    if (cached) {
      console.log(`📦 Cache hit: ${handle.displayName}`);
      onProgress?.({
        stage: LoaderStage.FETCH,
        progress: 100,
        message: 'Loaded from cache'
      });
      
      this.addToRecents(handle);
      return { blob: cached, cacheHit: true };
    }

    // Busca do provider
    const provider = this.providers.get(handle.provider);
    if (!provider) {
      throw new Error(`Provider not found: ${handle.provider}`);
    }

    const blob = await provider.readFile(handle);

    onProgress?.({
      stage: LoaderStage.FETCH,
      progress: 100,
      message: 'Download complete'
    });

    // Cacheia (async, não bloqueia)
    this.cache.set(handle.hash, blob).catch(err => {
      console.warn('Cache.set failed (non-blocking):', err);
    });

    this.addToRecents(handle);
    return { blob, cacheHit: false };
  }

  /**
   * Carrega arquivo (open + IFCLoader)
   * API completa com telemetria
   */
  public async load(
    handle: FileHandle,
    onProgress?: (progress: LoaderProgress) => void
  ): Promise<FileLoadResult> {
    const startTime = performance.now();
    let downloadTime = 0;
    let parseTime = 0;
    let cacheHit = false;

    try {
      // FETCH stage
      const fetchStart = performance.now();
      const { blob, cacheHit: wasCached } = await this.open(handle, onProgress);
      downloadTime = performance.now() - fetchStart;
      cacheHit = wasCached;

      // VALIDATE stage
      onProgress?.({
        stage: LoaderStage.VALIDATE,
        progress: 0,
        message: 'Validating file...'
      });

      await this.validateFile(blob, handle);

      onProgress?.({
        stage: LoaderStage.VALIDATE,
        progress: 100
      });

      // PARSE stage
      onProgress?.({
        stage: LoaderStage.PARSE,
        progress: 0,
        message: 'Parsing model...'
      });

      const parseStart = performance.now();

      // Converte Blob para File (IFCLoader espera File)
      const file = new File([blob], handle.displayName, { type: blob.type });

      // Chama IFCLoader injetado
      if (!this.ifcLoader) {
        throw new Error(
          'IFCLoader not injected. Call fileService.setIfcLoader() in main-simple.ts'
        );
      }

      await this.ifcLoader(file);

      parseTime = performance.now() - parseStart;

      const totalTime = performance.now() - startTime;

      // Constrói resultado com telemetria
      const result: FileLoadResult = {
        handle,
        success: true,
        metrics: {
          downloadTimeMs: Math.round(downloadTime),
          parseTimeMs: Math.round(parseTime),
          totalTimeMs: Math.round(totalTime),
          bytesDownloaded: blob.size,
          cacheHit, // ✅ Valor real capturado no open(), não heurística
          // TODO: Pegar stats reais do IFCLoader/scene
          triangles: undefined,
          vertices: undefined,
          objects: undefined,
          estimatedMemoryMB: blob.size / (1024 * 1024),
          ifcVersion: undefined,
          ifcSchema: undefined
        }
      };

      console.log('📊 Load metrics:', result.metrics);

      // Atualiza catalog
      this.updateCatalogEntry(handle);

      return result;

    } catch (error: any) {
      const totalTime = performance.now() - startTime;

      return {
        handle,
        success: false,
        error: error.message || 'Unknown error',
        metrics: {
          downloadTimeMs: Math.round(downloadTime),
          parseTimeMs: Math.round(parseTime),
          totalTimeMs: Math.round(totalTime),
          bytesDownloaded: 0,
          cacheHit // ✅ Usa valor capturado antes do erro
        }
      };
    }
  }

  /**
   * Valida arquivo
   */
  private async validateFile(blob: Blob, handle: FileHandle): Promise<void> {
    // Validação básica de arquivos IFC
    if (blob.size === 0) {
      throw new Error('File is empty');
    }
    
    // Verifica tamanho máximo (500MB)
    const maxSize = 500 * 1024 * 1024;
    if (blob.size > maxSize) {
      throw new Error(`File too large: ${(blob.size / 1024 / 1024).toFixed(2)}MB (max: 500MB)`);
    }
    
    // Para arquivos IFC, valida magic bytes e estrutura STEP
    if (handle.metadata.extension === 'ifc') {
      const header = await blob.slice(0, 1024).text();
      
      // Magic bytes: ISO-10303-21 (STEP format)
      if (!header.startsWith('ISO-10303-21')) {
        throw new Error('Invalid IFC file: missing ISO-10303-21 header');
      }
      
      // Valida seções básicas
      if (!header.includes('HEADER;') || !header.includes('ENDSEC;')) {
        throw new Error('Invalid IFC file: malformed STEP structure');
      }
      
      // Valida versão IFC (IFC2X3, IFC4, IFC4X3)
      const versionMatch = header.match(/FILE_SCHEMA\s*\(\s*\('(IFC[^']+)'\)/i);
      if (!versionMatch) {
        throw new Error('Invalid IFC file: missing FILE_SCHEMA');
      }
      
      const version = versionMatch[1];
      const supportedVersions = ['IFC2X3', 'IFC4', 'IFC4X3', 'IFC4X3_ADD2'];
      if (!supportedVersions.some(v => version.toUpperCase().startsWith(v))) {
        console.warn(`Unsupported IFC version: ${version} (trying anyway)`);
      }
    }
  }

  /**
   * Adiciona a recentes
   */
  private addToRecents(handle: FileHandle): void {
    // Remove duplicata
    this.recents = this.recents.filter(h => h.id !== handle.id);
    
    // Adiciona no topo
    this.recents.unshift(handle);
    
    // Limita a 20
    if (this.recents.length > 20) {
      this.recents = this.recents.slice(0, 20);
    }

    this.persistState();
  }

  /**
   * Obtém arquivos recentes
   */
  public getRecents(limit: number = 10): FileHandle[] {
    return this.recents.slice(0, limit);
  }

  /**
   * Adiciona/remove de favoritos
   */
  public toggleFavorite(handleId: string): boolean {
    if (this.favorites.has(handleId)) {
      this.favorites.delete(handleId);
      this.persistState();
      return false;
    } else {
      this.favorites.add(handleId);
      this.persistState();
      return true;
    }
  }

  /**
   * Obtém favoritos
   */
  public getFavorites(): FileHandle[] {
    return Array.from(this.favorites)
      .map(id => this.recents.find(h => h.id === id))
      .filter(Boolean) as FileHandle[];
  }

  /**
   * Atualiza entrada do catálogo
   */
  private updateCatalogEntry(handle: FileHandle): void {
    const existing = this.catalog.get(handle.id);
    
    const entry: FileCatalogEntry = {
      ...handle,
      tags: existing?.tags || [],
      favorite: this.favorites.has(handle.id),
      lastOpenedAt: new Date(),
      openCount: (existing?.openCount || 0) + 1
    };

    this.catalog.set(handle.id, entry);
  }

  /**
   * Registra arquivo local (drag&drop)
   */
  public async registerLocalFile(file: File): Promise<FileHandle> {
    const provider = this.providers.get(FileProviderType.LOCAL) as LocalProvider;
    if (!provider) {
      throw new Error('Local provider not registered');
    }

    return provider.registerFile(file);
  }

  /**
   * Persiste estado (localStorage)
   */
  private persistState(): void {
    try {
      // Persiste recents como handles completos (limitado a 20 últimos)
      const recentsToSave = this.recents.slice(0, 20);
      localStorage.setItem('arxis:file-service:recents', JSON.stringify(recentsToSave));
      
      // Persiste favorites como IDs + handles (para fallback offline)
      const favoritesHandles = Array.from(this.favorites)
        .map(id => this.recents.find(h => h.id === id))
        .filter(Boolean);
      
      localStorage.setItem('arxis:file-service:favorites', JSON.stringify({
        ids: Array.from(this.favorites),
        handles: favoritesHandles
      }));
    } catch (error) {
      console.warn('Failed to persist file service state:', error);
    }
  }

  /**
   * Carrega estado persistido
   */
  private loadPersistedState(): void {
    try {
      // Carrega recents (handles completos)
      const recentsJson = localStorage.getItem('arxis:file-service:recents');
      if (recentsJson) {
        const parsed = JSON.parse(recentsJson);
        // Reconstrói Dates de strings ISO
        this.recents = parsed.map((h: any) => ({
          ...h,
          createdAt: new Date(h.createdAt),
          modifiedAt: new Date(h.modifiedAt),
          accessedAt: h.accessedAt ? new Date(h.accessedAt) : undefined
        }));
      }
      
      // Carrega favorites
      const favoritesJson = localStorage.getItem('arxis:file-service:favorites');
      if (favoritesJson) {
        const parsed = JSON.parse(favoritesJson);
        
        // Formato novo: { ids, handles }
        if (parsed.ids) {
          this.favorites = new Set(parsed.ids);
          
          // Merge handles de favorites com recents (para caso offline)
          if (parsed.handles && Array.isArray(parsed.handles)) {
            for (const h of parsed.handles) {
              if (!this.recents.find(r => r.id === h.id)) {
                this.recents.push({
                  ...h,
                  createdAt: new Date(h.createdAt),
                  modifiedAt: new Date(h.modifiedAt)
                });
              }
            }
          }
        } else {
          // Formato antigo: array de IDs (fallback)
          this.favorites = new Set(parsed);
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted file service state:', error);
    }
  }

  /**
   * Define a ModelSession ativa (deve ser chamado após inicializar scene/camera)
   */
  public setModelSession(session: any): void {
    this.modelSession = session;
    console.log('✅ ModelSession linked to FileService');
  }

  /**
   * Carrega múltiplos modelos federados
   * Retorna Promise que resolve quando todos estiverem carregados
   */
  public async loadMultiple(
    handles: FileHandle[],
    onProgress?: (modelIndex: number, stage: string, progress: number) => void
  ): Promise<FileLoadResult[]> {
    if (!this.modelSession) {
      console.warn('⚠️ ModelSession not set. Call setModelSession() first.');
    }

    const results: FileLoadResult[] = [];
    let completedCount = 0;

    console.log(`📦 Loading ${handles.length} federated models...`);

    // Carrega modelos em paralelo (limitado a 3 simultâneos)
    const CONCURRENT_LIMIT = 3;
    const chunks: FileHandle[][] = [];
    
    for (let i = 0; i < handles.length; i += CONCURRENT_LIMIT) {
      chunks.push(handles.slice(i, i + CONCURRENT_LIMIT));
    }

    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(async (handle, index) => {
          const modelIndex = completedCount + index;
          
          const progressCallback = (stage: string, progress: number) => {
            onProgress?.(modelIndex, stage, progress);
          };

          try {
            const result = await this.load(handle, (p) => {
              progressCallback(p.stage, p.progress);
            });
            completedCount++;
            
            console.log(
              `✅ Model ${completedCount}/${handles.length}: ${handle.displayName} ` +
              `(${(result.metrics.totalTimeMs / 1000).toFixed(1)}s)`
            );
            
            return result;
          } catch (error) {
            console.error(`❌ Failed to load ${handle.displayName}:`, error);
            return {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              metrics: {
                downloadTimeMs: 0,
                parseTimeMs: 0,
                totalTimeMs: 0,
                bytesDownloaded: 0,
                cacheHit: false
              }
            } as FileLoadResult;
          }
        })
      );
      
      results.push(...chunkResults);
    }

    // Stats finais
    const totalTime = results.reduce((sum, r) => sum + r.metrics.totalTimeMs, 0);
    const totalTriangles = results.reduce((sum, r) => sum + (r.metrics.triangles || 0), 0);
    const totalMemory = results.reduce((sum, r) => sum + (r.metrics.estimatedMemoryMB || 0), 0);

    console.log(
      `\n🎉 Federated model loaded:\n` +
      `  Models: ${handles.length}\n` +
      `  Total time: ${(totalTime / 1000).toFixed(1)}s\n` +
      `  Triangles: ${totalTriangles.toLocaleString()}\n` +
      `  Memory: ${totalMemory.toFixed(0)}MB\n` +
      `  Session:`, this.modelSession?.getInfo()
    );

    return results;
  }

  /**
   * Obtém estatísticas
   */
  public getStats() {
    return {
      providersCount: this.providers.size,
      recentsCount: this.recents.length,
      favoritesCount: this.favorites.size,
      cacheSize: this.cache.getSize(),
      catalogSize: this.catalog.size,
      modelSession: this.modelSession?.getInfo()
    };
  }
}

/**
 * Singleton export
 */
export const fileService = FileService.getInstance();
