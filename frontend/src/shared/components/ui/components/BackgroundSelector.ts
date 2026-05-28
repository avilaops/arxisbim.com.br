/**
 * BackgroundSelector - UI para selecionar fundo da cena
 * Integra com BackgroundManager
 */

import { getAllBackgroundPresets, type BackgroundPreset } from '../../../../viewer/BackgroundPresets';

export class BackgroundSelector {
  private container: HTMLElement;
  private onChangeCallback?: (presetId: string) => void;

  constructor(currentPresetId: string = 'HORIZON', onChange?: (presetId: string) => void) {
    this.onChangeCallback = onChange;
    this.container = this.createUI(currentPresetId);
    this.applyStyles();
  }

  private createUI(currentPresetId: string): HTMLElement {
    const container = document.createElement('div');
    container.className = 'background-selector';

    // Title
    const title = document.createElement('h4');
    title.className = 'background-selector__title';
    title.textContent = 'Fundo da cena';
    container.appendChild(title);

    // Description
    const desc = document.createElement('p');
    desc.className = 'background-selector__description';
    desc.textContent = 'Escolha uma ambientação clara para revisão, apresentação ou coordenação BIM.';
    container.appendChild(desc);

    // Grid de presets
    const grid = document.createElement('div');
    grid.className = 'background-selector__grid';

    const presets = getAllBackgroundPresets();
    presets.forEach(preset => {
      const card = this.createPresetCard(preset, preset.id === currentPresetId);
      grid.appendChild(card);
    });

    container.appendChild(grid);
    return container;
  }

  private createPresetCard(preset: BackgroundPreset, isActive: boolean): HTMLElement {
    const card = document.createElement('button');
    card.className = 'background-preset-card';
    if (isActive) {
      card.classList.add('background-preset-card--active');
    }
    card.dataset.presetId = preset.id;

    // Preview (gradient visual)
    const preview = document.createElement('div');
    preview.className = 'background-preset-card__preview';
    preview.style.background = `linear-gradient(to bottom, ${preset.colors.top}, ${preset.colors.bottom})`;
    
    // Add grid indicator if enabled
    if (preset.grid?.enabled) {
      const gridIndicator = document.createElement('div');
      gridIndicator.className = 'background-preset-card__grid-indicator';
      gridIndicator.textContent = '⊞';
      preview.appendChild(gridIndicator);
    }

    card.appendChild(preview);

    // Info
    const info = document.createElement('div');
    info.className = 'background-preset-card__info';

    const name = document.createElement('div');
    name.className = 'background-preset-card__name';
    name.textContent = preset.name;
    info.appendChild(name);

    const description = document.createElement('div');
    description.className = 'background-preset-card__description';
    description.textContent = preset.description;
    info.appendChild(description);

    card.appendChild(info);

    // Click handler
    card.addEventListener('click', () => {
      this.selectPreset(preset.id);
    });

    return card;
  }

  private selectPreset(presetId: string): void {
    // Update active state
    const cards = this.container.querySelectorAll('.background-preset-card');
    cards.forEach(card => {
      if (card instanceof HTMLElement && card.dataset.presetId === presetId) {
        card.classList.add('background-preset-card--active');
      } else {
        card.classList.remove('background-preset-card--active');
      }
    });

    // Callback
    if (this.onChangeCallback) {
      this.onChangeCallback(presetId);
    }

    console.log(`[BackgroundSelector] Background preset selected: ${presetId}`);
  }

  public getElement(): HTMLElement {
    return this.container;
  }

  private applyStyles(): void {
    if (document.getElementById('background-selector-styles')) return;

    const style = document.createElement('style');
    style.id = 'background-selector-styles';
    style.textContent = `
      .background-selector {
        padding: 0;
      }

      .background-selector__title {
        font-size: var(--font-size-sm, 14px);
        font-weight: var(--font-weight-semibold, 600);
        color: var(--sidebar-text, #f9fafb);
        margin: 0 0 var(--space-2, 8px) 0;
      }

      .background-selector__description {
        font-size: var(--font-size-sm, 12px);
        color: var(--sidebar-text-muted, #9ca3af);
        margin: 0 0 var(--space-4, 16px) 0;
      }

      .background-selector__grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: var(--space-2, 8px);
      }

      .background-preset-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--sidebar-border, #374151);
        border-radius: var(--radius-md, 8px);
        padding: 0;
        cursor: pointer;
        transition: all 0.2s ease;
        overflow: hidden;
        text-align: left;
      }

      .background-preset-card:hover {
        border-color: rgba(96, 165, 250, 0.48);
        background: rgba(37, 99, 235, 0.16);
        transform: translateY(-1px);
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.14);
      }

      .background-preset-card--active {
        border-color: rgba(96, 165, 250, 0.64);
        background: rgba(37, 99, 235, 0.2);
        box-shadow: inset 3px 0 0 var(--accent, #2563eb);
      }

      .background-preset-card__preview {
        height: 62px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .background-preset-card__grid-indicator {
        font-size: 22px;
        opacity: 0.24;
        color: #0f172a;
        text-shadow: none;
      }

      .background-preset-card__info {
        padding: var(--space-2, 8px);
      }

      .background-preset-card__name {
        font-size: var(--font-size-md, 14px);
        font-weight: var(--font-weight-medium, 500);
        color: var(--sidebar-text, #f9fafb);
        margin-bottom: var(--space-1, 4px);
      }

      .background-preset-card__description {
        font-size: var(--font-size-xs, 11px);
        color: var(--sidebar-text-muted, #9ca3af);
        line-height: 1.4;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .background-selector__grid {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
