/**
 * SettingsPanel - Configurações gerais
 */

import { BackgroundSelector } from '../components/BackgroundSelector';
import type { BackgroundManager } from '../../../../viewer/BackgroundManager';

export class SettingsPanel {
  private container: HTMLElement;
  private backgroundSelector?: BackgroundSelector;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    // Create panel structure
    const panel = document.createElement('div');
    panel.className = 'panel settings-panel';

    // Background section
    const backgroundSection = this.createBackgroundSection();
    panel.appendChild(backgroundSection);

    // Appearance section
    const appearanceSection = document.createElement('div');
    appearanceSection.className = 'panel__section';
    appearanceSection.innerHTML = `
      <h3 class="panel__section-title">Aparência</h3>
      <label class="settings-item">
        <span>Tema</span>
        <select class="input">
          <option value="light" selected>Enterprise claro</option>
          <option value="dark">Corporativo escuro</option>
        </select>
      </label>
    `;
    panel.appendChild(appearanceSection);

    // Performance section
    const performanceSection = document.createElement('div');
    performanceSection.className = 'panel__section';
    performanceSection.innerHTML = `
      <h3 class="panel__section-title">Desempenho</h3>
      <label class="settings-item">
        <span>Qualidade de visualização</span>
        <select class="input">
          <option value="ultra">Ultra</option>
          <option value="high">Alta</option>
          <option value="medium" selected>Equilibrada</option>
          <option value="low">Performance</option>
        </select>
      </label>
    `;
    panel.appendChild(performanceSection);

    // Replace content
    this.container.innerHTML = '';
    this.container.appendChild(panel);
  }

  private createBackgroundSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'panel__section panel__section--background';

    // Get current preset from backgroundManager (global)
    const backgroundManager = (window as any).__backgroundManager as BackgroundManager | undefined;
    const currentPresetId = localStorage.getItem('arxis:backgroundPreset') || 'HORIZON';

    // Create BackgroundSelector
    this.backgroundSelector = new BackgroundSelector(currentPresetId, (presetId) => {
      this.onBackgroundChange(presetId);
    });

    section.appendChild(this.backgroundSelector.getElement());
    return section;
  }

  private onBackgroundChange(presetId: string): void {
    // Apply to BackgroundManager
    const backgroundManager = (window as any).__backgroundManager as BackgroundManager | undefined;
    if (backgroundManager) {
      backgroundManager.applyPreset(presetId);
      localStorage.setItem('arxis:backgroundPreset', presetId);
      console.log(`[SettingsPanel] Background changed to: ${presetId}`);
    } else {
      console.warn('[SettingsPanel] BackgroundManager not found on window');
    }
  }

  public destroy(): void {
    // Cleanup
    this.backgroundSelector = undefined;
  }
}
