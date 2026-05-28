import * as THREE from 'three';
import { ScriptAPI } from './ScriptAPI';
import { ScriptMetadata } from './events/ScriptEvents';
import { eventBus, EventType } from '../core';

/**
 * ScriptManager - Gerenciador de scripts runtime
 * Executa scripts TypeScript/JavaScript em tempo real
 * 
 * Features:
 * - Runtime script execution
 * - Hot-reload support
 * - Sandboxed execution
 * - API access control
 * - Error handling
 * - Script lifecycle management
 * 
 * Preparado para integração com V8 isolates ou Web Workers
 */
export class ScriptManager {
  private static instance: ScriptManager;
  
  private scriptAPI: ScriptAPI;
  private scripts: Map<string, {
    code: string;
    metadata: ScriptMetadata;
    instance: any;
    isRunning: boolean;
    error: Error | null;
  }> = new Map();
  
  // Context
  private scene: THREE.Scene | null = null;
  private camera: THREE.Camera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  
  private constructor() {
    // ScriptAPI será inicializado quando houver scene
    this.scriptAPI = null as any;
    
    console.log('📜 Script Manager initialized');
  }
  
  /**
   * Retorna instância singleton
   */
  public static getInstance(): ScriptManager {
    if (!ScriptManager.instance) {
      ScriptManager.instance = new ScriptManager();
    }
    return ScriptManager.instance;
  }
  
  /**
   * Inicializa com contexto
   */
  public initialize(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer): void {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    this.scriptAPI = new ScriptAPI(scene, camera, renderer);
    
    console.log('✅ Script Manager initialized with context');
  }
  
  /**
   * Carrega script
   */
  public loadScript(scriptId: string, code: string, metadata?: ScriptMetadata): void {
    if (this.scripts.has(scriptId)) {
      console.warn(`⚠️ Script already loaded: ${scriptId}`);
      return;
    }
    
    const scriptMetadata: ScriptMetadata = metadata || {
      id: scriptId,
      name: scriptId,
      version: '1.0.0'
    };
    
    this.scripts.set(scriptId, {
      code,
      metadata: scriptMetadata,
      instance: null,
      isRunning: false,
      error: null
    });
    
    console.log(`📜 Script loaded: ${scriptId}`);
    
    eventBus.emit(EventType.TOOL_ACTIVATED, {
      toolType: `Script:Loaded:${scriptId}`
    });
  }
  
  /**
   * Executa script
   */
  public executeScript(scriptId: string): any {
    const script = this.scripts.get(scriptId);
    
    if (!script) {
      console.error(`❌ Script not found: ${scriptId}`);
      return null;
    }
    
    try {
      console.log(`▶️ Executing script: ${scriptId}`);
      
      // Executa script usando Function constructor (sandbox simples)
      // Em produção, usar Web Workers ou V8 isolates
      const scriptFunction = new Function(
        'api',
        'scene',
        'camera',
        'renderer',
        'THREE',
        script.code
      );
      
      const result = scriptFunction(
        this.scriptAPI,
        this.scene,
        this.camera,
        this.renderer,
        THREE
      );
      
      script.instance = result;
      script.isRunning = true;
      script.error = null;
      
      console.log(`✅ Script executed: ${scriptId}`);
      
      eventBus.emit(EventType.TOOL_ACTIVATED, {
        toolType: `Script:Executed:${scriptId}`
      });
      
      return result;
      
    } catch (error) {
      console.error(`❌ Script execution error (${scriptId}):`, error);
      
      script.error = error as Error;
      script.isRunning = false;
      
      eventBus.emit(EventType.TOOL_DEACTIVATED, {
        toolType: `Script:Error:${scriptId}`
      });
      
      return null;
    }
  }
  
  /**
   * Para script
   */
  public stopScript(scriptId: string): void {
    const script = this.scripts.get(scriptId);
    
    if (script) {
      // Se script tem método stop, chama
      if (script.instance && typeof script.instance.stop === 'function') {
        try {
          script.instance.stop();
        } catch (error) {
          console.error(`❌ Error stopping script: ${scriptId}`, error);
        }
      }
      
      script.isRunning = false;
      
      console.log(`⏹️ Script stopped: ${scriptId}`);
      
      eventBus.emit(EventType.TOOL_DEACTIVATED, {
        toolType: `Script:Stopped:${scriptId}`
      });
    }
  }
  
  /**
   * Recarrega script (hot-reload)
   */
  public reloadScript(scriptId: string, newCode: string): void {
    const script = this.scripts.get(scriptId);
    
    if (!script) {
      console.warn(`⚠️ Script not found: ${scriptId}`);
      return;
    }
    
    console.log(`🔄 Reloading script: ${scriptId}`);
    
    // Para script atual
    this.stopScript(scriptId);
    
    // Atualiza código
    script.code = newCode;
    script.instance = null;
    script.error = null;
    
    // Executa novamente
    this.executeScript(scriptId);
    
    console.log(`✅ Script reloaded: ${scriptId}`);
    
    eventBus.emit(EventType.TOOL_ACTIVATED, {
      toolType: `Script:Reloaded:${scriptId}`
    });
  }
  
  /**
   * Remove script
   */
  public unloadScript(scriptId: string): void {
    const script = this.scripts.get(scriptId);
    
    if (script) {
      this.stopScript(scriptId);
      this.scripts.delete(scriptId);
      
      console.log(`🗑️ Script unloaded: ${scriptId}`);
      
      eventBus.emit(EventType.TOOL_DEACTIVATED, {
        toolType: `Script:Unloaded:${scriptId}`
      });
    }
  }
  
  /**
   * Carrega script de arquivo
   */
  public async loadScriptFromFile(path: string): Promise<string | null> {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load script: ${response.statusText}`);
      }
      
      const code = await response.text();
      
      // Extrai ID do nome do arquivo
      const scriptId = path.split('/').pop()?.replace(/\.(js|ts)$/, '') || 'unknown';
      
      this.loadScript(scriptId, code);
      
      return scriptId;
      
    } catch (error) {
      console.error(`❌ Error loading script file: ${path}`, error);
      return null;
    }
  }
  
  /**
   * Atualiza scripts (chamado a cada frame)
   */
  public update(delta: number): void {
    this.scripts.forEach((script, scriptId) => {
      if (script.isRunning && script.instance) {
        // Se script tem método update, chama
        if (typeof script.instance.update === 'function') {
          try {
            script.instance.update(delta);
          } catch (error) {
            console.error(`❌ Script update error (${scriptId}):`, error);
            script.error = error as Error;
          }
        }
      }
    });
  }
  
  /**
   * Retorna script
   */
  public getScript(scriptId: string): any {
    return this.scripts.get(scriptId);
  }
  
  /**
   * Retorna todos os scripts
   */
  public getAllScripts(): Map<string, any> {
    return this.scripts;
  }
  
  /**
   * Retorna ScriptAPI
   */
  public getAPI(): ScriptAPI {
    return this.scriptAPI;
  }
  
  /**
   * Limpa todos os scripts
   */
  public clearAll(): void {
    this.scripts.forEach((_, scriptId) => {
      this.unloadScript(scriptId);
    });
    
    console.log('🧹 All scripts cleared');
  }
  
  /**
   * Retorna estatísticas
   */
  public getStats(): {
    totalScripts: number;
    runningScripts: number;
    errorScripts: number;
  } {
    let running = 0;
    let errors = 0;
    
    this.scripts.forEach((script) => {
      if (script.isRunning) running++;
      if (script.error) errors++;
    });
    
    return {
      totalScripts: this.scripts.size,
      runningScripts: running,
      errorScripts: errors
    };
  }
  
  /**
   * Imprime estatísticas
   */
  public printStats(): void {
    const stats = this.getStats();
    console.log('📊 Script Manager Stats:');
    console.log(`   Total Scripts: ${stats.totalScripts}`);
    console.log(`   Running: ${stats.runningScripts}`);
    console.log(`   Errors: ${stats.errorScripts}`);
  }
}

// Exporta instância global
export const scriptManager = ScriptManager.getInstance();
