/**
 * VR Menu Radial
 * Menu radial 360° para VR
 */

export interface RadialMenuItem {
  id: string;
  label: string;
  icon: string;
  angle: number;
  action: () => void;
}

export class VRMenuRadial {
  private container: HTMLDivElement;
  private centerButton: HTMLDivElement;
  private items: RadialMenuItem[] = [];
  private isVisible: boolean = false;
  private selectedIndex: number = -1;
  private radius: number = 120;

  constructor(items: RadialMenuItem[] = []) {
    this.items = items;
    
    this.container = document.createElement('div');
    this.container.className = 'arxis-radial';
    this.container.style.display = 'none';

    this.centerButton = document.createElement('div');
    this.centerButton.className = 'arxis-radial__center';

    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';

    // Center button
    this.centerButton.innerHTML = '☰';
    this.container.appendChild(this.centerButton);

    // Load default items if empty
    if (this.items.length === 0) {
      this.loadDefaultItems();
    }

    // Calculate angles
    const angleStep = (2 * Math.PI) / this.items.length;
    this.items.forEach((item, index) => {
      item.angle = index * angleStep - Math.PI / 2; // Start from top
    });

    // Create menu items
    this.items.forEach((item, index) => {
      const menuItem = this.createMenuItem(item, index);
      this.container.appendChild(menuItem);
    });

    if (!document.body.contains(this.container)) {
      document.body.appendChild(this.container);
    }

    this.injectStyles();
  }

  private loadDefaultItems(): void {
    this.items = [
      { id: 'select', label: 'Selecionar', icon: '👆', angle: 0, action: () => console.log('Selecionar') },
      { id: 'measure', label: 'Medir', icon: '📏', angle: 0, action: () => console.log('Medir') },
      { id: 'annotate', label: 'Anotar', icon: '📝', angle: 0, action: () => console.log('Anotar') },
      { id: 'section', label: 'Corte', icon: '✂️', angle: 0, action: () => console.log('Corte') },
      { id: 'transparency', label: 'Transparência', icon: '👻', angle: 0, action: () => console.log('Transparência') },
      { id: 'teleport', label: 'Teleporte', icon: '📍', angle: 0, action: () => console.log('Teleporte') },
      { id: 'home', label: 'Início', icon: '🏠', angle: 0, action: () => console.log('Início') },
      { id: 'help', label: 'Ajuda', icon: '❓', angle: 0, action: () => console.log('Ajuda') }
    ];
  }

  private createMenuItem(item: RadialMenuItem, index: number): HTMLDivElement {
    const element = document.createElement('div');
    element.className = `arxis-radial__item ${this.selectedIndex === index ? 'arxis-radial__item--selected' : ''}`;

    const x = Math.cos(item.angle) * this.radius;
    const y = Math.sin(item.angle) * this.radius;

    element.style.left = `calc(50% + ${x}px)`;
    element.style.top = `calc(50% + ${y}px)`;

    const icon = document.createElement('div');
    icon.className = 'arxis-radial__icon';
    icon.textContent = item.icon;

    const label = document.createElement('div');
    label.className = 'arxis-radial__label';
    label.textContent = item.label;

    element.appendChild(icon);
    element.appendChild(label);

    element.addEventListener('click', () => {
      this.selectItem(index);
    });

    return element;
  }

  private selectItem(index: number): void {
    this.selectedIndex = index;
    const item = this.items[index];
    if (item) {
      item.action();
      this.hide();
    }
  }

  public show(position?: { x: number; y: number }): void {
    this.isVisible = true;
    this.container.style.display = 'block';
    
    if (position) {
      this.container.style.left = `${position.x}px`;
      this.container.style.top = `${position.y}px`;
    } else {
      this.container.style.left = '50%';
      this.container.style.top = '50%';
    }

    // Animate items
    const items = this.container.querySelectorAll('.arxis-radial__item');
    items.forEach((item, index) => {
      (item as HTMLElement).style.animationDelay = `${index * 0.05}s`;
    });
  }

  public hide(): void {
    this.isVisible = false;
    this.container.style.display = 'none';
    this.selectedIndex = -1;
  }

  public toggle(position?: { x: number; y: number }): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show(position);
    }
  }

  public setItems(items: RadialMenuItem[]): void {
    this.items = items;
    this.render();
  }

  public getElement(): HTMLElement {
    return this.container;
  }

  public destroy(): void {
    this.container.remove();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-radial-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-radial-styles';
    style.textContent = `
      .arxis-radial {
        position: fixed;
        transform: translate(-50%, -50%);
        width: 300px;
        height: 300px;
        z-index: 99999;
      }

      .arxis-radial__center {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 60px;
        height: 60px;
        background: rgba(0, 212, 255, 0.2);
        border: 3px solid #00d4ff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        color: #fff;
        box-shadow: 0 0 30px rgba(0, 212, 255, 0.6);
        animation: center-pulse 2s ease-in-out infinite;
      }

      @keyframes center-pulse {
        0%, 100% {
          transform: translate(-50%, -50%) scale(1);
          box-shadow: 0 0 30px rgba(0, 212, 255, 0.6);
        }
        50% {
          transform: translate(-50%, -50%) scale(1.1);
          box-shadow: 0 0 40px rgba(0, 212, 255, 0.8);
        }
      }

      .arxis-radial__item {
        position: absolute;
        transform: translate(-50%, -50%);
        width: 70px;
        height: 70px;
        background: rgba(20, 20, 30, 0.95);
        border: 2px solid rgba(0, 212, 255, 0.4);
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s;
        animation: item-appear 0.3s ease-out;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
      }

      @keyframes item-appear {
        from {
          transform: translate(-50%, -50%) scale(0);
          opacity: 0;
        }
        to {
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
      }

      .arxis-radial__item:hover {
        transform: translate(-50%, -50%) scale(1.2);
        background: rgba(0, 212, 255, 0.2);
        border-color: #00d4ff;
        box-shadow: 0 0 25px rgba(0, 212, 255, 0.8);
      }

      .arxis-radial__item--selected {
        background: rgba(0, 212, 255, 0.3);
        border-color: #00d4ff;
        transform: translate(-50%, -50%) scale(1.15);
      }

      .arxis-radial__icon {
        font-size: 28px;
        margin-bottom: 4px;
      }

      .arxis-radial__label {
        font-size: 10px;
        font-weight: 600;
        color: #fff;
        text-align: center;
        white-space: nowrap;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
      }
    `;
    document.head.appendChild(style);
  }
}
