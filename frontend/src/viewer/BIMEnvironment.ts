/**
 * BIMEnvironment - Preset profissional de ambiente para visualização BIM
 * 
 * Inspirado em conceitos de eficiência do Minecraft mas com visual arquitetônico:
 * - Sky gradient simples mas realista
 * - Fog arquitetônico para profundidade
 * - Ground plane infinito (peso zero)
 * - Iluminação BIM profissional
 */

import * as THREE from 'three';

export interface BIMEnvironmentConfig {
  // Sky
  skyTopColor?: number;      // Cor do topo do céu
  skyBottomColor?: number;   // Cor do horizonte
  
  // Fog
  fogEnabled?: boolean;
  fogColor?: number;
  fogDensity?: number;       // Densidade do fog (menor = mais longe)
  
  // Ground
  groundEnabled?: boolean;
  groundColor?: number;
  groundSize?: number;       // Tamanho do plano
  
  // Lighting
  ambientIntensity?: number;
  sunIntensity?: number;
  sunPosition?: [number, number, number];
}

// Preset padrão BIM profissional (técnico neutro)
export const BIM_PRESET_DEFAULT: BIMEnvironmentConfig = {
  skyTopColor: 0xF8FAFC,      // Branco azulado corporativo
  skyBottomColor: 0xEEF2F7,   // Cinza frio neutro
  
  fogEnabled: false,          // Fog desabilitado para clareza
  fogColor: 0xEEF2F7,
  fogDensity: 0.001,
  
  groundEnabled: false,        // Ground controlado por BackgroundManager
  groundColor: 0xEEF2F7,
  groundSize: 2000,
  
  ambientIntensity: 0.62,     // Luz ambiente clara para leitura técnica
  sunIntensity: 0.86,         // Sol arquitetônico suave, sem dramatização gamer
  sunPosition: [55, 95, 45]   // Sol alto e limpo
};

export class BIMEnvironment {
  private scene: THREE.Scene;
  private config: BIMEnvironmentConfig;
  private groundPlane?: THREE.Mesh;
  private skyGradient?: THREE.Mesh;
  private sunLight?: THREE.DirectionalLight;
  private ambientLight?: THREE.AmbientLight;

  constructor(scene: THREE.Scene, config: BIMEnvironmentConfig = BIM_PRESET_DEFAULT) {
    this.scene = scene;
    this.config = { ...BIM_PRESET_DEFAULT, ...config };
    
    this.setup();
  }

  /**
   * Configura todo o ambiente
   */
  private setup(): void {
    // Iluminação desabilitada — PhysicalSkyEnvironment + CSM gerenciam luzes
    // Evitar acúmulo: BIMEnvironment + PhysicalSky + CSM = ~10 de intensidade → branco
    console.log('🌍 BIM Environment: iluminação delegada ao PhysicalSkyEnvironment + CSM');
  }

  /**
   * Sky gradient (dome simplificado)
   */
  private setupSky(): void {
    // TEMPORARIAMENTE DESABILITADO - deixar preto
    // Background simples com cor do horizonte
    this.scene.background = new THREE.Color(0x000000); // Preto
    
    console.log('🌌 Sky desabilitado - fundo preto');
    
    /* CÓDIGO ORIGINAL (COMENTADO TEMPORARIAMENTE)
    this.scene.background = new THREE.Color(this.config.skyBottomColor!);
    
    // Criar sky dome simples (hemisphere invertido)
    const skyGeometry = new THREE.SphereGeometry(800, 32, 15, 0, Math.PI * 2, 0, Math.PI / 2);
    
    // Shader simples para gradiente vertical
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
    
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(this.config.skyTopColor!) },
        bottomColor: { value: new THREE.Color(this.config.skyBottomColor!) },
        offset: { value: 33 },
        exponent: { value: 0.6 }
      },
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
      depthWrite: false
    });
    
    this.skyGradient = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(this.skyGradient);
    
    console.log('☁️ Sky gradient criado');
    */
  }

  /**
   * Fog arquitetônico (essencial para BIM)
   */
  private setupFog(): void {
    // TEMPORARIAMENTE DESABILITADO
    console.log('🌫️ Fog desabilitado');
    return;
    
    /* CÓDIGO ORIGINAL (COMENTADO TEMPORARIAMENTE)
    if (!this.config.fogEnabled) return;
    
    // FogExp2 = densidade exponencial (mais natural que linear)
    this.scene.fog = new THREE.FogExp2(
      this.config.fogColor!,
      this.config.fogDensity!
    );
    
    console.log('🌫️ Fog arquitetônico ativado');
    */
  }

  /**
   * Ground plane infinito (truque profissional)
   */
  private setupGround(): void {
    // TEMPORARIAMENTE DESABILITADO
    console.log('🌄 Ground desabilitado');
    return;
    
    /* CÓDIGO ORIGINAL (COMENTADO TEMPORARIAMENTE)
    if (!this.config.groundEnabled) return;
    
    const size = this.config.groundSize!;
    
    // Geometria simples
    const geometry = new THREE.PlaneGeometry(size, size, 1, 1);
    
    // Material com textura procedural leve
    const material = new THREE.MeshStandardMaterial({
      color: this.config.groundColor!,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide
    });
    
    this.groundPlane = new THREE.Mesh(geometry, material);
    
    // Rotacionar para horizontal (Three.js: Y-up)
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.position.y = 0;
    
    // Receber sombras
    this.groundPlane.receiveShadow = true;
    
    // Renderizar por último (evitar z-fighting)
    this.groundPlane.renderOrder = -1;
    
    this.scene.add(this.groundPlane);
    
    console.log('🌄 Ground plane infinito criado');
    */
  }

  /**
   * Iluminação BIM profissional
   */
  private setupLighting(): void {
    // Luz ambiente suave (preenche sombras)
    this.ambientLight = new THREE.AmbientLight(
      0xffffff,
      this.config.ambientIntensity!
    );
    this.scene.add(this.ambientLight);
    
    // Sol (directional light com sombras)
    const [x, y, z] = this.config.sunPosition!;
    this.sunLight = new THREE.DirectionalLight(
      0xffffff,
      this.config.sunIntensity!
    );
    this.sunLight.position.set(x, y, z);
    
    // Configurar sombras de alta qualidade
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    
    // Área de sombra (ajustar baseado no modelo)
    const shadowSize = 100;
    this.sunLight.shadow.camera.left = -shadowSize;
    this.sunLight.shadow.camera.right = shadowSize;
    this.sunLight.shadow.camera.top = shadowSize;
    this.sunLight.shadow.camera.bottom = -shadowSize;
    
    // Soft shadows
    this.sunLight.shadow.bias = -0.0001;
    
    this.scene.add(this.sunLight);
    
    console.log('☀️ Iluminação BIM profissional configurada');
  }

  /**
   * Ajusta ambiente para modelo específico (auto-scale)
   */
  public fitToModel(boundingBox: THREE.Box3): void {
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Ajustar área de sombras
    if (this.sunLight) {
      const shadowSize = maxDim * 2;
      this.sunLight.shadow.camera.left = -shadowSize;
      this.sunLight.shadow.camera.right = shadowSize;
      this.sunLight.shadow.camera.top = shadowSize;
      this.sunLight.shadow.camera.bottom = -shadowSize;
      this.sunLight.shadow.camera.updateProjectionMatrix();
    }
    
    console.log(`📐 Ambiente ajustado para modelo (${maxDim.toFixed(1)} units)`);
  }

  /**
   * Alterna presets
   */
  public applyPreset(preset: BIMEnvironmentConfig): void {
    this.config = { ...BIM_PRESET_DEFAULT, ...preset };
    this.dispose();
    this.setup();
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    if (this.skyGradient) {
      this.scene.remove(this.skyGradient);
      if (this.skyGradient.geometry) this.skyGradient.geometry.dispose();
      if (this.skyGradient.material) (this.skyGradient.material as THREE.Material).dispose();
    }
    
    if (this.groundPlane) {
      this.scene.remove(this.groundPlane);
      if (this.groundPlane.geometry) this.groundPlane.geometry.dispose();
      if (this.groundPlane.material) (this.groundPlane.material as THREE.Material).dispose();
    }
    
    if (this.sunLight) this.scene.remove(this.sunLight);
    if (this.ambientLight) this.scene.remove(this.ambientLight);
    
    this.scene.fog = null;
  }
}

// Presets adicionais

export const BIM_PRESET_NIGHT: BIMEnvironmentConfig = {
  skyTopColor: 0x0a1929,
  skyBottomColor: 0x1a3a52,
  fogColor: 0x1a3a52,
  fogDensity: 0.002,
  groundColor: 0x2a3a2a,
  ambientIntensity: 0.2,
  sunIntensity: 0.3,
  sunPosition: [-50, 20, -50]
};

export const BIM_PRESET_STUDIO: BIMEnvironmentConfig = {
  skyTopColor: 0xf5f5f5,
  skyBottomColor: 0xffffff,
  fogEnabled: false,
  groundColor: 0xe0e0e0,
  ambientIntensity: 0.8,
  sunIntensity: 0.5,
  sunPosition: [30, 80, 30]
};
