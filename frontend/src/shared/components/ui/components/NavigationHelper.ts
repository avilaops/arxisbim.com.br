/**
 * NavigationHelper - View Cube + Mini-map + Navigation controls guide
 * Helps users understand camera position and navigation controls
 */

import { Camera, Scene, Vector3 } from 'three';
import { eventBus, EventType } from '../../core';

type ViewPreset = 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right' | 'iso';

export class NavigationHelper {
  private container: HTMLElement;
  private viewCube: HTMLElement;
  private miniMap: HTMLElement;
  private controlsGuide: HTMLElement;
  private camera: Camera | null = null;
  private isVisible: boolean = true;

  constructor(camera?: Camera) {
    this.camera = camera || null;
    this.container = this.createContainer();
    this.viewCube = this.container.querySelector('.nav-helper__view-cube') as HTMLElement;
    this.miniMap = this.container.querySelector('.nav-helper__mini-map') as HTMLElement;
    this.controlsGuide = this.container.querySelector('.nav-helper__controls') as HTMLElement;
    
    this.applyStyles();
    this.setupEventListeners();
    this.updateCameraIndicator();
    
    console.log('NavigationHelper initialized');
  }

  private createContainer(): HTMLElement {
    const helper = document.createElement('div');
    helper.className = 'navigation-helper';
    helper.innerHTML = `
      <!-- View Cube -->
      <div class="nav-helper__view-cube">
        <div class="view-cube__title">Vistas</div>
        <div class="view-cube__grid">
          <button class="view-cube__btn" data-view="top" title="Vista superior (Num 7)">
            <span class="view-cube__icon">SUP</span>
            <span class="view-cube__label">Superior</span>
          </button>
          <button class="view-cube__btn" data-view="front" title="Vista frontal (Num 1)">
            <span class="view-cube__icon">FRT</span>
            <span class="view-cube__label">Frontal</span>
          </button>
          <button class="view-cube__btn" data-view="right" title="Vista direita (Num 3)">
            <span class="view-cube__icon">DIR</span>
            <span class="view-cube__label">Direita</span>
          </button>
          <button class="view-cube__btn" data-view="left" title="Vista esquerda (Num 9)">
            <span class="view-cube__icon">ESQ</span>
            <span class="view-cube__label">Esquerda</span>
          </button>
          <button class="view-cube__btn" data-view="back" title="Vista posterior">
            <span class="view-cube__icon">POS</span>
            <span class="view-cube__label">Posterior</span>
          </button>
          <button class="view-cube__btn" data-view="bottom" title="Vista inferior">
            <span class="view-cube__icon">INF</span>
            <span class="view-cube__label">Inferior</span>
          </button>
          <button class="view-cube__btn view-cube__btn--highlight" data-view="iso" title="Isométrica (Num 0)">
            <span class="view-cube__icon">ISO</span>
            <span class="view-cube__label">Iso</span>
          </button>
        </div>
      </div>

      <!-- Mini-map -->
      <div class="nav-helper__mini-map">
        <div class="mini-map__title">Posição</div>
        <div class="mini-map__canvas">
          <div class="mini-map__north">▲ N</div>
          <div class="mini-map__model"></div>
          <div class="mini-map__camera"></div>
        </div>
        <div class="mini-map__coords">
          <span class="mini-map__coord">X: <span id="cam-x">0</span></span>
          <span class="mini-map__coord">Y: <span id="cam-y">0</span></span>
          <span class="mini-map__coord">Z: <span id="cam-z">0</span></span>
        </div>
      </div>

      <!-- Controls Guide -->
      <div class="nav-helper__controls">
        <div class="controls__title">
          <span>Navegação</span>
          <button class="controls__toggle" title="Alternar ajuda (H)">?</button>
        </div>
        <div class="controls__content">
          <div class="controls__item">
            <span class="controls__icon">M1</span>
            <span class="controls__text">Arrastar esquerdo = orbitar</span>
          </div>
          <div class="controls__item">
            <span class="controls__icon">M2</span>
            <span class="controls__text">Arrastar direito = panorâmica</span>
          </div>
          <div class="controls__item">
            <span class="controls__icon">ROL</span>
            <span class="controls__text">Scroll = zoom</span>
          </div>
          <div class="controls__item">
            <span class="controls__icon">F</span>
            <span class="controls__text">F = focar seleção</span>
          </div>
          <div class="controls__item">
            <span class="controls__icon">HOME</span>
            <span class="controls__text">Home = restaurar vista</span>
          </div>
        </div>
      </div>

      <!-- Toggle button -->
      <button class="nav-helper__toggle" title="Alternar assistente de navegação (H)">
        <span class="toggle__icon">NAV</span>
      </button>
    `;
    document.body.appendChild(helper);
    return helper;
  }

  private setupEventListeners(): void {
    // View Cube buttons
    const viewButtons = this.viewCube.querySelectorAll('.view-cube__btn');
    viewButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view') as ViewPreset;
        this.setView(view);
      });
    });

    // Controls guide toggle
    const controlsToggle = this.controlsGuide.querySelector('.controls__toggle') as HTMLElement;
    const controlsContent = this.controlsGuide.querySelector('.controls__content') as HTMLElement;
    controlsToggle?.addEventListener('click', () => {
      controlsContent.classList.toggle('controls__content--collapsed');
    });

    // Main toggle button
    const toggleBtn = this.container.querySelector('.nav-helper__toggle') as HTMLElement;
    toggleBtn?.addEventListener('click', () => {
      this.toggle();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't intercept when typing in inputs
      }

      switch(e.key) {
        case 'h':
        case 'H':
          if (!e.ctrlKey && !e.altKey) {
            e.preventDefault();
            this.toggle();
          }
          break;
        case 'Home':
          e.preventDefault();
          this.setView('iso');
          eventBus.emit('CAMERA_FRAME_ALL' as any, {});
          break;
      }

      // Numpad shortcuts
      if (!e.ctrlKey && !e.altKey) {
        switch(e.code) {
          case 'Numpad7':
            e.preventDefault();
            this.setView('top');
            break;
          case 'Numpad1':
            e.preventDefault();
            this.setView('front');
            break;
          case 'Numpad3':
            e.preventDefault();
            this.setView('right');
            break;
          case 'Numpad9':
            e.preventDefault();
            this.setView('left');
            break;
          case 'Numpad0':
            e.preventDefault();
            this.setView('iso');
            break;
        }
      }
    });

    // Listen to camera updates
    eventBus.on('CAMERA_UPDATED' as any, ({ position }) => {
      this.updateCameraIndicator(position);
    });

    // Update camera position periodically
    setInterval(() => {
      if (this.camera) {
        this.updateCameraIndicator(this.camera.position);
      }
    }, 500);
  }

  private setView(view: ViewPreset): void {
    console.log(`Setting view: ${view}`);
    
    eventBus.emit('SET_CAMERA_VIEW' as any, { view });
    
    // Visual feedback
    const buttons = this.viewCube.querySelectorAll('.view-cube__btn');
    buttons.forEach(btn => btn.classList.remove('view-cube__btn--active'));
    
    const activeBtn = this.viewCube.querySelector(`[data-view="${view}"]`);
    activeBtn?.classList.add('view-cube__btn--active');
  }

  private updateCameraIndicator(position?: Vector3): void {
    if (!position && !this.camera) return;
    
    const pos = position || this.camera!.position;
    
    // Update coordinates display
    const xSpan = document.getElementById('cam-x');
    const ySpan = document.getElementById('cam-y');
    const zSpan = document.getElementById('cam-z');
    
    if (xSpan) xSpan.textContent = pos.x.toFixed(1);
    if (ySpan) ySpan.textContent = pos.y.toFixed(1);
    if (zSpan) zSpan.textContent = pos.z.toFixed(1);
    
    // Update mini-map camera position (simplified 2D projection)
    const cameraIndicator = this.miniMap.querySelector('.mini-map__camera') as HTMLElement;
    if (cameraIndicator) {
      // Normalize to mini-map coordinates (0-100%)
      const normalizedX = ((pos.x + 100) / 200) * 100; // Assuming world bounds -100 to +100
      const normalizedZ = ((pos.z + 100) / 200) * 100;
      
      cameraIndicator.style.left = `${Math.max(10, Math.min(90, normalizedX))}%`;
      cameraIndicator.style.top = `${Math.max(10, Math.min(90, normalizedZ))}%`;
    }
  }

  public setCamera(camera: Camera): void {
    this.camera = camera;
    this.updateCameraIndicator();
  }

  public show(): void {
    this.container.classList.add('navigation-helper--visible');
    this.isVisible = true;
  }

  public hide(): void {
    this.container.classList.remove('navigation-helper--visible');
    this.isVisible = false;
  }

  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  private applyStyles(): void {
    if (document.getElementById('navigation-helper-styles')) return;

    const style = document.createElement('style');
    style.id = 'navigation-helper-styles';
    style.textContent = `
      .navigation-helper {
        position: fixed;
        top: 80px;
        right: 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        z-index: 9997;
        opacity: 0;
        transform: translateX(20px);
        transition: all 0.3s ease;
        pointer-events: none;
      }

      .navigation-helper--visible {
        opacity: 1;
        transform: translateX(0);
        pointer-events: all;
      }

      /* View Cube */
      .nav-helper__view-cube {
        background: rgba(20, 20, 20, 0.95);
        -webkit-backdrop-filter: blur(10px);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      }

      .view-cube__title {
        font-size: 11px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .view-cube__grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
      }

      .view-cube__btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 8px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid transparent;
        border-radius: 6px;
        color: var(--text-primary, #fff);
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 60px;
      }

      .view-cube__btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
        transform: translateY(-2px);
      }

      .view-cube__btn--active {
        background: var(--accent-color, #00ff88);
        color: #000;
        border-color: var(--accent-color, #00ff88);
      }

      .view-cube__btn--highlight {
        grid-column: span 2;
        background: rgba(102, 126, 234, 0.2);
        border-color: rgba(102, 126, 234, 0.3);
      }

      .view-cube__icon {
        font-size: 18px;
        line-height: 1;
      }

      .view-cube__label {
        font-size: 10px;
        font-weight: 500;
      }

      /* Mini-map */
      .nav-helper__mini-map {
        background: rgba(20, 20, 20, 0.95);
        -webkit-backdrop-filter: blur(10px);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      }

      .mini-map__title {
        font-size: 11px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .mini-map__canvas {
        position: relative;
        width: 120px;
        height: 120px;
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        margin-bottom: 8px;
      }

      .mini-map__north {
        position: absolute;
        top: 4px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
        font-weight: 600;
      }

      .mini-map__model {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 40px;
        height: 40px;
        background: rgba(102, 126, 234, 0.3);
        border: 2px solid rgba(102, 126, 234, 0.6);
        border-radius: 4px;
      }

      .mini-map__camera {
        position: absolute;
        width: 12px;
        height: 12px;
        background: var(--accent-color, #00ff88);
        border: 2px solid #000;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        box-shadow: 0 0 8px var(--accent-color, #00ff88);
        transition: all 0.3s ease;
      }

      .mini-map__coords {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        font-size: 11px;
        font-family: monospace;
      }

      .mini-map__coord {
        color: rgba(255, 255, 255, 0.7);
      }

      .mini-map__coord span {
        color: var(--accent-color, #00ff88);
        font-weight: 600;
      }

      /* Controls Guide */
      .nav-helper__controls {
        background: rgba(20, 20, 20, 0.95);
        -webkit-backdrop-filter: blur(10px);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      }

      .controls__title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .controls__toggle {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        width: 20px;
        height: 20px;
        color: var(--text-primary, #fff);
        cursor: pointer;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .controls__toggle:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .controls__content {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 200px;
        overflow: hidden;
        transition: max-height 0.3s ease;
      }

      .controls__content--collapsed {
        max-height: 0;
      }

      .controls__item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.8);
      }

      .controls__icon {
        font-size: 16px;
        width: 20px;
        text-align: center;
      }

      .controls__text {
        flex: 1;
      }

      /* Toggle Button */
      .nav-helper__toggle {
        position: fixed;
        top: 80px;
        right: 20px;
        width: 48px;
        height: 48px;
        background: rgba(20, 20, 20, 0.95);
        -webkit-backdrop-filter: blur(10px);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        color: var(--text-primary, #fff);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        transition: all 0.2s ease;
        z-index: 9996;
      }

      .nav-helper__toggle:hover {
        background: rgba(40, 40, 40, 0.95);
        transform: scale(1.1);
      }

      .toggle__icon {
        font-size: 24px;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .navigation-helper {
          right: 10px;
          top: 60px;
        }

        .nav-helper__toggle {
          right: 10px;
          top: 60px;
        }

        .view-cube__grid {
          grid-template-columns: repeat(3, 1fr);
        }

        .view-cube__btn {
          min-width: 50px;
          padding: 6px;
        }

        .mini-map__canvas {
          width: 100px;
          height: 100px;
        }

        .controls__content {
          font-size: 11px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  public destroy(): void {
    this.container.remove();
  }
}
