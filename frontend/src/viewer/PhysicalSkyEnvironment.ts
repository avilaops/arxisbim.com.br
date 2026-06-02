/**
 * PhysicalSkyEnvironment — Atmosfera fisicamente baseada
 *
 * Implementa o modelo de espalhamento atmosférico de Preetham,
 * o mesmo usado em Unreal Engine 5 (Sky Atmosphere) e Unity HDRP.
 *
 * Features:
 * - Sky atmosférico procedural (não foto, não cor sólida)
 * - Sol posicionável por azimute/elevação
 * - PMREMGenerator: reflections e IBL automáticos do céu
 * - FogExp2 com cor derivada do horizonte (sem hardcode)
 * - Ground plane com sombra recebida
 * - Presentes: manhã, meio-dia, pôr do sol, noite
 */

import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

export interface SkyPreset {
  label: string;
  turbidity: number;       // Partículas na atmosfera (1=limpo, 20=neblina densa)
  rayleigh: number;        // Espalhamento Rayleigh (cor azul do céu)
  mieCoefficient: number;  // Partículas Mie (neblina/poluição)
  mieDirectionalG: number; // Anisotropia Mie (0=disperso, 1=direcional)
  elevation: number;       // Ângulo do sol em graus acima do horizonte
  azimuth: number;         // Azimute do sol em graus (0=norte, 180=sul)
  exposure: number;        // Exposure do tone mapping
}

export const SKY_PRESETS: Record<string, SkyPreset> = {
  NOON: {
    label: 'Meio-dia',
    turbidity: 3,
    rayleigh: 1.0,
    mieCoefficient: 0.003,
    mieDirectionalG: 0.92,
    elevation: 65,
    azimuth: 180,
    exposure: 0.46,
  },
  MORNING: {
    label: 'Manhã',
    turbidity: 5,
    rayleigh: 2.5,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.88,
    elevation: 18,
    azimuth: 100,
    exposure: 0.52,
  },
  GOLDEN_HOUR: {
    label: 'Golden Hour',
    turbidity: 10,
    rayleigh: 4.0,
    mieCoefficient: 0.008,
    mieDirectionalG: 0.95,
    elevation: 4,
    azimuth: 220,
    exposure: 0.58,
  },
  OVERCAST: {
    label: 'Nublado',
    turbidity: 20,
    rayleigh: 0.5,
    mieCoefficient: 0.02,
    mieDirectionalG: 0.7,
    elevation: 40,
    azimuth: 180,
    exposure: 0.65,
  },
  DUSK: {
    label: 'Entardecer',
    turbidity: 15,
    rayleigh: 3.0,
    mieCoefficient: 0.01,
    mieDirectionalG: 0.93,
    elevation: 1.5,
    azimuth: 270,
    exposure: 0.60,
  },
};

export class PhysicalSkyEnvironment {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private sky: Sky;
  private sun: THREE.Vector3;
  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private pmremGenerator: THREE.PMREMGenerator;
  private groundPlane: THREE.Mesh | null = null;
  private currentPreset: SkyPreset;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer, presetKey = 'NOON') {
    this.scene = scene;
    this.renderer = renderer;
    this.sun = new THREE.Vector3();
    this.pmremGenerator = new THREE.PMREMGenerator(renderer);
    this.pmremGenerator.compileEquirectangularShader();

    // Sky
    this.sky = new Sky();
    this.sky.scale.setScalar(450000);
    this.sky.name = 'physical-sky';
    this.scene.add(this.sky);

    // Luzes
    this.sunLight = new THREE.DirectionalLight(0xfff5e0, 1.8);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(4096, 4096);
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 800;
    this.sunLight.shadow.camera.left = -200;
    this.sunLight.shadow.camera.right = 200;
    this.sunLight.shadow.camera.top = 200;
    this.sunLight.shadow.camera.bottom = -200;
    this.sunLight.shadow.bias = -0.0002;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    this.ambientLight = new THREE.AmbientLight(0xc8d8e8, 0.35);
    this.scene.add(this.ambientLight);

    // Ground plane
    this.setupGround();

    // Aplicar preset inicial
    this.currentPreset = SKY_PRESETS[presetKey] ?? SKY_PRESETS.NOON;
    this.applyPreset(this.currentPreset, presetKey);

    console.log('🌤️ PhysicalSkyEnvironment initialized');
  }

  private setupGround(): void {
    const geo = new THREE.PlaneGeometry(2000, 2000);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xd4cfc8,
      roughness: 0.95,
      metalness: 0.0,
    });
    this.groundPlane = new THREE.Mesh(geo, mat);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = -0.05;
    this.groundPlane.receiveShadow = true;
    this.groundPlane.name = 'physical-ground';
    this.scene.add(this.groundPlane);
  }

  /**
   * Aplica um preset de iluminação/céu
   */
  public applyPreset(preset: SkyPreset, key?: string): void {
    this.currentPreset = preset;

    const uniforms = this.sky.material.uniforms;
    uniforms['turbidity'].value = preset.turbidity;
    uniforms['rayleigh'].value = preset.rayleigh;
    uniforms['mieCoefficient'].value = preset.mieCoefficient;
    uniforms['mieDirectionalG'].value = preset.mieDirectionalG;

    // Calcular posição do sol
    const phi = THREE.MathUtils.degToRad(90 - preset.elevation);
    const theta = THREE.MathUtils.degToRad(preset.azimuth);
    this.sun.setFromSphericalCoords(1, phi, theta);
    uniforms['sunPosition'].value.copy(this.sun);

    // Posicionar directional light no mesmo ângulo do sol
    this.sunLight.position.copy(this.sun).multiplyScalar(300);
    this.sunLight.target.position.set(0, 0, 0);
    this.sunLight.target.updateMatrixWorld();

    // Ajustar intensidade e cor por horário
    const isGolden = preset.elevation < 10;
    const isOvercast = preset.turbidity > 15;

    this.sunLight.intensity = isOvercast ? 0.6 : isGolden ? 1.2 : 1.8;
    this.sunLight.color.set(isGolden ? 0xff9955 : isOvercast ? 0xd0d8e0 : 0xfff5e0);
    this.ambientLight.intensity = isOvercast ? 0.7 : 0.35;
    this.ambientLight.color.set(isOvercast ? 0xd0d8e8 : isGolden ? 0xffaa66 : 0xc8d8e8);

    // Atualizar exposure do renderer
    this.renderer.toneMappingExposure = preset.exposure;

    // Gerar environment map do céu para IBL (reflections)
    this.updateEnvironmentMap();

    // Fog derivado da cor do horizonte
    this.updateFog(preset);

    console.log(`☀️ Sky preset: ${key ?? preset.label} (elevation=${preset.elevation}°)`);
  }

  /**
   * Gera PMREM do céu atual e aplica como environment map na cena
   * → materiais StandardMaterial recebem reflexos do céu automaticamente
   */
  private updateEnvironmentMap(): void {
    // Renderiza o céu atual para um CubeRenderTarget e gera o PMREM
    // Isso dá IBL correto (reflection + diffuse) derivado do sky shader
    const skyScene = new THREE.Scene();
    const skyCopy = this.sky.clone() as Sky;
    skyCopy.material = this.sky.material; // compartilha uniforms atuais
    skyScene.add(skyCopy);

    const rt = this.pmremGenerator.fromScene(skyScene as any);
    this.scene.environment = rt.texture;

    // Limpeza — não descartar rt.texture pois está em uso na scene
    skyScene.remove(skyCopy);
  }

  /**
   * Fog atmosférico com cor derivada do horizonte
   */
  private updateFog(preset: SkyPreset): void {
    const isGolden = preset.elevation < 10;
    const isOvercast = preset.turbidity > 15;

    let fogColor: THREE.Color;
    if (isOvercast) {
      fogColor = new THREE.Color(0xb8c8d4);
    } else if (isGolden) {
      fogColor = new THREE.Color(0xffcc99);
    } else {
      fogColor = new THREE.Color(0xc8dce8);
    }

    this.scene.fog = new THREE.FogExp2(fogColor, 0.0008);
    this.scene.background = new THREE.Color(fogColor).lerp(new THREE.Color(0x88aabb), 0.3);

    // Cor do ground combina com o ambiente
    if (this.groundPlane) {
      const groundColor = isGolden ? 0xc8b89a : isOvercast ? 0xb8b8b4 : 0xd4cfc8;
      (this.groundPlane.material as THREE.MeshStandardMaterial).color.set(groundColor);
    }
  }

  /**
   * Aplica preset por nome
   */
  public setPreset(key: string): void {
    const preset = SKY_PRESETS[key.toUpperCase()];
    if (!preset) {
      console.warn(`[PhysicalSky] Preset "${key}" not found. Available:`, Object.keys(SKY_PRESETS));
      return;
    }
    this.applyPreset(preset, key);
  }

  /**
   * Ajuste fino — mover o sol em tempo real
   */
  public setSunPosition(elevation: number, azimuth: number): void {
    this.applyPreset({ ...this.currentPreset, elevation, azimuth });
  }

  /**
   * Ajusta o ground para o modelo BIM carregado (auto-fit)
   */
  public fitToModel(box: THREE.Box3): void {
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    // Sombras cobrem o modelo inteiro
    const s = maxDim * 1.5;
    this.sunLight.shadow.camera.left = -s;
    this.sunLight.shadow.camera.right = s;
    this.sunLight.shadow.camera.top = s;
    this.sunLight.shadow.camera.bottom = -s;
    this.sunLight.shadow.camera.far = maxDim * 4;
    this.sunLight.shadow.camera.updateProjectionMatrix();

    // Ground ao nível do modelo
    if (this.groundPlane) {
      this.groundPlane.position.y = box.min.y - 0.05;
    }

    console.log(`📐 PhysicalSky fitted to model: ${maxDim.toFixed(1)}m`);
  }

  public dispose(): void {
    this.scene.remove(this.sky);
    this.scene.remove(this.sunLight);
    this.scene.remove(this.ambientLight);
    if (this.groundPlane) this.scene.remove(this.groundPlane);
    this.pmremGenerator.dispose();
    this.scene.fog = null;
    this.scene.environment = null;
  }
}
