import * as THREE from 'three';

/**
 * Lighting System - Sistema de iluminação dinâmica e realista
 * Configurações otimizadas para visualização arquitetônica
 */
export class LightingSystem {
  private scene: THREE.Scene;
  private lights: Map<string, THREE.Light> = new Map();
  private shadowMapSize: number = 2048;
  
  // Configurações de tempo do dia
  private timeOfDay: number = 12; // 12:00 (meio-dia)
  private sunLight: THREE.DirectionalLight | null = null;
  private ambientLight: THREE.AmbientLight | null = null;
  private hemisphere: THREE.HemisphereLight | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Configura iluminação padrão otimizada
   */
  public setupDefaultLighting(): void {
    // Luz ambiente suave
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);
    this.lights.set('ambient', this.ambientLight);

    // Luz hemisférica para simular céu e chão
    this.hemisphere = new THREE.HemisphereLight(
      0x87ceeb, // Cor do céu
      0x444444, // Cor do chão
      0.6
    );
    this.scene.add(this.hemisphere);
    this.lights.set('hemisphere', this.hemisphere);

    // Luz direcional (sol) com sombras
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.sunLight.position.set(50, 100, 50);
    this.sunLight.castShadow = true;

    // Configurações de sombra de alta qualidade
    this.sunLight.shadow.mapSize.width = this.shadowMapSize;
    this.sunLight.shadow.mapSize.height = this.shadowMapSize;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    
    // Área de projeção de sombras (ajustar baseado no tamanho da cena)
    const shadowSize = 100;
    this.sunLight.shadow.camera.left = -shadowSize;
    this.sunLight.shadow.camera.right = shadowSize;
    this.sunLight.shadow.camera.top = shadowSize;
    this.sunLight.shadow.camera.bottom = -shadowSize;
    
    // normalBias é mais estável que bias em cenas grandes
    this.sunLight.shadow.bias = -0.0001;
    this.sunLight.shadow.normalBias = 0.02;

    this.scene.add(this.sunLight);
    this.lights.set('sun', this.sunLight);

    // Helper para visualizar direção do sol (debug)
    // const sunHelper = new THREE.DirectionalLightHelper(this.sunLight, 5);
    // this.scene.add(sunHelper);

    console.log('☀️ Sistema de iluminação configurado');
    this.updateTimeOfDay(this.timeOfDay);
  }

  /**
   * Atualiza iluminação baseado na hora do dia (0-24)
   */
  public updateTimeOfDay(hour: number): void {
    this.timeOfDay = Math.max(0, Math.min(24, hour));

    if (!this.sunLight || !this.ambientLight || !this.hemisphere) {
      console.warn('Iluminação não inicializada');
      return;
    }

    // Calcula posição do sol baseado na hora
    const angle = ((this.timeOfDay - 6) / 12) * Math.PI; // -90° a 90°
    const distance = 100;
    const height = Math.sin(angle) * distance;
    const horizontal = Math.cos(angle) * distance;

    this.sunLight.position.set(horizontal, Math.max(height, -10), 50);

    // Ajusta intensidades baseado na hora
    let sunIntensity = 0;
    let ambientIntensity = 0;
    let skyColor = 0x87ceeb;
    let sunColor = 0xffffff;

    if (this.timeOfDay >= 6 && this.timeOfDay <= 18) {
      // Dia (6:00 - 18:00)
      // Nascer/pôr do sol (6-8h e 16-18h)
      if (this.timeOfDay < 8) {
        const dawn = (this.timeOfDay - 6) / 2;
        sunIntensity = 0.3 + (dawn * 0.7);
        ambientIntensity = 0.2 + (dawn * 0.3);
        sunColor = this.interpolateColor(0xff6b3d, 0xffffff, dawn);
        skyColor = this.interpolateColor(0xff8c66, 0x87ceeb, dawn);
      } else if (this.timeOfDay > 16) {
        const dusk = (18 - this.timeOfDay) / 2;
        sunIntensity = 0.3 + (dusk * 0.7);
        ambientIntensity = 0.2 + (dusk * 0.3);
        sunColor = this.interpolateColor(0xff6b3d, 0xffffff, dusk);
        skyColor = this.interpolateColor(0xff8c66, 0x87ceeb, dusk);
      } else {
        // Meio-dia
        sunIntensity = 1.0;
        ambientIntensity = 0.5;
        sunColor = 0xffffff;
        skyColor = 0x87ceeb;
      }
    } else {
      // Noite
      sunIntensity = 0.0;
      ambientIntensity = 0.1;
      sunColor = 0x4477aa;
      skyColor = 0x001133;
    }

    this.sunLight.intensity = sunIntensity;
    this.sunLight.color.setHex(sunColor);
    this.ambientLight.intensity = ambientIntensity;
    this.hemisphere.color.setHex(skyColor);
    this.hemisphere.groundColor.setHex(this.timeOfDay >= 6 && this.timeOfDay <= 18 ? 0x444444 : 0x001122);

    // Atualiza cor de fundo da cena
    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.setHex(skyColor);
    }

    // Atualiza fog
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.setHex(skyColor);
    }
  }

  /**
   * Interpola entre duas cores
   */
  private interpolateColor(color1: number, color2: number, factor: number): number {
    const c1 = new THREE.Color(color1);
    const c2 = new THREE.Color(color2);
    return c1.lerp(c2, factor).getHex();
  }

  /**
   * Adiciona luz pontual (lâmpada, luminária)
   */
  public addPointLight(
    name: string,
    position: THREE.Vector3,
    color: number = 0xffffff,
    intensity: number = 1.0,
    distance: number = 10,
    decay: number = 2
  ): THREE.PointLight {
    const light = new THREE.PointLight(color, intensity, distance, decay);
    light.position.copy(position);
    light.castShadow = true;
    
    // Configuração de sombra
    light.shadow.mapSize.width = 512;
    light.shadow.mapSize.height = 512;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = distance;

    this.scene.add(light);
    this.lights.set(name, light);

    // Helper para debug
    // const helper = new THREE.PointLightHelper(light, 0.5);
    // this.scene.add(helper);

    return light;
  }

  /**
   * Adiciona spot light (holofote, refletor)
   */
  public addSpotLight(
    name: string,
    position: THREE.Vector3,
    target: THREE.Vector3,
    color: number = 0xffffff,
    intensity: number = 1.0,
    distance: number = 20,
    angle: number = Math.PI / 6,
    penumbra: number = 0.1
  ): THREE.SpotLight {
    const light = new THREE.SpotLight(color, intensity, distance, angle, penumbra);
    light.position.copy(position);
    light.target.position.copy(target);
    light.castShadow = true;

    // Configuração de sombra
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = distance;

    this.scene.add(light);
    this.scene.add(light.target);
    this.lights.set(name, light);

    return light;
  }

  /**
   * Remove luz
   */
  public removeLight(name: string): void {
    const light = this.lights.get(name);
    if (light) {
      this.scene.remove(light);
      
      // SpotLight tem target que precisa ser removido
      if (light instanceof THREE.SpotLight) {
        this.scene.remove(light.target);
      }
      
      // Dispose de shadow map se existir
      if (light.shadow && light.shadow.map) {
        light.shadow.map.dispose();
        light.shadow.map = null;
      }
      
      this.lights.delete(name);
    }
  }

  /**
   * Liga/desliga luz
   */
  public toggleLight(name: string, enabled: boolean): void {
    const light = this.lights.get(name);
    if (light) {
      light.visible = enabled;
    }
  }

  /**
   * Ajusta intensidade de uma luz
   */
  public setLightIntensity(name: string, intensity: number): void {
    const light = this.lights.get(name);
    if (light) {
      light.intensity = intensity;
    }
  }

  /**
   * Configura qualidade de sombras
   */
  public setShadowQuality(quality: 'low' | 'medium' | 'high' | 'ultra'): void {
    const sizeMap = {
      low: 512,
      medium: 1024,
      high: 2048,
      ultra: 4096
    };

    this.shadowMapSize = sizeMap[quality];

    // Atualiza todas as luzes com sombra
    this.lights.forEach((light) => {
      if (light.castShadow && light.shadow) {
        light.shadow.mapSize.width = this.shadowMapSize;
        light.shadow.mapSize.height = this.shadowMapSize;
        light.shadow.map?.dispose();
        light.shadow.map = null;
      }
    });

    console.log(`🌓 Qualidade de sombras ajustada: ${quality} (${this.shadowMapSize}px)`);
  }

  /**
   * Ajusta shadow camera para cobrir bounding box do modelo (FIX ENTERPRISE)
   * Evita sombras cortadas e melhora precisão em BIM real
   */
  public fitToBounds(bounds: THREE.Box3, margin: number = 1.2): void {
    if (!this.sunLight) {
      console.warn('sunLight não inicializado');
      return;
    }

    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    bounds.getCenter(center);
    bounds.getSize(size);

    // Centraliza target do sol no centro do modelo
    if (this.sunLight.target) {
      this.sunLight.target.position.copy(center);
    }

    // Ajusta shadow camera para cobrir o bounds (com margem)
    const maxDimension = Math.max(size.x, size.y, size.z) * margin;
    this.sunLight.shadow.camera.left = -maxDimension;
    this.sunLight.shadow.camera.right = maxDimension;
    this.sunLight.shadow.camera.top = maxDimension;
    this.sunLight.shadow.camera.bottom = -maxDimension;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = maxDimension * 4;

    // Força atualização da shadow camera
    this.sunLight.shadow.camera.updateProjectionMatrix();

    console.log(`☀️ Shadow camera ajustada: ${maxDimension.toFixed(1)}m (bounds: ${size.x.toFixed(1)}x${size.y.toFixed(1)}x${size.z.toFixed(1)})`);
  }

  /**
   * Configura renderer para iluminação realista (FIX ENTERPRISE)
   * Essencial para PBR consistente
   */
  public setupRenderer(renderer: THREE.WebGLRenderer): void {
    // Shadow mapping
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Color management (essencial para PBR)
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Tone mapping (arquitetura precisa de controle de exposure)
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    console.log('🎨 Renderer configurado para iluminação realista');
  }

  /**
   * Lista todas as luzes
   */
  public listLights(): string[] {
    return Array.from(this.lights.keys());
  }

  /**
   * Obtém hora do dia atual
   */
  public getTimeOfDay(): number {
    return this.timeOfDay;
  }

  public dispose(): void {
    this.lights.forEach((light) => {
      this.scene.remove(light);
      
      // SpotLight tem target
      if (light instanceof THREE.SpotLight) {
        this.scene.remove(light.target);
      }
      
      // Dispose shadow map se existir (light.dispose() NÃO EXISTE)
      if (light.shadow && light.shadow.map) {
        light.shadow.map.dispose();
        light.shadow.map = null;
      }
    });
    this.lights.clear();
  }
}
