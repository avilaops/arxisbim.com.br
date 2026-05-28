/**
 * Tutorial Overlay
 * Sistema de tutorial interativo passo a passo
 */

import { Button } from '../design-system/components/Button';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetElement?: string; // CSS selector
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: string;
  highlightElement?: boolean;
}

export interface TutorialOptions {
  steps: TutorialStep[];
  onComplete?: () => void;
  onSkip?: () => void;
}

export class TutorialOverlay {
  private container: HTMLDivElement;
  private overlay: HTMLDivElement;
  private tooltip: HTMLDivElement;
  private highlight?: HTMLDivElement;
  private steps: TutorialStep[];
  private currentStepIndex: number = 0;
  private onComplete?: () => void;
  private onSkip?: () => void;

  constructor(options: TutorialOptions) {
    this.steps = options.steps;
    this.onComplete = options.onComplete;
    this.onSkip = options.onSkip;

    this.container = document.createElement('div');
    this.container.className = 'arxis-tutorial';

    this.overlay = document.createElement('div');
    this.overlay.className = 'arxis-tutorial__overlay';

    this.tooltip = document.createElement('div');
    this.tooltip.className = 'arxis-tutorial__tooltip';

    this.render();
  }

  private render(): void {
    const step = this.steps[this.currentStepIndex];
    if (!step) return;

    // Clear previous highlight
    this.clearHighlight();

    // Create new highlight if needed
    if (step.targetElement && step.highlightElement !== false) {
      const target = document.querySelector(step.targetElement);
      if (target) {
        this.createHighlight(target as HTMLElement);
      }
    }

    // Build tooltip
    this.tooltip.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'arxis-tutorial__header';

    const title = document.createElement('h3');
    title.className = 'arxis-tutorial__title';
    title.textContent = step.title;

    const progress = document.createElement('div');
    progress.className = 'arxis-tutorial__progress';
    progress.textContent = `${this.currentStepIndex + 1}/${this.steps.length}`;

    header.appendChild(title);
    header.appendChild(progress);

    const description = document.createElement('p');
    description.className = 'arxis-tutorial__description';
    description.textContent = step.description;

    if (step.action) {
      const action = document.createElement('div');
      action.className = 'arxis-tutorial__action';
      action.innerHTML = `💡 <strong>Ação:</strong> ${step.action}`;
      this.tooltip.appendChild(header);
      this.tooltip.appendChild(description);
      this.tooltip.appendChild(action);
    } else {
      this.tooltip.appendChild(header);
      this.tooltip.appendChild(description);
    }

    // Progress bar
    const progressBar = document.createElement('div');
    progressBar.className = 'arxis-tutorial__progress-bar';
    const progressFill = document.createElement('div');
    progressFill.className = 'arxis-tutorial__progress-fill';
    progressFill.style.width = `${((this.currentStepIndex + 1) / this.steps.length) * 100}%`;
    progressBar.appendChild(progressFill);
    this.tooltip.appendChild(progressBar);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'arxis-tutorial__actions';

    const skipBtn = new Button({ text: 'Pular', variant: 'secondary', size: 'sm' });
    skipBtn.getElement().addEventListener('click', () => this.skip());

    if (this.currentStepIndex > 0) {
      const prevBtn = new Button({ text: '◀ Anterior', variant: 'secondary', size: 'sm' });
      prevBtn.getElement().addEventListener('click', () => this.previous());
      actions.appendChild(prevBtn.getElement());
    }

    const nextBtn = new Button({
      text: this.currentStepIndex < this.steps.length - 1 ? 'Próximo ▶' : '✓ Concluir',
      variant: 'primary',
      size: 'sm'
    });
    nextBtn.getElement().addEventListener('click', () => this.next());

    actions.appendChild(skipBtn.getElement());
    actions.appendChild(nextBtn.getElement());
    this.tooltip.appendChild(actions);

    // Position tooltip
    this.positionTooltip(step);

    this.container.appendChild(this.overlay);
    this.container.appendChild(this.tooltip);

    if (!document.body.contains(this.container)) {
      document.body.appendChild(this.container);
    }

    this.injectStyles();
  }

  private createHighlight(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();

    this.highlight = document.createElement('div');
    this.highlight.className = 'arxis-tutorial__highlight';
    this.highlight.style.left = `${rect.left}px`;
    this.highlight.style.top = `${rect.top}px`;
    this.highlight.style.width = `${rect.width}px`;
    this.highlight.style.height = `${rect.height}px`;

    this.container.appendChild(this.highlight);
  }

  private clearHighlight(): void {
    if (this.highlight) {
      this.highlight.remove();
      this.highlight = undefined;
    }
  }

  private positionTooltip(step: TutorialStep): void {
    if (!step.targetElement) {
      // Center on screen
      this.tooltip.style.position = 'fixed';
      this.tooltip.style.left = '50%';
      this.tooltip.style.top = '50%';
      this.tooltip.style.transform = 'translate(-50%, -50%)';
      return;
    }

    const target = document.querySelector(step.targetElement);
    if (!target) {
      this.tooltip.style.position = 'fixed';
      this.tooltip.style.left = '50%';
      this.tooltip.style.top = '50%';
      this.tooltip.style.transform = 'translate(-50%, -50%)';
      return;
    }

    const rect = target.getBoundingClientRect();
    const position = step.position || 'bottom';

    this.tooltip.style.position = 'fixed';

    switch (position) {
      case 'top':
        this.tooltip.style.left = `${rect.left + rect.width / 2}px`;
        this.tooltip.style.top = `${rect.top - 10}px`;
        this.tooltip.style.transform = 'translate(-50%, -100%)';
        break;
      case 'bottom':
        this.tooltip.style.left = `${rect.left + rect.width / 2}px`;
        this.tooltip.style.top = `${rect.bottom + 10}px`;
        this.tooltip.style.transform = 'translateX(-50%)';
        break;
      case 'left':
        this.tooltip.style.left = `${rect.left - 10}px`;
        this.tooltip.style.top = `${rect.top + rect.height / 2}px`;
        this.tooltip.style.transform = 'translate(-100%, -50%)';
        break;
      case 'right':
        this.tooltip.style.left = `${rect.right + 10}px`;
        this.tooltip.style.top = `${rect.top + rect.height / 2}px`;
        this.tooltip.style.transform = 'translateY(-50%)';
        break;
    }
  }

  public next(): void {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this.render();
    } else {
      this.complete();
    }
  }

  public previous(): void {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.render();
    }
  }

  public skip(): void {
    this.onSkip?.();
    this.destroy();
  }

  private complete(): void {
    this.onComplete?.();
    this.destroy();
  }

  public getElement(): HTMLElement {
    return this.container;
  }

  public destroy(): void {
    this.clearHighlight();
    this.container.remove();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-tutorial-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-tutorial-styles';
    style.textContent = `
      .arxis-tutorial {
        position: fixed;
        inset: 0;
        z-index: 99999;
        pointer-events: none;
      }

      .arxis-tutorial__overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(3px);
        pointer-events: all;
      }

      .arxis-tutorial__highlight {
        position: fixed;
        border: 3px solid #00d4ff;
        border-radius: 8px;
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7),
                    0 0 20px rgba(0, 212, 255, 0.8);
        pointer-events: none;
        z-index: 100000;
        animation: pulse-border 2s ease-in-out infinite;
      }

      @keyframes pulse-border {
        0%, 100% {
          border-color: #00d4ff;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7),
                      0 0 20px rgba(0, 212, 255, 0.8);
        }
        50% {
          border-color: #7b2ff7;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.7),
                      0 0 30px rgba(123, 47, 247, 0.8);
        }
      }

      .arxis-tutorial__tooltip {
        min-width: 320px;
        max-width: 400px;
        background: rgba(20, 20, 30, 0.98);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
        pointer-events: all;
        z-index: 100001;
      }

      .arxis-tutorial__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .arxis-tutorial__title {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: #fff;
      }

      .arxis-tutorial__progress {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        font-weight: 600;
      }

      .arxis-tutorial__description {
        margin: 0 0 12px 0;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.85);
        line-height: 1.6;
      }

      .arxis-tutorial__action {
        padding: 12px;
        background: rgba(0, 212, 255, 0.1);
        border-left: 3px solid #00d4ff;
        border-radius: 6px;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.9);
        margin-bottom: 16px;
      }

      .arxis-tutorial__progress-bar {
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 16px;
      }

      .arxis-tutorial__progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #00d4ff, #7b2ff7);
        transition: width 0.3s;
      }

      .arxis-tutorial__actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
    `;
    document.head.appendChild(style);
  }
}
