import * as THREE from 'three';
import { LightingSystem } from './LightingSystem';
import { LODSystem } from './LODSystem';

/**
 * Render Quality Manager
 * Coordena LightingSystem, LODSystem e Renderer para garantir performance
 * Modo "safe" para máquinas fracas
 */
export class RenderQualityManager {
  private currentQuality: QualityPreset = 'high';
  private safeMode: boolean = false;

  constructor(
    private renderer: THREE.WebGLRenderer,
    private lightingSystem: LightingSystem,
    private lodSystem: LODSystem
  ) {}

  /**
   * Define preset de qualidade
   */
  public setQuality(preset: QualityPreset): void {
    this.currentQuality = preset;

    switch (preset) {
      case 'ultra':
        this.applyUltraQuality();
        break;
      case 'high':
        this.applyHighQuality();
        break;
      case 'medium':
        this.applyMediumQuality();
        break;
      case 'low':
        this.applyLowQuality();
        break;
      case 'potato':
        this.applyPotatoQuality();
        break;
    }

    console.log(`🎨 Qualidade ajustada: ${preset}${this.safeMode ? ' (Safe Mode)' : ''}`);
  }

  /**
   * Ativa modo seguro (máquinas fracas)
   */
  public enableSafeMode(enabled: boolean): void {
    this.safeMode = enabled;

    if (enabled) {
      // Safe mode = qualidade baixa garantida
      this.setQuality('low');
      
      // Reduz pixel ratio
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
      
      console.warn('⚠️ Safe Mode ativado - performance conservativa');
    } else {
      // Restaura qualidade
      this.setQuality(this.currentQuality);
    }
  }

  /**
   * Ultra Quality (4K displays, GPU potente)
   */
  private applyUltraQuality(): void {
    // Renderer
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMappingExposure = 1.0;

    // Lighting
    this.lightingSystem.setShadowQuality('ultra');

    // LOD (distâncias aumentadas)
    this.lodSystem.setLODDistances(30, 80, 150, 250);
  }

  /**
   * High Quality (default)
   */
  private applyHighQuality(): void {
    // Renderer
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMappingExposure = 1.0;

    // Lighting
    this.lightingSystem.setShadowQuality('high');

    // LOD (default)
    this.lodSystem.setLODDistances(20, 50, 100, 150);
  }

  /**
   * Medium Quality (balanced)
   */
  private applyMediumQuality(): void {
    // Renderer
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMappingExposure = 1.0;

    // Lighting
    this.lightingSystem.setShadowQuality('medium');

    // LOD (reduzido)
    this.lodSystem.setLODDistances(15, 35, 70, 120);
  }

  /**
   * Low Quality (máquinas antigas)
   */
  private applyLowQuality(): void {
    // Renderer
    this.renderer.setPixelRatio(1.0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.toneMappingExposure = 1.0;

    // Lighting
    this.lightingSystem.setShadowQuality('low');

    // LOD (agressivo)
    this.lodSystem.setLODDistances(10, 25, 50, 80);
  }

  /**
   * Potato Quality (máquinas muito fracas)
   */
  private applyPotatoQuality(): void {
    // Renderer
    this.renderer.setPixelRatio(0.75);
    this.renderer.shadowMap.enabled = false; // Sem sombras
    this.renderer.toneMappingExposure = 1.2; // Compensa falta de sombras

    // Lighting - sem sombras
    this.lightingSystem.setShadowQuality('low');

    // LOD (muito agressivo)
    this.lodSystem.setLODDistances(8, 20, 40, 60);
  }

  /**
   * Auto-ajusta qualidade baseado em FPS
   */
  public autoAdjustQuality(currentFPS: number, targetFPS: number = 60): void {
    if (this.safeMode) return; // Safe mode não auto-ajusta

    const fpsRatio = currentFPS / targetFPS;

    // Reduz qualidade se FPS < 80% do target
    if (fpsRatio < 0.8) {
      this.downgradeQuality();
    }
    // Aumenta qualidade se FPS > 120% do target (consistentemente)
    else if (fpsRatio > 1.2) {
      this.upgradeQuality();
    }
  }

  /**
   * Reduz qualidade em 1 nível
   */
  private downgradeQuality(): void {
    const presets: QualityPreset[] = ['ultra', 'high', 'medium', 'low', 'potato'];
    const currentIndex = presets.indexOf(this.currentQuality);

    if (currentIndex < presets.length - 1) {
      this.setQuality(presets[currentIndex + 1]);
      console.warn(`⬇️ Qualidade reduzida para ${presets[currentIndex + 1]} (FPS baixo)`);
    }
  }

  /**
   * Aumenta qualidade em 1 nível
   */
  private upgradeQuality(): void {
    const presets: QualityPreset[] = ['ultra', 'high', 'medium', 'low', 'potato'];
    const currentIndex = presets.indexOf(this.currentQuality);

    if (currentIndex > 0) {
      this.setQuality(presets[currentIndex - 1]);
      console.log(`⬆️ Qualidade aumentada para ${presets[currentIndex - 1]} (FPS estável)`);
    }
  }

  /**
   * Obtém qualidade atual
   */
  public getCurrentQuality(): QualityPreset {
    return this.currentQuality;
  }

  /**
   * Verifica se está em safe mode
   */
  public isSafeMode(): boolean {
    return this.safeMode;
  }
}

// Types
export type QualityPreset = 'ultra' | 'high' | 'medium' | 'low' | 'potato';
