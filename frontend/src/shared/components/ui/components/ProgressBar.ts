/**
 * ProgressBar Component - Barra de progresso
 * Indicador visual de progresso de operações
 */

export type ProgressVariant = 'default' | 'success' | 'warning' | 'danger';
export type ProgressSize = 'sm' | 'md' | 'lg';

export interface ProgressBarProps {
  value?: number; // 0-100
  max?: number;
  label?: string;
  showPercentage?: boolean;
  variant?: ProgressVariant;
  size?: ProgressSize;
  striped?: boolean;
  animated?: boolean;
  indeterminate?: boolean;
  className?: string;
}

export class ProgressBar {
  private container: HTMLElement;
  private bar: HTMLElement;
  private labelEl: HTMLElement | null = null;
  private percentEl: HTMLElement | null = null;
  private props: ProgressBarProps;

  constructor(props: ProgressBarProps = {}) {
    this.props = {
      value: 0,
      max: 100,
      variant: 'default',
      size: 'md',
      showPercentage: true,
      striped: false,
      animated: false,
      indeterminate: false,
      ...props
    };
    this.container = this.createContainer();
    this.bar = this.createBar();
    this.applyStyles();
    this.updateProgress();
  }

  /**
   * Cria o container
   */
  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = this.getContainerClasses();

    // Label
    if (this.props.label || this.props.showPercentage) {
      const header = document.createElement('div');
      header.className = 'arxis-progress-header';

      if (this.props.label) {
        this.labelEl = document.createElement('span');
        this.labelEl.className = 'arxis-progress-label';
        this.labelEl.textContent = this.props.label;
        header.appendChild(this.labelEl);
      }

      if (this.props.showPercentage && !this.props.indeterminate) {
        this.percentEl = document.createElement('span');
        this.percentEl.className = 'arxis-progress-percent';
        header.appendChild(this.percentEl);
      }

      container.appendChild(header);
    }

    // Progress track
    const track = document.createElement('div');
    track.className = 'arxis-progress-track';
    container.appendChild(track);

    return container;
  }

  /**
   * Cria a barra
   */
  private createBar(): HTMLElement {
    const bar = document.createElement('div');
    bar.className = this.getBarClasses();
    
    const track = this.container.querySelector('.arxis-progress-track');
    if (track) {
      track.appendChild(bar);
    }

    return bar;
  }

  /**
   * Gera classes do container
   */
  private getContainerClasses(): string {
    const classes = ['arxis-progress-container'];
    
    if (this.props.size) {
      classes.push(`arxis-progress--${this.props.size}`);
    }
    
    if (this.props.className) {
      classes.push(this.props.className);
    }

    return classes.join(' ');
  }

  /**
   * Gera classes da barra
   */
  private getBarClasses(): string {
    const classes = ['arxis-progress-bar'];
    
    if (this.props.variant) {
      classes.push(`arxis-progress-bar--${this.props.variant}`);
    }
    
    if (this.props.striped) {
      classes.push('arxis-progress-bar--striped');
    }
    
    if (this.props.animated) {
      classes.push('arxis-progress-bar--animated');
    }
    
    if (this.props.indeterminate) {
      classes.push('arxis-progress-bar--indeterminate');
    }

    return classes.join(' ');
  }

  /**
   * Atualiza progresso
   */
  private updateProgress(): void {
    if (this.props.indeterminate) {
      this.bar.style.width = '100%';
      return;
    }

    const percent = Math.min(100, Math.max(0, (this.props.value! / this.props.max!) * 100));
    this.bar.style.width = `${percent}%`;

    if (this.percentEl) {
      this.percentEl.textContent = `${Math.round(percent)}%`;
    }
  }

  /**
   * Define valor
   */
  public setValue(value: number): void {
    this.props.value = value;
    this.updateProgress();
  }

  /**
   * Incrementa valor
   */
  public increment(amount: number = 1): void {
    this.setValue((this.props.value || 0) + amount);
  }

  /**
   * Define label
   */
  public setLabel(label: string): void {
    if (this.labelEl) {
      this.labelEl.textContent = label;
    }
  }

  /**
   * Aplica estilos CSS
   */
  private applyStyles(): void {
    if (document.getElementById('arxis-progress-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-progress-styles';
    style.textContent = `
      .arxis-progress-container {
        width: 100%;
      }

      .arxis-progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .arxis-progress-label {
        font-size: 13px;
        font-weight: 500;
        color: var(--theme-foreground, #fff);
      }

      .arxis-progress-percent {
        font-size: 12px;
        font-weight: 600;
        color: #1d4ed8;
        font-family: 'Courier New', monospace;
      }

      .arxis-progress-track {
        width: 100%;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 100px;
        overflow: hidden;
        position: relative;
      }

      .arxis-progress--sm .arxis-progress-track {
        height: 4px;
      }

      .arxis-progress--md .arxis-progress-track {
        height: 8px;
      }

      .arxis-progress--lg .arxis-progress-track {
        height: 12px;
      }

      .arxis-progress-bar {
        height: 100%;
        transition: width 0.3s ease;
        border-radius: 100px;
      }

      /* Variants */
      .arxis-progress-bar--default {
        background: #2563eb;
      }

      .arxis-progress-bar--success {
        background: #059669;
      }

      .arxis-progress-bar--warning {
        background: #d97706;
      }

      .arxis-progress-bar--danger {
        background: #dc2626;
      }

      /* Striped */
      .arxis-progress-bar--striped {
        box-shadow: inset 0 0 0 999px rgba(255, 255, 255, 0.12);
      }

      /* Animated */
      .arxis-progress-bar--animated {
        animation: arxis-progress-stripes 1s linear infinite;
      }

      @keyframes arxis-progress-stripes {
        from {
          background-position: 20px 0;
        }
        to {
          background-position: 0 0;
        }
      }

      /* Indeterminate */
      .arxis-progress-bar--indeterminate {
        animation: arxis-progress-indeterminate 1.5s ease-in-out infinite;
      }

      @keyframes arxis-progress-indeterminate {
        0% {
          transform: translateX(-100%);
        }
        50% {
          transform: translateX(0);
        }
        100% {
          transform: translateX(100%);
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Retorna o elemento
   */
  public getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Destrói o componente
   */
  public destroy(): void {
    this.container.remove();
  }
}

/**
 * LoadingSpinner Component - Spinner de carregamento
 */

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerVariant = 'default' | 'accent' | 'white';

export interface LoadingSpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  text?: string;
  overlay?: boolean;
  className?: string;
}

export class LoadingSpinner {
  private container: HTMLElement;
  private props: LoadingSpinnerProps;

  constructor(props: LoadingSpinnerProps = {}) {
    this.props = {
      size: 'md',
      variant: 'default',
      overlay: false,
      ...props
    };
    this.container = this.createSpinner();
    this.applyStyles();
  }

  /**
   * Cria o spinner
   */
  private createSpinner(): HTMLElement {
    const container = document.createElement('div');
    container.className = this.getContainerClasses();

    const spinner = document.createElement('div');
    spinner.className = 'arxis-spinner';
    container.appendChild(spinner);

    if (this.props.text) {
      const text = document.createElement('div');
      text.className = 'arxis-spinner-text';
      text.textContent = this.props.text;
      container.appendChild(text);
    }

    return container;
  }

  /**
   * Gera classes
   */
  private getContainerClasses(): string {
    const classes = ['arxis-spinner-container'];
    
    if (this.props.size) {
      classes.push(`arxis-spinner--${this.props.size}`);
    }
    
    if (this.props.variant) {
      classes.push(`arxis-spinner--${this.props.variant}`);
    }
    
    if (this.props.overlay) {
      classes.push('arxis-spinner--overlay');
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
    if (document.getElementById('arxis-spinner-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-spinner-styles';
    style.textContent = `
      .arxis-spinner-container {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      }

      .arxis-spinner-container--overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(8px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
      }

      .arxis-spinner {
        border-radius: 50%;
        border-style: solid;
        border-color: transparent;
        border-top-color: currentColor;
        animation: arxis-spinner-rotate 0.8s linear infinite;
      }

      @keyframes arxis-spinner-rotate {
        to {
          transform: rotate(360deg);
        }
      }

      /* Sizes */
      .arxis-spinner--xs .arxis-spinner {
        width: 16px;
        height: 16px;
        border-width: 2px;
      }

      .arxis-spinner--sm .arxis-spinner {
        width: 24px;
        height: 24px;
        border-width: 2px;
      }

      .arxis-spinner--md .arxis-spinner {
        width: 40px;
        height: 40px;
        border-width: 3px;
      }

      .arxis-spinner--lg .arxis-spinner {
        width: 56px;
        height: 56px;
        border-width: 4px;
      }

      .arxis-spinner--xl .arxis-spinner {
        width: 72px;
        height: 72px;
        border-width: 5px;
      }

      /* Variants */
      .arxis-spinner--default .arxis-spinner {
        color: #2563eb;
      }

      .arxis-spinner--accent .arxis-spinner {
        color: #059669;
      }

      .arxis-spinner--white .arxis-spinner {
        color: white;
      }

      .arxis-spinner-text {
        font-size: 14px;
        font-weight: 500;
        color: var(--theme-foreground, #fff);
        text-align: center;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Define texto
   */
  public setText(text: string): void {
    const textEl = this.container.querySelector('.arxis-spinner-text');
    if (textEl) {
      textEl.textContent = text;
    }
  }

  /**
   * Retorna o elemento
   */
  public getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Destrói o componente
   */
  public destroy(): void {
    this.container.remove();
  }
}

/**
 * Helpers
 */
export function createProgressBar(props: ProgressBarProps = {}): ProgressBar {
  return new ProgressBar(props);
}

export function createLoadingSpinner(props: LoadingSpinnerProps = {}): LoadingSpinner {
  return new LoadingSpinner(props);
}

/**
 * Show global loading overlay
 */
let globalSpinner: LoadingSpinner | null = null;

export function showLoading(text?: string): void {
  if (globalSpinner) {
    hideLoading();
  }
  
  globalSpinner = new LoadingSpinner({
    text: text || 'Carregando...',
    overlay: true,
    size: 'lg'
  });
  
  document.body.appendChild(globalSpinner.getElement());
}

export function hideLoading(): void {
  if (globalSpinner) {
    globalSpinner.destroy();
    globalSpinner = null;
  }
}
