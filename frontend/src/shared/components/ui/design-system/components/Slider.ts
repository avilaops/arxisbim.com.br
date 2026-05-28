/**
 * Slider Component - Sistema de Design ArxisVR
 */

export interface SliderProps {
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  disabled?: boolean;
  showValue?: boolean;
  unit?: string;
  onChange?: (value: number) => void;
  onInput?: (value: number) => void;
  className?: string;
}

export class Slider {
  private container: HTMLElement;
  private input: HTMLInputElement;
  private valueDisplay: HTMLElement | null = null;
  private props: SliderProps;

  constructor(props: SliderProps = {}) {
    this.props = {
      min: 0,
      max: 100,
      step: 1,
      value: 50,
      showValue: true,
      ...props
    };
    this.container = this.createSlider();
    this.input = this.container.querySelector('input')!;
    this.applyStyles();
    this.updateValueDisplay();
  }

  /**
   * Cria o slider
   */
  private createSlider(): HTMLElement {
    const container = document.createElement('div');
    container.className = this.getContainerClasses();

    // Header (label + value)
    if (this.props.label || this.props.showValue) {
      const header = document.createElement('div');
      header.className = 'arxis-slider-header';

      if (this.props.label) {
        const label = document.createElement('label');
        label.className = 'arxis-slider-label';
        label.textContent = this.props.label;
        header.appendChild(label);
      }

      if (this.props.showValue) {
        this.valueDisplay = document.createElement('span');
        this.valueDisplay.className = 'arxis-slider-value';
        header.appendChild(this.valueDisplay);
      }

      container.appendChild(header);
    }

    // Input range
    const input = document.createElement('input');
    input.type = 'range';
    input.className = 'arxis-slider-input';
    input.min = this.props.min!.toString();
    input.max = this.props.max!.toString();
    input.step = this.props.step!.toString();
    input.value = this.props.value!.toString();
    
    if (this.props.disabled) {
      input.disabled = true;
    }

    // Input event (real-time)
    input.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.updateValueDisplay();
      if (this.props.onInput) {
        this.props.onInput(value);
      }
    });

    // Change event (final value)
    input.addEventListener('change', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      if (this.props.onChange) {
        this.props.onChange(value);
      }
    });

    container.appendChild(input);

    return container;
  }

  /**
   * Atualiza display de valor
   */
  private updateValueDisplay(): void {
    if (this.valueDisplay) {
      const value = this.input.value;
      const unit = this.props.unit || '';
      this.valueDisplay.textContent = `${value}${unit}`;
    }
  }

  /**
   * Gera classes do container
   */
  private getContainerClasses(): string {
    const classes = ['arxis-slider-container'];
    
    if (this.props.disabled) {
      classes.push('arxis-slider-container--disabled');
    }
    
    if (this.props.className) {
      classes.push(this.props.className);
    }

    return classes.join(' ');
  }

  /**
   * Aplica estilos CSS
   */
  private applyStyles(): void {
    if (document.getElementById('arxis-slider-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-slider-styles';
    style.textContent = `
      .arxis-slider-container {
        margin-bottom: 16px;
      }

      .arxis-slider-container--disabled {
        opacity: 0.5;
        pointer-events: none;
      }

      .arxis-slider-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .arxis-slider-label {
        font-size: 13px;
        font-weight: 500;
        color: var(--theme-foreground, #fff);
      }

      .arxis-slider-value {
        font-size: 13px;
        font-weight: 600;
        color: #1d4ed8;
        font-family: 'Courier New', monospace;
      }

      .arxis-slider-input {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        outline: none;
        -webkit-appearance: none;
        appearance: none;
        cursor: pointer;
      }

      /* Track */
      .arxis-slider-input::-webkit-slider-track {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
      }

      .arxis-slider-input::-moz-range-track {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
      }

      /* Thumb */
      .arxis-slider-input::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        background: #2563eb;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.28);
        transition: all 0.2s ease;
      }

      .arxis-slider-input::-moz-range-thumb {
        width: 18px;
        height: 18px;
        background: #2563eb;
        border-radius: 50%;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.28);
        transition: all 0.2s ease;
      }

      .arxis-slider-input::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.32);
      }

      .arxis-slider-input::-moz-range-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.32);
      }

      /* Progress effect (fill) */
      .arxis-slider-input {
        background: #e5e7eb;
        accent-color: #2563eb;
      }
    `;
    document.head.appendChild(style);

    // Update progress CSS variable
    this.updateProgress();
    this.input.addEventListener('input', () => this.updateProgress());
  }

  /**
   * Atualiza progresso visual
   */
  private updateProgress(): void {
    const min = parseFloat(this.input.min);
    const max = parseFloat(this.input.max);
    const value = parseFloat(this.input.value);
    const progress = ((value - min) / (max - min)) * 100;
    this.input.style.setProperty('--slider-progress', `${progress}%`);
  }

  /**
   * Define valor
   */
  public setValue(value: number): void {
    this.input.value = value.toString();
    this.updateValueDisplay();
    this.updateProgress();
  }

  /**
   * Retorna valor
   */
  public getValue(): number {
    return parseFloat(this.input.value);
  }

  /**
   * Retorna o elemento
   */
  public getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Destrói o slider
   */
  public destroy(): void {
    this.container.remove();
  }
}

/**
 * Helper para criar slider
 */
export function createSlider(props: SliderProps = {}): Slider {
  return new Slider(props);
}
