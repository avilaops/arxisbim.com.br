import { Theme, ThemeId, validateThemeSchema } from './Theme';
import { eventBus, EventType } from '../EventBus';

/**
 * ThemeManager - Gerenciador central de temas do ArxisVR
 * 
 * Responsabilidades:
 * - Carregar e aplicar temas
 * - Hot-reload em tempo real
 * - Persistência local (localStorage)
 * - Emitir eventos de mudança para todos os módulos
 * - Gerenciar temas customizados
 */
export class ThemeManager {
  private static instance: ThemeManager;
  
  private themes: Map<ThemeId, Theme> = new Map();
  private currentTheme: Theme | null = null;
  private readonly STORAGE_KEY = 'arxisvr_theme';

  private constructor() {
    this.initializeDefaultThemes();
    this.setupEventListeners();
  }

  public static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  /**
   * Inicializa temas padrão
   */
  private initializeDefaultThemes(): void {
    // Temas padrão serão carregados via loadTheme()
    console.log('✅ ThemeManager initialized');
  }
  
  /**
   * Setup event listeners com tipagem forte
   */
  private setupEventListeners(): void {
    // Eventos de tema do sistema principal
    eventBus.on(EventType.THEME_CHANGED, (data: any) => {
      const themeId = data.themeId || data.theme;
      if (themeId && themeId !== this.currentTheme?.id) {
        console.log(`📨 ThemeManager: Received THEME_CHANGED event for ${themeId}`);
        this.applyTheme(themeId);
      }
    });
    
    console.log('✅ Theme event listeners registered');
  }

  /**
   * Carrega um tema no sistema
   */
  public loadTheme(theme: Theme): void {
    // Valida tema antes de carregar
    if (!validateThemeSchema(theme)) {
      console.error('Invalid theme schema:', theme);
      throw new Error('Theme validation failed: missing required properties or invalid format');
    }

    this.themes.set(theme.id, theme);
    
    eventBus.emit(EventType.THEME_LOADED, { themeId: theme.id });
    
    console.log(`🎨 Theme loaded: ${theme.name} (${theme.id})`);
  }
  
  /**
   * Recarrega tema do arquivo (hot-reload)
   */
  public async reloadTheme(themeId: ThemeId): Promise<void> {
    try {
      console.log(`🔄 Reloading theme: ${themeId}`);
      
      // Em desenvolvimento, busca do arquivo
      const response = await fetch(`/src/core/theme/themes/${themeId}.json`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const themeData = await response.json();
      
      // Valida antes de aplicar
      if (!validateThemeSchema(themeData)) {
        throw new Error('Invalid theme schema after reload');
      }
      
      // Atualiza no registro
      this.themes.set(themeId, themeData);
      
      // Re-aplica se for o tema atual
      if (this.currentTheme?.id === themeId) {
        this.applyTheme(themeId);
      }
      
      eventBus.emit(EventType.THEME_LOADED, { themeId, reloaded: true });
      
      console.log(`✅ Theme reloaded: ${themeId}`);
    } catch (error) {
      console.error(`❌ Failed to reload theme: ${themeId}`, error);
      eventBus.emit(EventType.THEME_ERROR, { themeId, error: String(error) });
      throw error;
    }
  }
  
  /**
   * Configura integração com Vite HMR para hot-reload automático
   */
  public setupHotReload(): void {
    if (import.meta.hot) {
      // Aceita mudanças em temas específicos
      import.meta.hot.accept('./themes/default.json', (newModule) => {
        if (newModule) this.reloadTheme('default').catch(console.error);
      });
      import.meta.hot.accept('./themes/dark.json', (newModule) => {
        if (newModule) this.reloadTheme('dark').catch(console.error);
      });
      import.meta.hot.accept('./themes/ocean.json', (newModule) => {
        if (newModule) this.reloadTheme('ocean').catch(console.error);
      });
      import.meta.hot.accept('./themes/forest.json', (newModule) => {
        if (newModule) this.reloadTheme('forest').catch(console.error);
      });
      import.meta.hot.accept('./themes/sunset.json', (newModule) => {
        if (newModule) this.reloadTheme('sunset').catch(console.error);
      });
      import.meta.hot.accept('./themes/highContrast.json', (newModule) => {
        if (newModule) this.reloadTheme('highContrast').catch(console.error);
      });
      
      console.log('🔥 Vite HMR enabled for themes');
    }
  }

  /**
   * Aplica um tema existente
   */
  public applyTheme(themeId: ThemeId): void {
    const theme = this.themes.get(themeId);
    
    if (!theme) {
      console.error(`Theme ${themeId} not found`);
      return;
    }

    this.currentTheme = theme;
    
    // Aplica cores CSS
    this.applyCSSVariables(theme);
    
    // Persiste escolha
    this.persistTheme(themeId);
    
    // Emite evento
    eventBus.emit('THEME_CHANGED' as any, {
      themeId: theme.id,
      themeName: theme.name
    });
    
    console.log(`🎨 Theme applied: ${theme.name}`);
  }

  /**
   * Aplica variáveis CSS do tema
   */
  private applyCSSVariables(theme: Theme): void {
    const root = document.documentElement;
    
    // Apply colors
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value);
    });
    
    // Apply fonts if defined
    if (theme.fonts) {
      root.style.setProperty('--theme-font-base', theme.fonts.base);
      root.style.setProperty('--theme-font-heading', theme.fonts.heading);
      root.style.setProperty('--theme-font-mono', theme.fonts.monospace);
      
      if (theme.fonts.sizes) {
        Object.entries(theme.fonts.sizes).forEach(([key, value]) => {
          root.style.setProperty(`--theme-font-${key}`, value);
        });
      }
    }
  }

  /**
   * Retorna o tema atual
   */
  public getCurrentTheme(): Theme | null {
    return this.currentTheme;
  }

  /**
   * Retorna tema por ID
   */
  public getTheme(themeId: ThemeId): Theme | undefined {
    return this.themes.get(themeId);
  }

  /**
   * Retorna todos os temas disponíveis
   */
  public getAvailableThemes(): Theme[] {
    return Array.from(this.themes.values());
  }

  /**
   * Registra um novo tema
   */
  public registerTheme(theme: Theme): void {
    this.loadTheme(theme);
    
    eventBus.emit('THEME_REGISTERED' as any, {
      themeId: theme.id,
      themeName: theme.name
    });
  }

  /**
   * Remove um tema
   */
  public unregisterTheme(themeId: ThemeId): void {
    if (this.currentTheme?.id === themeId) {
      console.warn('Cannot unregister active theme');
      return;
    }
    
    this.themes.delete(themeId);
    
    eventBus.emit('THEME_UNREGISTERED' as any, { themeId });
  }

  /**
   * Atualiza cor de um tema
   */
  public updateThemeColor(themeId: ThemeId, colorKey: string, newValue: string): void {
    const theme = this.themes.get(themeId);
    
    if (!theme) {
      console.error(`Theme ${themeId} not found`);
      return;
    }
    
    const oldValue = theme.colors[colorKey];
    theme.colors[colorKey] = newValue;
    
    // Se é o tema ativo, aplica mudança imediatamente
    if (this.currentTheme?.id === themeId) {
      document.documentElement.style.setProperty(`--theme-${colorKey}`, newValue);
    }
    
    eventBus.emit('THEME_COLOR_CHANGED' as any, {
      colorKey,
      oldValue,
      newValue
    });
  }

  /**
   * Cria tema customizado baseado no atual
   */
  public createCustomTheme(name: string, baseThemeId?: ThemeId): Theme {
    const baseTheme = baseThemeId 
      ? this.themes.get(baseThemeId) 
      : this.currentTheme;
    
    if (!baseTheme) {
      throw new Error('No base theme found');
    }
    
    const customTheme: Theme = {
      id: `custom-${Date.now()}`,
      name,
      description: `Custom theme based on ${baseTheme.name}`,
      colors: { ...baseTheme.colors },
      fonts: baseTheme.fonts ? { ...baseTheme.fonts } : undefined,
      metadata: {
        createdAt: new Date().toISOString(),
        author: 'User',
        version: '1.0.0',
        tags: ['custom']
      }
    };
    
    this.registerTheme(customTheme);
    
    return customTheme;
  }

  /**
   * Persiste tema no localStorage
   */
  private persistTheme(themeId: ThemeId): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, themeId);
    } catch (error) {
      console.error('Failed to persist theme:', error);
    }
  }

  /**
   * Carrega tema persistido
   */
  public loadPersistedTheme(): void {
    try {
      const themeId = localStorage.getItem(this.STORAGE_KEY);
      
      if (themeId && this.themes.has(themeId)) {
        this.applyTheme(themeId);
      } else if (this.themes.size > 0) {
        // Aplica primeiro tema disponível
        const firstTheme = Array.from(this.themes.values())[0];
        this.applyTheme(firstTheme.id);
      }
    } catch (error) {
      console.error('Failed to load persisted theme:', error);
    }
  }

  /**
   * Exporta tema como JSON
   */
  public exportTheme(themeId: ThemeId): string {
    const theme = this.themes.get(themeId);
    
    if (!theme) {
      throw new Error(`Theme ${themeId} not found`);
    }
    
    return JSON.stringify(theme, null, 2);
  }

  /**
   * Importa tema de JSON
   */
  public importTheme(jsonString: string): void {
    try {
      const theme = JSON.parse(jsonString) as Theme;
      this.registerTheme(theme);
    } catch (error) {
      console.error('Failed to import theme:', error);
      throw new Error('Invalid theme JSON');
    }
  }

  /**
   * Reseta para tema padrão
   */
  public resetToDefault(): void {
    const defaultTheme = this.themes.get('default');
    
    if (defaultTheme) {
      this.applyTheme('default');
    }
  }

  /**
   * Limpa todos os recursos
   */
  public dispose(): void {
    this.themes.clear();
    this.currentTheme = null;
  }
}

// Export singleton instance
export const themeManager = ThemeManager.getInstance();
