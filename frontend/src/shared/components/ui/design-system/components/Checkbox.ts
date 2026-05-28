/**
 * Checkbox Component - Sistema de Design ArxisVR
 */

export interface CheckboxProps {
  label?: string;
  checked?: boolean;
  disabled?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  className?: string;
}

export class Checkbox {
  private container: HTMLElement;
  private input: HTMLInputElement;
  private props: CheckboxProps;

  constructor(props: CheckboxProps = {}) {
    this.props = { ...props };
    this.container = this.createCheckbox();
    this.input = this.container.querySelector('input')!;
    this.applyStyles();
  }

  /**
   * Cria o checkbox
   */
  private createCheckbox(): HTMLElement {
    const container = document.createElement('label');
    container.className = this.getContainerClasses();

    // Input
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'arxis-checkbox-input';
    
    if (this.props.checked) {
      input.checked = true;
    }
    
    if (this.props.disabled) {
      input.disabled = true;
    }

    if (this.props.indeterminate) {
      input.indeterminate = true;
    }

    if (this.props.onChange) {
      input.addEventListener('change', (e) => {
        this.props.onChange!((e.target as HTMLInputElement).checked);
      });
    }

    container.appendChild(input);

    // Custom checkbox visual
    const checkmark = document.createElement('span');
    checkmark.className = 'arxis-checkbox-checkmark';
    container.appendChild(checkmark);

    // Label
    if (this.props.label) {
      const label = document.createElement('span');
      label.className = 'arxis-checkbox-label';
      label.textContent = this.props.label;
      container.appendChild(label);
    }

    return container;
  }

  /**
   * Gera classes do container
   */
  private getContainerClasses(): string {
    const classes = ['arxis-checkbox'];
    
    if (this.props.disabled) {
      classes.push('arxis-checkbox--disabled');
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
    if (document.getElementById('arxis-checkbox-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-checkbox-styles';
    style.textContent = `
      .arxis-checkbox {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        user-select: none;
        position: relative;
      }

      .arxis-checkbox--disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .arxis-checkbox-input {
        position: absolute;
        opacity: 0;
        cursor: pointer;
      }

      .arxis-checkbox-checkmark {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 4px;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }

      .arxis-checkbox:hover .arxis-checkbox-checkmark {
        border-color: #2563eb;
        background: #eff6ff;
      }

      .arxis-checkbox-input:checked ~ .arxis-checkbox-checkmark {
        background: #2563eb;
        border-color: #2563eb;
      }

      .arxis-checkbox-input:checked ~ .arxis-checkbox-checkmark::after {
        content: '✓';
        color: white;
        font-size: 14px;
        font-weight: bold;
      }

      .arxis-checkbox-input:indeterminate ~ .arxis-checkbox-checkmark {
        background: #2563eb;
        border-color: #2563eb;
      }

      .arxis-checkbox-input:indeterminate ~ .arxis-checkbox-checkmark::after {
        content: '−';
        color: white;
        font-size: 16px;
        font-weight: bold;
      }

      .arxis-checkbox-label {
        font-size: 14px;
        color: var(--theme-foreground, #fff);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Define checked
   */
  public setChecked(checked: boolean): void {
    this.input.checked = checked;
    this.input.indeterminate = false;
  }

  /**
   * Retorna checked
   */
  public isChecked(): boolean {
    return this.input.checked;
  }

  /**
   * Define indeterminate
   */
  public setIndeterminate(indeterminate: boolean): void {
    this.input.indeterminate = indeterminate;
  }

  /**
   * Retorna o elemento
   */
  public getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Destrói o checkbox
   */
  public destroy(): void {
    this.container.remove();
  }
}

/**
 * Helper para criar checkbox
 */
export function createCheckbox(props: CheckboxProps = {}): Checkbox {
  return new Checkbox(props);
}
