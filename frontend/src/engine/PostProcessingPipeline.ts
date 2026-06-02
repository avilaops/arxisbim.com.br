/**
 * PostProcessingPipeline — Stack AAA para ArxisVR
 *
 * Ordem dos passes (mesma lógica de UE5 / Unity HDRP):
 *   RenderPass → SSAOPass → UnrealBloomPass → SMAAPass
 *   → FilmPass (grain) → VignettePass → ShaderPass(FXAA) → OutputPass
 *
 * Referências:
 *   - UE5: Post Process Volume (AO, Bloom, Chromatic Aberration, Vignette)
 *   - Unity HDRP: Volume framework (SSAO, Bloom, Tonemapping, Film Grain)
 */

import * as THREE from 'three';
import { EffectComposer }   from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }       from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass }  from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAOPass }         from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { SMAAPass }         from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { ShaderPass }       from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FilmPass }              from 'three/examples/jsm/postprocessing/FilmPass.js';
import { VignetteShader }        from 'three/examples/jsm/shaders/VignetteShader.js';
import { FXAAShader }            from 'three/examples/jsm/shaders/FXAAShader.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';

// ─── Configuração por qualidade ──────────────────────────────────────────────

export type PostProcessQuality = 'low' | 'medium' | 'high' | 'ultra';

export interface PostProcessConfig {
  quality:    PostProcessQuality;

  // SSAO
  ssao:       boolean;
  ssaoRadius: number;       // raio de amostragem (0.1–8)
  ssaoMinDist: number;
  ssaoMaxDist: number;

  // Bloom (Unreal)
  bloom:           boolean;
  bloomStrength:   number;  // 0–3 (UE5 padrão ~0.8)
  bloomRadius:     number;  // 0–1
  bloomThreshold:  number;  // luminância mínima para bloom

  // Film grain
  grain:       boolean;
  grainIntensity: number;   // 0–1

  // Vignette
  vignette:      boolean;
  vignetteDarkness: number; // 0–2 (UE5 padrão ~0.5)
  vignetteOffset:   number;

  // Anti-aliasing
  smaa: boolean;
  fxaa: boolean;
}

const QUALITY_PRESETS: Record<PostProcessQuality, PostProcessConfig> = {
  low: {
    quality: 'low',
    ssao: false, ssaoRadius: 4, ssaoMinDist: 0.005, ssaoMaxDist: 0.1,
    bloom: true, bloomStrength: 0.4, bloomRadius: 0.4, bloomThreshold: 0.85,
    grain: false, grainIntensity: 0,
    vignette: true, vignetteDarkness: 0.4, vignetteOffset: 0.9,
    smaa: false, fxaa: true,
  },
  medium: {
    quality: 'medium',
    ssao: true, ssaoRadius: 4, ssaoMinDist: 0.005, ssaoMaxDist: 0.1,
    bloom: true, bloomStrength: 0.55, bloomRadius: 0.5, bloomThreshold: 0.82,
    grain: false, grainIntensity: 0,
    vignette: true, vignetteDarkness: 0.45, vignetteOffset: 0.92,
    smaa: true, fxaa: false,
  },
  high: {
    quality: 'high',
    ssao: true, ssaoRadius: 5, ssaoMinDist: 0.003, ssaoMaxDist: 0.08,
    bloom: true, bloomStrength: 0.65, bloomRadius: 0.55, bloomThreshold: 0.80,
    grain: true, grainIntensity: 0.03,
    vignette: true, vignetteDarkness: 0.50, vignetteOffset: 0.95,
    smaa: true, fxaa: false,
  },
  ultra: {
    quality: 'ultra',
    ssao: true, ssaoRadius: 6, ssaoMinDist: 0.002, ssaoMaxDist: 0.06,
    bloom: true, bloomStrength: 0.72, bloomRadius: 0.60, bloomThreshold: 0.78,
    grain: true, grainIntensity: 0.025,
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

  // Referências para ajuste em runtime
  private bloomPass:  UnrealBloomPass  | null = null;
  private ssaoPass:   SSAOPass         | null = null;
  private filmPass:   FilmPass         | null = null;
  private vigPass:    ShaderPass       | null = null;
  private fxaaPass:   ShaderPass       | null = null;

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

    // Renderizar em HDR para bloom correto (mesma técnica do UE5)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

    const size = renderer.getSize(new THREE.Vector2());
    this.composer = new EffectComposer(renderer);
    this.composer.setSize(size.x, size.y);

    this.buildPasses();
    console.log(`🎬 PostProcessingPipeline initialized [quality=${quality}]`);
  }

  // ─── Build ──────────────────────────────────────────────────────────────────

  private buildPasses(): void {
    const cfg = this.config;
    const size = this.renderer.getSize(new THREE.Vector2());

    // 1. Base render
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // 2. SSAO — oclusão de contato (substitui Lumen AO no WebGL)
    if (cfg.ssao) {
      this.ssaoPass = new SSAOPass(this.scene, this.camera, size.x, size.y);
      this.ssaoPass.kernelRadius  = cfg.ssaoRadius;
      this.ssaoPass.minDistance   = cfg.ssaoMinDist;
      this.ssaoPass.maxDistance   = cfg.ssaoMaxDist;
      this.composer.addPass(this.ssaoPass);
    }

    // 3. Unreal Bloom — mesmo algoritmo do UE4/5 Temporal Bloom
    if (cfg.bloom) {
      const resolution = new THREE.Vector2(size.x, size.y);
      this.bloomPass = new UnrealBloomPass(resolution, cfg.bloomStrength, cfg.bloomRadius, cfg.bloomThreshold);
      this.composer.addPass(this.bloomPass);
    }

    // 4. SMAA — melhor que MSAA/FXAA, sem blur de imagem
    if (cfg.smaa) {
      const smaaPass = new SMAAPass(size.x, size.y);
      this.composer.addPass(smaaPass);
    }

    // 5. Film grain — textura de ruído cinematográfico (sutil)
    if (cfg.grain && cfg.grainIntensity > 0) {
      this.filmPass = new FilmPass(cfg.grainIntensity, false);
      this.composer.addPass(this.filmPass);
    }

    // 6. Vignette — escurece as bordas (UE5 Post Process Volume padrão)
    if (cfg.vignette) {
      this.vigPass = new ShaderPass(VignetteShader);
      this.vigPass.uniforms['darkness'].value = cfg.vignetteDarkness;
      this.vigPass.uniforms['offset'].value   = cfg.vignetteOffset;
      this.composer.addPass(this.vigPass);
    }

    // 7. FXAA fallback (low quality)
    if (cfg.fxaa && !cfg.smaa) {
      this.fxaaPass = new ShaderPass(FXAAShader);
      this.fxaaPass.uniforms['resolution'].value.set(1 / size.x, 1 / size.y);
      this.composer.addPass(this.fxaaPass);
    }

    // 8. Gamma correction — equivalente ao OutputPass no Three.js 0.149
    const gammaPass = new ShaderPass(GammaCorrectionShader);
    this.composer.addPass(gammaPass);
  }

  // ─── API pública ─────────────────────────────────────────────────────────────

  /** Substitui o renderer.render() — chamar no loop de animação */
  public render(): void {
    this.composer.render();
  }

  /** Redimensiona ao resize do canvas */
  public setSize(width: number, height: number): void {
    this.composer.setSize(width, height);

    if (this.fxaaPass) {
      this.fxaaPass.uniforms['resolution'].value.set(1 / width, 1 / height);
    }
    if (this.ssaoPass) {
      this.ssaoPass.setSize(width, height);
    }
    if (this.bloomPass) {
      this.bloomPass.resolution.set(width, height);
    }
  }

  /** Troca preset de qualidade em runtime */
  public setQuality(quality: PostProcessQuality): void {
    this.config = { ...QUALITY_PRESETS[quality] };
    // Rebuild completo
    while (this.composer.passes.length) {
      this.composer.removePass(this.composer.passes[0]);
    }
    this.bloomPass = null;
    this.ssaoPass  = null;
    this.filmPass  = null;
    this.vigPass   = null;
    this.fxaaPass  = null;
    this.buildPasses();
    console.log(`🎬 PostProcess quality changed to: ${quality}`);
  }

  /** Ajuste fino do bloom em runtime (ex: slider na UI) */
  public setBloom(strength: number, radius?: number, threshold?: number): void {
    if (!this.bloomPass) return;
    this.bloomPass.strength  = strength;
    if (radius    !== undefined) this.bloomPass.radius    = radius;
    if (threshold !== undefined) this.bloomPass.threshold = threshold;
  }

  /** Liga/desliga SSAO sem rebuild completo */
  public setSSAOEnabled(enabled: boolean): void {
    if (this.ssaoPass) this.ssaoPass.enabled = enabled;
  }

  /** Ajuste de vignette em runtime */
  public setVignette(darkness: number, offset?: number): void {
    if (!this.vigPass) return;
    this.vigPass.uniforms['darkness'].value = darkness;
    if (offset !== undefined) this.vigPass.uniforms['offset'].value = offset;
  }

  public getConfig(): PostProcessConfig {
    return { ...this.config };
  }

  public dispose(): void {
    this.composer.dispose();
  }
}
