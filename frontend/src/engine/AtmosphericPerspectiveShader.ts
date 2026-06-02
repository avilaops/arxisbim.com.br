/**
 * AtmosphericPerspectiveShader — Perspectiva aérea (Aerial Perspective)
 *
 * Objetos distantes ficam progressivamente mais azulados/acinzentados.
 * Fenômeno físico real: espalhamento de Rayleigh na atmosfera.
 * Presente em UE5 (Exponential Height Fog + Atmospheric Perspective),
 * Unity HDRP (Fog Volume com Atmospheric Scattering).
 *
 * Usa o depth buffer para calcular distância e aplicar a névoa atmosférica.
 */

export const AtmosphericPerspectiveShader = {
  name: 'AtmosphericPerspectiveShader',

  uniforms: {
    tDiffuse:    { value: null },
    tDepth:      { value: null },
    cameraNear:  { value: 0.1 },
    cameraFar:   { value: 2000.0 },
    fogColor:    { value: [0.55, 0.72, 0.85] },  // azul atmosférico
    fogStart:    { value: 80.0 },                 // distância onde começa
    fogDensity:  { value: 0.0012 },               // densidade exponencial
    sunColor:    { value: [1.0, 0.95, 0.85] },    // cor do sol para haze
    sunAmount:   { value: 0.15 },                 // intensidade do haze solar
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
    uniform sampler2D tDepth;
    uniform float cameraNear;
    uniform float cameraFar;
    uniform vec3 fogColor;
    uniform float fogStart;
    uniform float fogDensity;
    uniform vec3 sunColor;
    uniform float sunAmount;
    varying vec2 vUv;

    float linearizeDepth(float depth) {
      float z = depth * 2.0 - 1.0;
      return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
    }

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float depth = texture2D(tDepth, vUv).r;

      // Pixel de skybox (depth = 1.0) — não aplicar fog
      if (depth >= 0.9999) {
        gl_FragColor = color;
        return;
      }

      float worldDist = linearizeDepth(depth);

      // Fog exponencial com start offset
      float fogFactor = 1.0 - exp(-fogDensity * max(0.0, worldDist - fogStart));
      fogFactor = clamp(fogFactor, 0.0, 0.88); // não 100% para preservar leitura

      // Adicionar tint solar (haze quente perto do horizonte)
      vec3 hazedFog = mix(fogColor, sunColor, sunAmount * (1.0 - vUv.y) * fogFactor);

      gl_FragColor = vec4(mix(color.rgb, hazedFog, fogFactor), color.a);
    }
  `,
};
