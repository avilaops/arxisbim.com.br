/**
 * Toggle/Switch Component - Sistema de Design ArxisVR
 */

export interface ToggleProps {
  label?: string;
  checked?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onChange?: (checked: boolean) => void;
  className?: string;
}

export class Toggle {
  private container: HTMLElement;
  private input: HTMLInputElement;
  private props: ToggleProps;

  constructor(props: ToggleProps = {}) {
    this.props = { size: 'md', ...props };
    this.container = this.createToggle();
    this.input = this.container.querySelector('input')!;
    this.applyStyles();
  }

  /**
   * Cria o toggle
   */
  private createToggle(): HTMLElement {
    const container = document.createElement('label');
    container.className = this.getContainerClasses();

    // Input
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'arxis-toggle-input';
    
    if (this.props.checked) {
      input.checked = true;
    }
    
    if (this.props.disabled) {
      input.disabled = true;
    }

    if (this.props.onChange) {
      input.addEventListener('change', (e) => {
        this.props.onChange!((e.target as HTMLInputElement).checked);
      });
    }

    container.appendChild(input);

    // Toggle switch visual
    const switchEl = document.createElement('span');
    switchEl.className = 'arxis-toggle-switch';
    
    const slider = document.createElement('span');
    slider.className = 'arxis-toggle-slider';
    switchEl.appendChild(slider);
    
    container.appendChild(switchEl);

    // Label
    if (this.props.label) {
      const label = document.createElement('span');
      label.className = 'arxis-toggle-label';
      label.textContent = this.props.label;
      container.appendChild(label);
    }

    return container;
  }

  /**
   * Gera classes do container
   */
  private getContainerClasses(): string {
    const classes = ['arxis-toggle'];
    
    if (this.props.size) {
      classes.push(`arxis-toggle--${this.props.size}`);
    }
    
    if (this.props.disabled) {
      classes.push('arxis-toggle--disabled');
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
    if (document.getElementById('arxis-toggle-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-toggle-styles';
    style.textContent = `
      .arxis-toggle {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        user-select: none;
        position: relative;
      }

      .arxis-toggle--disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .arxis-toggle-input {
        position: absolute;
        opacity: 0;
        cursor: pointer;
      }

      .arxis-toggle-switch {
        position: relative;
        display: inline-block;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 100px;
        transition: all 0.3s ease;
        flex-shrink: 0;
      }

      /* Sizes */
      .arxis-toggle--sm .arxis-toggle-switch {
        width: 36px;
        height: 20px;
      }

      .arxis-toggle--md .arxis-toggle-switch {
        width: 44px;
        height: 24px;
      }

      .arxis-toggle--lg .arxis-toggle-switch {
        width: 52px;
        height: 28px;
      }

      .arxis-toggle-slider {
        position: absolute;
        top: 2px;
        left: 2px;
        background: white;
        border-radius: 50%;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .arxis-toggle--sm .arxis-toggle-slider {
        width: 16px;
        height: 16px;
      }

      .arxis-toggle--md .arxis-toggle-slider {
        width: 20px;
        height: 20px;
      }

      .arxis-toggle--lg .arxis-toggle-slider {
        width: 24px;
        height: 24px;
      }

      .arxis-toggle-input:checked ~ .arxis-toggle-switch {
        background: #2563eb;
      }

      .arxis-toggle--sm .arxis-toggle-input:checked ~ .arxis-toggle-switch .arxis-toggle-slider {
        transform: translateX(16px);
      }

      .arxis-toggle--md .arxis-toggle-input:checked ~ .arxis-toggle-switch .arxis-toggle-slider {
        transform: translateX(20px);
      }

      .arxis-toggle--lg .arxis-toggle-input:checked ~ .arxis-toggle-switch .arxis-toggle-slider {
        transform: translateX(24px);
      }

      .arxis-toggle:hover .arxis-toggle-switch {
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16);
      }

      .arxis-toggle-label {
        font-size: 14px;
        color: var(--theme-foreground, #fff);
        font-weight: 500;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Define checked
   */
  public setChecked(checked: boolean): void {
    this.input.checked = checked;
  }

  /**
   * Retorna checked
   */
  public isChecked(): boolean {
    return this.input.checked;
  }

  /**
   * Toggle
   */
  public toggle(): void {
    this.input.checked = !this.input.checked;
    if (this.props.onChange) {
      this.props.onChange(this.input.checked);
    }
  }

  /**
   * Retorna o elemento
   */
  public getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Destrói o toggle
   */
  public destroy(): void {
    this.container.remove();
  }
}

/**
 * Helper para criar toggle
 */
export function createToggle(props: ToggleProps = {}): Toggle {
  return new Toggle(props);
}
