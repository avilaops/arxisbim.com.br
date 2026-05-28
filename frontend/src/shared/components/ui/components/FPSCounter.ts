/**
 * FPSCounter - Contador de FPS sempre visível
 * Mostra performance em tempo real no canto superior direito
 */

export class FPSCounter {
  private container: HTMLElement;
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;
  private animationId?: number;

  constructor() {
    this.container = this.createContainer();
    this.start();
  }

  private createContainer(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'fps-counter';
    div.innerHTML = `
      <span class="fps-counter__value">60</span>
      <span class="fps-counter__label">FPS</span>
    `;
    document.body.appendChild(div);
    return div;
  }

  private start(): void {
    const update = () => {
      this.frameCount++;
      const currentTime = performance.now();
      const elapsed = currentTime - this.lastTime;

      if (elapsed >= 1000) {
        this.fps = Math.round((this.frameCount * 1000) / elapsed);
        this.updateDisplay();
        this.frameCount = 0;
        this.lastTime = currentTime;
      }

      this.animationId = requestAnimationFrame(update);
    };

    update();
  }

  private updateDisplay(): void {
    const valueEl = this.container.querySelector('.fps-counter__value');
    if (!valueEl) return;

    valueEl.textContent = this.fps.toString();

    // Color coding baseado em performance
    this.container.classList.remove('fps-counter--good', 'fps-counter--medium', 'fps-counter--bad');
    
    if (this.fps >= 50) {
      this.container.classList.add('fps-counter--good');
    } else if (this.fps >= 30) {
      this.container.classList.add('fps-counter--medium');
    } else {
      this.container.classList.add('fps-counter--bad');
    }
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }

  public toggle(): void {
    this.container.style.display = 
      this.container.style.display === 'none' ? 'flex' : 'none';
  }
}
