/**
 * Tooltip Component
 * Tooltips avançados com posicionamento inteligente
 */

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'auto';
export type TooltipTrigger = 'hover' | 'click' | 'focus' | 'manual';

export interface TooltipOptions {
  content: string | HTMLElement;
  position?: TooltipPosition;
  trigger?: TooltipTrigger;
  delay?: number;
  maxWidth?: number;
  arrow?: boolean;
  interactive?: boolean;
  theme?: 'dark' | 'light' | 'glass';
}

export class Tooltip {
  private element: HTMLDivElement;
  private arrowElement: HTMLDivElement;
  private target: HTMLElement;
  private options: Required<TooltipOptions>;
  private showTimeout?: number;
  private hideTimeout?: number;
  private isVisible = false;

  constructor(target: HTMLElement, options: TooltipOptions) {
    this.target = target;
    this.options = {
      content: options.content,
      position: options.position || 'auto',
      trigger: options.trigger || 'hover',
      delay: options.delay || 300,
      maxWidth: options.maxWidth || 300,
      arrow: options.arrow !== undefined ? options.arrow : true,
      interactive: options.interactive || false,
      theme: options.theme || 'glass'
    };

    this.element = this.createElement();
    this.arrowElement = this.createArrow();
    this.element.appendChild(this.arrowElement);
    
    this.attachListeners();
    this.injectStyles();
  }

  private createElement(): HTMLDivElement {
    const tooltip = document.createElement('div');
    tooltip.className = `arxis-tooltip arxis-tooltip--${this.options.theme}`;
    tooltip.style.maxWidth = `${this.options.maxWidth}px`;
    tooltip.style.position = 'absolute';
    tooltip.style.zIndex = '10000';
    tooltip.style.opacity = '0';
    tooltip.style.pointerEvents = this.options.interactive ? 'auto' : 'none';

    if (typeof this.options.content === 'string') {
      tooltip.innerHTML = this.options.content;
    } else {
      tooltip.appendChild(this.options.content);
    }

    document.body.appendChild(tooltip);
    return tooltip;
  }

  private createArrow(): HTMLDivElement {
    const arrow = document.createElement('div');
    arrow.className = 'arxis-tooltip__arrow';
    if (!this.options.arrow) {
      arrow.style.display = 'none';
    }
    return arrow;
  }

  private attachListeners(): void {
    if (this.options.trigger === 'hover') {
      this.target.addEventListener('mouseenter', () => this.show());
      this.target.addEventListener('mouseleave', () => this.hide());
      
      if (this.options.interactive) {
        this.element.addEventListener('mouseenter', () => this.cancelHide());
        this.element.addEventListener('mouseleave', () => this.hide());
      }
    } else if (this.options.trigger === 'click') {
      this.target.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggle();
      });
      document.addEventListener('click', () => this.hide());
    } else if (this.options.trigger === 'focus') {
      this.target.addEventListener('focus', () => this.show());
      this.target.addEventListener('blur', () => this.hide());
    }
  }

  public show(): void {
    this.cancelHide();
    
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
    }

    this.showTimeout = window.setTimeout(() => {
      this.isVisible = true;
      this.updatePosition();
      this.element.style.opacity = '1';
      this.element.style.transform = 'scale(1)';
    }, this.options.delay);
  }

  public hide(): void {
    this.cancelShow();
    
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }

    this.hideTimeout = window.setTimeout(() => {
      this.isVisible = false;
      this.element.style.opacity = '0';
      this.element.style.transform = 'scale(0.95)';
    }, 100);
  }

  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  private cancelShow(): void {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = undefined;
    }
  }

  private cancelHide(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = undefined;
    }
  }

  private updatePosition(): void {
    const targetRect = this.target.getBoundingClientRect();
    const tooltipRect = this.element.getBoundingClientRect();
    
    let position = this.options.position;
    
    // Auto positioning
    if (position === 'auto') {
      position = this.calculateBestPosition(targetRect, tooltipRect);
    }

    const coords = this.calculatePosition(position, targetRect, tooltipRect);
    
    this.element.style.left = `${coords.x}px`;
    this.element.style.top = `${coords.y}px`;
    
    this.updateArrowPosition(position);
  }

  private calculateBestPosition(
    targetRect: DOMRect,
    tooltipRect: DOMRect
  ): TooltipPosition {
    const spaceTop = targetRect.top;
    const spaceBottom = window.innerHeight - targetRect.bottom;
    const spaceLeft = targetRect.left;
    const spaceRight = window.innerWidth - targetRect.right;

    const spaces = {
      top: spaceTop,
      bottom: spaceBottom,
      left: spaceLeft,
      right: spaceRight
    };

    return Object.entries(spaces).reduce((a, b) => 
      spaces[a[0] as TooltipPosition] > spaces[b[0] as TooltipPosition] ? a : b
    )[0] as TooltipPosition;
  }

  private calculatePosition(
    position: TooltipPosition,
    targetRect: DOMRect,
    tooltipRect: DOMRect
  ): { x: number; y: number } {
    const gap = 8;
    let x = 0;
    let y = 0;

    switch (position) {
      case 'top':
        x = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        y = targetRect.top - tooltipRect.height - gap;
        break;
      case 'bottom':
        x = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        y = targetRect.bottom + gap;
        break;
      case 'left':
        x = targetRect.left - tooltipRect.width - gap;
        y = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        break;
      case 'right':
        x = targetRect.right + gap;
        y = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        break;
    }

    // Boundary checks
    x = Math.max(8, Math.min(x, window.innerWidth - tooltipRect.width - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - tooltipRect.height - 8));

    return { x, y };
  }

  private updateArrowPosition(position: TooltipPosition): void {
    this.arrowElement.className = `arxis-tooltip__arrow arxis-tooltip__arrow--${position}`;
  }

  public setContent(content: string | HTMLElement): void {
    this.element.innerHTML = '';
    if (typeof content === 'string') {
      this.element.innerHTML = content;
    } else {
      this.element.appendChild(content);
    }
    this.element.appendChild(this.arrowElement);
  }

  public destroy(): void {
    this.cancelShow();
    this.cancelHide();
    this.element.remove();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-tooltip-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-tooltip-styles';
    style.textContent = `
      .arxis-tooltip {
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13px;
        line-height: 1.4;
        transition: opacity 0.2s, transform 0.2s;
        transform-origin: center;
        transform: scale(0.95);
        white-space: normal;
        word-wrap: break-word;
      }

      .arxis-tooltip--dark {
        background: rgba(0, 0, 0, 0.9);
        color: #fff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .arxis-tooltip--light {
        background: rgba(255, 255, 255, 0.95);
        color: #333;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        border: 1px solid rgba(0, 0, 0, 0.1);
      }

      .arxis-tooltip--glass {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      }

      .arxis-tooltip__arrow {
        position: absolute;
        width: 8px;
        height: 8px;
        transform: rotate(45deg);
      }

      .arxis-tooltip--dark .arxis-tooltip__arrow {
        background: rgba(0, 0, 0, 0.9);
      }

      .arxis-tooltip--light .arxis-tooltip__arrow {
        background: rgba(255, 255, 255, 0.95);
        border: 1px solid rgba(0, 0, 0, 0.1);
      }

      .arxis-tooltip--glass .arxis-tooltip__arrow {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .arxis-tooltip__arrow--top {
        bottom: -4px;
        left: 50%;
        margin-left: -4px;
      }

      .arxis-tooltip__arrow--bottom {
        top: -4px;
        left: 50%;
        margin-left: -4px;
      }

      .arxis-tooltip__arrow--left {
        right: -4px;
        top: 50%;
        margin-top: -4px;
      }

      .arxis-tooltip__arrow--right {
        left: -4px;
        top: 50%;
        margin-top: -4px;
      }
    `;
    document.head.appendChild(style);
  }
}

// Helper function
export function createTooltip(
  target: HTMLElement,
  content: string | HTMLElement,
  options?: Partial<TooltipOptions>
): Tooltip {
  return new Tooltip(target, { content, ...options });
}
