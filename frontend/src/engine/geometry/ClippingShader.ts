import * as THREE from 'three';

/**
 * ClippingShader - Shaders customizados para clipping avançado
 *
 * Fornece shaders para:
 * - Clipping com fade (suave)
 * - Section lines com glow
 * - Clipping com stencil
 */
export class ClippingShader {
  /**
   * Shader para clipping com fade suave
   */
  static getFadeClippingMaterial(baseMaterial: THREE.Material): THREE.ShaderMaterial {
    const material = baseMaterial.clone() as THREE.ShaderMaterial;

    material.onBeforeCompile = (shader) => {
      // Adiciona uniforms para clipping
      shader.uniforms.clippingFadeWidth = { value: 0.1 };
      shader.uniforms.clippingFadeColor = { value: new THREE.Color(0xff0000) };

      // Modifica vertex shader
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        `
        #include <common>
        varying float vClippingDistance;
        `
      ).replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vClippingDistance = 0.0;

        // Calcula distância para todos os planos de clipping
        for (int i = 0; i < NUM_CLIPPING_PLANES; i++) {
          vClippingDistance = max(vClippingDistance, dot(position, clippingPlanes[i].xyz) + clippingPlanes[i].w);
        }
        `
      );

      // Modifica fragment shader
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `
        #include <common>
        varying float vClippingDistance;
        uniform float clippingFadeWidth;
        uniform vec3 clippingFadeColor;
        `
      ).replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>

        // Aplica fade de clipping
        if (vClippingDistance < clippingFadeWidth && vClippingDistance > 0.0) {
          float alpha = vClippingDistance / clippingFadeWidth;
          diffuseColor.rgb = mix(clippingFadeColor, diffuseColor.rgb, alpha);
          diffuseColor.a *= alpha;
        } else if (vClippingDistance <= 0.0) {
          diffuseColor.a = 0.0;
        }
        `
      );
    };

    return material;
  }

  /**
   * Shader para section lines com glow
   */
  static getSectionLineMaterial(color: THREE.Color = new THREE.Color(0xff0000)): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: color },
        glowIntensity: { value: 1.0 },
        time: { value: 0.0 }
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;

        void main() {
          vPosition = position;
          vNormal = normal;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float glowIntensity;
        uniform float time;
        varying vec3 vPosition;
        varying vec3 vNormal;

        void main() {
          float glow = sin(time * 2.0) * 0.5 + 0.5;
          glow = glow * glowIntensity;

          vec3 finalColor = color + vec3(glow * 0.3);
          float alpha = 0.8 + glow * 0.2;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
  }

  /**
   * Material para preenchimento de seções
   */
  static getSectionFillMaterial(color: THREE.Color = new THREE.Color(0xff0000), opacity: number = 0.1): THREE.Material {
    return new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  /**
   * Atualiza uniforms de tempo para animações
   */
  static updateTime(materials: THREE.Material[], time: number): void {
    materials.forEach(material => {
      if (material instanceof THREE.ShaderMaterial && material.uniforms.time) {
        material.uniforms.time.value = time;
      }
    });
  }
}