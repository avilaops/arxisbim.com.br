/**
 * Theme Interface - ArxisVR Theme System
 * Define a estrutura completa de um tema
 */
export interface Theme {
  id: string;
  name: string;
  description?: string;
  
  colors: ThemeColors;
  fonts?: ThemeFonts;
  metadata?: ThemeMetadata;
}

export interface ThemeColors {
  // Background colors
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  
  // Foreground colors
  foreground: string;
  foregroundSecondary: string;
  foregroundMuted: string;
  
  // Brand colors
  primary: string;
  secondary: string;
  accent: string;
  
  // Status colors
  error: string;
  warning: string;
  info: string;
  success: string;
  
  // UI Element colors
  border: string;
  borderHover: string;
  shadow: string;
  
  // Interactive colors
  hover: string;
  active: string;
  focus: string;
  disabled: string;
  
  // Custom colors (extensible)
  [key: string]: string;
}

export interface ThemeFonts {
  base: string;
  heading: string;
  monospace: string;
  sizes?: {
    small: string;
    medium: string;
    large: string;
    xlarge: string;
  };
}

export interface ThemeMetadata {
  createdAt: string;
  updatedAt?: string;
  author?: string;
  version?: string;
  tags?: string[];
}

export type ThemeId = string;

/**
 * Valida se um objeto é um tema válido
 */
export function validateThemeSchema(theme: any): theme is Theme {
  const requiredColors = [
    'background', 'backgroundSecondary', 'foreground', 'primary'
  ];
  
  if (!theme.id || typeof theme.id !== 'string') return false;
  if (!theme.name || typeof theme.name !== 'string') return false;
  if (!theme.colors || typeof theme.colors !== 'object') return false;
  
  // Verifica cores obrigatórias
  const hasRequiredColors = requiredColors.every(color => 
    theme.colors[color] && isValidHex(theme.colors[color])
  );
  
  return hasRequiredColors;
}

/**
 * Valida formato hexadecimal de cor
 */
export function isValidHex(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color);
}

/**
 * Cria um tema com valores padrão
 */
export function createDefaultTheme(overrides?: Partial<Theme>): Theme {
  const defaultTheme: Theme = {
    id: 'default',
    name: 'Tema corporativo',
    description: 'Tema padrão ArxisVR com paleta enterprise',
    colors: {
      background: '#f5f7fa',
      backgroundSecondary: '#ffffff',
      backgroundTertiary: '#f3f4f6',
      foreground: '#111827',
      foregroundSecondary: '#374151',
      foregroundMuted: '#6b7280',
      primary: '#2563eb',
      secondary: '#1f2937',
      accent: '#059669',
      error: '#e53e3e',
      warning: '#dd6b20',
      info: '#3182ce',
      success: '#38a169',
      border: '#e5e7eb',
      borderHover: '#cbd5e1',
      shadow: 'rgba(15, 23, 42, 0.12)',
      hover: '#eff6ff',
      active: '#dbeafe',
      focus: '#4299e1',
      disabled: '#a0aec0'
    },
    metadata: {
      createdAt: new Date().toISOString(),
      version: '1.0.0',
      tags: ['default', 'enterprise']
    }
  };
  
  // Merge com overrides se fornecido
  if (overrides) {
    return {
      ...defaultTheme,
      ...overrides,
      colors: { ...defaultTheme.colors, ...overrides.colors },
      metadata: { 
        ...defaultTheme.metadata, 
        ...overrides.metadata,
        createdAt: overrides.metadata?.createdAt || new Date().toISOString()
      }
    };
  }
  
  return defaultTheme;
}
