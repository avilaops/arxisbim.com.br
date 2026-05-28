import { ThemeManager } from './ThemeManager';
import { Theme } from './Theme';

/**
 * ThemeSelector - Seletor visual de temas
 * 
 * Funcionalidades:
 * - Lista todos os temas disponíveis
 * - Preview em tempo real
 * - Seleção via clique
 * - Auto-atualização quando novos temas são registrados
 */
export class ThemeSelector {
  protected manager: ThemeManager;
  private container: HTMLElement;
  private themeButtons: Map<string, HTMLButtonElement> = new Map();

  constructor(containerId: string) {
    this.manager = ThemeManager.getInstance();
    
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }
    
    this.container = container;
    this.init();
  }

  /**
   * Inicializa o seletor
   */
  private init(): void {
    this.container.innerHTML = '';
    this.container.className = 'theme-selector';
    
    // Aplica estilos
    this.applyStyles();
    
    // Renderiza temas
    this.renderThemes();
    
    console.log('✅ ThemeSelector initialized');
  }

  /**
   * Aplica estilos CSS ao container
   */
  private applyStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .theme-selector {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        padding: 16px;
        background: var(--theme-backgroundSecondary, #1e1e1e);
        border-radius: 8px;
      }
      
      .theme-button {
        padding: 12px 24px;
        border: 2px solid transparent;
        border-radius: 6px;
        cursor: pointer;
        font-weight: bold;
        font-size: 14px;
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
      }
      
      .theme-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
      
      .theme-button.active {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16);
      }
      
      .theme-button::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        opacity: 0.6;
      }
      
      .theme-preview {
        display: flex;
        gap: 4px;
        margin-top: 8px;
      }
      
      .theme-preview-color {
        width: 20px;
        height: 20px;
        border-radius: 4px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
    `;
    
    if (!document.getElementById('theme-selector-styles')) {
      style.id = 'theme-selector-styles';
      document.head.appendChild(style);
    }
  }

  /**
   * Renderiza todos os temas disponíveis
   */
  private renderThemes(): void {
    const themes = this.manager.getAvailableThemes();
    const currentTheme = this.manager.getCurrentTheme();
    
    this.themeButtons.clear();
    
    themes.forEach(theme => {
      const button = this.createThemeButton(theme, theme.id === currentTheme?.id);
      this.container.appendChild(button);
      this.themeButtons.set(theme.id, button);
    });
  }

  /**
   * Cria botão para um tema
   */
  protected createThemeButton(theme: Theme, isActive: boolean): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = `theme-button ${isActive ? 'active' : ''}`;
    button.style.backgroundColor = theme.colors.primary;
    button.style.color = theme.colors.foreground;
    
    // Nome do tema
    const name = document.createElement('div');
    name.textContent = theme.name;
    button.appendChild(name);
    
    // Preview de cores
    if (theme.description) {
      const preview = this.createColorPreview(theme);
      button.appendChild(preview);
    }
    
    // Event handler
    button.onclick = () => this.selectTheme(theme.id);
    
    return button;
  }

  /**
   * Cria preview de cores do tema
   */
  private createColorPreview(theme: Theme): HTMLElement {
    const preview = document.createElement('div');
    preview.className = 'theme-preview';
    
    const mainColors = [
      theme.colors.primary,
      theme.colors.secondary,
      theme.colors.accent,
      theme.colors.success
    ];
    
    mainColors.forEach(color => {
      const colorDiv = document.createElement('div');
      colorDiv.className = 'theme-preview-color';
      colorDiv.style.backgroundColor = color;
      preview.appendChild(colorDiv);
    });
    
    return preview;
  }

  /**
   * Seleciona um tema
   */
  private selectTheme(themeId: string): void {
    this.manager.applyTheme(themeId);
    
    // Atualiza botões ativos
    this.themeButtons.forEach((button, id) => {
      if (id === themeId) {
        button.classList.add('active');
      } else {
        button.classList.remove('active');
      }
    });
  }

  /**
   * Atualiza a lista de temas
   */
  public refresh(): void {
    this.renderThemes();
  }

  /**
   * Mostra o seletor
   */
  public show(): void {
    this.container.style.display = 'flex';
  }

  /**
   * Esconde o seletor
   */
  public hide(): void {
    this.container.style.display = 'none';
  }

  /**
   * Alterna visibilidade
   */
  public toggle(): void {
    if (this.container.style.display === 'none') {
      this.show();
    } else {
      this.hide();
    }
  }

  /**
   * Limpa recursos
   */
  public dispose(): void {
    this.container.innerHTML = '';
    this.themeButtons.clear();
  }
}
