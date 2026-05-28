/**
 * Theme Picker
 * Seletor de temas com preview
 */

import { Card } from '../design-system/components/Card';

export interface Theme {
  id: string;
  name: string;
  description: string;
  preview: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
  };
}

export class ThemePicker {
  private card: Card;
  private themes: Theme[] = [];
  private currentTheme: string = 'dark';
  private onThemeChange?: (themeId: string) => void;

  constructor(options?: {
    onThemeChange?: (themeId: string) => void;
  }) {
    this.onThemeChange = options?.onThemeChange;
    
    this.card = new Card({
      title: 'Temas',
      variant: 'glass'
    });

    this.loadThemes();
    this.render();
  }

  private loadThemes(): void {
    this.themes = [
      {
        id: 'dark',
        name: 'Escuro corporativo',
        description: 'Tema operacional com contraste controlado',
        preview: {
          primary: '#6f8f7c',
          secondary: '#8c959f',
          background: '#0f1217',
          surface: '#151a21'
        }
      },
      {
        id: 'light',
        name: 'Claro Profissional',
        description: 'Tema claro para ambientes bem iluminados',
        preview: {
          primary: '#46715a',
          secondary: '#57606a',
          background: '#f6f8fa',
          surface: '#ffffff'
        }
      },
      {
        id: 'blue',
        name: 'Azul técnico',
        description: 'Acentos frios para coordenação e análise',
        preview: {
          primary: '#6f8fb8',
          secondary: '#8c959f',
          background: '#111827',
          surface: '#182231'
        }
      },
      {
        id: 'purple',
        name: 'Grafite auditoria',
        description: 'Tons neutros para revisão e aprovação',
        preview: {
          primary: '#9da7b3',
          secondary: '#6b7480',
          background: '#111418',
          surface: '#1b2028'
        }
      },
      {
        id: 'green',
        name: 'Verde status',
        description: 'Uso funcional para seleção e disponibilidade',
        preview: {
          primary: '#6f8f7c',
          secondary: '#557260',
          background: '#101611',
          surface: '#182118'
        }
      },
      {
        id: 'orange',
        name: 'Âmbar planejamento',
        description: 'Acento para alertas, prazos e planejamento',
        preview: {
          primary: '#b08952',
          secondary: '#8a6a3f',
          background: '#17130d',
          surface: '#221b12'
        }
      }
    ];
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    // Current theme
    const current = document.createElement('div');
    current.className = 'arxis-theme__current';
    
    const currentTheme = this.themes.find(t => t.id === this.currentTheme);
    current.innerHTML = `
      <div class="arxis-theme__current-label">Tema Atual</div>
      <div class="arxis-theme__current-name">${currentTheme?.name || 'Padrão'}</div>
    `;
    body.appendChild(current);

    // Themes grid
    const grid = document.createElement('div');
    grid.className = 'arxis-theme__grid';

    this.themes.forEach(theme => {
      const card = this.createThemeCard(theme);
      grid.appendChild(card);
    });

    body.appendChild(grid);
    this.injectStyles();
  }

  private createThemeCard(theme: Theme): HTMLDivElement {
    const card = document.createElement('div');
    card.className = `arxis-theme__card ${theme.id === this.currentTheme ? 'arxis-theme__card--active' : ''}`;

    // Preview
    const preview = document.createElement('div');
    preview.className = 'arxis-theme__preview';
    preview.style.background = theme.preview.background;

    const colors = document.createElement('div');
    colors.className = 'arxis-theme__colors';

    const primary = document.createElement('div');
    primary.className = 'arxis-theme__color';
    primary.style.background = theme.preview.primary;

    const secondary = document.createElement('div');
    secondary.className = 'arxis-theme__color';
    secondary.style.background = theme.preview.secondary;

    const surface = document.createElement('div');
    surface.className = 'arxis-theme__color arxis-theme__color--large';
    surface.style.background = theme.preview.surface;

    colors.appendChild(primary);
    colors.appendChild(secondary);
    colors.appendChild(surface);
    preview.appendChild(colors);

    card.appendChild(preview);

    // Info
    const info = document.createElement('div');
    info.className = 'arxis-theme__info';

    const name = document.createElement('h4');
    name.className = 'arxis-theme__name';
    name.textContent = theme.name;

    const description = document.createElement('p');
    description.className = 'arxis-theme__description';
    description.textContent = theme.description;

    info.appendChild(name);
    info.appendChild(description);
    card.appendChild(info);

    // Active badge
    if (theme.id === this.currentTheme) {
      const badge = document.createElement('div');
      badge.className = 'arxis-theme__badge';
      badge.textContent = '✓ Ativo';
      card.appendChild(badge);
    }

    card.addEventListener('click', () => this.selectTheme(theme.id));

    return card;
  }

  public selectTheme(themeId: string): void {
    this.currentTheme = themeId;
    this.onThemeChange?.(themeId);
    this.render();
    console.log('Tema alterado para:', themeId);
  }

  public getCurrentTheme(): string {
    return this.currentTheme;
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.card.destroy();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-theme-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-theme-styles';
    style.textContent = `
      .arxis-theme__current {
        padding: 16px;
        background: rgba(208, 215, 222, 0.06);
        border-radius: 8px;
        margin-bottom: 20px;
        text-align: center;
      }

      .arxis-theme__current-label {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
        text-transform: uppercase;
        margin-bottom: 4px;
      }

      .arxis-theme__current-name {
        font-size: 18px;
        font-weight: 700;
        color: #d0d7de;
      }

      .arxis-theme__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
      }

      .arxis-theme__card {
        position: relative;
        border-radius: 12px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.3s;
        background: rgba(255, 255, 255, 0.04);
        border: 2px solid transparent;
      }

      .arxis-theme__card:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.22);
        border-color: rgba(255, 255, 255, 0.1);
      }

      .arxis-theme__card--active {
        border-color: #6f8f7c;
        box-shadow: inset 0 0 0 1px rgba(111, 143, 124, 0.28);
      }

      .arxis-theme__preview {
        height: 120px;
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .arxis-theme__colors {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .arxis-theme__color {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }

      .arxis-theme__color--large {
        width: 48px;
        height: 48px;
      }

      .arxis-theme__info {
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
      }

      .arxis-theme__name {
        margin: 0 0 4px 0;
        font-size: 14px;
        font-weight: 600;
        color: #fff;
      }

      .arxis-theme__description {
        margin: 0;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        line-height: 1.4;
      }

      .arxis-theme__badge {
        position: absolute;
        top: 8px;
        right: 8px;
        padding: 4px 10px;
        background: #dfe7e2;
        color: #10151b;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 700;
      }
    `;
    document.head.appendChild(style);
  }
}
