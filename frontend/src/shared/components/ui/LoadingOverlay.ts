import { eventBus, EventType } from '../core';

/**
 * LoadingOverlay - UI elegante para feedback de carregamento IFC
 * Mostra progresso, estatísticas em tempo real e preview
 */
export class LoadingOverlay {
  private container: HTMLElement;
  private progressBar: HTMLElement;
  private progressText: HTMLElement;
  private statsContainer: HTMLElement;
  private previewCanvas: HTMLElement;
  private isVisible: boolean = false;

  // Estatísticas
  private stats = {
    loadedElements: 0,
    totalElements: 0,
    currentPhase: '',
    fps: 0,
    memoryUsed: 0,
    estimatedTime: 0
  };

  constructor() {
    this.container = this.createOverlay();
    this.progressBar = this.container.querySelector('.loading-progress-bar')!;
    this.progressText = this.container.querySelector('.loading-progress-text')!;
    this.statsContainer = this.container.querySelector('.loading-stats')!;
    this.previewCanvas = this.container.querySelector('.loading-preview')!;

    this.setupEventListeners();
    this.hide(); // Iniciar oculto
  }

  /**
   * Cria estrutura HTML do overlay
   */
  private createOverlay(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-content">
        <!-- Logo/Header -->
        <div class="loading-header">
          <div class="loading-icon">
            <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="loadingGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#00ff88"/>
                  <stop offset="100%" style="stop-color:#00d9ff"/>
                </linearGradient>
              </defs>
              <circle class="loading-circle" cx="32" cy="32" r="28" fill="none" stroke="#00ff88" stroke-width="2" opacity="0.2"/>
              <g>
                <path d="M 32 16 L 48 24 L 48 40 L 32 48 L 16 40 L 16 24 Z" fill="url(#loadingGrad1)" opacity="0.9"/>
                <path d="M 32 16 L 48 24 L 32 32 L 16 24 Z" fill="#00ff88" opacity="0.7"/>
                <path d="M 48 24 L 48 40 L 32 48 L 32 32 Z" fill="#00d9ff" opacity="0.5"/>
                <line x1="32" y1="32" x2="32" y2="48" stroke="#00ff88" stroke-width="2.5"/>
              </g>
            </svg>
          </div>
          <h2 class="loading-title">Carregando Modelo IFC</h2>
          <p class="loading-subtitle">Processando com otimizações máximas...</p>
        </div>

        <!-- Barra de Progresso -->
        <div class="loading-progress-container">
          <div class="loading-progress-bar-bg">
            <div class="loading-progress-bar" style="width: 0%"></div>
          </div>
          <div class="loading-progress-text">0%</div>
        </div>

        <!-- Fase Atual -->
        <div class="loading-phase">
          <span class="loading-phase-text">Inicializando...</span>
        </div>

        <!-- Estatísticas em Tempo Real -->
        <div class="loading-stats">
          <div class="stat-item">
            <span class="stat-label">Elementos</span>
            <span class="stat-value" data-stat="elements">0 / 0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">FPS</span>
            <span class="stat-value" data-stat="fps">60</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Memória</span>
            <span class="stat-value" data-stat="memory">0 MB</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Tempo Restante</span>
            <span class="stat-value" data-stat="time">Calculando...</span>
          </div>
        </div>

        <!-- Preview (opcional) -->
        <div class="loading-preview">
          <canvas id="loading-preview-canvas"></canvas>
        </div>

        <!-- Dicas de Otimização -->
        <div class="loading-tips">
          <div class="tip-item">✅ Instancing de geometrias repetidas</div>
          <div class="tip-item">✅ LOD automático por distância</div>
          <div class="tip-item">✅ Streaming progressivo em chunks</div>
          <div class="tip-item">✅ Culling inteligente</div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    return overlay;
  }

  /**
   * Setup de event listeners
   */
  private setupEventListeners(): void {
    // Loading requested
    eventBus.on(EventType.MODEL_LOAD_REQUESTED, (data: any) => {
      this.show();
      this.updatePhase('Fase 1: Carregando preview...');
    });

    // Loading progress
    eventBus.on(EventType.MODEL_LOAD_PROGRESS, (data: any) => {
      this.updateProgress(data.progress);
      
      if (data.loadedElements !== undefined) {
        this.stats.loadedElements = data.loadedElements;
        this.stats.totalElements = data.totalElements;
        this.updateStats();
      }

      // Atualizar fase baseado no progresso
      if (data.progress < 30) {
        this.updatePhase('Fase 1: Preview rápido...');
      } else if (data.progress < 90) {
        this.updatePhase('Fase 2: Carregamento progressivo...');
      } else {
        this.updatePhase('Fase 3: Finalizando otimizações...');
      }
    });

    // Loading complete
    eventBus.on(EventType.MODEL_LOADED, () => {
      this.updatePhase('✅ Carregamento Completo!');
      setTimeout(() => this.hide(), 1500);
    });

    // Error
    eventBus.on(EventType.MODEL_LOAD_FAILED, (data: any) => {
      if (data.type === 'load_error') {
        this.showError(data.message);
      }
    });
  }

  /**
   * Mostra overlay
   */
  public show(): void {
    this.isVisible = true;
    this.container.classList.add('visible');
    this.startAnimation();
  }

  /**
   * Esconde overlay
   */
  public hide(): void {
    this.isVisible = false;
    this.container.classList.remove('visible');
    this.stopAnimation();
    this.reset();
  }

  /**
   * Atualiza progresso
   */
  private updateProgress(progress: number): void {
    progress = Math.min(100, Math.max(0, progress));
    
    this.progressBar.style.width = `${progress}%`;
    this.progressText.textContent = `${Math.round(progress)}%`;

    // Animar cor baseado no progresso
    const hue = (progress / 100) * 120; // 0 (red) to 120 (green)
    this.progressBar.style.backgroundColor = `hsl(${hue}, 80%, 50%)`;
  }

  /**
   * Atualiza fase atual
   */
  private updatePhase(phase: string): void {
    const phaseElement = this.container.querySelector('.loading-phase-text');
    if (phaseElement) {
      phaseElement.textContent = phase;
      this.stats.currentPhase = phase;
    }
  }

  /**
   * Atualiza estatísticas
   */
  private updateStats(): void {
    // Elementos
    const elementsEl = this.statsContainer.querySelector('[data-stat="elements"]');
    if (elementsEl) {
      elementsEl.textContent = `${this.stats.loadedElements} / ${this.stats.totalElements}`;
    }

    // FPS (atualizar via RAF)
    const fpsEl = this.statsContainer.querySelector('[data-stat="fps"]');
    if (fpsEl) {
      fpsEl.textContent = `${Math.round(this.stats.fps)}`;
    }

    // Memória
    const memoryEl = this.statsContainer.querySelector('[data-stat="memory"]');
    if (memoryEl && (performance as any).memory) {
      const memoryMB = (performance as any).memory.usedJSHeapSize / 1048576;
      memoryEl.textContent = `${Math.round(memoryMB)} MB`;
    }

    // Tempo restante
    const timeEl = this.statsContainer.querySelector('[data-stat="time"]');
    if (timeEl && this.stats.estimatedTime > 0) {
      timeEl.textContent = `${Math.round(this.stats.estimatedTime)}s`;
    }
  }

  /**
   * Mostra erro
   */
  private showError(message: string): void {
    const phaseElement = this.container.querySelector('.loading-phase-text');
    if (phaseElement) {
      phaseElement.textContent = `❌ ${message}`;
      phaseElement.classList.add('error');
    }

    setTimeout(() => this.hide(), 3000);
  }

  /**
   * Inicia animação
   */
  private startAnimation(): void {
    let lastTime = performance.now();
    let frames = 0;

    const animate = () => {
      if (!this.isVisible) return;

      const currentTime = performance.now();
      frames++;

      // Atualizar FPS a cada segundo
      if (currentTime - lastTime >= 1000) {
        this.stats.fps = frames;
        frames = 0;
        lastTime = currentTime;
        this.updateStats();
      }

      // Rotacionar ícone
      const icon = this.container.querySelector('.loading-icon svg') as SVGElement;
      if (icon) {
        const rotation = (currentTime / 10) % 360;
        icon.style.transform = `rotate(${rotation}deg)`;
      }

      requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * Para animação
   */
  private stopAnimation(): void {
    this.isVisible = false;
  }

  /**
   * Reset estado
   */
  private reset(): void {
    this.updateProgress(0);
    this.updatePhase('Inicializando...');
    this.stats = {
      loadedElements: 0,
      totalElements: 0,
      currentPhase: '',
      fps: 0,
      memoryUsed: 0,
      estimatedTime: 0
    };
  }

  /**
   * Remove overlay do DOM
   */
  public dispose(): void {
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }
}

// CSS inline (pode ser movido para arquivo separado)
const style = document.createElement('style');
style.textContent = `
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
  backdrop-filter: blur(10px);
}

.loading-overlay.visible {
  opacity: 1;
  pointer-events: all;
}

.loading-content {
  max-width: 600px;
  width: 90%;
  text-align: center;
  color: #fff;
}

.loading-header {
  margin-bottom: 2rem;
}

.loading-icon {
  margin-bottom: 1rem;
}

.loading-icon svg {
  filter: drop-shadow(0 0 20px rgba(0, 255, 136, 0.5));
}

.loading-circle {
  animation: pulse 2s ease-in-out infinite;
}

.loading-path {
  animation: rotate-path 1.5s linear infinite;
  transform-origin: 32px 32px;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes rotate-path {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-title {
  font-size: 2rem;
  margin: 0 0 0.5rem 0;
  font-weight: 700;
  background: linear-gradient(90deg, #00ff88, #00ccff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.loading-subtitle {
  font-size: 1rem;
  color: #888;
  margin: 0;
}

.loading-progress-container {
  margin: 2rem 0;
  position: relative;
}

.loading-progress-bar-bg {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.loading-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #00ff88, #00ccff);
  border-radius: 4px;
  transition: width 0.3s ease;
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
}

.loading-progress-text {
  position: absolute;
  top: -30px;
  right: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #00ff88;
}

.loading-phase {
  margin: 1rem 0;
  font-size: 1.2rem;
  color: #aaa;
}

.loading-phase-text.error {
  color: #ff4444;
}

.loading-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin: 2rem 0;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.stat-label {
  font-size: 0.85rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.stat-value {
  font-size: 1.3rem;
  font-weight: 700;
  color: #00ff88;
}

.loading-preview {
  margin: 2rem 0;
  height: 200px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  display: none; /* Oculto por padrão */
}

.loading-tips {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.tip-item {
  font-size: 0.9rem;
  color: #666;
  text-align: left;
  padding-left: 0.5rem;
}

@media (max-width: 600px) {
  .loading-stats,
  .loading-tips {
    grid-template-columns: 1fr;
  }
}
`;
document.head.appendChild(style);
