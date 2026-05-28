import { ColorPicker } from './ColorPicker';
import { generateColorPalette, generateGradient } from './ThemeUtils';

/**
 * AdvancedColorPicker - Color Picker com funcionalidades avançadas
 * 
 * Funcionalidades extras:
 * - Histórico de cores
 * - Paletas de cor
 * - Seletor de gradiente
 * - Cores análogas e complementares
 */
export class AdvancedColorPicker extends ColorPicker {
  private colorHistory: string[] = [];
  private readonly MAX_HISTORY = 10;
  private currentPalette: string[] = [];

  /**
   * Renderiza controles avançados
   */
  protected createAdvancedControls(): HTMLElement {
    const controls = document.createElement('div');
    controls.className = 'color-picker-advanced';
    
    // Color history
    const history = this.createColorHistory();
    controls.appendChild(history);
    
    // Color palette generator
    const paletteGen = this.createPaletteGenerator();
    controls.appendChild(paletteGen);
    
    // Gradient picker
    const gradient = this.createGradientPicker();
    controls.appendChild(gradient);
    
    return controls;
  }

  /**
   * Cria seção de histórico de cores
   */
  private createColorHistory(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'color-history-section';
    
    const title = document.createElement('h4');
    title.textContent = 'Color History';
    title.className = 'section-title';
    section.appendChild(title);
    
    const history = document.createElement('div');
    history.className = 'color-history';
    history.id = 'color-history';
    
    this.updateColorHistory(history);
    
    section.appendChild(history);
    return section;
  }

  /**
   * Atualiza display do histórico
   */
  private updateColorHistory(container: HTMLElement): void {
    container.innerHTML = '';
    
    if (this.colorHistory.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No recent colors';
      empty.className = 'empty-message';
      container.appendChild(empty);
      return;
    }
    
    this.colorHistory.forEach((color) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = color;
      swatch.title = color;
      
      swatch.onclick = () => this.applyColorFromHistory(color);
      
      container.appendChild(swatch);
    });
  }

  /**
   * Aplica cor do histórico
   */
  private applyColorFromHistory(color: string): void {
    console.log(`Applying color from history: ${color}`);
    // Implementar lógica específica
  }

  /**
   * Adiciona cor ao histórico
   */
  protected addToHistory(color: string): void {
    // Remove duplicatas
    this.colorHistory = this.colorHistory.filter(c => c !== color);
    
    // Adiciona no início
    this.colorHistory.unshift(color);
    
    // Limita tamanho
    if (this.colorHistory.length > this.MAX_HISTORY) {
      this.colorHistory = this.colorHistory.slice(0, this.MAX_HISTORY);
    }
    
    // Atualiza UI
    const historyContainer = document.getElementById('color-history');
    if (historyContainer) {
      this.updateColorHistory(historyContainer);
    }
    
    // Salva no localStorage
    this.saveHistoryToStorage();
  }

  /**
   * Cria gerador de paleta de cores
   */
  private createPaletteGenerator(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'palette-generator-section';
    
    const title = document.createElement('h4');
    title.textContent = 'Color Palette Generator';
    title.className = 'section-title';
    section.appendChild(title);
    
    const input = document.createElement('input');
    input.type = 'color';
    input.className = 'palette-base-color';
    input.onchange = () => this.generatePalette(input.value);
    
    const button = document.createElement('button');
    button.textContent = 'Generate Palette';
    button.className = 'color-picker-button';
    button.onclick = () => this.generatePalette(input.value);
    
    const paletteDisplay = document.createElement('div');
    paletteDisplay.id = 'palette-display';
    paletteDisplay.className = 'palette-display';
    
    section.appendChild(input);
    section.appendChild(button);
    section.appendChild(paletteDisplay);
    
    return section;
  }

  /**
   * Gera paleta de cores
   */
  private generatePalette(baseColor: string): void {
    this.currentPalette = generateColorPalette(baseColor, 7);
    
    const display = document.getElementById('palette-display');
    if (!display) return;
    
    display.innerHTML = '';
    
    this.currentPalette.forEach((color, index) => {
      const swatch = document.createElement('div');
      swatch.className = 'palette-swatch';
      swatch.style.backgroundColor = color;
      swatch.title = `${color} (${index + 1}/7)`;
      
      const label = document.createElement('span');
      label.textContent = color;
      label.className = 'palette-label';
      
      swatch.appendChild(label);
      swatch.onclick = () => {
        this.addToHistory(color);
        console.log('Selected from palette:', color);
      };
      
      display.appendChild(swatch);
    });
  }

  /**
   * Cria seletor de gradiente
   */
  private createGradientPicker(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'gradient-picker-section';
    
    const title = document.createElement('h4');
    title.textContent = 'Gradient Generator';
    title.className = 'section-title';
    section.appendChild(title);
    
    const controls = document.createElement('div');
    controls.className = 'gradient-controls';
    
    const color1 = document.createElement('input');
    color1.type = 'color';
    color1.id = 'gradient-color1';
    color1.value = '#667eea';
    
    const color2 = document.createElement('input');
    color2.type = 'color';
    color2.id = 'gradient-color2';
    color2.value = '#764ba2';
    
    const steps = document.createElement('input');
    steps.type = 'number';
    steps.min = '3';
    steps.max = '10';
    steps.value = '5';
    steps.id = 'gradient-steps';
    
    const button = document.createElement('button');
    button.textContent = 'Generate Gradient';
    button.className = 'color-picker-button';
    button.onclick = () => {
      this.generateGradientDisplay(color1.value, color2.value, parseInt(steps.value));
    };
    
    controls.appendChild(color1);
    controls.appendChild(document.createTextNode(' → '));
    controls.appendChild(color2);
    controls.appendChild(steps);
    controls.appendChild(button);
    
    const gradientDisplay = document.createElement('div');
    gradientDisplay.id = 'gradient-display';
    gradientDisplay.className = 'gradient-display';
    
    section.appendChild(controls);
    section.appendChild(gradientDisplay);
    
    return section;
  }

  /**
   * Gera e exibe gradiente
   */
  private generateGradientDisplay(color1: string, color2: string, steps: number): void {
    const gradient = generateGradient(color1, color2, steps);
    
    const display = document.getElementById('gradient-display');
    if (!display) return;
    
    display.innerHTML = '';
    
    // Cria barra de gradiente
    const bar = document.createElement('div');
    bar.className = 'gradient-bar';
    bar.style.background = `linear-gradient(to right, ${gradient.join(', ')})`;
    display.appendChild(bar);
    
    // Cria swatches individuais
    const swatches = document.createElement('div');
    swatches.className = 'gradient-swatches';
    
    gradient.forEach((color) => {
      const swatch = document.createElement('div');
      swatch.className = 'gradient-swatch';
      swatch.style.backgroundColor = color;
      swatch.title = color;
      
      swatch.onclick = () => {
        this.addToHistory(color);
        console.log('Selected from gradient:', color);
      };
      
      swatches.appendChild(swatch);
    });
    
    display.appendChild(swatches);
  }

  /**
   * Override do método updateColor para incluir histórico
   */
  public updateColor(colorKey: string, newValue: string): void {
    super.updateColor(colorKey, newValue);
    this.addToHistory(newValue);
  }

  /**
   * Salva histórico no localStorage
   */
  private saveHistoryToStorage(): void {
    try {
      localStorage.setItem('arxisvr_color_history', JSON.stringify(this.colorHistory));
    } catch (error) {
      console.error('Failed to save color history:', error);
    }
  }

  /**
   * Carrega histórico do localStorage
   */
  protected loadHistoryFromStorage(): void {
    try {
      const stored = localStorage.getItem('arxisvr_color_history');
      if (stored) {
        this.colorHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load color history:', error);
    }
  }
}
