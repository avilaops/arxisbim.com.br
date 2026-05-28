/**
 * WelcomeDialog - Modal de boas-vindas e onboarding
 * Exibido na primeira vez que o usuário acessa o app
 */

import { SampleProjectsManager } from './SampleProjects';

export class WelcomeDialog {
  private container?: HTMLElement;
  private backdrop?: HTMLElement;
  private sampleManager: SampleProjectsManager;

  constructor() {
    this.sampleManager = new SampleProjectsManager();
  }

  /**
   * Verifica se deve mostrar (primeira vez)
   */
  shouldShow(): boolean {
    return !localStorage.getItem('arxisvr_welcome_shown');
  }

  /**
   * Marca como visto
   */
  markAsSeen(): void {
    localStorage.setItem('arxisvr_welcome_shown', 'true');
  }

  /**
   * Mostra o dialog
   */
  show(): void {
    this.createDialog();
    
    // Pequeno delay para animação
    requestAnimationFrame(() => {
      this.backdrop?.classList.add('welcome-dialog-backdrop--open');
    });
  }

  /**
   * Fecha o dialog
   */
  close(): void {
    this.backdrop?.classList.remove('welcome-dialog-backdrop--open');
    
    setTimeout(() => {
      if (this.backdrop?.parentElement) {
        this.backdrop.parentElement.removeChild(this.backdrop);
      }
      this.backdrop = undefined;
      this.container = undefined;
    }, 300);
  }

  /**
   * Cria o dialog
   */
  private createDialog(): void {
    // Backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'welcome-dialog-backdrop';

    // Container
    this.container = document.createElement('div');
    this.container.className = 'welcome-dialog';

    this.container.innerHTML = `
      <div class="welcome-dialog__header">
        <div class="welcome-dialog__logo">
          <span class="welcome-dialog__logo-icon">
            <svg width="48" height="48" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="welcomeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#2563eb"/>
                  <stop offset="100%" style="stop-color:#1d4ed8"/>
                </linearGradient>
                <linearGradient id="welcomeGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#059669"/>
                  <stop offset="100%" style="stop-color:#047857"/>
                </linearGradient>
              </defs>
              <g>
                <path d="M 32 16 L 48 24 L 48 40 L 32 48 L 16 40 L 16 24 Z" fill="url(#welcomeGrad1)" opacity="0.9"/>
                <path d="M 32 16 L 48 24 L 32 32 L 16 24 Z" fill="#60a5fa" opacity="0.7"/>
                <path d="M 48 24 L 48 40 L 32 48 L 32 32 Z" fill="#1d4ed8" opacity="0.5"/>
                <line x1="32" y1="32" x2="32" y2="48" stroke="#2563eb" stroke-width="2"/>
              </g>
              <g transform="translate(48, 12)">
                <circle cx="0" cy="0" r="8" fill="#1e1e1e"/>
                <circle cx="0" cy="0" r="6" fill="none" stroke="url(#welcomeGrad2)" stroke-width="1.5"/>
                <path d="M -3 0 L 0 -3 L 3 0" fill="none" stroke="url(#welcomeGrad2)" stroke-width="1.5"/>
                <circle cx="0" cy="1.5" r="1" fill="url(#welcomeGrad2)"/>
              </g>
            </svg>
          </span>
          <h1>ArxisVR</h1>
        </div>
        <p class="welcome-dialog__tagline">Plataforma BIM corporativa para revisão, coordenação e decisão</p>
      </div>

      <div class="welcome-dialog__content">
        <div class="welcome-dialog__section">
          <h2>Bem-vindo ao ArxisVR</h2>
          <p>Escolha um fluxo para iniciar a revisão do projeto.</p>
        </div>

        <div class="welcome-dialog__actions">
          <button class="welcome-action-card" data-action="load-file">
            <div class="welcome-action-card__icon">IFC</div>
            <div class="welcome-action-card__content">
              <h3>Abrir arquivo IFC</h3>
              <p>Importe um modelo BIM local para revisão técnica</p>
            </div>
          </button>

          <button class="welcome-action-card" data-action="samples">
            <div class="welcome-action-card__icon">BIM</div>
            <div class="welcome-action-card__content">
              <h3>Modelos de referência</h3>
              <p>Abra arquivos BIM disponíveis no ambiente para avaliação</p>
            </div>
          </button>

          <button class="welcome-action-card" data-action="tutorial">
            <div class="welcome-action-card__icon">GUIA</div>
            <div class="welcome-action-card__content">
              <h3>Guia rápido</h3>
              <p>Veja os controles essenciais de navegação e análise</p>
            </div>
          </button>
        </div>

        <div class="welcome-dialog__footer">
          <label class="welcome-dialog__checkbox">
            <input type="checkbox" id="dontShowAgain" />
            <span>Não mostrar novamente</span>
          </label>
          <button class="welcome-dialog__skip" data-action="skip">
            Pular introdução →
          </button>
        </div>
      </div>
    `;

    this.backdrop.appendChild(this.container);
    document.body.appendChild(this.backdrop);

    this.attachEventListeners();
  }

  /**
   * Anexa event listeners
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // Load File
    const loadFileBtn = this.container.querySelector('[data-action="load-file"]');
    loadFileBtn?.addEventListener('click', () => {
      this.handleLoadFile();
    });

    // Samples
    const samplesBtn = this.container.querySelector('[data-action="samples"]');
    samplesBtn?.addEventListener('click', () => {
      this.handleShowSamples();
    });

    // Tutorial
    const tutorialBtn = this.container.querySelector('[data-action="tutorial"]');
    tutorialBtn?.addEventListener('click', () => {
      this.handleShowTutorial();
    });

    // Skip
    const skipBtn = this.container.querySelector('[data-action="skip"]');
    skipBtn?.addEventListener('click', () => {
      this.handleSkip();
    });

    // Backdrop click para fechar
    this.backdrop?.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        this.handleSkip();
      }
    });

    // ESC para fechar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.handleSkip();
      }
    });
  }

  /**
   * Handler: Load File
   */
  private handleLoadFile(): void {
    console.log('Opening file dialog...');
    
    // Trigger file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ifc';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const { eventBus, EventType } = await import('../../core');
        eventBus.emit(EventType.FILE_SELECTED, {
          file,
          kind: 'ifc',
          source: 'user'
        });
      }
    };
    input.click();
    
    this.markAsSeen();
    this.close();
  }

  /**
   * Handler: Show Samples
   */
  private handleShowSamples(): void {
    console.log('Showing reference projects...');
    
    // Substitui o conteúdo do dialog com os samples
    const content = this.container?.querySelector('.welcome-dialog__content');
    if (content) {
      content.innerHTML = '';
      
      const backBtn = document.createElement('button');
      backBtn.className = 'welcome-dialog__back';
      backBtn.innerHTML = '← Voltar';
      backBtn.addEventListener('click', () => {
        this.close();
        this.show();
      });
      content.appendChild(backBtn);

      const samplesUI = this.sampleManager.createUI();
      content.appendChild(samplesUI);
    }
  }

  /**
   * Handler: Show Tutorial
   */
  private handleShowTutorial(): void {
    console.log('Showing quick guide...');
    
    // Substitui com tutorial
    const content = this.container?.querySelector('.welcome-dialog__content');
    if (content) {
      content.innerHTML = `
        <button class="welcome-dialog__back">← Voltar</button>
        
        <div class="welcome-tutorial">
          <h2>Guia rápido</h2>
          
          <div class="tutorial-step">
            <div class="tutorial-step__number">1</div>
            <div class="tutorial-step__content">
              <h3>Navegação 3D</h3>
              <p><strong>Modo FPS (padrão - WASD ativo):</strong></p>
              <ul>
                <li><strong>WASD:</strong> Mover câmera (Shift = rápido, Ctrl = devagar)</li>
                <li><strong>Setas:</strong> Rotacionar câmera</li>
                <li><strong>Tecla C:</strong> Alternar para modo Orbit (mouse)</li>
              </ul>
              <p><strong>Modo Orbit (mouse):</strong></p>
              <ul>
                <li><strong>Botão esquerdo + arrastar:</strong> Orbit</li>
                <li><strong>Botão direito + arrastar:</strong> Pan</li>
                <li><strong>Scroll:</strong> Zoom</li>
                <li><strong>Tecla C:</strong> Voltar para modo FPS</li>
              </ul>
              <p style="background: var(--warning-bg, #fff3cd); padding: 8px; border-radius: 6px; font-size: 13px; margin-top: 8px;">
                <strong>Dica:</strong> Use <kbd>F</kbd> para focar no objeto selecionado, <kbd>H</kbd> para enquadrar tudo
              </p>
            </div>
          </div>

          <div class="tutorial-step">
            <div class="tutorial-step__number">2</div>
            <div class="tutorial-step__content">
              <h3>Seleção e Propriedades</h3>
              <ul>
                <li><strong>Selecionar:</strong> Clique em qualquer elemento</li>
                <li><strong>Propriedades:</strong> Visualize no painel direito</li>
                <li><strong>Isolar:</strong> <kbd>I</kbd> para isolar elemento</li>
              </ul>
            </div>
          </div>

          <div class="tutorial-step">
            <div class="tutorial-step__number">3</div>
            <div class="tutorial-step__content">
              <h3>Ferramentas</h3>
              <ul>
                <li><strong>Medição:</strong> Pressione <kbd>M</kbd></li>
                <li><strong>Seções:</strong> Pressione <kbd>S</kbd></li>
                <li><strong>Camadas:</strong> <kbd>Ctrl+Shift+L</kbd></li>
              </ul>
            </div>
          </div>

          <div class="tutorial-step">
            <div class="tutorial-step__number">4</div>
            <div class="tutorial-step__content">
              <h3>Atalhos de Teclado</h3>
              <ul>
                <li><strong>Ajuda:</strong> Pressione <kbd>?</kbd> para ver todos os atalhos</li>
                <li><strong>Paleta de comandos:</strong> <kbd>Ctrl+P</kbd></li>
                <li><strong>Tela cheia:</strong> <kbd>F11</kbd></li>
              </ul>
            </div>
          </div>

          <button class="btn-primary btn-block" style="margin-top: 20px;" onclick="this.closest('.welcome-dialog-backdrop').remove()">
            Começar a usar
          </button>
        </div>
      `;

      // Back button
      const backBtn = content.querySelector('.welcome-dialog__back');
      backBtn?.addEventListener('click', () => {
        this.close();
        this.show();
      });
    }

    this.markAsSeen();
  }

  /**
   * Handler: Skip
   */
  private handleSkip(): void {
    const checkbox = document.getElementById('dontShowAgain') as HTMLInputElement;
    if (checkbox?.checked) {
      this.markAsSeen();
    }
    this.close();
  }
}
