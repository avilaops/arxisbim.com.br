/**
 * ColorPicker - Seletor de cores avançado
 * Permite escolher cores para customização de temas
 */
export class ColorPicker {
  private panel: HTMLElement | null = null;
  private isOpen: boolean = false;
  private currentColor: string = '#00ff88';
  private onColorChange: ((color: string) => void) | null = null;

  constructor() {
    this.createPanel();
  }

  /**
   * Cria o painel do color picker
   */
  private createPanel(): void {
    const panel = document.createElement('div');
    panel.id = 'color-picker-panel';
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 300px;
      background: var(--bg-primary, rgba(0,0,0,0.95));
      border: 2px solid var(--border-color, #00ff88);
      border-radius: 12px;
      padding: 20px;
      z-index: 10000;
      display: none;
      flex-direction: column;
      gap: 15px;
      backdrop-filter: blur(10px);
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
    header.innerHTML = `
      <h3 style="margin:0; color: var(--color-primary, #00ff88);">🎨 Escolher Cor</h3>
      <button id="color-picker-close" style="background:transparent; border:none; color:white; font-size:20px; cursor:pointer;">✖</button>
    `;

    // Color input (HTML5)
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.id = 'color-input';
    colorInput.value = this.currentColor;
    colorInput.style.cssText = `
      width: 100%;
      height: 60px;
      border: 2px solid var(--border-color, #00ff88);
      border-radius: 8px;
      cursor: pointer;
    `;
    colorInput.oninput = (e) => {
      const color = (e.target as HTMLInputElement).value;
      this.updateColor(color);
    };

    // Hex input
    const hexContainer = document.createElement('div');
    hexContainer.innerHTML = `
      <label style="color: var(--fg-secondary, #ccc); font-size: 12px; display: block; margin-bottom: 5px;">Código HEX:</label>
      <input type="text" id="hex-input" value="${this.currentColor}" 
             style="width: 100%; padding: 8px; background: var(--bg-secondary, rgba(255,255,255,0.05)); 
                    border: 1px solid var(--border-light, rgba(255,255,255,0.2)); border-radius: 4px; 
                    color: white; font-family: monospace; box-sizing: border-box;">
    `;

    const hexInput = hexContainer.querySelector('#hex-input') as HTMLInputElement;
    hexInput.oninput = (e) => {
      const hex = (e.target as HTMLInputElement).value;
      if (/^#[0-9A-F]{6}$/i.test(hex)) {
        this.updateColor(hex);
      }
    };

    // Preset colors (paleta rápida)
    const presetsContainer = document.createElement('div');
    presetsContainer.innerHTML = '<div style="color: var(--fg-secondary, #ccc); font-size: 12px; margin-bottom: 5px;">Cores Rápidas:</div>';
    
    const presetsGrid = document.createElement('div');
    presetsGrid.style.cssText = 'display: grid; grid-template-columns: repeat(8, 1fr); gap: 5px;';
    
    const presetColors = [
      '#00ff88', '#00ccff', '#ff0088', '#ffaa00', '#00ff00', '#ff0000', '#0000ff', '#ffff00',
      '#ff69b4', '#7b68ee', '#00ced1', '#ff6347', '#32cd32', '#ff8c00', '#9370db', '#20b2aa'
    ];

    presetColors.forEach(color => {
      const btn = document.createElement('button');
      btn.style.cssText = `
        width: 100%;
        aspect-ratio: 1;
        background: ${color};
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 4px;
        cursor: pointer;
        transition: transform 0.2s;
      `;
      btn.onmouseover = () => btn.style.transform = 'scale(1.1)';
      btn.onmouseout = () => btn.style.transform = 'scale(1)';
      btn.onclick = () => this.updateColor(color);
      presetsGrid.appendChild(btn);
    });

    presetsContainer.appendChild(presetsGrid);

    // Buttons
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = 'display: flex; gap: 10px;';
    
    const applyBtn = document.createElement('button');
    applyBtn.textContent = '✓ Aplicar';
    applyBtn.style.cssText = `
      flex: 1;
      padding: 10px;
      background: var(--color-primary, #00ff88);
      border: none;
      border-radius: 6px;
      color: black;
      font-weight: bold;
      cursor: pointer;
    `;
    applyBtn.onclick = () => this.apply();

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '✖ Cancelar';
    cancelBtn.style.cssText = `
      flex: 1;
      padding: 10px;
      background: var(--bg-secondary, rgba(255,255,255,0.1));
      border: 1px solid var(--border-light, rgba(255,255,255,0.2));
      border-radius: 6px;
      color: white;
      font-weight: bold;
      cursor: pointer;
    `;
    cancelBtn.onclick = () => this.hide();

    buttonsContainer.appendChild(applyBtn);
    buttonsContainer.appendChild(cancelBtn);

    // Monta painel
    panel.appendChild(header);
    panel.appendChild(colorInput);
    panel.appendChild(hexContainer);
    panel.appendChild(presetsContainer);
    panel.appendChild(buttonsContainer);

    document.body.appendChild(panel);
    this.panel = panel;

    // Event listeners
    document.getElementById('color-picker-close')!.onclick = () => this.hide();

    // Fecha ao clicar fora
    panel.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('click', (e) => {
      if (this.isOpen && !panel.contains(e.target as Node)) {
        this.hide();
      }
    });
  }

  /**
   * Atualiza cor selecionada
   */
  private updateColor(color: string): void {
    this.currentColor = color;
    
    const colorInput = document.getElementById('color-input') as HTMLInputElement;
    const hexInput = document.getElementById('hex-input') as HTMLInputElement;
    
    if (colorInput) colorInput.value = color;
    if (hexInput) hexInput.value = color;
  }

  /**
   * Aplica cor selecionada
   */
  private apply(): void {
    if (this.onColorChange) {
      this.onColorChange(this.currentColor);
    }
    this.hide();
  }

  /**
   * Mostra color picker
   */
  public show(initialColor: string, onChange: (color: string) => void): void {
    this.currentColor = initialColor;
    this.onColorChange = onChange;
    this.updateColor(initialColor);
    
    if (this.panel) {
      this.panel.style.display = 'flex';
      this.isOpen = true;
    }
  }

  /**
   * Oculta color picker
   */
  public hide(): void {
    if (this.panel) {
      this.panel.style.display = 'none';
      this.isOpen = false;
    }
  }

  /**
   * Dispose
   */
  public dispose(): void {
    if (this.panel) {
      this.panel.remove();
      this.panel = null;
    }
  }
}
