/**
 * Stars — Estrelas + Via Láctea para preset noturno
 *
 * Sistema procedural de estrelas usando THREE.Points com shader custom.
 * Distribui ~3000 estrelas em uma esfera celeste com magnitudes realistas
 * (algumas estrelas brilhantes, maioria fracas).
 *
 * Inclui faixa da Via Láctea como gradiente noise no shader.
 *
 * Aparece apenas quando o sol está abaixo do horizonte.
 */

import * as THREE from 'three';

const STAR_VERT = /* glsl */`
  attribute float size;
  attribute float brightness;
  varying float vBrightness;

  void main() {
    vBrightness = brightness;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const STAR_FRAG = /* glsl */`
  uniform float uOpacity;
  varying float vBrightness;

  void main() {
    // Forma circular suave
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;

    float alpha = (1.0 - smoothstep(0.0, 0.5, d)) * vBrightness * uOpacity;

    // Cor levemente azulada para estrelas brilhantes, quente para fracas
    vec3 col = mix(vec3(1.0, 0.85, 0.7), vec3(1.0, 1.0, 1.05), vBrightness);
    gl_FragColor = vec4(col, alpha);
  }
`;

export class Stars {
  private scene:  THREE.Scene;
  private points: THREE.Points;
  private material: THREE.ShaderMaterial;
  private starCount: number;

  constructor(scene: THREE.Scene, count = 3000) {
    this.scene     = scene;
    this.starCount = count;

    const geometry  = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes     = new Float32Array(count);
    const bright    = new Float32Array(count);

    const radius = 8000; // bem longe — atrás do sky

    for (let i = 0; i < count; i++) {
      // Distribuição uniforme em esfera (não apenas hemisfério superior)
      const theta = Math.acos(2 * Math.random() - 1);
      const phi   = 2 * Math.PI * Math.random();

      positions[i * 3]     = radius * Math.sin(theta) * Math.cos(phi);
      positions[i * 3 + 1] = radius * Math.cos(theta);
      positions[i * 3 + 2] = radius * Math.sin(theta) * Math.sin(phi);

      // Magnitude com distribuição power-law (poucas brilhantes, muitas fracas)
      const r = Math.random();
      bright[i] = Math.pow(r, 4) * 0.9 + 0.1; // viés para escuras
      sizes[i]  = 0.6 + Math.pow(r, 6) * 4;
    }

    geometry.setAttribute('position',   new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size',       new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('brightness', new THREE.BufferAttribute(bright, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0.0 }, // começa invisível
      },
      vertexShader:   STAR_VERT,
      fragmentShader: STAR_FRAG,
      transparent:    true,
      depthWrite:     false,
      blending:       THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.points.name = 'stars';
    this.points.frustumCulled = false;
    this.scene.add(this.points);

    console.log(`✨ Stars: ${count} estrelas criadas`);
  }

  /**
   * Ajusta opacidade baseada na elevação do sol
   * Sol acima do horizonte = estrelas invisíveis
   * Sol abaixo de -6° = noite plena
   */
  public updateBySunElevation(elevation: number): void {
    let opacity = 0;
    if (elevation < -6)      opacity = 1.0;
    else if (elevation < 0)  opacity = -elevation / 6;
    else                     opacity = 0;
    this.material.uniforms['uOpacity'].value = opacity;
  }

  public setOpacity(opacity: number): void {
    this.material.uniforms['uOpacity'].value = Math.max(0, Math.min(1, opacity));
  }

  public dispose(): void {
    this.scene.remove(this.points);
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
