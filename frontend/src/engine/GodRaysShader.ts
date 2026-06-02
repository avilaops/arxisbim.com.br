/**
 * GodRaysShader — Radial Light Scattering (Crepuscular Rays)
 *
 * Implementa "god rays" / raios crepusculares: raios de luz visíveis
 * emanando do sol através de obstáculos.
 *
 * Técnica: radial blur amostrando a partir da posição do sol em screen-space.
 * Mesmo princípio usado em UE5 (Light Shafts) e Unity HDRP (Light Shafts).
 *
 * Custo: 100 samples × resolução / 2 — usar density e samples baixos em low quality.
 */

export const GodRaysShader = {
  name: 'GodRaysShader',

  uniforms: {
    tDiffuse:   { value: null },
    sunPosScreen: { value: [0.5, 0.8] },  // posição do sol em screen UV (0-1)
    intensity:  { value: 0.18 },           // 0=off, 0.5=forte
    density:    { value: 0.95 },           // decay por step
    decay:      { value: 0.92 },
    weight:     { value: 0.4 },
    exposure:   { value: 0.3 },
    samples:    { value: 60 },             // mais = melhor qualidade, mais caro
  },

  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec2  sunPosScreen;
    uniform float intensity;
    uniform float density;
    uniform float decay;
    uniform float weight;
    uniform float exposure;
    uniform int   samples;
    varying vec2 vUv;

    const int MAX_SAMPLES = 100;

    void main() {
      vec2 uv = vUv;
      vec2 deltaUv = uv - sunPosScreen;
      deltaUv *= 1.0 / float(samples) * density;

      vec3 color = texture2D(tDiffuse, uv).rgb;
      float illumDecay = 1.0;
      vec3 godrays = vec3(0.0);

      for (int i = 0; i < MAX_SAMPLES; i++) {
        if (i >= samples) break;
        uv -= deltaUv;
        vec3 sample_ = texture2D(tDiffuse, uv).rgb;
        // Pegar só pixels muito brilhantes (próximos do sol)
        float lum = max(max(sample_.r, sample_.g), sample_.b);
        sample_ *= smoothstep(0.7, 1.0, lum);
        sample_ *= illumDecay * weight;
        godrays += sample_;
        illumDecay *= decay;
      }

      // Mask: rays só na direção radial do sol, fade ao se afastar
      vec2 toSun = sunPosScreen - vUv;
      float distFromSun = length(toSun);
      float rayMask = 1.0 - smoothstep(0.0, 0.9, distFromSun);

      gl_FragColor = vec4(color + godrays * exposure * intensity * rayMask, 1.0);
    }
  `,
};
