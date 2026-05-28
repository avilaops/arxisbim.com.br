/**
 * VR Teleport UI
 * Interface de teleporte para VR
 */

export interface TeleportTarget {
  position: { x: number; y: number; z: number };
  rotation?: number;
  valid: boolean;
}

export class VRTeleportUI {
  private container: HTMLDivElement;
  private reticle: HTMLDivElement;
  private arc: SVGElement;
  private isActive: boolean = false;
  private currentTarget?: TeleportTarget;
  private onTeleport?: (target: TeleportTarget) => void;

  constructor(options?: {
    onTeleport?: (target: TeleportTarget) => void;
  }) {
    this.onTeleport = options?.onTeleport;
    
    this.container = document.createElement('div');
    this.container.className = 'arxis-teleport';
    this.container.style.display = 'none';

    this.reticle = document.createElement('div');
    this.reticle.className = 'arxis-teleport__reticle';

    this.arc = this.createArc();

    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';
    this.container.appendChild(this.arc);
    this.container.appendChild(this.reticle);

    if (!document.body.contains(this.container)) {
      document.body.appendChild(this.container);
    }

    this.injectStyles();
  }

  private createArc(): SVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'arxis-teleport__arc');
    svg.setAttribute('width', '100');
    svg.setAttribute('height', '200');
    svg.style.position = 'absolute';
    svg.style.pointerEvents = 'none';

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M 50 0 Q 50 100 50 200');
    path.setAttribute('stroke', '#00d4ff');
    path.setAttribute('stroke-width', '3');
    path.setAttribute('fill', 'none');
    path.setAttribute('opacity', '0.8');

    svg.appendChild(path);
    return svg;
  }

  public show(position?: { x: number; y: number }): void {
    this.isActive = true;
    this.container.style.display = 'block';
    
    if (position) {
      this.updatePosition(position);
    }
  }

  public hide(): void {
    this.isActive = false;
    this.container.style.display = 'none';
  }

  public updateTarget(target: TeleportTarget): void {
    this.currentTarget = target;
    
    // Update reticle appearance based on validity
    if (target.valid) {
      this.reticle.className = 'arxis-teleport__reticle arxis-teleport__reticle--valid';
    } else {
      this.reticle.className = 'arxis-teleport__reticle arxis-teleport__reticle--invalid';
    }
  }

  public updatePosition(position: { x: number; y: number }): void {
    this.reticle.style.left = `${position.x}px`;
    this.reticle.style.top = `${position.y}px`;
  }

  public executeTeleport(): void {
    if (this.currentTarget && this.currentTarget.valid) {
      this.onTeleport?.(this.currentTarget);
      this.playTeleportAnimation();
    }
  }

  private playTeleportAnimation(): void {
    // Flash effect
    const flash = document.createElement('div');
    flash.className = 'arxis-teleport__flash';
    document.body.appendChild(flash);

    setTimeout(() => {
      flash.remove();
    }, 300);
  }

  public isShowing(): boolean {
    return this.isActive;
  }

  public getElement(): HTMLElement {
    return this.container;
  }

  public destroy(): void {
    this.container.remove();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-teleport-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-teleport-styles';
    style.textContent = `
      .arxis-teleport {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 9999;
      }

      .arxis-teleport__arc {
        filter: drop-shadow(0 0 10px rgba(0, 212, 255, 0.8));
        animation: arc-pulse 1.5s ease-in-out infinite;
      }

      @keyframes arc-pulse {
        0%, 100% {
          opacity: 0.6;
        }
        50% {
          opacity: 1;
        }
      }

      .arxis-teleport__reticle {
        position: fixed;
        width: 80px;
        height: 80px;
        border-radius: 50%;
        border: 4px solid #00d4ff;
        transform: translate(-50%, -50%);
        pointer-events: none;
        animation: reticle-pulse 1s ease-in-out infinite;
        transition: all 0.2s;
      }

      .arxis-teleport__reticle::before {
        content: '';
        position: absolute;
        inset: -12px;
        border-radius: 50%;
        border: 2px solid #00d4ff;
        opacity: 0.4;
      }

      .arxis-teleport__reticle::after {
        content: '';
        position: absolute;
        inset: 50%;
        width: 8px;
        height: 8px;
        background: #00d4ff;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 20px rgba(0, 212, 255, 1);
      }

      .arxis-teleport__reticle--valid {
        border-color: #4caf50;
        box-shadow: 0 0 30px rgba(76, 175, 80, 0.8);
      }

      .arxis-teleport__reticle--valid::before {
        border-color: #4caf50;
      }

      .arxis-teleport__reticle--valid::after {
        background: #4caf50;
        box-shadow: 0 0 20px rgba(76, 175, 80, 1);
      }

      .arxis-teleport__reticle--invalid {
        border-color: #ff4444;
        box-shadow: 0 0 30px rgba(255, 68, 68, 0.8);
      }

      .arxis-teleport__reticle--invalid::before {
        border-color: #ff4444;
      }

      .arxis-teleport__reticle--invalid::after {
        background: #ff4444;
        box-shadow: 0 0 20px rgba(255, 68, 68, 1);
      }

      @keyframes reticle-pulse {
        0%, 100% {
          transform: translate(-50%, -50%) scale(1);
        }
        50% {
          transform: translate(-50%, -50%) scale(1.1);
        }
      }

      .arxis-teleport__flash {
        position: fixed;
        inset: 0;
        background: radial-gradient(circle, rgba(0, 212, 255, 0.5) 0%, transparent 70%);
        animation: flash-fade 0.3s ease-out;
        pointer-events: none;
        z-index: 99999;
      }

      @keyframes flash-fade {
        0% {
          opacity: 1;
        }
        100% {
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
