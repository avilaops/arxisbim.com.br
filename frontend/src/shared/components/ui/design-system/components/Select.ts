/**
 * Select/Dropdown Component - Sistema de Design ArxisVR
 */

export interface SelectOption {
  value: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

export interface SelectProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  hint?: string;
  searchable?: boolean;
  fullWidth?: boolean;
  onChange?: (value: string) => void;
  className?: string;
}

export class Select {
  private container: HTMLElement;
  private selectButton: HTMLElement;
  private dropdown: HTMLElement;
  private props: SelectProps;
  private isOpen: boolean = false;
  private selectedValue: string | null = null;

  constructor(props: SelectProps) {
    this.props = { ...props };
    this.container = this.createContainer();
    this.selectButton = this.createSelectButton();
    this.dropdown = this.createDropdown();
    this.applyStyles();
    this.setupEventListeners();
  }

  /**
   * Cria o container
   */
  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = this.getContainerClasses();

    // Label
    if (this.props.label) {
      const label = document.createElement('label');
      label.className = 'arxis-select-label';
      label.textContent = this.props.label;
      if (this.props.required) {
        const required = document.createElement('span');
        required.className = 'arxis-select-required';
        required.textContent = ' *';
        label.appendChild(required);
      }
      container.appendChild(label);
    }

    return container;
  }

  /**
   * Cria o botão select
   */
  private createSelectButton(): HTMLElement {
    const button = document.createElement('div');
    button.className = 'arxis-select-button';
    
    if (this.props.disabled) {
      button.classList.add('arxis-select-button--disabled');
    }

    const text = document.createElement('span');
    text.className = 'arxis-select-text';
    text.textContent = this.props.placeholder || 'Selecione...';
    button.appendChild(text);

    const arrow = document.createElement('span');
    arrow.className = 'arxis-select-arrow';
    arrow.textContent = '▼';
    button.appendChild(arrow);

    this.container.appendChild(button);
    return button;
  }

  /**
   * Cria o dropdown
   */
  private createDropdown(): HTMLElement {
    const dropdown = document.createElement('div');
    dropdown.className = 'arxis-select-dropdown';
    dropdown.style.display = 'none';

    // Search input (se searchable)
    if (this.props.searchable) {
      const searchContainer = document.createElement('div');
      searchContainer.className = 'arxis-select-search';
      
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.placeholder = 'Buscar...';
      searchInput.className = 'arxis-select-search-input';
      searchInput.addEventListener('input', (e) => {
        this.filterOptions((e.target as HTMLInputElement).value);
      });
      
      searchContainer.appendChild(searchInput);
      dropdown.appendChild(searchContainer);
    }

    // Options list
    const optionsList = document.createElement('div');
    optionsList.className = 'arxis-select-options';
    
    this.props.options.forEach(option => {
      const optionEl = this.createOption(option);
      optionsList.appendChild(optionEl);
    });

    dropdown.appendChild(optionsList);
    this.container.appendChild(dropdown);
    
    return dropdown;
  }

  /**
   * Cria uma option
   */
  private createOption(option: SelectOption): HTMLElement {
    const optionEl = document.createElement('div');
    optionEl.className = 'arxis-select-option';
    optionEl.dataset.value = option.value;
    
    if (option.disabled) {
      optionEl.classList.add('arxis-select-option--disabled');
    }

    if (option.icon) {
      const icon = document.createElement('span');
      icon.className = 'arxis-select-option-icon';
      icon.textContent = option.icon;
      optionEl.appendChild(icon);
    }

    const label = document.createElement('span');
    label.textContent = option.label;
    optionEl.appendChild(label);

    if (!option.disabled) {
      optionEl.addEventListener('click', () => {
        this.selectOption(option);
      });
    }

    return optionEl;
  }

  /**
   * Filtra options (para searchable)
   */
  private filterOptions(query: string): void {
    const optionsList = this.dropdown.querySelector('.arxis-select-options');
    if (!optionsList) return;

    const options = optionsList.querySelectorAll('.arxis-select-option');
    const lowerQuery = query.toLowerCase();

    options.forEach(option => {
      const text = option.textContent?.toLowerCase() || '';
      if (text.includes(lowerQuery)) {
        (option as HTMLElement).style.display = '';
      } else {
        (option as HTMLElement).style.display = 'none';
      }
    });
  }

  /**
   * Seleciona uma option
   */
  private selectOption(option: SelectOption): void {
    this.selectedValue = option.value;
    
    // Atualiza texto do botão
    const text = this.selectButton.querySelector('.arxis-select-text');
    if (text) {
      text.textContent = option.label;
    }

    // Remove seleção anterior
    const options = this.dropdown.querySelectorAll('.arxis-select-option');
    options.forEach(opt => opt.classList.remove('arxis-select-option--selected'));

    // Adiciona seleção atual
    const currentOption = this.dropdown.querySelector(`[data-value="${option.value}"]`);
    if (currentOption) {
      currentOption.classList.add('arxis-select-option--selected');
    }

    this.close();

    if (this.props.onChange) {
      this.props.onChange(option.value);
    }
  }

  /**
   * Configura event listeners
   */
  private setupEventListeners(): void {
    // Toggle dropdown
    this.selectButton.addEventListener('click', () => {
      if (!this.props.disabled) {
        this.toggle();
      }
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target as Node)) {
        this.close();
      }
    });
  }

  /**
   * Gera classes do container
   */
  private getContainerClasses(): string {
    const classes = ['arxis-select-container'];
    
    if (this.props.fullWidth) {
      classes.push('arxis-select-container--full');
    }
    
    if (this.props.error) {
      classes.push('arxis-select-container--error');
    }
    
    if (this.props.disabled) {
      classes.push('arxis-select-container--disabled');
    }
    
    if (this.props.className) {
      classes.push(this.props.className);
    }

    return classes.join(' ');
  }

  /**
   * Abre o dropdown
   */
  public open(): void {
    if (this.props.disabled) return;
    this.dropdown.style.display = 'block';
    this.selectButton.classList.add('arxis-select-button--open');
    this.isOpen = true;
  }

  /**
   * Fecha o dropdown
   */
  public close(): void {
    this.dropdown.style.display = 'none';
    this.selectButton.classList.remove('arxis-select-button--open');
    this.isOpen = false;
  }

  /**
   * Toggle open/close
   */
  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Define valor selecionado
   */
  public setValue(value: string): void {
    const option = this.props.options.find(opt => opt.value === value);
    if (option) {
      this.selectOption(option);
    }
  }

  /**
   * Retorna valor selecionado
   */
  public getValue(): string | null {
    return this.selectedValue;
  }

  /**
   * Aplica estilos CSS
   */
  private applyStyles(): void {
    if (document.getElementById('arxis-select-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-select-styles';
    style.textContent = `
      .arxis-select-container {
        position: relative;
        margin-bottom: 16px;
      }

      .arxis-select-container--full {
        width: 100%;
      }

      .arxis-select-label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: var(--theme-foreground, #fff);
        margin-bottom: 6px;
      }

      .arxis-select-required {
        color: #f5576c;
      }

      .arxis-select-button {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: var(--theme-foreground, #fff);
        cursor: pointer;
        transition: all 0.2s ease;
        user-select: none;
      }

      .arxis-select-button:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.2);
      }

      .arxis-select-button--open {
        border-color: var(--theme-primary, #667eea);
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }

      .arxis-select-button--open .arxis-select-arrow {
        transform: rotate(180deg);
      }

      .arxis-select-button--disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .arxis-select-text {
        flex: 1;
        font-size: 14px;
      }

      .arxis-select-arrow {
        font-size: 10px;
        transition: transform 0.2s ease;
      }

      .arxis-select-dropdown {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        right: 0;
        background: rgba(20, 20, 20, 0.98);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        z-index: 1000;
        max-height: 300px;
        overflow-y: auto;
        animation: arxis-select-dropdown-show 0.2s ease;
      }

      @keyframes arxis-select-dropdown-show {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .arxis-select-search {
        padding: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .arxis-select-search-input {
        width: 100%;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        color: var(--theme-foreground, #fff);
        font-size: 13px;
        outline: none;
      }

      .arxis-select-search-input::placeholder {
        color: rgba(255, 255, 255, 0.4);
      }

      .arxis-select-options {
        padding: 4px;
      }

      .arxis-select-option {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.15s ease;
        font-size: 14px;
        color: var(--theme-foreground, #fff);
      }

      .arxis-select-option:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .arxis-select-option--selected {
        background: rgba(102, 126, 234, 0.2);
        color: var(--theme-accent, #00ff88);
      }

      .arxis-select-option--disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .arxis-select-option-icon {
        font-size: 16px;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Retorna o elemento container
   */
  public getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Destrói o select
   */
  public destroy(): void {
    this.container.remove();
  }
}

/**
 * Helper para criar select rapidamente
 */
export function createSelect(props: SelectProps): Select {
  return new Select(props);
}
