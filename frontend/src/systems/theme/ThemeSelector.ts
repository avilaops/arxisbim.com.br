import { ThemeManager } from './ThemeManager';
import { ThemePreset } from './ThemeTypes';

/**
 * ThemeSelector - Barra de Ferramentas + Seletor de Temas
 * Interface estilo VSCode no canto inferior esquerdo
 */
export class ThemeSelector {
  private themeManager: ThemeManager;
  private toolbar: HTMLElement | null = null;
  private panel: HTMLElement | null = null;
  private isOpen: boolean = false;

  constructor(themeManager: ThemeManager) {
    this.themeManager = themeManager;
    this.createToolbar();
    this.createPanel();
  }

  /**
   * Cria barra de ferramentas (canto inferior esquerdo)
   */
  private createToolbar(): void {
    const toolbar = document.createElement('div');
    toolbar.id = 'bottom-toolbar';
    toolbar.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      display: flex;
      gap: 10px;
      align-items: center;
      padding: 8px 12px;
      background: var(--bg-secondary, rgba(0,0,0,0.9));
      border: 1px solid var(--border-color, #00ff88);
      border-radius: 8px;
      z-index: 9998;
      backdrop-filter: blur(10px);
      box-shadow: 0 5px 20px rgba(0,0,0,0.3);
    `;

    // Botão de temas
    const themeBtn = this.createButton('🎨', 'Temas', () => this.toggle());
    
    // Botão de configurações
    const settingsBtn = this.createButton('⚙️', 'Configurações', () => console.log('Settings'));
    
    // Botão de ajuda
    const helpBtn = this.createButton('❓', 'Ajuda', () => console.log('Help'));
    
    // Indicador de tema atual
    const themeIndicator = document.createElement('span');
    themeIndicator.id = 'theme-indicator';
    themeIndicator.style.cssText = `
      color: var(--fg-muted, #888);
      font-size: 12px;
      margin-left: 8px;
      font-family: 'Segoe UI', sans-serif;
    `;
    themeIndicator.textContent = 'Dark Default';

    toolbar.appendChild(themeBtn);
    toolbar.appendChild(settingsBtn);
    toolbar.appendChild(helpBtn);
    toolbar.appendChild(themeIndicator);

    document.body.appendChild(toolbar);
    this.toolbar = toolbar;

    // Atualiza indicador quando tema muda
    this.themeManager.addEventListener((event) => {
      themeIndicator.textContent = event.currentTheme.name;
    });
  }

  /**
   * Cria botão da toolbar
   */
  private createButton(icon: string, tooltip: string, onClick: () => void): HTMLElement {
    const btn = document.createElement('button');
    btn.innerHTML = icon;
    btn.title = tooltip;
    btn.style.cssText = `
      background: transparent;
      border: none;
      color: var(--fg-primary, white);
      font-size: 20px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background 0.2s;
    `;
    btn.onmouseover = () => btn.style.background = 'var(--hover, rgba(255,255,255,0.1))';
    btn.onmouseout = () => btn.style.background = 'transparent';
    btn.onclick = onClick;
    return btn;
  }

  /**
   * Cria painel de seleção de temas
   */
  private createPanel(): void {
    const panel = document.createElement('div');
    panel.id = 'theme-selector-panel';
    panel.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 20px;
      width: 400px;
      max-height: 600px;
      background: var(--bg-primary, rgba(0,0,0,0.95));
      border: 2px solid var(--border-color, #00ff88);
      border-radius: 12px;
      z-index: 9999;
      display: none;
      flex-direction: column;
      backdrop-filter: blur(10px);
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      overflow: hidden;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 16px;
      border-bottom: 1px solid var(--border-light, rgba(255,255,255,0.1));
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    header.innerHTML = `
      <h3 style="margin:0; color: var(--color-primary, #00ff88); font-size:18px;">🎨 Selecionar Tema</h3>
      <button onclick="document.getElementById('theme-selector-panel').style.display='none'" 
              style="background:transparent; border:none; color:white; font-size:24px; cursor:pointer;">✖</button>
    `;

    // Categorias
    const categories = document.createElement('div');
    categories.style.cssText = `
      display: flex;
      gap: 8px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-light, rgba(255,255,255,0.1));
      flex-wrap: wrap;
    `;

    ['Todos', 'Escuros', 'Claros', 'Alto Contraste'].forEach(cat => {
      const btn = document.createElement('button');
      btn.textContent = cat;
      btn.style.cssText = `
        padding: 6px 12px;
        background: var(--bg-secondary, rgba(255,255,255,0.05));
        border: 1px solid var(--border-light, rgba(255,255,255,0.2));
        border-radius: 4px;
        color: var(--fg-primary, white);
        cursor: pointer;
        font-size: 12px;
      `;
      btn.onclick = () => this.filterByCategory(cat);
      categories.appendChild(btn);
    });

    // Lista de temas
    const themesList = document.createElement('div');
    themesList.id = 'themes-list';
    themesList.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 8px;
    `;

    panel.appendChild(header);
    panel.appendChild(categories);
    panel.appendChild(themesList);

    document.body.appendChild(panel);
    this.panel = panel;

    this.renderThemes();
  }

  /**
   * Renderiza lista de temas
   */
  private renderThemes(filter?: string): void {
    const themesList = document.getElementById('themes-list');
    if (!themesList) return;

    themesList.innerHTML = '';

    let presets = this.themeManager.getPresets();

    // Filtra por categoria
    if (filter === 'Escuros') {
      presets = presets.filter(p => p.type === 'dark');
    } else if (filter === 'Claros') {
      presets = presets.filter(p => p.type === 'light');
    } else if (filter === 'Alto Contraste') {
      presets = presets.filter(p => p.type === 'high-contrast');
    }

    // Renderiza cada tema
    presets.forEach(preset => {
      const item = this.createThemeItem(preset);
      themesList.appendChild(item);
    });
  }

  /**
   * Cria item de tema
   */
  private createThemeItem(preset: ThemePreset): HTMLElement {
    const item = document.createElement('div');
    item.style.cssText = `
      padding: 12px;
      margin: 4px 0;
      background: var(--bg-secondary, rgba(255,255,255,0.03));
      border: 1px solid var(--border-light, rgba(255,255,255,0.1));
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 12px;
    `;
    
    item.onmouseover = () => {
      item.style.background = 'var(--hover, rgba(255,255,255,0.08))';
      item.style.borderColor = 'var(--color-primary, #00ff88)';
    };
    item.onmouseout = () => {
      item.style.background = 'var(--bg-secondary, rgba(255,255,255,0.03))';
      item.style.borderColor = 'var(--border-light, rgba(255,255,255,0.1))';
    };

    // Ícone
    const icon = document.createElement('div');
    icon.textContent = preset.icon || '🎨';
    icon.style.cssText = 'font-size: 24px;';

    // Info
    const info = document.createElement('div');
    info.style.cssText = 'flex: 1;';
    info.innerHTML = `
      <div style="font-weight: bold; color: var(--fg-primary, white); margin-bottom: 2px;">${preset.name}</div>
      <div style="font-size: 11px; color: var(--fg-muted, #888);">${preset.description}</div>
    `;

    // Preview de cores
    const preview = document.createElement('div');
    preview.style.cssText = 'display: flex; gap: 4px;';
    [preset.colors.primary, preset.colors.secondary, preset.colors.accent].forEach(color => {
      const dot = document.createElement('div');
      dot.style.cssText = `
        width: 20px;
        height: 20px;
        background: ${color};
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,0.3);
      `;
      preview.appendChild(dot);
    });

    item.appendChild(icon);
    item.appendChild(info);
    item.appendChild(preview);

    item.onclick = () => {
      this.themeManager.applyTheme(preset.id);
      this.hide();
    };

    return item;
  }

  /**
   * Filtra por categoria
   */
  private filterByCategory(category: string): void {
    this.renderThemes(category);
  }

  /**
   * Mostra/oculta painel
   */
  public toggle(): void {
    if (this.isOpen) {
      this.hide();
    } else {
      this.show();
    }
  }

  public show(): void {
    if (this.panel) {
      this.panel.style.display = 'flex';
      this.isOpen = true;
      this.renderThemes();
    }
  }

  public hide(): void {
    if (this.panel) {
      this.panel.style.display = 'none';
      this.isOpen = false;
    }
  }

  public dispose(): void {
    if (this.toolbar) this.toolbar.remove();
    if (this.panel) this.panel.remove();
  }
}
