/**
 * AdaptiveQualityManager — Dynamic Resolution & Quality Scaling
 *
 * Monitora FPS em tempo real e ajusta automaticamente:
 *   - Pixel ratio (resolução do canvas)
 *   - Post-processing quality preset
 *   - Shadow map size
 *
 * Comportamento igual ao Dynamic Resolution do UE5 e Unity HDRP:
 *   - FPS cai abaixo do target → reduz resolução
 *   - FPS estável acima do target → aumenta resolução gradualmente
 *   - Protege contra oscillação com hysteresis
 *
 * Targets:
 *   - "performance" mode: 60 FPS locked
 *   - "balanced" mode:    45 FPS target
 *   - "quality" mode:     30 FPS target
 */

import * as THREE from 'three';
import type { PostProcessingPipeline, PostProcessQuality } from './PostProcessingPipeline.js';
import type { CascadedShadowManager } from './CascadedShadowManager.js';

export type AdaptiveMode = 'performance' | 'balanced' | 'quality';

interface AdaptiveConfig {
  mode:          AdaptiveMode;
  targetFPS:     number;
  minPixelRatio: number;
  maxPixelRatio: number;
  checkInterval: number;  // ms entre avaliações
  hysteresis:    number;  // frames estáveis antes de upgrade
}

const MODE_CONFIGS: Record<AdaptiveMode, AdaptiveConfig> = {
  performance: {
    mode: 'performance', targetFPS: 60,
    minPixelRatio: 0.5, maxPixelRatio: 1.0,
    checkInterval: 2000, hysteresis: 5,
  },
  balanced: {
    mode: 'balanced', targetFPS: 45,
    minPixelRatio: 0.75, maxPixelRatio: 1.5,
    checkInterval: 3000, hysteresis: 8,
  },
  quality: {
    mode: 'quality', targetFPS: 30,
    minPixelRatio: 1.0, maxPixelRatio: 2.0,
    checkInterval: 4000, hysteresis: 12,
  },
};

// Escada de qualidade (ordem descendente = reduz carga)
const QUALITY_LADDER: PostProcessQuality[] = ['ultra', 'high', 'medium', 'low'];

export class AdaptiveQualityManager {
  private renderer:    THREE.WebGLRenderer;
  private postProcess: PostProcessingPipeline | null;
  private csm:         CascadedShadowManager  | null;
  private config:      AdaptiveConfig;

  private fps:          number = 60;
  private frameCount:   number = 0;
  private lastCheck:    number = performance.now();
  private stableFrames: number = 0;
  private currentQualityIdx: number = 1; // começa em 'high'
  private currentPixelRatio:  number;
  private enabled: boolean = true;

  // Métricas expostas para debug/UI
  public stats = {
    fps: 0,
    pixelRatio: 1,
    quality: 'high' as PostProcessQuality,
    gpuTier: 'unknown' as 'low' | 'mid' | 'high' | 'unknown',
  };

  constructor(
    renderer:    THREE.WebGLRenderer,
    mode:        AdaptiveMode = 'balanced',
    postProcess: PostProcessingPipeline | null = null,
    csm:         CascadedShadowManager  | null = null,
  ) {
    this.renderer    = renderer;
    this.postProcess = postProcess;
    this.csm         = csm;
    this.config      = { ...MODE_CONFIGS[mode] };
    this.currentPixelRatio = renderer.getPixelRatio();

    // Detectar tier da GPU via WebGL
    this.detectGPUTier();

    console.log(`⚡ AdaptiveQualityManager: mode=${mode}, target=${this.config.targetFPS}fps`);
  }

  private detectGPUTier(): void {
    const gl = this.renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return;

    const gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL).toLowerCase();
    if (gpu.includes('rtx') || gpu.includes('rx 6') || gpu.includes('rx 7') || gpu.includes('m1') || gpu.includes('m2')) {
      this.stats.gpuTier = 'high';
      // GPU high-end: começa em ultra
      this.currentQualityIdx = 0;
    } else if (gpu.includes('gtx') || gpu.includes('rx 5') || gpu.includes('iris')) {
      this.stats.gpuTier = 'mid';
      this.currentQualityIdx = 1; // high
    } else {
      this.stats.gpuTier = 'low';
      this.currentQualityIdx = 2; // medium
    }

    console.log(`🖥️ GPU detected: ${gpu} → tier=${this.stats.gpuTier}`);
  }

  /**
   * Chamar a cada frame no render loop — mede FPS e adapta
   */
  public tick(): void {
    if (!this.enabled) return;

    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastCheck;

    if (elapsed < this.config.checkInterval) return;

    // Calcular FPS médio no intervalo
    this.fps = (this.frameCount / elapsed) * 1000;
    this.frameCount = 0;
    this.lastCheck = now;

    this.stats.fps = Math.round(this.fps);
    this.stats.pixelRatio = this.currentPixelRatio;
    this.stats.quality = QUALITY_LADDER[this.currentQualityIdx];

    this.evaluate();
  }

  private evaluate(): void {
    const target = this.config.targetFPS;
    const fps    = this.fps;

    // FPS muito baixo — degradar imediatamente
    if (fps < target * 0.75) {
      this.stableFrames = 0;
      this.downgrade('severe');
      return;
    }

    // FPS levemente abaixo — degradar suavemente
    if (fps < target * 0.9) {
      this.stableFrames = 0;
      this.downgrade('soft');
      return;
    }

    // FPS bom — contar frames estáveis antes de upgrade
    if (fps > target * 1.1) {
      this.stableFrames++;
      if (this.stableFrames >= this.config.hysteresis) {
        this.stableFrames = 0;
        this.upgrade();
      }
    }
  }

  private downgrade(severity: 'soft' | 'severe'): void {
    const step = severity === 'severe' ? 0.15 : 0.08;

    // 1. Tentar reduzir pixel ratio primeiro (menos impacto visual)
    const newRatio = Math.max(
      this.config.minPixelRatio,
      this.currentPixelRatio - step,
    );

    if (newRatio < this.currentPixelRatio) {
      this.setPixelRatio(newRatio);
      console.log(`📉 Adaptive: pixel ratio → ${newRatio.toFixed(2)} (fps=${this.fps.toFixed(0)})`);
      return;
    }

    // 2. Se já no mínimo de resolução, baixar qualidade de post-process
    if (this.currentQualityIdx < QUALITY_LADDER.length - 1) {
      this.currentQualityIdx++;
      const q = QUALITY_LADDER[this.currentQualityIdx];
      this.postProcess?.setQuality(q);
      console.log(`📉 Adaptive: quality → ${q} (fps=${this.fps.toFixed(0)})`);
    }

    // 3. Reduzir shadow maps
    if (severity === 'severe') {
      this.csm?.setShadowMapSize(512);
    }
  }

  private upgrade(): void {
    // 1. Tentar subir qualidade de post-process primeiro
    if (this.currentQualityIdx > 0) {
      this.currentQualityIdx--;
      const q = QUALITY_LADDER[this.currentQualityIdx];
      this.postProcess?.setQuality(q);
      console.log(`📈 Adaptive: quality → ${q} (fps=${this.fps.toFixed(0)})`);
      return;
    }

    // 2. Aumentar pixel ratio até o máximo
    const newRatio = Math.min(
      this.config.maxPixelRatio,
      Math.min(window.devicePixelRatio, this.currentPixelRatio + 0.1),
    );

    if (newRatio > this.currentPixelRatio) {
      this.setPixelRatio(newRatio);
      console.log(`📈 Adaptive: pixel ratio → ${newRatio.toFixed(2)} (fps=${this.fps.toFixed(0)})`);
    }
  }

  private setPixelRatio(ratio: number): void {
    this.currentPixelRatio = ratio;
    this.renderer.setPixelRatio(ratio);
  }

  public setMode(mode: AdaptiveMode): void {
    this.config = { ...MODE_CONFIGS[mode] };
    console.log(`⚡ Adaptive mode changed to: ${mode} (target=${this.config.targetFPS}fps)`);
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      // Restaurar ao native pixel ratio quando desabilitado
      const native = Math.min(window.devicePixelRatio, 2);
      this.setPixelRatio(native);
    }
  }

  public getStats() {
    return { ...this.stats };
  }
}
