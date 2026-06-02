/**
 * HDRIManager - Sistema de gerenciamento de Skybox/HDRI
 * 
 * Recursos:
 * - HDRI loader otimizado (RGBELoader)
 * - Presets leves para BIM (2K recomendado)
 * - Environment lighting automático
 * - Fog opcional para qualidade
 * - Troca dinâmica sem reload
 */

import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export interface HDRIPreset {
  id: string;
  name: string;
  description: string;
  url: string;
  exposure?: number;
  rotation?: number;
  /** Show HDRI as visible skybox. When false, uses solidBackground color instead. Default true. */
  showBackground?: boolean;
  /** Solid background color (used when showBackground=false). */
  solidBackground?: number;
  fog?: {
    enabled: boolean;
    color: number;
    density: number;
  };
}

export interface HDRIConfig {
  enableEnvironment: boolean;
  enableBackground: boolean;
  exposure: number;
  rotation: number;
  enableFog: boolean;
}

/**
 * Presets otimizados para visualização BIM
 * URLs apontam para HDRIs públicos do Poly Haven (2K, otimizados)
 */
export const HDRI_PRESETS: Record<string, HDRIPreset> = {
  neutral: {
    id: 'neutral',
    name: 'Neutro',
    description: 'Fundo cinza claro liso com iluminação suave, ideal para análise técnica',
    url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/studio_small_08_2k.hdr',
    exposure: 1.0,
    rotation: 0,
    showBackground: false,
    solidBackground: 0xe8eaed,
    fog: {
      enabled: false,
      color: 0xcccccc,
      density: 0.0005
    }
  },
  
  nature: {
    id: 'nature',
    name: 'Natural Outdoor',
    description: 'Ambiente externo natural, ótimo para arquitetura residencial',
    url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/kloppenheim_02_2k.hdr',
    exposure: 1.2,
    rotation: 0,
    fog: {
      enabled: true,
      color: 0xa8c8e0,
      density: 0.002
    }
  },
  
  urban: {
    id: 'urban',
    name: 'Urban Environment',
    description: 'Ambiente urbano corporativo, ideal para projetos comerciais',
    url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/wide_street_01_2k.hdr',
    exposure: 1.0,
    rotation: 0,
    fog: {
      enabled: true,
      color: 0xb0b8c0,
      density: 0.0015
    }
  },
  
  sunset: {
    id: 'sunset',
    name: 'Sunset Premium',
    description: 'Pôr do sol premium para apresentações',
    url: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/sunset_in_the_chalk_quarry_2k.hdr',
    exposure: 1.3,
    rotation: 0,
    fog: {
      enabled: true,
      color: 0xffa070,
      density: 0.001
    }
  }
};

export class HDRIManager {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private loader: RGBELoader;
  
  private currentPreset?: HDRIPreset;
  private currentTexture?: THREE.Texture;
  private config: HDRIConfig;
  
  private fog?: THREE.Fog;
  
  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.loader = new RGBELoader();
    
    // Config padrão
    this.config = {
      enableEnvironment: true,
      enableBackground: true,
      exposure: 1.0,
      rotation: 0,
      enableFog: false
    };
    
    // Configurar tone mapping para HDR
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
  }

  /**
   * Carrega HDRI de um preset
   */
  public async loadPreset(presetId: string): Promise<void> {
    const preset = HDRI_PRESETS[presetId];
    
    if (!preset) {
      console.warn(`[HDRIManager] Preset não encontrado: ${presetId}`);
      return;
    }

    console.log(`[HDRIManager] Carregando preset: ${preset.name}`);
    
    const showBg = preset.showBackground !== false;
    
    try {
      await this.loadHDRI(preset.url, {
        ...this.config,
        exposure: preset.exposure || this.config.exposure,
        rotation: preset.rotation || this.config.rotation,
        enableBackground: showBg,
        enableFog: preset.fog?.enabled || false
      });
      
      if (!showBg) {
        this.scene.background = new THREE.Color(preset.solidBackground ?? 0xe8eaed);
      }
      
      this.currentPreset = preset;
      
      // Aplicar fog se configurado
      if (preset.fog && preset.fog.enabled) {
        this.setFog(preset.fog.color, preset.fog.density);
      } else {
        this.removeFog();
      }
      
      console.log(`[HDRIManager] ✅ Preset carregado: ${preset.name}`);
    } catch (error) {
      console.error(`[HDRIManager] ❌ Erro ao carregar preset ${presetId}:`, error);
      
      // Fallback para skybox procedural simples
      this.setProceduralSky();
    }
  }

  /**
   * Carrega HDRI de URL customizada
   */
  public async loadHDRI(url: string, config?: Partial<HDRIConfig>): Promise<void> {
    // Atualizar config
    if (config) {
      this.config = { ...this.config, ...config };
    }

    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (texture: any) => {
          this.applyTexture(texture);
          resolve();
        },
        undefined,
        (error: any) => {
          reject(error);
        }
      );
    });
  }

  /**
   * Aplica textura HDRI na cena
   */
  private applyTexture(texture: THREE.Texture): void {
    // Configurar textura
    texture.mapping = THREE.EquirectangularReflectionMapping;
    
    // Rotação (útil para ajustar iluminação)
    if (this.config.rotation !== 0) {
      texture.rotation = this.config.rotation * (Math.PI / 180);
    }

    // Aplicar como environment (iluminação)
    if (this.config.enableEnvironment) {
      this.scene.environment = texture;
    }

    // Aplicar como background (skybox)
    if (this.config.enableBackground) {
      this.scene.background = texture;
    }

    // Ajustar exposure
    this.renderer.toneMappingExposure = this.config.exposure;

    // Limpar textura anterior
    if (this.currentTexture && this.currentTexture !== texture) {
      this.currentTexture.dispose();
    }

    this.currentTexture = texture;
  }

  /**
   * Skybox procedural simples (fallback)
   */
  private setProceduralSky(): void {
    console.log('[HDRIManager] Usando skybox procedural (fallback)');
    
    const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `;

    const uniforms = {
      topColor: { value: new THREE.Color(0x0077ff) },
      bottomColor: { value: new THREE.Color(0xffffff) },
      offset: { value: 33 },
      exponent: { value: 0.6 }
    };

    const skyGeo = new THREE.SphereGeometry(4000, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      side: THREE.BackSide
    });

    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);
  }

  /**
   * Define fog na cena
   */
  public setFog(color: number, density: number): void {
    this.fog = new THREE.Fog(color, 1, 1000);
    (this.fog as any).density = density; // Hack para Fog exponencial
    this.scene.fog = this.fog;
    this.config.enableFog = true;
    
    console.log(`[HDRIManager] Fog ativado: color=0x${color.toString(16)}, density=${density}`);
  }

  /**
   * Remove fog
   */
  public removeFog(): void {
    this.scene.fog = null;
    this.fog = undefined;
    this.config.enableFog = false;
    
    console.log('[HDRIManager] Fog removido');
  }

  /**
   * Ajusta exposure em tempo real
   */
  public setExposure(exposure: number): void {
    this.config.exposure = exposure;
    this.renderer.toneMappingExposure = exposure;
  }

  /**
   * Rotaciona HDRI (útil para ajustar direção da luz)
   */
  public setRotation(degrees: number): void {
    this.config.rotation = degrees;
    
    if (this.currentTexture) {
      this.currentTexture.rotation = degrees * (Math.PI / 180);
      this.currentTexture.needsUpdate = true;
    }
  }

  /**
   * Toggle environment lighting
   */
  public toggleEnvironment(enabled: boolean): void {
    this.config.enableEnvironment = enabled;
    
    if (enabled && this.currentTexture) {
      this.scene.environment = this.currentTexture;
    } else {
      this.scene.environment = null;
    }
  }

  /**
   * Toggle background skybox
   */
  public toggleBackground(enabled: boolean): void {
    this.config.enableBackground = enabled;
    
    if (enabled && this.currentTexture) {
      this.scene.background = this.currentTexture;
    } else {
      this.scene.background = null;
    }
  }

  /**
   * Retorna preset atual
   */
  public getCurrentPreset(): HDRIPreset | undefined {
    return this.currentPreset;
  }

  /**
   * Retorna config atual
   */
  public getConfig(): HDRIConfig {
    return { ...this.config };
  }

  /**
   * Lista todos os presets disponíveis
   */
  public static getPresets(): HDRIPreset[] {
    return Object.values(HDRI_PRESETS);
  }

  /**
   * Dispose (limpeza)
   */
  public dispose(): void {
    if (this.currentTexture) {
      this.currentTexture.dispose();
      this.currentTexture = undefined;
    }

    this.scene.environment = null;
    this.scene.background = null;
    this.scene.fog = null;
  }
}
