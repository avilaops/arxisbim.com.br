/*
 * Aviso de nomenclatura, nao de React.
 *
 * As funcoes daqui comecam com `use` mas NAO sao hooks: nenhuma chama
 * useState, useEffect ou qualquer outro hook. Sao leitores sincronos que
 * consultam um singleton e devolvem o valor na hora, entao podem ser
 * chamadas de classe, de callback e de dentro de condicional sem quebrar
 * nada. O ESLint julga so pelo prefixo, e por isso acusava
 * `react-hooks/rules-of-hooks` em todo consumidor.
 *
 * Desligar a regra AQUI, na origem, e mais honesto do que espalhar
 * eslint-disable por cada arquivo que as usa. Renomear para `getPlan` /
 * `getFeature` seria o certo de verdade, mas mexe em 12 arquivos e fica
 * para quando alguem encostar nessa area.
 */
/* eslint-disable react-hooks/rules-of-hooks */
/**
 * FeatureFlags - Sistema de feature flags para controle de funcionalidades
 * Padrão usado por: LaunchDarkly, Unleash, Split.io, Firebase Remote Config
 * 
 * Permite:
 * - A/B testing
 * - Gradual rollout
 * - Kill switches
 * - Canary releases
 * - User segmentation
 */

export type FeatureFlagValue = boolean | string | number | object;

export interface FeatureFlag {
  key: string;
  value: FeatureFlagValue;
  enabled: boolean;
  description?: string;
  rolloutPercentage?: number; // 0-100
  userSegments?: string[]; // ['beta', 'premium', 'internal']
  expiresAt?: number; // timestamp
}

export interface FeatureFlagConfig {
  flags: Record<string, FeatureFlag>;
  userId?: string;
  userSegments?: string[];
  enableLogging?: boolean;
}

export interface FeatureFlagEvaluation {
  key: string;
  value: FeatureFlagValue;
  enabled: boolean;
  reason: 'default' | 'override' | 'rollout' | 'segment' | 'expired';
}

/**
 * Feature Flags System
 */
export class FeatureFlags {
  private static instance: FeatureFlags;
  
  private flags: Map<string, FeatureFlag> = new Map();
  private overrides: Map<string, FeatureFlagValue> = new Map();
  private userId?: string;
  private userSegments: Set<string> = new Set();
  private enableLogging: boolean = false;
  
  private changeListeners: Map<string, ((value: FeatureFlagValue) => void)[]> = new Map();

  private constructor() {
    this.loadDefaults();
    this.loadFromLocalStorage();
  }

  public static getInstance(): FeatureFlags {
    if (!FeatureFlags.instance) {
      FeatureFlags.instance = new FeatureFlags();
    }
    return FeatureFlags.instance;
  }

  /**
   * Inicializa feature flags
   */
  public initialize(config: Partial<FeatureFlagConfig>): void {
    if (config.userId) {
      this.userId = config.userId;
    }
    
    if (config.userSegments) {
      this.userSegments = new Set(config.userSegments);
    }
    
    if (config.enableLogging !== undefined) {
      this.enableLogging = config.enableLogging;
    }
    
    if (config.flags) {
      Object.entries(config.flags).forEach(([key, flag]) => {
        this.flags.set(key, flag);
      });
    }
    
    this.log('FeatureFlags initialized', { userId: this.userId, segments: Array.from(this.userSegments) });
  }

  /**
   * Define flags padrão
   */
  private loadDefaults(): void {
    const defaults: Record<string, FeatureFlag> = {
      // Performance Features
      'performance.gpu-acceleration': {
        key: 'performance.gpu-acceleration',
        value: true,
        enabled: true,
        description: 'Enable GPU acceleration for clipping and rendering'
      },
      'performance.occlusion-culling': {
        key: 'performance.occlusion-culling',
        value: true,
        enabled: true,
        description: 'Enable occlusion culling for hidden objects'
      },
      'performance.lod-system': {
        key: 'performance.lod-system',
        value: true,
        enabled: true,
        description: 'Enable Level of Detail system'
      },
      
      // BIM Features
      'bim.4d-planning': {
        key: 'bim.4d-planning',
        value: false,
        enabled: false,
        description: 'Enable BIM 4D temporal planning (beta)',
        rolloutPercentage: 0
      },
      'bim.5d-costs': {
        key: 'bim.5d-costs',
        value: false,
        enabled: false,
        description: 'Enable BIM 5D cost management (beta)',
        rolloutPercentage: 0
      },
      'bim.6d-facilities': {
        key: 'bim.6d-facilities',
        value: false,
        enabled: false,
        description: 'Enable BIM 6D facilities management (beta)',
        rolloutPercentage: 0
      },
      
      // Multiplayer Features
      'multiplayer.enabled': {
        key: 'multiplayer.enabled',
        value: import.meta.env.VITE_ENABLE_MULTIPLAYER === 'true',
        enabled: import.meta.env.VITE_ENABLE_MULTIPLAYER === 'true',
        description: 'Enable multiplayer collaboration'
      },
      'multiplayer.voice-chat': {
        key: 'multiplayer.voice-chat',
        value: true,
        enabled: true,
        description: 'Enable voice chat in multiplayer'
      },
      'multiplayer.screen-sharing': {
        key: 'multiplayer.screen-sharing',
        value: true,
        enabled: true,
        description: 'Enable screen sharing in multiplayer'
      },
      
      // VR/AR Features
      'vr.enabled': {
        key: 'vr.enabled',
        value: true,
        enabled: true,
        description: 'Enable VR support'
      },
      'ar.enabled': {
        key: 'ar.enabled',
        value: true,
        enabled: true,
        description: 'Enable AR support'
      },
      'vr.hand-tracking': {
        key: 'vr.hand-tracking',
        value: false,
        enabled: false,
        description: 'Enable hand tracking (experimental)',
        rolloutPercentage: 25
      },
      
      // UI Features
      'ui.command-palette': {
        key: 'ui.command-palette',
        value: true,
        enabled: true,
        description: 'Enable command palette (Ctrl+K)'
      },
      'ui.dark-mode': {
        key: 'ui.dark-mode',
        value: true,
        enabled: true,
        description: 'Dark mode enabled by default'
      },
      'ui.tooltips': {
        key: 'ui.tooltips',
        value: true,
        enabled: true,
        description: 'Show tooltips'
      },
      
      // Analytics
      'analytics.enabled': {
        key: 'analytics.enabled',
        value: false,
        enabled: false,
        description: 'Enable analytics tracking',
        userSegments: ['internal', 'beta']
      },
      
      // Experimental
      'experimental.webgpu': {
        key: 'experimental.webgpu',
        value: false,
        enabled: false,
        description: 'Use WebGPU renderer (experimental)',
        rolloutPercentage: 5
      },
      'experimental.ai-assistant': {
        key: 'experimental.ai-assistant',
        value: false,
        enabled: false,
        description: 'Enable AI assistant (experimental)',
        userSegments: ['internal']
      }
    };

    Object.entries(defaults).forEach(([key, flag]) => {
      this.flags.set(key, flag);
    });
  }

  /**
   * Carrega overrides do localStorage
   */
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem('arxis_feature_flags');
      if (stored) {
        const overrides = JSON.parse(stored);
        Object.entries(overrides).forEach(([key, value]) => {
          this.overrides.set(key, value as FeatureFlagValue);
        });
      }
    } catch (error) {
      console.warn('Failed to load feature flags from localStorage:', error);
    }
  }

  /**
   * Salva overrides no localStorage
   */
  private saveToLocalStorage(): void {
    try {
      const overrides: Record<string, FeatureFlagValue> = {};
      this.overrides.forEach((value, key) => {
        overrides[key] = value;
      });
      localStorage.setItem('arxis_feature_flags', JSON.stringify(overrides));
    } catch (error) {
      console.warn('Failed to save feature flags to localStorage:', error);
    }
  }

  /**
   * Verifica se feature está habilitada
   */
  public isEnabled(key: string): boolean {
    const evaluation = this.evaluate(key);
    return evaluation.enabled && !!evaluation.value;
  }

  /**
   * Obtém valor da feature flag
   */
  public getValue<T extends FeatureFlagValue = boolean>(key: string, defaultValue?: T): T {
    const evaluation = this.evaluate(key);
    return (evaluation.value as T) ?? defaultValue ?? (false as T);
  }

  /**
   * Avalia feature flag com todas as regras
   */
  public evaluate(key: string): FeatureFlagEvaluation {
    // Check override first
    if (this.overrides.has(key)) {
      const value = this.overrides.get(key)!;
      this.log('Feature flag override', { key, value });
      return {
        key,
        value,
        enabled: !!value,
        reason: 'override'
      };
    }

    const flag = this.flags.get(key);
    
    if (!flag) {
      this.log('Feature flag not found', { key });
      return {
        key,
        value: false,
        enabled: false,
        reason: 'default'
      };
    }

    // Check expiration
    if (flag.expiresAt && Date.now() > flag.expiresAt) {
      this.log('Feature flag expired', { key, expiresAt: flag.expiresAt });
      return {
        key,
        value: false,
        enabled: false,
        reason: 'expired'
      };
    }

    // Check user segments
    if (flag.userSegments && flag.userSegments.length > 0) {
      const hasSegment = flag.userSegments.some(segment => this.userSegments.has(segment));
      
      if (!hasSegment) {
        this.log('Feature flag segment not matched', { key, userSegments: flag.userSegments });
        return {
          key,
          value: false,
          enabled: false,
          reason: 'segment'
        };
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      const inRollout = this.isInRollout(key, flag.rolloutPercentage);
      
      if (!inRollout) {
        this.log('Feature flag rollout not matched', { key, rolloutPercentage: flag.rolloutPercentage });
        return {
          key,
          value: false,
          enabled: false,
          reason: 'rollout'
        };
      }
    }

    this.log('Feature flag evaluated', { key, value: flag.value, enabled: flag.enabled });
    
    return {
      key,
      value: flag.value,
      enabled: flag.enabled,
      reason: 'default'
    };
  }

  /**
   * Determina se user está no rollout (consistent hashing)
   */
  private isInRollout(key: string, percentage: number): boolean {
    if (!this.userId) {
      // Sem userId, usa random (não determinístico)
      return Math.random() * 100 < percentage;
    }

    // Hash consistente baseado em userId + key
    const hash = this.simpleHash(this.userId + key);
    const bucket = hash % 100;
    
    return bucket < percentage;
  }

  /**
   * Hash simples (DJB2)
   */
  private simpleHash(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return Math.abs(hash);
  }

  /**
   * Define override para feature flag
   */
  public setOverride(key: string, value: FeatureFlagValue): void {
    this.overrides.set(key, value);
    this.saveToLocalStorage();
    this.notifyListeners(key, value);
    this.log('Feature flag override set', { key, value });
  }

  /**
   * Remove override
   */
  public clearOverride(key: string): void {
    this.overrides.delete(key);
    this.saveToLocalStorage();
    
    const evaluation = this.evaluate(key);
    this.notifyListeners(key, evaluation.value);
    
    this.log('Feature flag override cleared', { key });
  }

  /**
   * Limpa todos os overrides
   */
  public clearAllOverrides(): void {
    this.overrides.clear();
    this.saveToLocalStorage();
    this.log('All feature flag overrides cleared');
  }

  /**
   * Registra listener para mudanças
   */
  public onChange(key: string, callback: (value: FeatureFlagValue) => void): () => void {
    if (!this.changeListeners.has(key)) {
      this.changeListeners.set(key, []);
    }
    
    this.changeListeners.get(key)!.push(callback);
    
    // Retorna função para unregister
    return () => {
      const listeners = this.changeListeners.get(key);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * Notifica listeners
   */
  private notifyListeners(key: string, value: FeatureFlagValue): void {
    const listeners = this.changeListeners.get(key);
    if (listeners) {
      listeners.forEach(callback => callback(value));
    }
  }

  /**
   * Obtém todas as flags
   */
  public getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Obtém todas as flags avaliadas
   */
  public getAllEvaluations(): FeatureFlagEvaluation[] {
    return Array.from(this.flags.keys()).map(key => this.evaluate(key));
  }

  /**
   * Define user segments
   */
  public setUserSegments(segments: string[]): void {
    this.userSegments = new Set(segments);
    this.log('User segments updated', { segments });
  }

  /**
   * Adiciona user segment
   */
  public addUserSegment(segment: string): void {
    this.userSegments.add(segment);
    this.log('User segment added', { segment });
  }

  /**
   * Log (se habilitado)
   */
  private log(message: string, data?: any): void {
    if (this.enableLogging) {
      console.log(`[FeatureFlags] ${message}`, data || '');
    }
  }

  /**
   * Export para debug
   */
  public export(): string {
    return JSON.stringify({
      flags: Array.from(this.flags.entries()),
      overrides: Array.from(this.overrides.entries()),
      userId: this.userId,
      userSegments: Array.from(this.userSegments),
      evaluations: this.getAllEvaluations()
    }, null, 2);
  }
}

// Singleton instance
export const featureFlags = FeatureFlags.getInstance();

// Helper hook-style function
export function useFeatureFlag(key: string): boolean {
  return featureFlags.isEnabled(key);
}

export function useFeatureFlagValue<T extends FeatureFlagValue = boolean>(
  key: string,
  defaultValue?: T
): T {
  return featureFlags.getValue<T>(key, defaultValue);
}
