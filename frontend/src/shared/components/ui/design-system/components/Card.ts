/**
 * Card Component - Sistema de Design ArxisVR
 * Container de conteúdo com estilos consistentes
 */

export type CardVariant = 'default' | 'bordered' | 'elevated' | 'glass';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps {
  title?: string;
  subtitle?: string;
  headerActions?: HTMLElement[];
  footer?: HTMLElement | string;
  variant?: CardVariant;
  padding?: CardPadding;
  hoverable?: boolean;
  clickable?: boolean;
  fullWidth?: boolean;
  onClick?: (event: MouseEvent) => void;
  className?: string;
}

export class Card {
  private container: HTMLElement;
  private header: HTMLElement | null = null;
  private body: HTMLElement;
  private footer: HTMLElement | null = null;
  private props: CardProps;

  constructor(props: CardProps = {}) {
    this.props = { variant: 'default', padding: 'md', ...props };
    this.container = this.createCard();
    this.body = this.createBody();
    this.applyStyles();
  }

  /**
   * Cria o card container
   */
  private createCard(): HTMLElement {
    const card = document.createElement('div');
    card.className = this.getCardClasses();

    // Header
    if (this.props.title || this.props.headerActions) {
      this.header = this.createHeader();
      card.appendChild(this.header);
    }

    // Click handler
    if (this.props.onClick) {
      card.style.cursor = 'pointer';
      card.addEventListener('click', this.props.onClick);
    }

    return card;
  }

  /**
   * Cria o header do card
   */
  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'arxis-card-header';

    // Title section
    const titleSection = document.createElement('div');
    titleSection.className = 'arxis-card-title-section';

    if (this.props.title) {
      const title = document.createElement('h3');
      title.className = 'arxis-card-title';
      title.textContent = this.props.title;
      titleSection.appendChild(title);
    }

    if (this.props.subtitle) {
      const subtitle = document.createElement('p');
      subtitle.className = 'arxis-card-subtitle';
      subtitle.textContent = this.props.subtitle;
      titleSection.appendChild(subtitle);
    }

    header.appendChild(titleSection);

    // Header actions
    if (this.props.headerActions && this.props.headerActions.length > 0) {
      const actions = document.createElement('div');
      actions.className = 'arxis-card-header-actions';
      this.props.headerActions.forEach(action => {
        actions.appendChild(action);
      });
      header.appendChild(actions);
    }

    return header;
  }

  /**
   * Cria o body do card
   */
  private createBody(): HTMLElement {
    const body = document.createElement('div');
    body.className = 'arxis-card-body';
    this.container.appendChild(body);
    return body;
  }

  /**
   * Cria o footer do card
   */
  private createFooter(): HTMLElement {
    const footer = document.createElement('div');
    footer.className = 'arxis-card-footer';

    if (typeof this.props.footer === 'string') {
      footer.textContent = this.props.footer;
    } else if (this.props.footer instanceof HTMLElement) {
      footer.appendChild(this.props.footer);
    }

    return footer;
  }

  /**
   * Gera classes do card
   */
  private getCardClasses(): string {
    const classes = ['arxis-card'];
    
    if (this.props.variant) {
      classes.push(`arxis-card--${this.props.variant}`);
    }
    
    if (this.props.padding) {
      classes.push(`arxis-card--padding-${this.props.padding}`);
    }
    
    if (this.props.hoverable) {
      classes.push('arxis-card--hoverable');
    }
    
    if (this.props.clickable) {
      classes.push('arxis-card--clickable');
    }
    
    if (this.props.fullWidth) {
      classes.push('arxis-card--full');
    }
    
    if (this.props.className) {
      classes.push(this.props.className);
    }

    return classes.join(' ');
  }

  /**
   * Aplica estilos CSS
   */
  private applyStyles(): void {
    if (document.getElementById('arxis-card-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-card-styles';
    style.textContent = `
      .arxis-card {
        background: rgba(30, 30, 30, 0.95);
        border-radius: 8px;
        transition: all 0.3s ease;
        overflow: hidden;
      }

      .arxis-card--full {
        width: 100%;
      }

      /* Variants */
      .arxis-card--default {
        background: rgba(30, 30, 30, 0.95);
      }

      .arxis-card--bordered {
        background: rgba(30, 30, 30, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .arxis-card--elevated {
        background: rgba(30, 30, 30, 0.95);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      }

      .arxis-card--glass {
        background: rgba(30, 30, 30, 0.7);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      /* Hoverable */
      .arxis-card--hoverable:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      }

      .arxis-card--clickable {
        cursor: pointer;
      }

      .arxis-card--clickable:active {
        transform: scale(0.98);
      }

      /* Header */
      .arxis-card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        gap: 16px;
      }

      .arxis-card-title-section {
        flex: 1;
      }

      .arxis-card-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--theme-foreground, #fff);
      }

      .arxis-card-subtitle {
        margin: 4px 0 0 0;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.6);
      }

      .arxis-card-header-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      /* Body */
      .arxis-card-body {
        color: var(--theme-foreground, #fff);
      }

      .arxis-card--padding-none .arxis-card-body {
        padding: 0;
      }

      .arxis-card--padding-sm .arxis-card-body {
        padding: 12px;
      }

      .arxis-card--padding-md .arxis-card-body {
        padding: 20px;
      }

      .arxis-card--padding-lg .arxis-card-body {
        padding: 28px;
      }

      /* Footer */
      .arxis-card-footer {
        padding: 16px 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(0, 0, 0, 0.2);
        font-size: 13px;
        color: rgba(255, 255, 255, 0.7);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Define conteúdo do body
   */
  public setContent(content: HTMLElement | string): void {
    this.body.innerHTML = '';
    if (typeof content === 'string') {
      this.body.innerHTML = content;
    } else {
      this.body.appendChild(content);
    }
  }

  /**
   * Adiciona elemento ao body
   */
  public appendChild(element: HTMLElement): void {
    this.body.appendChild(element);
  }

  /**
   * Define footer
   */
  public setFooter(footer: HTMLElement | string): void {
    this.props.footer = footer;
    
    // Remove footer existente
    if (this.footer) {
      this.footer.remove();
      this.footer = null;
    }

    // Cria novo footer
    this.footer = this.createFooter();
    this.container.appendChild(this.footer);
  }

  /**
   * Retorna o elemento body
   */
  public getBody(): HTMLElement {
    return this.body;
  }

  /**
   * Retorna o elemento container
   */
  public getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Destrói o card
   */
  public destroy(): void {
    if (this.props.onClick) {
      this.container.removeEventListener('click', this.props.onClick);
    }
    this.container.remove();
  }
}

/**
 * Helper para criar card rapidamente
 */
export function createCard(props: CardProps = {}): Card {
  return new Card(props);
}
