/**
 * Minimap Component - Minimapa 2D do projeto
 * Mostra vista superior com posição da câmera
 */

import { Button } from '../design-system/components/Button';

export class Minimap {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isVisible: boolean = true;

  constructor() {
    this.container = this.createContainer();
    this.canvas = this.createCanvas();
    this.ctx = this.canvas.getContext('2d')!;
    this.applyStyles();
    this.render();
  }

  /**
   * Cria o container
   */
  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'arxis-minimap';

    // Header
    const header = document.createElement('div');
    header.className = 'arxis-minimap-header';
    
    const title = document.createElement('span');
    title.textContent = '🗺️ Mapa';
    header.appendChild(title);

    const toggleBtn = new Button({
      icon: '−',
      variant: 'ghost',
      size: 'xs',
      onClick: () => this.toggle()
    });
    header.appendChild(toggleBtn.getElement());

    container.appendChild(header);

    document.body.appendChild(container);
    return container;
  }

  /**
   * Cria o canvas
   */
  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    canvas.className = 'arxis-minimap-canvas';
    this.container.appendChild(canvas);
    return canvas;
  }

  /**
   * Renderiza o minimapa
   */
  private render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = 'rgba(10, 10, 10, 0.8)';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 10; i++) {
      const x = (w / 10) * i;
      const y = (h / 10) * i;
      
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Mock building outline
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, 120, 120);
    
    ctx.strokeStyle = '#00ff88';
    ctx.strokeRect(60, 60, 80, 80);

    // Camera position (centro por enquanto)
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 5, 0, Math.PI * 2);
    ctx.fill();

    // Camera direction
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2, h / 2);
    ctx.lineTo(w / 2, h / 2 - 20);
    ctx.stroke();

    // Compass
    this.drawCompass(ctx, w - 30, 30, 20);
  }

  /**
   * Desenha bússola
   */
  private drawCompass(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
    // Circle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // N
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', x, y - radius - 8);

    // Arrow
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.moveTo(x, y - radius + 5);
    ctx.lineTo(x - 4, y - 5);
    ctx.lineTo(x + 4, y - 5);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Atualiza posição da câmera
   */
  public updateCamera(x: number, y: number, z: number, rotation: number): void {
    // TODO: Implementar atualização real da posição
    this.render();
  }

  /**
   * Toggle visibilidade
   */
  public toggle(): void {
    this.isVisible = !this.isVisible;
    this.container.style.display = this.isVisible ? 'block' : 'none';
  }

  /**
   * Aplica estilos CSS
   */
  private applyStyles(): void {
    if (document.getElementById('arxis-minimap-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-minimap-styles';
    style.textContent = `
      .arxis-minimap {
        position: fixed;
        bottom: 140px;
        right: 20px;
        background: rgba(20, 20, 20, 0.95);
        backdrop-filter: blur(20px);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        z-index: 900;
        animation: minimap-slide-in 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      @keyframes minimap-slide-in {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .arxis-minimap-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 12px;
        font-weight: 600;
        color: var(--theme-foreground, #fff);
      }

      .arxis-minimap-canvas {
        display: block;
        border-radius: 0 0 12px 12px;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Destrói o minimap
   */
  public destroy(): void {
    this.container.remove();
  }
}
