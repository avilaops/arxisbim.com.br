import * as THREE from 'three';

/**
 * Sistema de Temas - ArxisVR
 * Inspirado no VSCode Theme System
 */

/**
 * Paleta de cores de um tema
 */
export interface ThemeColors {
  // Background
  background: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  
  // Foreground
  foreground: string;
  foregroundSecondary: string;
  foregroundMuted: string;
  
  // Accent colors
  primary: string;
  secondary: string;
  accent: string;
  
  // UI Elements
  border: string;
  borderLight: string;
  shadow: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Selection
  selection: string;
  selectionBackground: string;
  
  // Interactive
  hover: string;
  active: string;
  focus: string;
  
  // Scene 3D
  sceneBackground: THREE.Color;
  gridColor: THREE.Color;
  gridColorCenterLine: THREE.Color;
  ambientLight: THREE.Color;
  directionalLight: THREE.Color;
  fog?: THREE.Color;
}

/**
 * Configuração visual do tema
 */
export interface ThemeVisuals {
  // Bordas
  borderRadius: string;
  borderWidth: string;
  
  // Sombras
  boxShadow: string;
  boxShadowHover: string;
  
  // Transparência
  opacity: number;
  opacityHover: number;
  
  // Blur
  backdropBlur: string;
  
  // Transições
  transition: string;
  transitionFast: string;
  transitionSlow: string;
}

/**
 * Tipografia do tema
 */
export interface ThemeTypography {
  fontFamily: string;
  fontFamilyMono: string;
  fontSize: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  fontWeight: {
    light: number;
    normal: number;
    medium: number;
    bold: number;
  };
  lineHeight: {
    tight: number;
    normal: number;
    relaxed: number;
  };
}

/**
 * Espaçamento do tema
 */
export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

/**
 * Tema completo
 */
export interface Theme {
  id: string;
  name: string;
  description: string;
  type: 'dark' | 'light' | 'high-contrast';
  author?: string;
  version?: string;
  
  colors: ThemeColors;
  visuals: ThemeVisuals;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  
  // Customização
  custom?: boolean;
  customizations?: Partial<ThemeColors>;
  
  // Preview
  preview?: {
    icon?: string;
    screenshot?: string;
  };
}

/**
 * Preset de tema (pré-configurado)
 */
export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  type: 'dark' | 'light' | 'high-contrast';
  colors: ThemeColors;
  icon?: string;
  tags?: string[];
}

/**
 * Configuração de customização
 */
export interface ThemeCustomization {
  baseTheme: string;
  colorOverrides: Partial<ThemeColors>;
  visualOverrides?: Partial<ThemeVisuals>;
  name?: string;
}

/**
 * Evento de mudança de tema
 */
export interface ThemeChangeEvent {
  previousTheme: Theme | null;
  currentTheme: Theme;
  timestamp: Date;
}

/**
 * Configuração de exportação/importação
 */
export interface ThemeConfiguration {
  version: string;
  theme: Theme;
  timestamp: Date;
}

/**
 * Categoria de cor para edição
 */
export interface ColorCategory {
  id: string;
  name: string;
  icon: string;
  colors: {
    key: keyof ThemeColors;
    label: string;
    description?: string;
  }[];
}

/**
 * Histórico de temas
 */
export interface ThemeHistory {
  themes: Theme[];
  maxSize: number;
  currentIndex: number;
}

/**
 * Preferências do usuário
 */
export interface UserThemePreferences {
  favoriteThemes: string[];
  lastUsedTheme: string;
  autoSave: boolean;
  syncWithOS?: boolean;
}
