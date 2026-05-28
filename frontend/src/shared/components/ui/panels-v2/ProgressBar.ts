/**
 * Progress Bar Component
 * Barra de progresso visual com diferentes variantes
 */

export interface ProgressBarOptions {
  progress?: number; // 0-100
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'gradient';
  showLabel?: boolean;
  label?: string;
  striped?: boolean;
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export class ProgressBar {
  private container: HTMLDivElement;
  private bar: HTMLDivElement;
  private labelElement?: HTMLSpanElement;
  private progress: number = 0;
  private options: Required<ProgressBarOptions>;

  constructor(options: ProgressBarOptions = {}) {
    this.options = {
      progress: options.progress ?? 0,
      variant: options.variant ?? 'default',
      showLabel: options.showLabel ?? true,
      label: options.label ?? '',
      striped: options.striped ?? false,
      animated: options.animated ?? false,
      size: options.size ?? 'md'
    };

    this.container = document.createElement('div');
    this.bar = document.createElement('div');
    
    this.render();
    this.setProgress(this.options.progress);
  }

  private render(): void {
    this.container.className = `arxis-progress arxis-progress--${this.options.size}`;

    this.bar.className = `arxis-progress__bar arxis-progress__bar--${this.options.variant}`;
    
    if (this.options.striped) {
      this.bar.classList.add('arxis-progress__bar--striped');
    }
    
    if (this.options.animated) {
      this.bar.classList.add('arxis-progress__bar--animated');
    }

    if (this.options.showLabel) {
      this.labelElement = document.createElement('span');
      this.labelElement.className = 'arxis-progress__label';
      this.bar.appendChild(this.labelElement);
    }

    this.container.appendChild(this.bar);
    this.injectStyles();
  }

  public setProgress(value: number): void {
    this.progress = Math.max(0, Math.min(100, value));
    this.bar.style.width = `${this.progress}%`;
    
    if (this.labelElement) {
      const label = this.options.label || `${Math.round(this.progress)}%`;
      this.labelElement.textContent = label;
    }
  }

  public getProgress(): number {
    return this.progress;
  }

  public setVariant(variant: ProgressBarOptions['variant']): void {
    this.bar.className = this.bar.className.replace(/arxis-progress__bar--\w+/, '');
    this.options.variant = variant || 'default';
    this.bar.classList.add(`arxis-progress__bar--${this.options.variant}`);
  }

  public setLabel(label: string): void {
    this.options.label = label;
    if (this.labelElement) {
      this.labelElement.textContent = label || `${Math.round(this.progress)}%`;
    }
  }

  public getElement(): HTMLElement {
    return this.container;
  }

  public destroy(): void {
    this.container.remove();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-progress-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-progress-styles';
    style.textContent = `
      .arxis-progress {
        width: 100%;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 100px;
        overflow: hidden;
        position: relative;
      }

      .arxis-progress--sm {
        height: 8px;
      }

      .arxis-progress--md {
        height: 16px;
      }

      .arxis-progress--lg {
        height: 24px;
      }

      .arxis-progress__bar {
        height: 100%;
        transition: width 0.3s ease;
        border-radius: 100px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
      }

      .arxis-progress__bar--default {
        background: linear-gradient(90deg, #00d4ff, #7b2ff7);
      }

      .arxis-progress__bar--success {
        background: linear-gradient(90deg, #4caf50, #8bc34a);
      }

      .arxis-progress__bar--warning {
        background: linear-gradient(90deg, #ff9800, #ffeb3b);
      }

      .arxis-progress__bar--danger {
        background: linear-gradient(90deg, #f44336, #ff5722);
      }

      .arxis-progress__bar--gradient {
        background: linear-gradient(90deg, #ff0080, #ff8c00, #40e0d0, #0080ff);
        background-size: 200% 100%;
        animation: gradient-shift 3s ease infinite;
      }

      .arxis-progress__bar--striped {
        background-image: linear-gradient(
          45deg,
          rgba(255, 255, 255, 0.15) 25%,
          transparent 25%,
          transparent 50%,
          rgba(255, 255, 255, 0.15) 50%,
          rgba(255, 255, 255, 0.15) 75%,
          transparent 75%,
          transparent
        );
        background-size: 20px 20px;
      }

      .arxis-progress__bar--animated {
        animation: progress-stripes 1s linear infinite;
      }

      .arxis-progress__label {
        font-size: 11px;
        font-weight: 600;
        color: #fff;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        position: relative;
        z-index: 1;
      }

      @keyframes progress-stripes {
        0% {
          background-position: 20px 0;
        }
        100% {
          background-position: 0 0;
        }
      }

      @keyframes gradient-shift {
        0%, 100% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
