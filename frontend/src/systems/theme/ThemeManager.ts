import * as THREE from 'three';
import {
  Theme,
  ThemePreset,
  ThemeChangeEvent,
  ThemeConfiguration,
  UserThemePreferences
} from './ThemeTypes';

/**
 * ThemeManager - Gerenciador de Temas
 * Sistema completo de temas inspirado no VSCode
 */
export class ThemeManager {
  private currentTheme: Theme | null = null;
  private presets: Map<string, ThemePreset>;
  private eventListeners: Map<string, Set<(event: ThemeChangeEvent) => void>>;
  private preferences: UserThemePreferences;
  
  // Referências ao sistema
  private scene: THREE.Scene | null = null;

  constructor() {
    this.presets = new Map();
    this.eventListeners = new Map();
    this.preferences = this.loadPreferences();

    this.initializePresets();
    this.loadSavedTheme();

    console.log('✅ ThemeManager iniciado');
  }

  /**
   * Inicializa presets de temas
   */
  private initializePresets(): void {
    // Dark Themes
    this.registerPreset(this.createDarkDefaultPreset());
    this.registerPreset(this.createDarkModernPreset());
    this.registerPreset(this.createMidnightPreset());
    this.registerPreset(this.createCyberpunkPreset());
    
    // Light Themes
    this.registerPreset(this.createLightDefaultPreset());
    this.registerPreset(this.createLightModernPreset());
    this.registerPreset(this.createSolarizedLightPreset());
    
    // High Contrast
    this.registerPreset(this.createHighContrastDarkPreset());
    this.registerPreset(this.createHighContrastLightPreset());
    
    // Special Themes
    this.registerPreset(this.createNordPreset());
    this.registerPreset(this.createDraculaPreset());
    this.registerPreset(this.createMonokaiPreset());
    this.registerPreset(this.createGruvboxPreset());
    this.registerPreset(this.createOneDarkPreset());
    this.registerPreset(this.createTokyoNightPreset());

    console.log(`📚 ${this.presets.size} temas pré-configurados carregados`);
  }

  /**
   * Dark Default (tema padrão atual)
   */
  private createDarkDefaultPreset(): ThemePreset {
    return {
      id: 'dark-default',
      name: 'Dark (Default)',
      description: 'Tema escuro padrão com verde accent',
      type: 'dark',
      icon: '🌙',
      tags: ['dark', 'default'],
      colors: {
        background: 'rgba(0, 0, 0, 0.95)',
        backgroundSecondary: 'rgba(0, 0, 0, 0.9)',
        backgroundTertiary: 'rgba(0, 0, 0, 0.85)',
        foreground: '#ffffff',
        foregroundSecondary: '#cccccc',
        foregroundMuted: '#888888',
        primary: '#00ff88',
        secondary: '#00ccff',
        accent: '#ff0088',
        border: '#00ff88',
        borderLight: 'rgba(0, 255, 136, 0.3)',
        shadow: 'rgba(0, 255, 136, 0.3)',
        success: '#00ff88',
        warning: '#ffaa00',
        error: '#ff4444',
        info: '#00ccff',
        selection: '#00ff88',
        selectionBackground: 'rgba(0, 255, 136, 0.2)',
        hover: 'rgba(0, 255, 136, 0.1)',
        active: 'rgba(0, 255, 136, 0.3)',
        focus: 'rgba(0, 255, 136, 0.5)',
        sceneBackground: new THREE.Color(0x0a0a0a),
        gridColor: new THREE.Color(0x222222),
        gridColorCenterLine: new THREE.Color(0x444444),
        ambientLight: new THREE.Color(0x404040),
        directionalLight: new THREE.Color(0xffffff),
        fog: new THREE.Color(0x0a0a0a)
      }
    };
  }

  /**
   * Dark Modern (estilo VSCode Dark+)
   */
  private createDarkModernPreset(): ThemePreset {
    return {
      id: 'dark-modern',
      name: 'Dark Modern',
      description: 'Tema escuro moderno inspirado no VSCode',
      type: 'dark',
      icon: '🌃',
      tags: ['dark', 'modern', 'vscode'],
      colors: {
        background: '#1e1e1e',
        backgroundSecondary: '#252526',
        backgroundTertiary: '#2d2d30',
        foreground: '#d4d4d4',
        foregroundSecondary: '#cccccc',
        foregroundMuted: '#858585',
        primary: '#007acc',
        secondary: '#0e639c',
        accent: '#d7ba7d',
        border: '#3e3e42',
        borderLight: '#2b2b2b',
        shadow: 'rgba(0, 0, 0, 0.5)',
        success: '#89d185',
        warning: '#d7ba7d',
        error: '#f48771',
        info: '#75beff',
        selection: '#264f78',
        selectionBackground: 'rgba(38, 79, 120, 0.4)',
        hover: 'rgba(255, 255, 255, 0.1)',
        active: 'rgba(255, 255, 255, 0.2)',
        focus: '#007acc',
        sceneBackground: new THREE.Color(0x1e1e1e),
        gridColor: new THREE.Color(0x2d2d30),
        gridColorCenterLine: new THREE.Color(0x3e3e42),
        ambientLight: new THREE.Color(0x404040),
        directionalLight: new THREE.Color(0xffffff)
      }
    };
  }

  /**
   * Midnight (azul escuro profundo)
   */
  private createMidnightPreset(): ThemePreset {
    return {
      id: 'midnight',
      name: 'Midnight',
      description: 'Tema azul escuro profundo',
      type: 'dark',
      icon: '🌌',
      tags: ['dark', 'blue'],
      colors: {
        background: '#0d1117',
        backgroundSecondary: '#161b22',
        backgroundTertiary: '#1f2937',
        foreground: '#e6edf3',
        foregroundSecondary: '#c9d1d9',
        foregroundMuted: '#7d8590',
        primary: '#58a6ff',
        secondary: '#79c0ff',
        accent: '#ffa657',
        border: '#30363d',
        borderLight: '#21262d',
        shadow: 'rgba(0, 0, 0, 0.6)',
        success: '#3fb950',
        warning: '#d29922',
        error: '#f85149',
        info: '#58a6ff',
        selection: '#388bfd',
        selectionBackground: 'rgba(56, 139, 253, 0.3)',
        hover: 'rgba(177, 186, 196, 0.12)',
        active: 'rgba(177, 186, 196, 0.24)',
        focus: '#58a6ff',
        sceneBackground: new THREE.Color(0x0d1117),
        gridColor: new THREE.Color(0x1f2937),
        gridColorCenterLine: new THREE.Color(0x30363d),
        ambientLight: new THREE.Color(0x304050),
        directionalLight: new THREE.Color(0xffffff)
      }
    };
  }

  /**
   * Cyberpunk (neon futurista)
   */
  private createCyberpunkPreset(): ThemePreset {
    return {
      id: 'cyberpunk',
      name: 'Cyberpunk',
      description: 'Tema neon futurista estilo cyberpunk',
      type: 'dark',
      icon: '🌃',
      tags: ['dark', 'neon', 'futuristic'],
      colors: {
        background: '#0a0a0f',
        backgroundSecondary: '#121218',
        backgroundTertiary: '#1a1a24',
        foreground: '#00ffff',
        foregroundSecondary: '#00dddd',
        foregroundMuted: '#008888',
        primary: '#ff00ff',
        secondary: '#00ffff',
        accent: '#ffff00',
        border: '#ff00ff',
        borderLight: 'rgba(255, 0, 255, 0.3)',
        shadow: 'rgba(255, 0, 255, 0.5)',
        success: '#00ff00',
        warning: '#ffff00',
        error: '#ff0000',
        info: '#00ffff',
        selection: '#ff00ff',
        selectionBackground: 'rgba(255, 0, 255, 0.2)',
        hover: 'rgba(255, 0, 255, 0.1)',
        active: 'rgba(255, 0, 255, 0.3)',
        focus: '#ff00ff',
        sceneBackground: new THREE.Color(0x0a0a0f),
        gridColor: new THREE.Color(0x1a1a24),
        gridColorCenterLine: new THREE.Color(0xff00ff),
        ambientLight: new THREE.Color(0x404060),
        directionalLight: new THREE.Color(0x00ffff),
        fog: new THREE.Color(0x0a0a0f)
      }
    };
  }

  /**
   * Light Default
   */
  private createLightDefaultPreset(): ThemePreset {
    return {
      id: 'light-default',
      name: 'Light (Default)',
      description: 'Tema claro padrão',
      type: 'light',
      icon: '☀️',
      tags: ['light', 'default'],
      colors: {
        background: '#ffffff',
        backgroundSecondary: '#f5f5f5',
        backgroundTertiary: '#eeeeee',
        foreground: '#000000',
        foregroundSecondary: '#333333',
        foregroundMuted: '#666666',
        primary: '#0066cc',
        secondary: '#0080ff',
        accent: '#ff6600',
        border: '#cccccc',
        borderLight: '#eeeeee',
        shadow: 'rgba(0, 0, 0, 0.1)',
        success: '#00aa00',
        warning: '#ff8800',
        error: '#cc0000',
        info: '#0080ff',
        selection: '#0066cc',
        selectionBackground: 'rgba(0, 102, 204, 0.1)',
        hover: 'rgba(0, 0, 0, 0.05)',
        active: 'rgba(0, 0, 0, 0.1)',
        focus: '#0066cc',
        sceneBackground: new THREE.Color(0xf5f5f5),
        gridColor: new THREE.Color(0xcccccc),
        gridColorCenterLine: new THREE.Color(0x999999),
        ambientLight: new THREE.Color(0xffffff),
        directionalLight: new THREE.Color(0xffffff)
      }
    };
  }

  /**
   * Light Modern
   */
  private createLightModernPreset(): ThemePreset {
    return {
      id: 'light-modern',
      name: 'Light Modern',
      description: 'Tema claro moderno e minimalista',
      type: 'light',
      icon: '🌞',
      tags: ['light', 'modern', 'minimal'],
      colors: {
        background: '#fafafa',
        backgroundSecondary: '#f0f0f0',
        backgroundTertiary: '#e8e8e8',
        foreground: '#212121',
        foregroundSecondary: '#424242',
        foregroundMuted: '#757575',
        primary: '#1976d2',
        secondary: '#42a5f5',
        accent: '#ff5722',
        border: '#e0e0e0',
        borderLight: '#eeeeee',
        shadow: 'rgba(0, 0, 0, 0.08)',
        success: '#4caf50',
        warning: '#ff9800',
        error: '#f44336',
        info: '#2196f3',
        selection: '#1976d2',
        selectionBackground: 'rgba(25, 118, 210, 0.1)',
        hover: 'rgba(0, 0, 0, 0.04)',
        active: 'rgba(0, 0, 0, 0.08)',
        focus: '#1976d2',
        sceneBackground: new THREE.Color(0xfafafa),
        gridColor: new THREE.Color(0xe0e0e0),
        gridColorCenterLine: new THREE.Color(0xbdbdbd),
        ambientLight: new THREE.Color(0xffffff),
        directionalLight: new THREE.Color(0xffffff)
      }
    };
  }

  /**
   * Solarized Light
   */
  private createSolarizedLightPreset(): ThemePreset {
    return {
      id: 'solarized-light',
      name: 'Solarized Light',
      description: 'Tema Solarized Light clássico',
      type: 'light',
      icon: '☀️',
      tags: ['light', 'solarized', 'classic'],
      colors: {
        background: '#fdf6e3',
        backgroundSecondary: '#eee8d5',
        backgroundTertiary: '#ede6d3',
        foreground: '#657b83',
        foregroundSecondary: '#586e75',
        foregroundMuted: '#93a1a1',
        primary: '#268bd2',
        secondary: '#2aa198',
        accent: '#cb4b16',
        border: '#e7dfc7',
        borderLight: '#f0e9d7',
        shadow: 'rgba(0, 0, 0, 0.05)',
        success: '#859900',
        warning: '#b58900',
        error: '#dc322f',
        info: '#268bd2',
        selection: '#268bd2',
        selectionBackground: 'rgba(38, 139, 210, 0.1)',
        hover: 'rgba(0, 0, 0, 0.03)',
        active: 'rgba(0, 0, 0, 0.06)',
        focus: '#268bd2',
        sceneBackground: new THREE.Color(0xfdf6e3),
        gridColor: new THREE.Color(0xe7dfc7),
        gridColorCenterLine: new THREE.Color(0xd1c9b1),
        ambientLight: new THREE.Color(0xfdf6e3),
        directionalLight: new THREE.Color(0xffffff)
      }
    };
  }

  /**
   * High Contrast Dark
   */
  private createHighContrastDarkPreset(): ThemePreset {
    return {
      id: 'high-contrast-dark',
      name: 'High Contrast Dark',
      description: 'Tema escuro de alto contraste para acessibilidade',
      type: 'high-contrast',
      icon: '◼️',
      tags: ['dark', 'high-contrast', 'accessibility'],
      colors: {
        background: '#000000',
        backgroundSecondary: '#0a0a0a',
        backgroundTertiary: '#141414',
        foreground: '#ffffff',
        foregroundSecondary: '#ffffff',
        foregroundMuted: '#cccccc',
        primary: '#00ffff',
        secondary: '#00ff00',
        accent: '#ffff00',
        border: '#ffffff',
        borderLight: '#888888',
        shadow: 'rgba(255, 255, 255, 0.3)',
        success: '#00ff00',
        warning: '#ffff00',
        error: '#ff0000',
        info: '#00ffff',
        selection: '#00ffff',
        selectionBackground: 'rgba(0, 255, 255, 0.3)',
        hover: 'rgba(255, 255, 255, 0.1)',
        active: 'rgba(255, 255, 255, 0.2)',
        focus: '#00ffff',
        sceneBackground: new THREE.Color(0x000000),
        gridColor: new THREE.Color(0x333333),
        gridColorCenterLine: new THREE.Color(0xffffff),
        ambientLight: new THREE.Color(0x404040),
        directionalLight: new THREE.Color(0xffffff)
      }
    };
  }

  /**
   * High Contrast Light
   */
  private createHighContrastLightPreset(): ThemePreset {
    return {
      id: 'high-contrast-light',
      name: 'High Contrast Light',
      description: 'Tema claro de alto contraste para acessibilidade',
      type: 'high-contrast',
      icon: '◻️',
      tags: ['light', 'high-contrast', 'accessibility'],
      colors: {
        background: '#ffffff',
        backgroundSecondary: '#f5f5f5',
        backgroundTertiary: '#eeeeee',
        foreground: '#000000',
        foregroundSecondary: '#000000',
        foregroundMuted: '#333333',
        primary: '#0000ff',
        secondary: '#008800',
        accent: '#ff6600',
        border: '#000000',
        borderLight: '#666666',
        shadow: 'rgba(0, 0, 0, 0.3)',
        success: '#008800',
        warning: '#ff6600',
        error: '#cc0000',
        info: '#0000ff',
        selection: '#0000ff',
        selectionBackground: 'rgba(0, 0, 255, 0.2)',
        hover: 'rgba(0, 0, 0, 0.1)',
        active: 'rgba(0, 0, 0, 0.2)',
        focus: '#0000ff',
        sceneBackground: new THREE.Color(0xffffff),
        gridColor: new THREE.Color(0xcccccc),
        gridColorCenterLine: new THREE.Color(0x000000),
        ambientLight: new THREE.Color(0xffffff),
        directionalLight: new THREE.Color(0xffffff)
      }
    };
  }

  /**
   * Nord (tema popular minimalista)
   */
  private createNordPreset(): ThemePreset {
    return {
      id: 'nord',
      name: 'Nord',
      description: 'Tema Nord - Paleta ártica minimalista',
      type: 'dark',
      icon: '❄️',
      tags: ['dark', 'nord', 'minimal'],
      colors: {
        background: '#2e3440',
        backgroundSecondary: '#3b4252',
        backgroundTertiary: '#434c5e',
        foreground: '#eceff4',
        foregroundSecondary: '#e5e9f0',
        foregroundMuted: '#d8dee9',
        primary: '#88c0d0',
        secondary: '#81a1c1',
        accent: '#5e81ac',
        border: '#4c566a',
        borderLight: '#434c5e',
        shadow: 'rgba(0, 0, 0, 0.3)',
        success: '#a3be8c',
        warning: '#ebcb8b',
        error: '#bf616a',
        info: '#88c0d0',
        selection: '#88c0d0',
        selectionBackground: 'rgba(136, 192, 208, 0.2)',
        hover: 'rgba(136, 192, 208, 0.1)',
        active: 'rgba(136, 192, 208, 0.2)',
        focus: '#88c0d0',
        sceneBackground: new THREE.Color(0x2e3440),
        gridColor: new THREE.Color(0x434c5e),
        gridColorCenterLine: new THREE.Color(0x4c566a),
        ambientLight: new THREE.Color(0x404550),
        directionalLight: new THREE.Color(0xeceff4)
      }
    };
  }

  /**
   * Dracula (tema vampire)
   */
  private createDraculaPreset(): ThemePreset {
    return {
      id: 'dracula',
      name: 'Dracula',
      description: 'Tema Dracula - Dark theme clássico',
      type: 'dark',
      icon: '🧛',
      tags: ['dark', 'dracula', 'purple'],
      colors: {
        background: '#282a36',
        backgroundSecondary: '#21222c',
        backgroundTertiary: '#191a21',
        foreground: '#f8f8f2',
        foregroundSecondary: '#f8f8f2',
        foregroundMuted: '#6272a4',
        primary: '#bd93f9',
        secondary: '#ff79c6',
        accent: '#50fa7b',
        border: '#44475a',
        borderLight: '#343746',
        shadow: 'rgba(0, 0, 0, 0.5)',
        success: '#50fa7b',
        warning: '#f1fa8c',
        error: '#ff5555',
        info: '#8be9fd',
        selection: '#bd93f9',
        selectionBackground: 'rgba(189, 147, 249, 0.2)',
        hover: 'rgba(68, 71, 90, 0.5)',
        active: 'rgba(68, 71, 90, 0.8)',
        focus: '#bd93f9',
        sceneBackground: new THREE.Color(0x282a36),
        gridColor: new THREE.Color(0x44475a),
        gridColorCenterLine: new THREE.Color(0x6272a4),
        ambientLight: new THREE.Color(0x404550),
        directionalLight: new THREE.Color(0xf8f8f2)
      }
    };
  }

  /**
   * Monokai
   */
  private createMonokaiPreset(): ThemePreset {
    return {
      id: 'monokai',
      name: 'Monokai',
      description: 'Tema Monokai clássico',
      type: 'dark',
      icon: '🎨',
      tags: ['dark', 'monokai', 'classic'],
      colors: {
        background: '#272822',
        backgroundSecondary: '#1e1f1c',
        backgroundTertiary: '#1a1b17',
        foreground: '#f8f8f2',
        foregroundSecondary: '#f8f8f2',
        foregroundMuted: '#75715e',
        primary: '#f92672',
        secondary: '#66d9ef',
        accent: '#a6e22e',
        border: '#49483e',
        borderLight: '#3e3d32',
        shadow: 'rgba(0, 0, 0, 0.5)',
        success: '#a6e22e',
        warning: '#e6db74',
        error: '#f92672',
        info: '#66d9ef',
        selection: '#f92672',
        selectionBackground: 'rgba(249, 38, 114, 0.2)',
        hover: 'rgba(73, 72, 62, 0.5)',
        active: 'rgba(73, 72, 62, 0.8)',
        focus: '#f92672',
        sceneBackground: new THREE.Color(0x272822),
        gridColor: new THREE.Color(0x49483e),
        gridColorCenterLine: new THREE.Color(0x75715e),
        ambientLight: new THREE.Color(0x404040),
        directionalLight: new THREE.Color(0xf8f8f2)
      }
    };
  }

  /**
   * Gruvbox Dark
   */
  private createGruvboxPreset(): ThemePreset {
    return {
      id: 'gruvbox-dark',
      name: 'Gruvbox Dark',
      description: 'Tema Gruvbox - Retro groove',
      type: 'dark',
      icon: '🏕️',
      tags: ['dark', 'gruvbox', 'retro'],
      colors: {
        background: '#282828',
        backgroundSecondary: '#1d2021',
        backgroundTertiary: '#3c3836',
        foreground: '#ebdbb2',
        foregroundSecondary: '#d5c4a1',
        foregroundMuted: '#928374',
        primary: '#fe8019',
        secondary: '#fabd2f',
        accent: '#b8bb26',
        border: '#504945',
        borderLight: '#3c3836',
        shadow: 'rgba(0, 0, 0, 0.5)',
        success: '#b8bb26',
        warning: '#fabd2f',
        error: '#fb4934',
        info: '#83a598',
        selection: '#fe8019',
        selectionBackground: 'rgba(254, 128, 25, 0.2)',
        hover: 'rgba(80, 73, 69, 0.5)',
        active: 'rgba(80, 73, 69, 0.8)',
        focus: '#fe8019',
        sceneBackground: new THREE.Color(0x282828),
        gridColor: new THREE.Color(0x3c3836),
        gridColorCenterLine: new THREE.Color(0x504945),
        ambientLight: new THREE.Color(0x404040),
        directionalLight: new THREE.Color(0xebdbb2)
      }
    };
  }

  /**
   * One Dark (Atom)
   */
  private createOneDarkPreset(): ThemePreset {
    return {
      id: 'one-dark',
      name: 'One Dark',
      description: 'Tema One Dark do Atom',
      type: 'dark',
      icon: '⚛️',
      tags: ['dark', 'one-dark', 'atom'],
      colors: {
        background: '#282c34',
        backgroundSecondary: '#21252b',
        backgroundTertiary: '#2c313c',
        foreground: '#abb2bf',
        foregroundSecondary: '#9da5b4',
        foregroundMuted: '#5c6370',
        primary: '#61afef',
        secondary: '#56b6c2',
        accent: '#c678dd',
        border: '#3e4451',
        borderLight: '#2c313c',
        shadow: 'rgba(0, 0, 0, 0.5)',
        success: '#98c379',
        warning: '#e5c07b',
        error: '#e06c75',
        info: '#61afef',
        selection: '#61afef',
        selectionBackground: 'rgba(97, 175, 239, 0.2)',
        hover: 'rgba(62, 68, 81, 0.5)',
        active: 'rgba(62, 68, 81, 0.8)',
        focus: '#61afef',
        sceneBackground: new THREE.Color(0x282c34),
        gridColor: new THREE.Color(0x2c313c),
        gridColorCenterLine: new THREE.Color(0x3e4451),
        ambientLight: new THREE.Color(0x404550),
        directionalLight: new THREE.Color(0xabb2bf)
      }
    };
  }

  /**
   * Tokyo Night
   */
  private createTokyoNightPreset(): ThemePreset {
    return {
      id: 'tokyo-night',
      name: 'Tokyo Night',
      description: 'Tema Tokyo Night - Noites de Tokyo',
      type: 'dark',
      icon: '🌃',
      tags: ['dark', 'tokyo', 'purple'],
      colors: {
        background: '#1a1b26',
        backgroundSecondary: '#16161e',
        backgroundTertiary: '#24283b',
        foreground: '#c0caf5',
        foregroundSecondary: '#a9b1d6',
        foregroundMuted: '#565f89',
        primary: '#7aa2f7',
        secondary: '#bb9af7',
        accent: '#7dcfff',
        border: '#3b4261',
        borderLight: '#24283b',
        shadow: 'rgba(0, 0, 0, 0.5)',
        success: '#9ece6a',
        warning: '#e0af68',
        error: '#f7768e',
        info: '#7aa2f7',
        selection: '#7aa2f7',
        selectionBackground: 'rgba(122, 162, 247, 0.2)',
        hover: 'rgba(59, 66, 97, 0.5)',
        active: 'rgba(59, 66, 97, 0.8)',
        focus: '#7aa2f7',
        sceneBackground: new THREE.Color(0x1a1b26),
        gridColor: new THREE.Color(0x24283b),
        gridColorCenterLine: new THREE.Color(0x3b4261),
        ambientLight: new THREE.Color(0x303545),
        directionalLight: new THREE.Color(0xc0caf5)
      }
    };
  }

  /**
   * Registra preset
   */
  private registerPreset(preset: ThemePreset): void {
    this.presets.set(preset.id, preset);
  }

  /**
   * Aplica tema
   */
  public applyTheme(themeId: string): void {
    const preset = this.presets.get(themeId);
    if (!preset) {
      console.warn(`Tema ${themeId} não encontrado`);
      return;
    }

    const previousTheme = this.currentTheme;

    // Cria tema completo a partir do preset
    this.currentTheme = this.presetToTheme(preset);

    // Aplica ao DOM
    this.applyThemeToDOM(this.currentTheme);

    // Aplica à cena 3D
    if (this.scene) {
      this.applyThemeTo3D(this.currentTheme);
    }

    // Salva preferência
    this.preferences.lastUsedTheme = themeId;
    this.savePreferences();

    // Emite evento
    this.emitEvent({
      previousTheme,
      currentTheme: this.currentTheme,
      timestamp: new Date()
    });

    console.log(`🎨 Tema aplicado: ${this.currentTheme.name}`);
  }

  /**
   * Converte preset para tema completo
   */
  private presetToTheme(preset: ThemePreset): Theme {
    return {
      id: preset.id,
      name: preset.name,
      description: preset.description,
      type: preset.type,
      colors: preset.colors,
      visuals: this.getDefaultVisuals(),
      typography: this.getDefaultTypography(),
      spacing: this.getDefaultSpacing()
    };
  }

  /**
   * Aplica tema ao DOM
   */
  private applyThemeToDOM(theme: Theme): void {
    const root = document.documentElement;
    const colors = theme.colors;

    // CSS Variables
    root.style.setProperty('--bg-primary', colors.background);
    root.style.setProperty('--bg-secondary', colors.backgroundSecondary);
    root.style.setProperty('--bg-tertiary', colors.backgroundTertiary);
    root.style.setProperty('--fg-primary', colors.foreground);
    root.style.setProperty('--fg-secondary', colors.foregroundSecondary);
    root.style.setProperty('--fg-muted', colors.foregroundMuted);
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--border-color', colors.border);
    root.style.setProperty('--border-light', colors.borderLight);
    root.style.setProperty('--shadow', colors.shadow);
    root.style.setProperty('--success', colors.success);
    root.style.setProperty('--warning', colors.warning);
    root.style.setProperty('--error', colors.error);
    root.style.setProperty('--info', colors.info);

    // Atualiza elementos específicos
    this.updateUIElements(theme);
  }

  /**
   * Aplica tema à cena 3D
   */
  private applyThemeTo3D(theme: Theme): void {
    if (!this.scene) return;

    const colors = theme.colors;

    // Background
    this.scene.background = colors.sceneBackground;

    // Fog
    if (colors.fog) {
      this.scene.fog = new THREE.Fog(colors.fog, 10, 100);
    }

    // Grid
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.GridHelper) {
        obj.material = new THREE.LineBasicMaterial({
          color: colors.gridColor,
          vertexColors: false
        });
      }
    });

    // Lights
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.AmbientLight) {
        obj.color = colors.ambientLight;
      }
      if (obj instanceof THREE.DirectionalLight) {
        obj.color = colors.directionalLight;
      }
    });
  }

  /**
   * Atualiza elementos da UI
   */
  private updateUIElements(theme: Theme): void {
    // Atualiza painéis existentes
    const panels = ['layer-panel', 'properties-panel', 'controls-info', 'stats-panel'];
    panels.forEach(id => {
      const panel = document.getElementById(id);
      if (panel) {
        panel.style.background = theme.colors.background;
        panel.style.borderColor = theme.colors.border;
        panel.style.color = theme.colors.foreground;
      }
    });

    // Atualiza toolbar
    const toolbar = document.getElementById('toolbar');
    if (toolbar) {
      toolbar.style.background = theme.colors.backgroundSecondary;
    }
  }

  /**
   * Define referências ao sistema
   */
  public setScene(scene: THREE.Scene): void {
    this.scene = scene;
    if (this.currentTheme) {
      this.applyThemeTo3D(this.currentTheme);
    }
  }

  /**
   * Obtém todos os presets
   */
  public getPresets(): ThemePreset[] {
    return Array.from(this.presets.values());
  }

  /**
   * Obtém presets por tipo
   */
  public getPresetsByType(type: 'dark' | 'light' | 'high-contrast'): ThemePreset[] {
    return this.getPresets().filter(p => p.type === type);
  }

  /**
   * Obtém tema atual
   */
  public getCurrentTheme(): Theme | null {
    return this.currentTheme;
  }

  /**
   * Valores padrão
   */
  private getDefaultVisuals(): any {
    return {
      borderRadius: '8px',
      borderWidth: '2px',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
      boxShadowHover: '0 10px 40px rgba(0, 0, 0, 0.5)',
      opacity: 0.95,
      opacityHover: 1.0,
      backdropBlur: 'blur(10px)',
      transition: 'all 0.3s ease',
      transitionFast: 'all 0.15s ease',
      transitionSlow: 'all 0.6s ease'
    };
  }

  private getDefaultTypography(): any {
    return {
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontFamilyMono: "'Consolas', 'Monaco', monospace",
      fontSize: {
        xs: '10px',
        sm: '12px',
        md: '14px',
        lg: '16px',
        xl: '20px',
        xxl: '24px'
      },
      fontWeight: {
        light: 300,
        normal: 400,
        medium: 500,
        bold: 700
      },
      lineHeight: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.8
      }
    };
  }

  private getDefaultSpacing(): any {
    return {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
      xxl: '48px'
    };
  }

  /**
   * Preferências
   */
  private loadPreferences(): UserThemePreferences {
    const saved = localStorage.getItem('arxisvr_theme_preferences');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      favoriteThemes: [],
      lastUsedTheme: 'dark-default',
      autoSave: true
    };
  }

  private savePreferences(): void {
    localStorage.setItem('arxisvr_theme_preferences', JSON.stringify(this.preferences));
  }

  private loadSavedTheme(): void {
    const themeId = this.preferences.lastUsedTheme;
    if (themeId && this.presets.has(themeId)) {
      this.applyTheme(themeId);
    } else {
      this.applyTheme('dark-default');
    }
  }

  /**
   * Event system
   */
  public addEventListener(callback: (event: ThemeChangeEvent) => void): void {
    if (!this.eventListeners.has('change')) {
      this.eventListeners.set('change', new Set());
    }
    this.eventListeners.get('change')!.add(callback);
  }

  private emitEvent(event: ThemeChangeEvent): void {
    const listeners = this.eventListeners.get('change');
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  }

  /**
   * Exportar/Importar
   */
  public exportCurrentTheme(): string {
    if (!this.currentTheme) {
      throw new Error('Nenhum tema aplicado');
    }

    const config: ThemeConfiguration = {
      version: '1.0.0',
      theme: this.currentTheme,
      timestamp: new Date()
    };

    return JSON.stringify(config, null, 2);
  }

  public dispose(): void {
    this.eventListeners.clear();
    console.log('♻️ ThemeManager disposed');
  }
}
