/**
 * Input Component - Sistema de Design ArxisVR
 * Campo de entrada reutilizável com validação e estados
 */

export type InputType = 'text' | 'number' | 'email' | 'password' | 'search' | 'tel' | 'url';
export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps {
  type?: InputType;
  placeholder?: string;
  label?: string;
  value?: string;
  size?: InputSize;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  icon?: string;
  suffix?: string;
  fullWidth?: boolean;
  onChange?: (value: string) => void;
  onFocus?: (event: FocusEvent) => void;
  onBlur?: (event: FocusEvent) => void;
  className?: string;
}

export class Input {
  private container: HTMLElement;
  private input: HTMLInputElement;
  private props: InputProps;
  private errorElement: HTMLElement | null = null;
  private hintElement: HTMLElement | null = null;

  constructor(props: InputProps) {
    this.props = { type: 'text', size: 'md', ...props };
    this.container = this.createContainer();
    this.input = this.createInput();
    this.applyStyles();
  }

  /**
   * Cria o container do input
   */
  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = this.getContainerClasses();
    return container;
  }

  /**
   * Cria o elemento input
   */
  private createInput(): HTMLInputElement {
    // Label
    if (this.props.label) {
      const label = document.createElement('label');
      label.className = 'arxis-input-label';
      label.textContent = this.props.label;
      if (this.props.required) {
        const required = document.createElement('span');
        required.className = 'arxis-input-required';
        required.textContent = ' *';
        label.appendChild(required);
      }
      this.container.appendChild(label);
    }

    // Input wrapper (para icon/suffix)
    const wrapper = document.createElement('div');
    wrapper.className = 'arxis-input-wrapper';

    // Icon
    if (this.props.icon) {
      const icon = document.createElement('span');
      icon.className = 'arxis-input-icon';
      icon.textContent = this.props.icon;
      wrapper.appendChild(icon);
    }

    // Input
    const input = document.createElement('input');
    input.type = this.props.type || 'text';
    input.className = 'arxis-input';
    
    if (this.props.placeholder) {
      input.placeholder = this.props.placeholder;
    }
    
    if (this.props.value) {
      input.value = this.props.value;
    }
    
    if (this.props.disabled) {
      input.disabled = true;
    }
    
    if (this.props.readonly) {
      input.readOnly = true;
    }
    
    if (this.props.required) {
      input.required = true;
    }

    // Event listeners
    if (this.props.onChange) {
      input.addEventListener('input', () => {
        this.props.onChange!(input.value);
      });
    }

    if (this.props.onFocus) {
      input.addEventListener('focus', this.props.onFocus);
    }

    if (this.props.onBlur) {
      input.addEventListener('blur', this.props.onBlur);
    }

    wrapper.appendChild(input);

    // Suffix
    if (this.props.suffix) {
      const suffix = document.createElement('span');
      suffix.className = 'arxis-input-suffix';
      suffix.textContent = this.props.suffix;
      wrapper.appendChild(suffix);
    }

    this.container.appendChild(wrapper);

    // Hint
    if (this.props.hint && !this.props.error) {
      this.hintElement = document.createElement('div');
      this.hintElement.className = 'arxis-input-hint';
      this.hintElement.textContent = this.props.hint;
      this.container.appendChild(this.hintElement);
    }

    // Error
    if (this.props.error) {
      this.errorElement = document.createElement('div');
      this.errorElement.className = 'arxis-input-error';
      this.errorElement.textContent = this.props.error;
      this.container.appendChild(this.errorElement);
    }

    return input;
  }

  /**
   * Gera classes do container
   */
  private getContainerClasses(): string {
    const classes = ['arxis-input-container'];
    
    if (this.props.size) {
      classes.push(`arxis-input-container--${this.props.size}`);
    }
    
    if (this.props.fullWidth) {
      classes.push('arxis-input-container--full');
    }
    
    if (this.props.error) {
      classes.push('arxis-input-container--error');
    }
    
    if (this.props.disabled) {
      classes.push('arxis-input-container--disabled');
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
    if (document.getElementById('arxis-input-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-input-styles';
    style.textContent = `
      .arxis-input-container {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 16px;
      }

      .arxis-input-container--full {
        width: 100%;
      }

      .arxis-input-label {
        font-size: 13px;
        font-weight: 500;
        color: var(--theme-foreground, #fff);
        margin-bottom: 4px;
      }

      .arxis-input-required {
        color: #f5576c;
      }

      .arxis-input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        transition: all 0.2s ease;
      }

      .arxis-input-wrapper:focus-within {
        border-color: var(--theme-primary, #667eea);
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        background: rgba(255, 255, 255, 0.08);
      }

      .arxis-input-container--error .arxis-input-wrapper {
        border-color: #f5576c;
      }

      .arxis-input-container--error .arxis-input-wrapper:focus-within {
        box-shadow: 0 0 0 3px rgba(245, 87, 108, 0.1);
      }

      .arxis-input-container--disabled .arxis-input-wrapper {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .arxis-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        padding: 10px 14px;
        font-size: 14px;
        color: var(--theme-foreground, #fff);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .arxis-input::placeholder {
        color: rgba(255, 255, 255, 0.4);
      }

      .arxis-input:disabled {
        cursor: not-allowed;
      }

      .arxis-input-icon {
        padding-left: 14px;
        color: rgba(255, 255, 255, 0.5);
        font-size: 16px;
      }

      .arxis-input-suffix {
        padding-right: 14px;
        color: rgba(255, 255, 255, 0.5);
        font-size: 13px;
        font-weight: 500;
      }

      /* Sizes */
      .arxis-input-container--sm .arxis-input {
        padding: 6px 10px;
        font-size: 12px;
      }

      .arxis-input-container--md .arxis-input {
        padding: 10px 14px;
        font-size: 14px;
      }

      .arxis-input-container--lg .arxis-input {
        padding: 14px 18px;
        font-size: 16px;
      }

      /* Hint & Error */
      .arxis-input-hint {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        margin-top: -2px;
      }

      .arxis-input-error {
        font-size: 12px;
        color: #f5576c;
        margin-top: -2px;
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .arxis-input-error::before {
        content: '⚠';
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Define valor do input
   */
  public setValue(value: string): void {
    this.input.value = value;
  }

  /**
   * Retorna valor do input
   */
  public getValue(): string {
    return this.input.value;
  }

  /**
   * Define erro
   */
  public setError(error: string | null): void {
    this.props.error = error || undefined;
    
    // Remove erro existente
    if (this.errorElement) {
      this.errorElement.remove();
      this.errorElement = null;
    }

    // Remove hint se tiver erro
    if (error && this.hintElement) {
      this.hintElement.remove();
      this.hintElement = null;
    }

    // Adiciona novo erro
    if (error) {
      this.errorElement = document.createElement('div');
      this.errorElement.className = 'arxis-input-error';
      this.errorElement.textContent = error;
      this.container.appendChild(this.errorElement);
      this.container.classList.add('arxis-input-container--error');
    } else {
      this.container.classList.remove('arxis-input-container--error');
      
      // Restaura hint se tinha
      if (this.props.hint) {
        this.hintElement = document.createElement('div');
        this.hintElement.className = 'arxis-input-hint';
        this.hintElement.textContent = this.props.hint;
        this.container.appendChild(this.hintElement);
      }
    }
  }

  /**
   * Foca no input
   */
  public focus(): void {
    this.input.focus();
  }

  /**
   * Limpa o input
   */
  public clear(): void {
    this.input.value = '';
    if (this.props.onChange) {
      this.props.onChange('');
    }
  }

  /**
   * Retorna o elemento DOM container
   */
  public getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Retorna o elemento input
   */
  public getInputElement(): HTMLInputElement {
    return this.input;
  }

  /**
   * Destrói o input
   */
  public destroy(): void {
    this.container.remove();
  }
}

/**
 * Helper para criar input rapidamente
 */
export function createInput(props: InputProps): Input {
  return new Input(props);
}
