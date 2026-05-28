/**
 * QualityManager - Ajusta qualidade gráfica automaticamente
 * Responde ao PerformanceMonitor para manter FPS estável
 */

import * as THREE from 'three';
import { getLogger } from './Logger';
import { getPerformanceMonitor } from './PerformanceMonitor';

const logger = getLogger();

export enum QualityLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  ULTRA_LOW = 'ultra-low'
}

export interface QualitySettings {
  level: QualityLevel;
  shadowsEnabled: boolean;
  antialiasing: boolean;
  pixelRatio: number;
  fogEnabled: boolean;
  postProcessing: boolean;
}

export class QualityManager {
  private static instance: QualityManager;
  
  private currentLevel: QualityLevel = QualityLevel.HIGH;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private autoAdjustEnabled: boolean = true;
  private adjustmentHistory: QualityLevel[] = [];

  private constructor() {
    this.setupPerformanceMonitoring();
  }

  public static getInstance(): QualityManager {
    if (!QualityManager.instance) {
      QualityManager.instance = new QualityManager();
    }
    return QualityManager.instance;
  }

  /**
   * Inicializa com renderer e scene
   */
  public initialize(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    this.renderer = renderer;
    this.scene = scene;
    logger.info('Quality', 'QualityManager initialized', { level: this.currentLevel });
  }

  /**
   * Configura monitoramento de performance
   */
  private setupPerformanceMonitoring(): void {
    const monitor = getPerformanceMonitor();
    
    monitor.start({
      onLowPerformance: () => {
        if (this.autoAdjustEnabled) {
          this.downgradeQuality();
        }
      },
      onPerformanceRestore: () => {
        // Não aumenta automaticamente (evita oscilação)
        logger.debug('Quality', 'Performance restored, staying at current level');
      }
    });
  }

  /**
   * Reduz qualidade gráfica
   */
  private downgradeQuality(): void {
    const currentIndex = this.getLevelIndex(this.currentLevel);
    const levels = Object.values(QualityLevel);
    
    if (currentIndex < levels.length - 1) {
      const newLevel = levels[currentIndex + 1];
      this.setQualityLevel(newLevel);
      
      logger.warn('Quality', `Quality downgraded: ${this.currentLevel} → ${newLevel}`);
    } else {
      logger.warn('Quality', 'Already at lowest quality level');
    }
  }

  /**
   * Define nível de qualidade
   */
  public setQualityLevel(level: QualityLevel): void {
    if (!this.renderer || !this.scene) {
      logger.error('Quality', 'Cannot set quality: renderer/scene not initialized');
      return;
    }

    const oldLevel = this.currentLevel;
    this.currentLevel = level;
    this.adjustmentHistory.push(level);

    const settings = this.getSettingsForLevel(level);
    this.applySettings(settings);

    logger.info('Quality', `Quality level changed: ${oldLevel} → ${level}`, settings);
  }

  /**
   * Obtém configurações para um nível
   */
  private getSettingsForLevel(level: QualityLevel): QualitySettings {
    switch (level) {
      case QualityLevel.HIGH:
        return {
          level,
          shadowsEnabled: true,
          antialiasing: true,
          pixelRatio: Math.min(window.devicePixelRatio, 2),
          fogEnabled: false,
          postProcessing: true
        };

      case QualityLevel.MEDIUM:
        return {
          level,
          shadowsEnabled: false,
          antialiasing: true,
          pixelRatio: Math.min(window.devicePixelRatio, 1.5),
          fogEnabled: true,
          postProcessing: false
        };

      case QualityLevel.LOW:
        return {
          level,
          shadowsEnabled: false,
          antialiasing: false,
          pixelRatio: 1,
          fogEnabled: true,
          postProcessing: false
        };

      case QualityLevel.ULTRA_LOW:
        return {
          level,
          shadowsEnabled: false,
          antialiasing: false,
          pixelRatio: 0.75,
          fogEnabled: true,
          postProcessing: false
        };
    }
  }

  /**
   * Aplica configurações
   */
  private applySettings(settings: QualitySettings): void {
    if (!this.renderer || !this.scene) return;

    // Pixel Ratio
    this.renderer.setPixelRatio(settings.pixelRatio);

    // Shadows
    this.renderer.shadowMap.enabled = settings.shadowsEnabled;
    
    // Fog
    if (settings.fogEnabled && !this.scene.fog) {
      this.scene.fog = new THREE.Fog(0x0a0a0f, 50, 200);
    } else if (!settings.fogEnabled && this.scene.fog) {
      this.scene.fog = null;
    }

    // Atualiza tamanho para aplicar pixelRatio
    const canvas = this.renderer.domElement;
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    logger.debug('Quality', 'Settings applied', settings);
  }

  /**
   * Ativa/desativa ajuste automático
   */
  public setAutoAdjust(enabled: boolean): void {
    this.autoAdjustEnabled = enabled;
    logger.info('Quality', `Auto-adjust ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Obtém nível atual
   */
  public getCurrentLevel(): QualityLevel {
    return this.currentLevel;
  }

  /**
   * Obtém configurações atuais
   */
  public getCurrentSettings(): QualitySettings {
    return this.getSettingsForLevel(this.currentLevel);
  }

  /**
   * Obtém histórico de ajustes
   */
  public getAdjustmentHistory(): QualityLevel[] {
    return [...this.adjustmentHistory];
  }

  /**
   * Helper: obtém índice do nível
   */
  private getLevelIndex(level: QualityLevel): number {
    return Object.values(QualityLevel).indexOf(level);
  }

  /**
   * Reseta para nível alto
   */
  public reset(): void {
    this.setQualityLevel(QualityLevel.HIGH);
    this.adjustmentHistory = [];
    logger.info('Quality', 'Quality reset to HIGH');
  }
}

/**
 * Singleton accessor
 */
export function getQualityManager(): QualityManager {
  return QualityManager.getInstance();
}
