/**
 * AssetConfig - Configuração global do sistema de streaming
 * Centraliza todas as configurações para fácil ajuste
 */

export interface AssetStreamingConfig {
  // Cache
  cacheSizeMB: number;
  enableCompression: boolean;
  compressionThresholdMB: number;
  
  // Streaming
  maxConcurrentLoads: number;
  enableWebWorkers: boolean;
  workerCount: number;
  
  // LOD
  autoLODEnabled: boolean;
  lodDistances: {
    low: number[];
    medium: number[];
    high: number[];
  };
  
  // Performance
  targetFPS: number;
  enableAdaptiveQuality: boolean;
  frameBudgetMS: number;
  
  // Prefetch
  prefetchEnabled: boolean;
  prefetchDistance: number;
  maxPrefetchCount: number;
  
  // Memory
  memoryWarningThresholdMB: number;
  memoryCriticalThresholdMB: number;
}

/**
 * Configuração padrão otimizada para desktop
 */
export const DEFAULT_CONFIG: AssetStreamingConfig = {
  cacheSizeMB: 512,
  enableCompression: true,
  compressionThresholdMB: 10,
  
  maxConcurrentLoads: 4,
  enableWebWorkers: true,
  workerCount: 2,
  
  autoLODEnabled: true,
  lodDistances: {
    low: [0, 20, 40, 80],
    medium: [0, 30, 60, 120],
    high: [0, 50, 100, 200]
  },
  
  targetFPS: 60,
  enableAdaptiveQuality: true,
  frameBudgetMS: 16,
  
  prefetchEnabled: true,
  prefetchDistance: 100,
  maxPrefetchCount: 5,
  
  memoryWarningThresholdMB: 768,
  memoryCriticalThresholdMB: 1024
};

/**
 * Configuração otimizada para VR (mais conservadora)
 */
export const VR_CONFIG: AssetStreamingConfig = {
  ...DEFAULT_CONFIG,
  cacheSizeMB: 256,
  targetFPS: 90,
  frameBudgetMS: 11,
  lodDistances: {
    low: [0, 15, 30, 60],
    medium: [0, 20, 40, 80],
    high: [0, 30, 60, 120]
  },
  maxPrefetchCount: 3,
  memoryWarningThresholdMB: 512,
  memoryCriticalThresholdMB: 768
};

/**
 * Configuração otimizada para mobile
 */
export const MOBILE_CONFIG: AssetStreamingConfig = {
  ...DEFAULT_CONFIG,
  cacheSizeMB: 128,
  enableCompression: true,
  compressionThresholdMB: 5,
  maxConcurrentLoads: 2,
  workerCount: 1,
  targetFPS: 30,
  frameBudgetMS: 33,
  lodDistances: {
    low: [0, 10, 20, 40],
    medium: [0, 15, 30, 60],
    high: [0, 25, 50, 100]
  },
  maxPrefetchCount: 2,
  memoryWarningThresholdMB: 256,
  memoryCriticalThresholdMB: 384
};

/**
 * Gerenciador de configuração singleton
 */
export class AssetConfigManager {
  private static instance: AssetConfigManager;
  private config: AssetStreamingConfig;
  
  private constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.detectPlatform();
  }
  
  public static getInstance(): AssetConfigManager {
    if (!AssetConfigManager.instance) {
      AssetConfigManager.instance = new AssetConfigManager();
    }
    return AssetConfigManager.instance;
  }
  
  /**
   * Detecta plataforma e aplica configuração adequada
   */
  private detectPlatform(): void {
    // Detecta VR
    if (navigator.xr) {
      navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        if (supported) {
          this.applyPreset('vr');
        }
      });
    }
    
    // Detecta mobile
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      this.applyPreset('mobile');
    }
  }
  
  /**
   * Aplica preset de configuração
   */
  public applyPreset(preset: 'default' | 'vr' | 'mobile'): void {
    switch (preset) {
      case 'vr':
        this.config = { ...VR_CONFIG };
        console.log('🥽 Applied VR configuration preset');
        break;
      case 'mobile':
        this.config = { ...MOBILE_CONFIG };
        console.log('📱 Applied Mobile configuration preset');
        break;
      default:
        this.config = { ...DEFAULT_CONFIG };
        console.log('🖥️ Applied Desktop configuration preset');
    }
  }
  
  /**
   * Obtém configuração atual
   */
  public getConfig(): AssetStreamingConfig {
    return { ...this.config };
  }
  
  /**
   * Atualiza configuração parcial
   */
  public updateConfig(partial: Partial<AssetStreamingConfig>): void {
    this.config = { ...this.config, ...partial };
    console.log('⚙️ Configuration updated');
  }
  
  /**
   * Reseta para configuração padrão
   */
  public reset(): void {
    this.config = { ...DEFAULT_CONFIG };
    console.log('🔄 Configuration reset to defaults');
  }
}

// Export singleton
export const assetConfig = AssetConfigManager.getInstance();
