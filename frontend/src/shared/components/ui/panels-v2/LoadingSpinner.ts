/**
 * Loading Spinner Component
 * Diversos tipos de spinners de carregamento
 */

export interface LoadingSpinnerOptions {
  type?: 'circular' | 'dots' | 'bars' | 'pulse' | 'orbit' | 'cube';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  text?: string;
}

export class LoadingSpinner {
  private container: HTMLDivElement;
  private spinner: HTMLDivElement;
  private textElement?: HTMLDivElement;
  private options: Required<LoadingSpinnerOptions>;

  constructor(options: LoadingSpinnerOptions = {}) {
    this.options = {
      type: options.type ?? 'circular',
      size: options.size ?? 'md',
      color: options.color ?? '#00d4ff',
      text: options.text ?? ''
    };

    this.container = document.createElement('div');
    this.spinner = document.createElement('div');
    
    this.render();
  }

  private render(): void {
    this.container.className = `arxis-spinner-container arxis-spinner-container--${this.options.size}`;

    this.spinner.className = `arxis-spinner arxis-spinner--${this.options.type} arxis-spinner--${this.options.size}`;
    
    // Apply custom color
    this.spinner.style.setProperty('--spinner-color', this.options.color);

    // Create spinner elements based on type
    switch (this.options.type) {
      case 'circular':
        this.createCircularSpinner();
        break;
      case 'dots':
        this.createDotsSpinner();
        break;
      case 'bars':
        this.createBarsSpinner();
        break;
      case 'pulse':
        this.createPulseSpinner();
        break;
      case 'orbit':
        this.createOrbitSpinner();
        break;
      case 'cube':
        this.createCubeSpinner();
        break;
    }

    this.container.appendChild(this.spinner);

    if (this.options.text) {
      this.textElement = document.createElement('div');
      this.textElement.className = 'arxis-spinner__text';
      this.textElement.textContent = this.options.text;
      this.container.appendChild(this.textElement);
    }

    this.injectStyles();
  }

  private createCircularSpinner(): void {
    const circle = document.createElement('div');
    circle.className = 'arxis-spinner__circle';
    this.spinner.appendChild(circle);
  }

  private createDotsSpinner(): void {
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.className = 'arxis-spinner__dot';
      dot.style.animationDelay = `${i * 0.15}s`;
      this.spinner.appendChild(dot);
    }
  }

  private createBarsSpinner(): void {
    for (let i = 0; i < 5; i++) {
      const bar = document.createElement('div');
      bar.className = 'arxis-spinner__bar';
      bar.style.animationDelay = `${i * 0.1}s`;
      this.spinner.appendChild(bar);
    }
  }

  private createPulseSpinner(): void {
    for (let i = 0; i < 3; i++) {
      const ring = document.createElement('div');
      ring.className = 'arxis-spinner__ring';
      ring.style.animationDelay = `${i * 0.3}s`;
      this.spinner.appendChild(ring);
    }
  }

  private createOrbitSpinner(): void {
    const center = document.createElement('div');
    center.className = 'arxis-spinner__center';
    this.spinner.appendChild(center);

    for (let i = 0; i < 3; i++) {
      const orbit = document.createElement('div');
      orbit.className = 'arxis-spinner__orbit';
      orbit.style.animationDelay = `${i * 0.4}s`;
      this.spinner.appendChild(orbit);
    }
  }

  private createCubeSpinner(): void {
    const cube = document.createElement('div');
    cube.className = 'arxis-spinner__cube';
    
    for (let i = 0; i < 6; i++) {
      const face = document.createElement('div');
      face.className = `arxis-spinner__face arxis-spinner__face--${i}`;
      cube.appendChild(face);
    }
    
    this.spinner.appendChild(cube);
  }

  public setText(text: string): void {
    this.options.text = text;
    if (this.textElement) {
      this.textElement.textContent = text;
    } else if (text) {
      this.textElement = document.createElement('div');
      this.textElement.className = 'arxis-spinner__text';
      this.textElement.textContent = text;
      this.container.appendChild(this.textElement);
    }
  }

  public show(): void {
    this.container.style.display = 'flex';
  }

  public hide(): void {
    this.container.style.display = 'none';
  }

  public getElement(): HTMLElement {
    return this.container;
  }

  public destroy(): void {
    this.container.remove();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-spinner-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-spinner-styles';
    style.textContent = `
      .arxis-spinner-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
      }

      .arxis-spinner {
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }

      .arxis-spinner--sm { width: 24px; height: 24px; }
      .arxis-spinner--md { width: 48px; height: 48px; }
      .arxis-spinner--lg { width: 72px; height: 72px; }
      .arxis-spinner--xl { width: 96px; height: 96px; }

      /* Circular Spinner */
      .arxis-spinner--circular .arxis-spinner__circle {
        width: 100%;
        height: 100%;
        border: 3px solid rgba(255, 255, 255, 0.1);
        border-top-color: var(--spinner-color, #00d4ff);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }

      /* Dots Spinner */
      .arxis-spinner--dots {
        gap: 8px;
      }

      .arxis-spinner__dot {
        width: 25%;
        height: 25%;
        background: var(--spinner-color, #00d4ff);
        border-radius: 50%;
        animation: dot-bounce 1s ease-in-out infinite;
      }

      /* Bars Spinner */
      .arxis-spinner--bars {
        gap: 4px;
      }

      .arxis-spinner__bar {
        width: 12%;
        height: 100%;
        background: var(--spinner-color, #00d4ff);
        border-radius: 2px;
        animation: bar-scale 1s ease-in-out infinite;
      }

      /* Pulse Spinner */
      .arxis-spinner--pulse .arxis-spinner__ring {
        position: absolute;
        width: 100%;
        height: 100%;
        border: 3px solid var(--spinner-color, #00d4ff);
        border-radius: 50%;
        animation: pulse-ring 1.5s ease-out infinite;
      }

      /* Orbit Spinner */
      .arxis-spinner--orbit .arxis-spinner__center {
        width: 30%;
        height: 30%;
        background: var(--spinner-color, #00d4ff);
        border-radius: 50%;
        position: absolute;
      }

      .arxis-spinner--orbit .arxis-spinner__orbit {
        position: absolute;
        width: 20%;
        height: 20%;
        background: var(--spinner-color, #00d4ff);
        border-radius: 50%;
        animation: orbit-rotate 1.5s linear infinite;
      }

      /* Cube Spinner */
      .arxis-spinner--cube {
        perspective: 120px;
      }

      .arxis-spinner__cube {
        width: 100%;
        height: 100%;
        position: relative;
        transform-style: preserve-3d;
        animation: cube-rotate 2s linear infinite;
      }

      .arxis-spinner__face {
        position: absolute;
        width: 100%;
        height: 100%;
        background: var(--spinner-color, #00d4ff);
        opacity: 0.8;
        border: 2px solid rgba(255, 255, 255, 0.3);
      }

      .arxis-spinner__face--0 { transform: rotateY(0deg) translateZ(24px); }
      .arxis-spinner__face--1 { transform: rotateY(90deg) translateZ(24px); }
      .arxis-spinner__face--2 { transform: rotateY(180deg) translateZ(24px); }
      .arxis-spinner__face--3 { transform: rotateY(-90deg) translateZ(24px); }
      .arxis-spinner__face--4 { transform: rotateX(90deg) translateZ(24px); }
      .arxis-spinner__face--5 { transform: rotateX(-90deg) translateZ(24px); }

      .arxis-spinner__text {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.8);
        text-align: center;
      }

      /* Animations */
      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      @keyframes dot-bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }

      @keyframes bar-scale {
        0%, 40%, 100% { transform: scaleY(0.4); }
        20% { transform: scaleY(1); }
      }

      @keyframes pulse-ring {
        0% {
          transform: scale(0.5);
          opacity: 1;
        }
        100% {
          transform: scale(1.5);
          opacity: 0;
        }
      }

      @keyframes orbit-rotate {
        0% {
          transform: rotate(0deg) translateX(150%) rotate(0deg);
        }
        100% {
          transform: rotate(360deg) translateX(150%) rotate(-360deg);
        }
      }

      @keyframes cube-rotate {
        0% { transform: rotateX(0deg) rotateY(0deg); }
        100% { transform: rotateX(360deg) rotateY(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
}
