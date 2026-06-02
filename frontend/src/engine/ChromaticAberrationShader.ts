/**
 * ChromaticAberrationShader — Distorção de lente cromática
 *
 * Separa os canais R, G, B radialmente a partir do centro da tela.
 * Efeito presente em UE5 (Lens Distortion), Unity HDRP (Chromatic Aberration).
 * Intensidade sutil (~0.003) é o padrão AAA — perceptível sem incomodar.
 */

export const ChromaticAberrationShader = {
  name: 'ChromaticAberrationShader',

  uniforms: {
    tDiffuse:  { value: null },
    intensity: { value: 0.003 },  // 0 = desligado, 0.01 = forte
    offset:    { value: 0.0 },    // offset radial adicional (raramente usado)
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
    uniform float intensity;
    uniform float offset;
    varying vec2 vUv;

    void main() {
      // Vetor do centro para o pixel atual
      vec2 dir = vUv - vec2(0.5);
      float dist = length(dir);

      // Deslocamento radial por canal (R afasta, B aproxima)
      float r = texture2D(tDiffuse, vUv + dir * intensity * 1.0).r;
      float g = texture2D(tDiffuse, vUv + dir * intensity * 0.5).g;
      float b = texture2D(tDiffuse, vUv - dir * intensity * 1.0).b;

      // Máscara radial: efeito mais forte nas bordas (como lentes reais)
      float mask = smoothstep(0.0, 0.7, dist);
      vec4 base = texture2D(tDiffuse, vUv);

      gl_FragColor = vec4(
        mix(base.r, r, mask),
        mix(base.g, g, mask),
        mix(base.b, b, mask),
        base.a
      );
    }
  `,
};
