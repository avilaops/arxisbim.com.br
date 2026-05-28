/**
 * Theme Utils - Utilitários para sistema de temas
 */

/**
 * Converte hex para RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
}

/**
 * Converte RGB para hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Mistura duas cores (blend)
 */
export function blendColors(color1: string, color2: string, weight: number = 0.5): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) {
    throw new Error('Invalid color format');
  }
  
  const r = Math.round(rgb1.r * (1 - weight) + rgb2.r * weight);
  const g = Math.round(rgb1.g * (1 - weight) + rgb2.g * weight);
  const b = Math.round(rgb1.b * (1 - weight) + rgb2.b * weight);
  
  return rgbToHex(r, g, b);
}

/**
 * Calcula contraste entre duas cores
 */
export function calculateContrast(foreground: string, background: string): number {
  const rgb1 = hexToRgb(foreground);
  const rgb2 = hexToRgb(background);
  
  if (!rgb1 || !rgb2) {
    throw new Error('Invalid color format');
  }
  
  const luminance1 = calculateLuminance(rgb1.r, rgb1.g, rgb1.b);
  const luminance2 = calculateLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Calcula luminância de uma cor
 */
function calculateLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Valida se contraste é acessível (WCAG AA)
 */
export function isContrastAccessible(foreground: string, background: string): boolean {
  const contrast = calculateContrast(foreground, background);
  return contrast >= 4.5; // WCAG AA standard
}

/**
 * Escurece uma cor
 */
export function darken(color: string, amount: number = 0.1): string {
  const rgb = hexToRgb(color);
  if (!rgb) throw new Error('Invalid color format');
  
  return rgbToHex(
    Math.max(0, Math.round(rgb.r * (1 - amount))),
    Math.max(0, Math.round(rgb.g * (1 - amount))),
    Math.max(0, Math.round(rgb.b * (1 - amount)))
  );
}

/**
 * Clareia uma cor
 */
export function lighten(color: string, amount: number = 0.1): string {
  const rgb = hexToRgb(color);
  if (!rgb) throw new Error('Invalid color format');
  
  return rgbToHex(
    Math.min(255, Math.round(rgb.r + (255 - rgb.r) * amount)),
    Math.min(255, Math.round(rgb.g + (255 - rgb.g) * amount)),
    Math.min(255, Math.round(rgb.b + (255 - rgb.b) * amount))
  );
}

/**
 * Adiciona alpha (transparência) a uma cor hex
 */
export function addAlpha(color: string, alpha: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) throw new Error('Invalid color format');
  
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/**
 * Valida formato de cor hex
 */
export function isValidHex(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Normaliza cor hex (adiciona # se necessário, converte para lowercase)
 */
export function normalizeHex(color: string): string {
  color = color.trim().toLowerCase();
  if (!color.startsWith('#')) {
    color = '#' + color;
  }
  return color;
}

/**
 * Gera paleta de cores baseada em uma cor
 */
export function generateColorPalette(baseColor: string, steps: number = 7): string[] {
  const palette = [baseColor];
  
  // Calcula quantos tons mais claros e mais escuros
  const lighterSteps = Math.floor(steps / 2);
  const darkerSteps = steps - lighterSteps - 1;
  
  // Gerar tons mais claros
  for (let i = 1; i <= lighterSteps; i++) {
    const amount = (i / (lighterSteps + 1)) * 0.8; // Máximo 80% mais claro
    palette.unshift(lighten(baseColor, amount));
  }
  
  // Gerar tons mais escuros
  for (let i = 1; i <= darkerSteps; i++) {
    const amount = (i / (darkerSteps + 1)) * 0.8; // Máximo 80% mais escuro
    palette.push(darken(baseColor, amount));
  }
  
  return palette;
}

/**
 * Retorna cor de texto legível para um fundo
 */
export function getReadableTextColor(backgroundColor: string, lightColor: string = '#ffffff', darkColor: string = '#000000'): string {
  const contrastLight = calculateContrast(lightColor, backgroundColor);
  const contrastDark = calculateContrast(darkColor, backgroundColor);
  
  return contrastLight > contrastDark ? lightColor : darkColor;
}

/**
 * Gera cores análogas (adjacentes no círculo cromático)
 */
export function generateAnalogousColors(baseColor: string, count: number = 3, angle: number = 30): string[] {
  const colors: string[] = [];
  const halfCount = Math.floor(count / 2);
  
  for (let i = -halfCount; i <= halfCount; i++) {
    if (i === 0 && count % 2 === 1) {
      colors.push(baseColor);
      continue;
    }
    
    const hueShift = i * angle;
    const analogousColor = adjustHue(baseColor, hueShift);
    colors.push(analogousColor);
  }
  
  return colors;
}

/**
 * Gera cores complementares
 */
export function generateComplementaryColor(baseColor: string): string {
  return adjustHue(baseColor, 180);
}

/**
 * Gera cores triádicas (120° de diferença)
 */
export function generateTriadicColors(baseColor: string): string[] {
  return [
    baseColor,
    adjustHue(baseColor, 120),
    adjustHue(baseColor, 240)
  ];
}

/**
 * Gera cores em esquema tetrádico (90° de diferença)
 */
export function generateTetradicColors(baseColor: string): string[] {
  return [
    baseColor,
    adjustHue(baseColor, 90),
    adjustHue(baseColor, 180),
    adjustHue(baseColor, 270)
  ];
}

/**
 * Ajusta matiz (hue) de uma cor
 */
export function adjustHue(color: string, degrees: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) throw new Error('Invalid color format');
  
  // Converte RGB para HSL
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  
  // Ajusta o matiz
  hsl.h = (hsl.h + degrees) % 360;
  if (hsl.h < 0) hsl.h += 360;
  
  // Converte de volta para RGB
  const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
}

/**
 * Converte RGB para HSL
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Converte HSL para RGB
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

/**
 * Ajusta saturação de uma cor
 */
export function adjustSaturation(color: string, amount: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) throw new Error('Invalid color format');
  
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  hsl.s = Math.max(0, Math.min(100, hsl.s + amount));
  
  const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
}

/**
 * Ajusta luminosidade de uma cor
 */
export function adjustLightness(color: string, amount: number): string {
  const rgb = hexToRgb(color);
  if (!rgb) throw new Error('Invalid color format');
  
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  hsl.l = Math.max(0, Math.min(100, hsl.l + amount));
  
  const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
}

/**
 * Gera gradiente entre duas cores
 */
export function generateGradient(color1: string, color2: string, steps: number = 5): string[] {
  const gradient: string[] = [];
  
  for (let i = 0; i < steps; i++) {
    const weight = i / (steps - 1);
    gradient.push(blendColors(color1, color2, weight));
  }
  
  return gradient;
}
