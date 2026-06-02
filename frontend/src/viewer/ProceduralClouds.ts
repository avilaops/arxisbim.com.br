/**
 * ProceduralClouds — Nuvens procedurais via billboard + noise shader
 *
 * Billboard sprites com shader de ruído para simular volumetria.
 * Técnica usada em jogos mobile AAA e BIM viewers (Autodesk Forma, etc.).
 * Para hardware potente, pode-se trocar por voxel clouds ou raymarch.
 *
 * Features:
 * - Shader de ruído Worley/FBM para textura procedural
 * - Billboard face-camera automático
 * - Animação de deriva por tempo
 * - Preset: Nublado / Parcialmente Nublado / Limpo
 */

import * as THREE from 'three';

const CLOUD_VERT = /* glsl */`
  varying vec2 vUv;
  varying float vOpacity;

  uniform float uTime;
  uniform float uWindSpeed;
  uniform vec2  uWindDir;

  void main() {
    vUv = uv;

    // Animação de deriva
    vec3 pos = position;
    pos.x += uTime * uWindSpeed * uWindDir.x;
    pos.z += uTime * uWindSpeed * uWindDir.y;

    // Billboard: mantém sprite voltado para a câmera
    vec3 camRight = vec3(modelViewMatrix[0].x, modelViewMatrix[1].x, modelViewMatrix[2].x);
    vec3 camUp    = vec3(modelViewMatrix[0].y, modelViewMatrix[1].y, modelViewMatrix[2].y);

    vec3 worldPos = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    worldPos += camRight * pos.x + camUp * pos.y;

    vOpacity = 1.0 - smoothstep(0.0, 1.0, abs(uv.y - 0.5) * 2.0); // fade topo/base

    gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
  }
`;

const CLOUD_FRAG = /* glsl */`
  varying vec2 vUv;
  varying float vOpacity;

  uniform float uTime;
  uniform float uDensity;
  uniform vec3  uColor;
  uniform float uWindSpeed;

  // Hash
  float hash(vec2 p) {
    p = fract(p * vec2(234.34, 435.345));
    p += dot(p, p + 34.23);
    return fract(p.x * p.y);
  }

  // Value noise
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // smoothstep
    return mix(
      mix(hash(i), hash(i + vec2(1,0)), f.x),
      mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
      f.y
    );
  }

  // FBM (fractal brownian motion) — 4 oitavas
  float fbm(vec2 p) {
    float val = 0.0;
    float amp = 0.5;
    float freq = 1.0;
    for (int i = 0; i < 4; i++) {
      val  += noise(p * freq) * amp;
      freq *= 2.1;
      amp  *= 0.5;
    }
    return val;
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;

    // Noise animado
    vec2 animated = vUv + vec2(uTime * uWindSpeed * 0.001, 0.0);
    float n = fbm(animated * 3.0);

    // Shape circular com fade nas bordas
    float dist  = length(uv);
    float shape = 1.0 - smoothstep(0.3, 1.0, dist);

    // Densidade
    float cloud = smoothstep(0.5 - uDensity * 0.3, 0.8, n * shape);

    if (cloud < 0.01) discard;

    // Sombreamento sutil (parte inferior mais escura)
    float shadow = mix(0.85, 1.0, vUv.y);
    vec3 col = uColor * shadow;

    gl_FragColor = vec4(col, cloud * vOpacity * 0.85);
  }
`;

export interface CloudPreset {
  count:     number;
  altitude:  number;  // altura base em metros
  spread:    number;  // raio horizontal de distribuição
  scale:     number;  // tamanho médio das nuvens
  density:   number;  // 0=transparente, 1=sólido
  windSpeed: number;
  color:     number;
}

export const CLOUD_PRESETS: Record<string, CloudPreset> = {
  clear:    { count: 5,  altitude: 300, spread: 800, scale: 120, density: 0.25, windSpeed: 0.8, color: 0xffffff },
  partial:  { count: 18, altitude: 250, spread: 600, scale: 150, density: 0.55, windSpeed: 1.2, color: 0xf0f4f8 },
  overcast: { count: 35, altitude: 180, spread: 500, scale: 200, density: 0.80, windSpeed: 2.0, color: 0xd8dde4 },
};

export class ProceduralClouds {
  private scene:    THREE.Scene;
  private group:    THREE.Group;
  private material: THREE.ShaderMaterial;
  private clock:    THREE.Clock;
  private preset:   CloudPreset;

  constructor(scene: THREE.Scene, presetKey = 'partial') {
    this.scene  = scene;
    this.group  = new THREE.Group();
    this.group.name = 'procedural-clouds';
    this.clock  = new THREE.Clock();
    this.preset = CLOUD_PRESETS[presetKey] ?? CLOUD_PRESETS.partial;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime:      { value: 0 },
        uDensity:   { value: this.preset.density },
        uWindSpeed: { value: this.preset.windSpeed },
        uWindDir:   { value: new THREE.Vector2(0.6, 0.4) },
        uColor:     { value: new THREE.Color(this.preset.color) },
      },
      vertexShader:   CLOUD_VERT,
      fragmentShader: CLOUD_FRAG,
      transparent:    true,
      depthWrite:     false,
      side:           THREE.DoubleSide,
    });

    this.spawnClouds();
    this.scene.add(this.group);
    console.log(`☁️ ProceduralClouds: ${this.preset.count} nuvens (${presetKey})`);
  }

  private spawnClouds(): void {
    // Limpar nuvens anteriores
    while (this.group.children.length) {
      const m = this.group.children[0] as THREE.Mesh;
      m.geometry.dispose();
      this.group.remove(m);
    }

    const p = this.preset;
    for (let i = 0; i < p.count; i++) {
      const angle = (i / p.count) * Math.PI * 2 + Math.random() * 0.8;
      const r     = p.spread * (0.3 + Math.random() * 0.7);
      const x     = Math.cos(angle) * r;
      const z     = Math.sin(angle) * r;
      const y     = p.altitude + (Math.random() - 0.5) * 80;

      const scale = p.scale * (0.7 + Math.random() * 0.6);
      const geo   = new THREE.PlaneGeometry(scale, scale * 0.5);
      const mesh  = new THREE.Mesh(geo, this.material);

      mesh.position.set(x, y, z);
      mesh.renderOrder = -1;
      this.group.add(mesh);
    }
  }

  /** Chamar no render loop */
  public update(): void {
    this.material.uniforms['uTime'].value = this.clock.getElapsedTime();
  }

  public setPreset(key: string): void {
    this.preset  = CLOUD_PRESETS[key] ?? CLOUD_PRESETS.partial;
    this.material.uniforms['uDensity'].value   = this.preset.density;
    this.material.uniforms['uWindSpeed'].value = this.preset.windSpeed;
    (this.material.uniforms['uColor'].value as THREE.Color).set(this.preset.color);
    this.spawnClouds();
  }

  public dispose(): void {
    this.scene.remove(this.group);
    this.material.dispose();
  }
}
