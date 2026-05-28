/**
 * LayersPanel - Gerenciamento de camadas/layers
 */

import { appController } from '../../../../app/AppController';
import { eventBus, EventType } from '../../../../core';
import type { Layer } from '../../../../core';
import { uiStore } from '../../../../app/state/uiStore';

export class LayersPanel {
  private container: HTMLElement;
  private unsubscribeState?: () => void;
  private readonly eventUnsubscribers: Array<() => void> = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.setupEventListeners();
    this.render();
  }

  private setupEventListeners(): void {
    const refresh = () => this.render();
    eventBus.on(EventType.LAYER_CREATED, refresh);
    eventBus.on(EventType.LAYER_TOGGLED, refresh);
    eventBus.on(EventType.LAYER_LOCKED, refresh);
    eventBus.on(EventType.LAYER_DELETED, refresh);
    eventBus.on(EventType.LAYER_UPDATED, refresh);
    eventBus.on(EventType.MODEL_LOADED, refresh);
    this.eventUnsubscribers.push(() => {
      eventBus.off(EventType.LAYER_CREATED, refresh);
      eventBus.off(EventType.LAYER_TOGGLED, refresh);
      eventBus.off(EventType.LAYER_LOCKED, refresh);
      eventBus.off(EventType.LAYER_DELETED, refresh);
      eventBus.off(EventType.LAYER_UPDATED, refresh);
      eventBus.off(EventType.MODEL_LOADED, refresh);
    });

    this.unsubscribeState = uiStore.subscribe(() => this.render());
  }

  private render(): void {
    const layers = appController.getLayers();
    const selection = uiStore.getState().selection;
    const hasModel = uiStore.getState().activeModel.loaded;
    const visibleCount = layers.filter(layer => layer.visible).length;
    const lockedCount = layers.filter(layer => layer.locked).length;

    this.container.innerHTML = `
      <div class="panel layers-panel">
        <div class="panel__section panel__metrics" aria-label="Resumo de camadas">
          <div class="metric-card metric-card--compact">
            <span class="metric-card__label">Camadas</span>
            <strong class="metric-card__value">${layers.length}</strong>
          </div>
          <div class="metric-card metric-card--compact">
            <span class="metric-card__label">Visíveis</span>
            <strong class="metric-card__value">${visibleCount}</strong>
          </div>
          <div class="metric-card metric-card--compact">
            <span class="metric-card__label">Bloqueadas</span>
            <strong class="metric-card__value">${lockedCount}</strong>
          </div>
          <div class="metric-card metric-card--compact">
            <span class="metric-card__label">Seleção</span>
            <strong class="metric-card__value">${selection.hasSelection ? '1' : '0'}</strong>
          </div>
        </div>

        <div class="panel__section">
          <h3 class="panel__section-title">Camadas</h3>
          <div class="panel__toolbar-row">
            <button class="toolbar-button" id="layers-show-all" type="button" ${layers.length ? '' : 'disabled'}>Mostrar tudo</button>
            <button class="toolbar-button" id="layers-isolate-selection" type="button" ${selection.hasSelection ? '' : 'disabled'}>Isolar</button>
          </div>
          <div class="panel__list" id="layers-list">
            ${layers.length ? layers.map(layer => this.renderLayer(layer)).join('') : this.renderEmptyLayers(hasModel)}
          </div>
        </div>

        <div class="panel__section">
          <h3 class="panel__section-title">Árvore BIM</h3>
          <div class="panel__tree">
            ${this.renderCategory('STR', 'Estrutura', hasModel ? 'Monitorando pilares, vigas e lajes' : 'Aguardando modelo')}
            ${this.renderCategory('ARC', 'Arquitetura', hasModel ? 'Paredes, portas e aberturas' : 'Aguardando modelo')}
            ${this.renderCategory('MEP', 'Instalações', hasModel ? 'Sistemas técnicos e interferências' : 'Aguardando modelo')}
          </div>
        </div>
      </div>
    `;

    this.bindActions();
  }

  private bindActions(): void {
    this.container.querySelector('#layers-show-all')?.addEventListener('click', () => {
      appController.getLayers().forEach(layer => {
        if (!layer.visible) {
          appController.layerManager.setLayerVisibility(layer.id, true);
        }
      });
      eventBus.emit(EventType.MODEL_SHOW_ALL, {});
    });

    this.container.querySelector('#layers-isolate-selection')?.addEventListener('click', () => {
      const selected = appController.selectionManager.getSelectedObject();
      if (!selected) return;
      eventBus.emit(EventType.MODEL_ISOLATE_SELECTED, { objects: [selected.uuid] });
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-layer-toggle]').forEach(button => {
      button.addEventListener('click', () => {
        appController.toggleLayerVisibility(button.dataset.layerToggle!);
      });
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-layer-lock]').forEach(button => {
      button.addEventListener('click', () => {
        appController.layerManager.toggleLayerLock(button.dataset.layerLock!);
      });
    });
  }

  private renderLayer(layer: Layer): string {
    return `
      <div class="panel__list-item layer-row ${layer.visible ? '' : 'is-muted'}">
        <span class="panel__item-kicker">LYR</span>
        <span class="panel__list-text" title="${this.escape(layer.name)}">${this.escape(layer.name)}</span>
        <span class="layer-row__meta">${Math.round(layer.opacity * 100)}%</span>
        <button class="toolbar-button toolbar-button--xs" data-layer-toggle="${this.escape(layer.id)}" type="button" aria-label="Alternar visibilidade ${this.escape(layer.name)}">${layer.visible ? 'Visível' : 'Oculto'}</button>
        <button class="toolbar-button toolbar-button--xs" data-layer-lock="${this.escape(layer.id)}" type="button" aria-label="Bloquear ${this.escape(layer.name)}">${layer.locked ? 'Fixo' : 'Livre'}</button>
      </div>
    `;
  }

  private renderEmptyLayers(hasModel: boolean): string {
    return `
      <div class="panel__empty panel__empty--compact">
        ${hasModel ? 'Modelo carregado sem camadas operacionais registradas.' : 'Carregue um IFC para preencher camadas e categorias do modelo.'}
      </div>
    `;
  }

  private renderCategory(code: string, label: string, detail: string): string {
    return `
      <div class="panel__tree-item">
        <span class="panel__item-kicker">${this.escape(code)}</span>
        <span class="panel__tree-label">${this.escape(label)}</span>
        <span class="panel__tree-detail">${this.escape(detail)}</span>
      </div>
    `;
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
    this.unsubscribeState?.();
    this.eventUnsubscribers.forEach(unsubscribe => unsubscribe());
    this.container.innerHTML = '';
  }
}
