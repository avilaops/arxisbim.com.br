/**
 * ExplorerPanel - Lista de arquivos e projetos
 */

import { uiStore } from '../../../../app/state/uiStore';
import { fileService } from '../../../../systems/file';

export class ExplorerPanel {
  private container: HTMLElement;
  private unsubscribe?: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.unsubscribe = uiStore.subscribe(() => this.render());
  }

  private render(): void {
    const state = uiStore.getState();
    const model = state.activeModel;

    this.container.innerHTML = `
      <div class="panel explorer-panel">
        <div class="panel__section">
          <button class="btn btn--primary btn--block" id="open-file-btn">
            <span class="panel__item-kicker">IFC</span>
            Abrir modelo
          </button>
        </div>

        <div class="panel__section panel__metrics" aria-label="Resumo do projeto">
          <div class="metric-card metric-card--compact">
            <span class="metric-card__label">Modelo ativo</span>
            <strong class="metric-card__value" id="models-count">${model.loaded ? '1' : '0'}</strong>
          </div>
          <div class="metric-card metric-card--compact">
            <span class="metric-card__label">Triângulos</span>
            <strong class="metric-card__value">${model.triangles ? this.formatNumber(model.triangles) : '—'}</strong>
          </div>
          <div class="metric-card metric-card--compact metric-card--wide">
            <span class="metric-card__label">Arquivo</span>
            <strong class="metric-card__value" title="${this.escape(model.fileName || 'Nenhum modelo')}">${this.escape(model.fileName || 'Nenhum modelo')}</strong>
          </div>
        </div>

        <div class="panel__section">
          <h3 class="panel__section-title">Arquivos recentes</h3>
          <div class="panel__list" id="recent-files-list">
            <div class="panel__empty panel__empty--compact">
              Nenhum arquivo recente. Abra um IFC para iniciar o contexto do projeto.
            </div>
          </div>
        </div>

        <div class="panel__section">
          <h3 class="panel__section-title">Favoritos</h3>
          <div class="panel__list" id="favorites-list">
            <div class="panel__empty panel__empty--compact">Sem favoritos fixados.</div>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
    this.loadRecentFiles();
  }

  private setupEventListeners(): void {
    const openBtn = this.container.querySelector('#open-file-btn');
    
    if (!openBtn) {
      console.error('[ExplorerPanel] Open file button not found');
      return;
    }
    
    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uiStore.openModal('loadFile');
    });
    
    // Touch support for mobile
    openBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uiStore.openModal('loadFile');
    });
  }

  private async loadRecentFiles(): Promise<void> {
    const recents = fileService.getRecents(10);
    const listEl = this.container.querySelector('#recent-files-list');
    const countEl = this.container.querySelector('#models-count');
    void countEl;
    
    if (listEl && recents.length > 0) {
      listEl.innerHTML = recents.map(file => `
        <div class="panel__list-item">
          <span class="panel__item-kicker">IFC</span>
          <span class="panel__list-text">${file.displayName || 'Untitled'}</span>
        </div>
      `).join('');
    }
  }

  public destroy(): void {
    this.unsubscribe?.();
    this.container.innerHTML = '';
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(value);
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
