/**
 * PostProcessingPipeline — Stack AAA para ArxisVR
 *
 * Ordem dos passes (mesma lógica de UE5 / Unity HDRP):
 *   RenderPass → SSAOPass → UnrealBloomPass → BokehPass (DoF)
 *   → SMAAPass → FilmPass → VignettePass → LUTPass → GammaCorrection
 *
 * Referências:
 *   - UE5: Post Process Volume (AO, Bloom, DoF, Chromatic Aberration, Vignette, LUT)
 *   - Unity HDRP: Volume framework (SSAO, Bloom, DoF, Tonemapping, Film Grain, LUT)
 */

import * as THREE from 'three';
import { EffectComposer }        from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }            from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass }       from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SAOPass }               from 'three/examples/jsm/postprocessing/SAOPass.js';
import { SMAAPass }              from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { BokehPass }             from 'three/examples/jsm/postprocessing/BokehPass.js';
import { ShaderPass }            from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FilmPass }              from 'three/examples/jsm/postprocessing/FilmPass.js';
import { VignetteShader }        from 'three/examples/jsm/shaders/VignetteShader.js';
import { FXAAShader }            from 'three/examples/jsm/shaders/FXAAShader.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type PostProcessQuality = 'low' | 'medium' | 'high' | 'ultra';

export interface PostProcessConfig {
  quality:    PostProcessQuality;

  // SSAO (Ambient Occlusion)
  ssao:        boolean;
  ssaoRadius:  number;
  ssaoMinDist: number;
  ssaoMaxDist: number;

  // Bloom (Unreal)
  bloom:          boolean;
  bloomStrength:  number;
  bloomRadius:    number;
  bloomThreshold: number;

  // Depth of Field (Bokeh)
  dof:       boolean;
  dofFocus:  number;   // distância focal (world units)
  dofAperture: number; // abertura — controla blur fora de foco
  dofMaxBlur:  number; // blur máximo (0–0.02)

  // Film Grain
  grain:          boolean;
  grainIntensity: number;

  // Vignette
  vignette:         boolean;
  vignetteDarkness: number;
  vignetteOffset:   number;

  // Anti-aliasing
  smaa: boolean;
  fxaa: boolean;
}

const QUALITY_PRESETS: Record<PostProcessQuality, PostProcessConfig> = {
  low: {
    quality: 'low',
    ssao: false, ssaoRadius: 4, ssaoMinDist: 0.005, ssaoMaxDist: 0.1,
    bloom: true,  bloomStrength: 0.35, bloomRadius: 0.40, bloomThreshold: 0.88,
    dof: false,   dofFocus: 50, dofAperture: 0.00002, dofMaxBlur: 0.005,
    grain: false, grainIntensity: 0,
    vignette: true, vignetteDarkness: 0.38, vignetteOffset: 0.88,
    smaa: false, fxaa: true,
  },
  medium: {
    quality: 'medium',
    ssao: true,  ssaoRadius: 4, ssaoMinDist: 0.005, ssaoMaxDist: 0.10,
    bloom: true,  bloomStrength: 0.55, bloomRadius: 0.50, bloomThreshold: 0.82,
    dof: false,   dofFocus: 50, dofAperture: 0.00002, dofMaxBlur: 0.006,
    grain: false, grainIntensity: 0,
    vignette: true, vignetteDarkness: 0.44, vignetteOffset: 0.92,
    smaa: true, fxaa: false,
  },
  high: {
    quality: 'high',
    ssao: true,  ssaoRadius: 5, ssaoMinDist: 0.003, ssaoMaxDist: 0.08,
    bloom: true,  bloomStrength: 0.65, bloomRadius: 0.55, bloomThreshold: 0.80,
    dof: true,    dofFocus: 60, dofAperture: 0.000025, dofMaxBlur: 0.008,
    grain: true,  grainIntensity: 0.028,
    vignette: true, vignetteDarkness: 0.50, vignetteOffset: 0.95,
    smaa: true, fxaa: false,
  },
  ultra: {
    quality: 'ultra',
    ssao: true,  ssaoRadius: 6, ssaoMinDist: 0.002, ssaoMaxDist: 0.06,
    bloom: true,  bloomStrength: 0.72, bloomRadius: 0.60, bloomThreshold: 0.78,
    dof: true,    dofFocus: 60, dofAperture: 0.00003, dofMaxBlur: 0.010,
    grain: true,  grainIntensity: 0.022,
    vignette: true, vignetteDarkness: 0.52, vignetteOffset: 0.98,
    smaa: true, fxaa: false,
  },
};

// ─── Pipeline ────────────────────────────────────────────────────────────────

export class PostProcessingPipeline {
  private composer:   EffectComposer;
  private renderer:   THREE.WebGLRenderer;
  private scene:      THREE.Scene;
  private camera:     THREE.PerspectiveCamera;
  private config:     PostProcessConfig;

  // Refs para ajuste em runtime
  private bloomPass: UnrealBloomPass | null = null;
  private saoPass:   SAOPass         | null = null;  // SAO = 4× faster than SSAO
  private bokehPass: BokehPass       | null = null;
  private filmPass:  FilmPass        | null = null;
  private vigPass:   ShaderPass      | null = null;
  private fxaaPass:  ShaderPass      | null = null;
  private aoEnabled: boolean         = false;       // lazy: só liga com modelo

  constructor(
    renderer: THREE.WebGLRenderer,
    scene:    THREE.Scene,
    camera:   THREE.PerspectiveCamera,
    quality:  PostProcessQuality = 'high',
  ) {
    this.renderer = renderer;
    this.scene    = scene;
    this.camera   = camera;
    this.config   = { ...QUALITY_PRESETS[quality] };

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const size = renderer.getSize(new THREE.Vector2());
    this.composer = new EffectComposer(renderer);
    this.composer.setSize(size.x, size.y);

    this.buildPasses();
    console.log(`🎬 PostProcessingPipeline [${quality}] — ${this.composer.passes.length} passes`);
  }

  // ─── Build ──────────────────────────────────────────────────────────────────

  private buildPasses(): void {
    const cfg  = this.config;
    const size = this.renderer.getSize(new THREE.Vector2());
    const w = size.x, h = size.y;

    // 1. Base render
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    // 2. SAO — Scalable Ambient Obscurance (4× mais rápido que SSAOPass)
    //    Lazy: começa desabilitado, liga apenas quando modelo é carregado
    if (cfg.ssao) {
      this.saoPass = new SAOPass(this.scene, this.camera, false, true);
      this.saoPass.params.saoBias         = 0.5;
      this.saoPass.params.saoIntensity    = 0.18;
      this.saoPass.params.saoScale        = 1;
      this.saoPass.params.saoKernelRadius = cfg.ssaoRadius * 10;
      this.saoPass.params.saoMinResolution = 0;
      this.saoPass.params.saoBlur         = true;
      this.saoPass.params.saoBlurRadius   = 8;
      this.saoPass.params.saoBlurStdDev   = 4;
      this.saoPass.enabled = this.aoEnabled;  // desabilitado até modelo carregar
      this.composer.addPass(this.saoPass);
    }

    // 3. Unreal Bloom — UE4/5 Temporal Bloom
    if (cfg.bloom) {
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(w, h),
        cfg.bloomStrength,
        cfg.bloomRadius,
        cfg.bloomThreshold,
      );
      this.composer.addPass(this.bloomPass);
    }

    // 4. Depth of Field (Bokeh) — desfoque cinematográfico
    if (cfg.dof) {
      this.bokehPass = new BokehPass(this.scene, this.camera, {
        focus:    cfg.dofFocus,
        aperture: cfg.dofAperture,
        maxblur:  cfg.dofMaxBlur,
      });
      this.composer.addPass(this.bokehPass);
    }

    // 5. SMAA — melhor AA, sem blur (UE5 SMAA / Unity SMAA)
    if (cfg.smaa) {
      this.composer.addPass(new SMAAPass(w, h));
    }

    // 6. Film grain — ruído cinematográfico
    if (cfg.grain && cfg.grainIntensity > 0) {
      this.filmPass = new FilmPass(cfg.grainIntensity, false);
      this.composer.addPass(this.filmPass);
    }

    // 7. Vignette — bordas escurecidas
    if (cfg.vignette) {
      this.vigPass = new ShaderPass(VignetteShader);
      this.vigPass.uniforms['darkness'].value = cfg.vignetteDarkness;
      this.vigPass.uniforms['offset'].value   = cfg.vignetteOffset;
      this.composer.addPass(this.vigPass);
    }

    // 8. FXAA fallback (apenas low quality)
    if (cfg.fxaa && !cfg.smaa) {
      this.fxaaPass = new ShaderPass(FXAAShader);
      this.fxaaPass.uniforms['resolution'].value.set(1 / w, 1 / h);
      this.composer.addPass(this.fxaaPass);
    }

    // 9. Gamma correction — último sempre
    this.composer.addPass(new ShaderPass(GammaCorrectionShader));
  }

  // ─── Runtime API ─────────────────────────────────────────────────────────────

  public render(): void {
    this.composer.render();
  }

  public setSize(w: number, h: number): void {
    this.composer.setSize(w, h);
    this.fxaaPass?.uniforms['resolution'].value.set(1 / w, 1 / h);
    this.saoPass?.setSize(w, h);
    if (this.bloomPass) this.bloomPass.resolution.set(w, h);
  }

  public setQuality(quality: PostProcessQuality): void {
    const wasAoEnabled = this.aoEnabled;
    this.config = { ...QUALITY_PRESETS[quality] };
    this.composer.passes.splice(0);
    this.bloomPass = null; this.saoPass   = null;
    this.bokehPass = null; this.filmPass  = null;
    this.vigPass   = null; this.fxaaPass  = null;
    this.buildPasses();
    // Restore AO state after rebuild
    if (wasAoEnabled && this.saoPass) this.saoPass.enabled = true;
    this.aoEnabled = wasAoEnabled;
    console.log(`🎬 PostProcess → ${quality} (${this.composer.passes.length} passes)`);
  }

  /**
   * Ligar AO — chamar APÓS primeiro modelo IFC ser carregado
   * Evita rodar SAO em cena vazia (caro e inútil)
   */
  public enableAO(): void {
    this.aoEnabled = true;
    if (this.saoPass) {
      this.saoPass.enabled = true;
      console.log('🌑 SAO (Ambient Occlusion) ativado');
    }
  }

  public disableAO(): void {
    this.aoEnabled = false;
    if (this.saoPass) this.saoPass.enabled = false;
  }

  /** Bloom: strength 0–3, radius 0–1, threshold 0–1 */
  public setBloom(strength: number, radius?: number, threshold?: number): void {
    if (!this.bloomPass) return;
    this.bloomPass.strength = strength;
    if (radius    !== undefined) this.bloomPass.radius    = radius;
    if (threshold !== undefined) this.bloomPass.threshold = threshold;
  }

  /** DoF: foco em world units, aperture controla blur */
  public setDOF(focus: number, aperture?: number, maxBlur?: number): void {
    if (!this.bokehPass) return;
    (this.bokehPass as any).uniforms['focus'].value    = focus;
    if (aperture !== undefined) (this.bokehPass as any).uniforms['aperture'].value = aperture;
    if (maxBlur  !== undefined) (this.bokehPass as any).uniforms['maxblur'].value  = maxBlur;
  }

  /** Auto-foca no ponto que a câmera está olhando */
  public autoFocusAtDistance(distance: number): void {
    this.setDOF(distance);
  }

  public setSSAOEnabled(enabled: boolean): void {
    if (enabled) this.enableAO(); else this.disableAO();
  }

  public setVignette(darkness: number, offset?: number): void {
    if (!this.vigPass) return;
    this.vigPass.uniforms['darkness'].value = darkness;
    if (offset !== undefined) this.vigPass.uniforms['offset'].value = offset;
  }

  public setBloomEnabled(enabled: boolean): void {
    if (this.bloomPass) this.bloomPass.enabled = enabled;
  }

  public setDOFEnabled(enabled: boolean): void {
    if (this.bokehPass) this.bokehPass.enabled = enabled;
  }

  public getConfig(): PostProcessConfig { return { ...this.config }; }

  public dispose(): void { this.composer.dispose(); }
}
