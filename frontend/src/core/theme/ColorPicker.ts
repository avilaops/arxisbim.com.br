import { ThemeManager } from './ThemeManager';
import { Theme } from './Theme';
import { isValidHex, normalizeHex } from './ThemeUtils';

/**
 * ColorPicker - Editor de cores para customização avançada de temas
 * 
 * Funcionalidades:
 * - Editar qualquer cor do tema ativo
 * - Atualização em tempo real
 * - Validação de formato hex
 * - Criar temas customizados
 * - Preview de mudanças
 */
export class ColorPicker {
  private manager: ThemeManager;
  private container: HTMLElement;
  private currentTheme: Theme | null = null;

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
   * Inicializa o color picker
   */
  private init(): void {
    this.container.innerHTML = '';
    this.container.className = 'color-picker';
    
    // Aplica estilos
    this.applyStyles();
    
    // Renderiza controles
    this.render();
    
    console.log('✅ ColorPicker initialized');
  }

  /**
   * Aplica estilos CSS
   */
  private applyStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .color-picker {
        padding: 20px;
        background: var(--theme-backgroundSecondary, #1e1e1e);
        border-radius: 8px;
        max-height: 600px;
        overflow-y: auto;
      }
      
      .color-picker-header {
        margin-bottom: 20px;
        padding-bottom: 12px;
        border-bottom: 2px solid var(--theme-border, #333);
      }
      
      .color-picker-title {
        font-size: 18px;
        font-weight: bold;
        color: var(--theme-foreground, #fff);
        margin-bottom: 8px;
      }
      
      .color-picker-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }
      
      .color-picker-button {
        padding: 8px 16px;
        background: var(--theme-primary, #667eea);
        color: var(--theme-foreground, #fff);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        transition: all 0.2s;
      }
      
      .color-picker-button:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }
      
      .color-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        margin-bottom: 8px;
        background: var(--theme-backgroundTertiary, #252525);
        border-radius: 6px;
        transition: background 0.2s;
      }
      
      .color-row:hover {
        background: var(--theme-hover, #2a2a2a);
      }
      
      .color-label {
        flex: 1;
        color: var(--theme-foreground, #fff);
        font-size: 14px;
        text-transform: capitalize;
      }
      
      .color-input {
        width: 80px;
        height: 36px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      
      .color-hex {
        width: 100px;
        padding: 8px;
        background: var(--theme-background, #1a1a1a);
        border: 1px solid var(--theme-border, #333);
        border-radius: 4px;
        color: var(--theme-foreground, #fff);
        font-family: monospace;
        font-size: 12px;
      }
      
      .color-hex:focus {
        outline: none;
        border-color: var(--theme-primary, #667eea);
      }
      
      .color-preview {
        width: 36px;
        height: 36px;
        border-radius: 4px;
        border: 2px solid var(--theme-border, #333);
      }
    `;
    
    if (!document.getElementById('color-picker-styles')) {
      style.id = 'color-picker-styles';
      document.head.appendChild(style);
    }
  }

  /**
   * Renderiza o color picker
   */
  private render(): void {
    this.currentTheme = this.manager.getCurrentTheme();
    
    if (!this.currentTheme) {
      this.container.innerHTML = '<p style="color: white;">No theme active</p>';
      return;
    }
    
    // Header
    const header = this.createHeader();
    this.container.appendChild(header);
    
    // Color controls
    const colors = this.currentTheme.colors;
    Object.entries(colors).forEach(([key, value]) => {
      if (typeof value === 'string') {
        const row = this.createColorRow(key, value);
        this.container.appendChild(row);
      }
    });
  }

  /**
   * Cria header com título e ações
   */
  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'color-picker-header';
    
    const title = document.createElement('div');
    title.className = 'color-picker-title';
    title.textContent = `Edit Theme: ${this.currentTheme?.name}`;
    header.appendChild(title);
    
    const actions = document.createElement('div');
    actions.className = 'color-picker-actions';
    
    // Botão criar tema customizado
    const createButton = document.createElement('button');
    createButton.className = 'color-picker-button';
    createButton.textContent = '💾 Save as Custom';
    createButton.onclick = () => this.saveAsCustom();
    actions.appendChild(createButton);
    
    // Botão reset
    const resetButton = document.createElement('button');
    resetButton.className = 'color-picker-button';
    resetButton.textContent = '🔄 Reset';
    resetButton.onclick = () => this.reset();
    actions.appendChild(resetButton);
    
    header.appendChild(actions);
    
    return header;
  }

  /**
   * Cria linha de controle de cor
   */
  private createColorRow(colorKey: string, colorValue: string): HTMLElement {
    const row = document.createElement('div');
    row.className = 'color-row';
    
    // Label
    const label = document.createElement('div');
    label.className = 'color-label';
    label.textContent = colorKey.replace(/([A-Z])/g, ' $1').trim();
    row.appendChild(label);
    
    // Color input (native picker)
    const input = document.createElement('input');
    input.type = 'color';
    input.className = 'color-input';
    input.value = colorValue;
    input.oninput = (e: any) => this.updateColor(colorKey, e.target.value);
    row.appendChild(input);
    
    // Hex input (manual edit)
    const hexInput = document.createElement('input');
    hexInput.type = 'text';
    hexInput.className = 'color-hex';
    hexInput.value = colorValue;
    hexInput.maxLength = 7;
    hexInput.oninput = (e: any) => {
      const value = normalizeHex(e.target.value);
      if (isValidHex(value)) {
        this.updateColor(colorKey, value);
        input.value = value;
      }
    };
    row.appendChild(hexInput);
    
    // Preview
    const preview = document.createElement('div');
    preview.className = 'color-preview';
    preview.style.backgroundColor = colorValue;
    row.appendChild(preview);
    
    return row;
  }

  /**
   * Atualiza uma cor do tema
   */
  protected updateColor(colorKey: string, newValue: string): void {
    if (!this.currentTheme) return;
    
    this.manager.updateThemeColor(this.currentTheme.id, colorKey, newValue);
    
    // Atualiza preview
    const rows = this.container.querySelectorAll('.color-row');
    rows.forEach(row => {
      const label = row.querySelector('.color-label');
      if (label && label.textContent?.toLowerCase().replace(/\s/g, '') === colorKey.toLowerCase()) {
        const preview = row.querySelector('.color-preview') as HTMLElement;
        if (preview) {
          preview.style.backgroundColor = newValue;
        }
      }
    });
  }

  /**
   * Salva tema atual como customizado
   */
  private saveAsCustom(): void {
    if (!this.currentTheme) return;
    
    const name = prompt('Enter custom theme name:', `${this.currentTheme.name} (Custom)`);
    if (!name) return;
    
    const customTheme = this.manager.createCustomTheme(name, this.currentTheme.id);
    this.manager.applyTheme(customTheme.id);
    
    // Atualiza UI
    this.render();
    
    alert(`✅ Custom theme "${name}" created and applied!`);
  }

  /**
   * Reseta tema ao padrão
   */
  private reset(): void {
    if (confirm('Reset to default theme? This will lose unsaved changes.')) {
      this.manager.resetToDefault();
      this.render();
    }
  }

  /**
   * Atualiza o picker
   */
  public refresh(): void {
    this.render();
  }

  /**
   * Mostra o picker
   */
  public show(): void {
    this.container.style.display = 'block';
  }

  /**
   * Esconde o picker
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
    this.currentTheme = null;
  }
}
