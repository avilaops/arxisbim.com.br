/**
 * SearchPanel - Busca global em modelos/elementos
 */

import { uiStore } from '../../../../app/state/uiStore';

export class SearchPanel {
  private container: HTMLElement;
  private unsubscribe?: () => void;
  private query = '';

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.unsubscribe = uiStore.subscribe(() => this.render());
  }

  private render(): void {
    const state = uiStore.getState();
    const results = this.getResults();

    this.container.innerHTML = `
      <div class="panel search-panel">
        <div class="panel__section">
          <h3 class="panel__section-title">Busca BIM</h3>
          <input 
            type="text" 
            class="input input--block" 
            placeholder="Buscar por nome, tipo IFC ou Express ID"
            id="search-input"
            value="${this.escape(this.query)}"
          />
          <div class="panel__hint">Busca leve sobre o contexto já disponível. Índice IFC completo fica para uma etapa dedicada.</div>
        </div>

        <div class="panel__section">
          <h3 class="panel__section-title">Escopo</h3>
          <div class="panel__chips" aria-label="Escopos de busca">
            <span class="panel-chip ${state.activeModel.loaded ? 'is-active' : ''}">Modelo ativo</span>
            <span class="panel-chip ${state.selection.hasSelection ? 'is-active' : ''}">Seleção</span>
            <span class="panel-chip ${state.layerSummary.total ? 'is-active' : ''}">Camadas</span>
          </div>
        </div>

        <div class="panel__section">
          <h3 class="panel__section-title">Resultados</h3>
          <div class="panel__list" id="search-results">
            ${results.length ? results.join('') : '<div class="panel__empty panel__empty--compact">Nenhum resultado disponível no contexto atual.</div>'}
          </div>
        </div>
      </div>
    `;

    this.container.querySelector<HTMLInputElement>('#search-input')?.addEventListener('input', (event) => {
      this.query = (event.target as HTMLInputElement).value;
      this.render();
      this.container.querySelector<HTMLInputElement>('#search-input')?.focus();
    });
  }

  private getResults(): string[] {
    const state = uiStore.getState();
    const normalized = this.query.trim().toLowerCase();
    const candidates = [
      state.activeModel.loaded ? { code: 'MOD', title: state.activeModel.fileName || 'Modelo IFC', detail: `${state.activeModel.triangles || 0} triângulos` } : null,
      state.selection.hasSelection ? { code: 'SEL', title: state.selection.name || `Elemento #${state.selection.expressID || '—'}`, detail: state.selection.type || 'Elemento selecionado' } : null,
      state.layerSummary.total ? { code: 'LYR', title: `${state.layerSummary.total} camadas`, detail: `${state.layerSummary.visible} visíveis` } : null
    ].filter(Boolean) as Array<{ code: string; title: string; detail: string }>;

    return candidates
      .filter(item => !normalized || `${item.code} ${item.title} ${item.detail}`.toLowerCase().includes(normalized))
      .map(item => `
        <div class="panel__list-item panel__list-item--readonly">
          <span class="panel__item-kicker">${this.escape(item.code)}</span>
          <span class="panel__list-text" title="${this.escape(item.title)}">${this.escape(item.title)}</span>
          <span class="panel__list-meta">${this.escape(item.detail)}</span>
        </div>
      `);
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  public destroy(): void {
    this.unsubscribe?.();
    this.container.innerHTML = '';
  }
}
