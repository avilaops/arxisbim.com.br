/**
 * PropertiesPanel - Propriedades do elemento selecionado
 */

import * as THREE from 'three';
import { appController } from '../../../../app/AppController';
import type { DetailedIFCProperties } from '../../../../app/IFCPropertyService';
import { eventBus, EventType } from '../../../../core';
import { uiStore } from '../../../../app/state/uiStore';

export class PropertiesPanel {
  private container: HTMLElement;
  private destroyed = false;
  private renderVersion = 0;
  private unsubscribeState?: () => void;
  private readonly eventUnsubscribers: Array<() => void> = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.setupEventListeners();
    void this.refresh();
  }

  private setupEventListeners(): void {
    const refresh = () => {
      void this.refresh();
    };

    eventBus.on(EventType.OBJECT_SELECTED, refresh);
    eventBus.on(EventType.OBJECT_DESELECTED, refresh);
    eventBus.on(EventType.SELECTION_CHANGED, refresh);
    this.eventUnsubscribers.push(() => {
      eventBus.off(EventType.OBJECT_SELECTED, refresh);
      eventBus.off(EventType.OBJECT_DESELECTED, refresh);
      eventBus.off(EventType.SELECTION_CHANGED, refresh);
    });

    this.unsubscribeState = uiStore.subscribe(() => {
      void this.refresh();
    });
  }

  private async refresh(): Promise<void> {
    if (this.destroyed) return;

    const version = ++this.renderVersion;
    const selectedObject = appController.selectionManager.getSelectedObject();
    const selectedElement = appController.selectionManager.getSelectedElement();

    if (!selectedObject) {
      this.renderEmpty();
      return;
    }

    const selection = uiStore.getState().selection;
    const userData = selectedObject.userData || {};
    const expressID = selectedElement?.expressID ?? selection.expressID ?? userData.expressID ?? userData.ifcId;
    const modelID = selection.modelID ?? userData.modelID ?? userData.modelId ?? 0;

    this.renderInspector(selectedObject, null, true, expressID, modelID);

    if (typeof expressID !== 'number') {
      this.renderInspector(selectedObject, null, false, undefined, modelID);
      return;
    }

    const detailed = await appController.ifcPropertyService.getElementProperties(modelID, expressID);
    if (this.destroyed || version !== this.renderVersion) return;

    this.renderInspector(selectedObject, detailed, false, expressID, modelID);
  }

  private renderEmpty(): void {
    this.container.innerHTML = `
      <div class="panel properties-panel">
        <div class="panel__section">
          <h3 class="panel__section-title">Inspector técnico</h3>
          <div class="panel__empty panel__empty--compact">
            Selecione um elemento no modelo para consultar geometria, IFC, execução e auditoria.
          </div>
        </div>
      </div>
    `;
  }

  private renderInspector(
    object: THREE.Object3D,
    detailed: DetailedIFCProperties | null,
    loading: boolean,
    expressID?: number,
    modelID: number = 0
  ): void {
    const geometryRows = this.getGeometryRows(object);
    const ifcRows = this.getIFCRows(object, detailed, expressID, modelID);
    const propertyRows = detailed?.properties.slice(0, 8).map(prop => this.row(prop.name, this.formatValue(prop.value))).join('') || '';
    const psetRows = detailed?.propertySets.slice(0, 5).map((pset, index) => {
      const name = pset?.Name?.value || pset?.name || `PropertySet ${index + 1}`;
      return this.row('Pset', name);
    }).join('') || '';

    this.container.innerHTML = `
      <div class="panel properties-panel technical-inspector">
        <div class="panel__section inspector-summary">
          <div class="inspector-summary__title">${this.escape(object.name || detailed?.basic.name || 'Elemento selecionado')}</div>
          <div class="inspector-summary__meta">
            <span class="panel-chip is-active">${this.escape(detailed?.basic.type || object.userData?.ifcType || object.type)}</span>
            <span class="panel-chip">${typeof expressID === 'number' ? `#${expressID}` : 'Sem Express ID'}</span>
          </div>
        </div>

        <div class="panel__section">
          <h3 class="panel__section-title">Elemento</h3>
          <div class="inspector-table">
            ${this.row('Nome', object.name || detailed?.basic.name || 'Sem nome')}
            ${this.row('Tipo objeto', object.type)}
            ${this.row('Modelo', uiStore.getState().activeModel.fileName || 'Modelo local')}
            ${this.row('Selecionado', 'Sim')}
          </div>
        </div>

        <div class="panel__section">
          <h3 class="panel__section-title">Geometria</h3>
          <div class="inspector-table">
            ${geometryRows || this.row('Geometria', 'Sem malha selecionada')}
          </div>
        </div>

        <div class="panel__section">
          <h3 class="panel__section-title">IFC</h3>
          <div class="inspector-table">
            ${ifcRows}
            ${loading ? this.row('Propriedades', 'Carregando leitura IFC…') : ''}
          </div>
        </div>

        ${(propertyRows || psetRows) ? `
          <div class="panel__section">
            <h3 class="panel__section-title">Property sets</h3>
            <div class="inspector-table">
              ${psetRows}
              ${propertyRows}
            </div>
          </div>
        ` : ''}

        <div class="panel__section">
          <h3 class="panel__section-title">Execução</h3>
          <div class="inspector-table">
            ${this.row('Vínculo 4D', 'Não vinculado')}
            ${this.row('Planejado', 'Pendente')}
            ${this.row('Executado', 'Sem apontamento')}
          </div>
        </div>

        <div class="panel__section">
          <h3 class="panel__section-title">Auditoria</h3>
          <div class="inspector-table">
            ${this.row('Fonte', detailed ? 'IFCPropertyService' : 'Seleção local')}
            ${this.row('Modelo ID', modelID)}
            ${this.row('Atualizado', new Date().toLocaleTimeString('pt-BR'))}
          </div>
        </div>
      </div>
    `;
  }

  private getGeometryRows(object: THREE.Object3D): string {
    if (!(object instanceof THREE.Mesh)) return '';

    const geometry = object.geometry;
    const positionCount = geometry.attributes.position?.count ?? 0;
    const faceCount = geometry.index ? geometry.index.count / 3 : positionCount / 3;

    return [
      this.row('Tipo', geometry.type),
      this.row('Vértices', this.formatNumber(positionCount)),
      this.row('Faces', this.formatNumber(Math.round(faceCount))),
      this.row('Posição', `${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)}`),
      this.row('Escala', `${object.scale.x.toFixed(2)}, ${object.scale.y.toFixed(2)}, ${object.scale.z.toFixed(2)}`)
    ].join('');
  }

  private getIFCRows(object: THREE.Object3D, detailed: DetailedIFCProperties | null, expressID?: number, modelID: number = 0): string {
    const userData = object.userData || {};
    return [
      this.row('Express ID', typeof expressID === 'number' ? expressID : '—'),
      this.row('Classe', detailed?.basic.type || userData.ifcType || userData.type || '—'),
      this.row('Global ID', detailed?.basic.globalId || userData.GlobalId?.value || userData.globalId || '—'),
      this.row('Nome IFC', detailed?.basic.name || userData.Name?.value || '—'),
      this.row('Descrição', detailed?.basic.description || userData.Description?.value || '—'),
      this.row('Model ID', modelID)
    ].join('');
  }

  private row(label: string, value: string | number | boolean | undefined | null): string {
    return `
      <div class="inspector-row">
        <span class="inspector-row__label">${this.escape(label)}</span>
        <span class="inspector-row__value" title="${this.escape(String(value ?? '—'))}">${this.escape(String(value ?? '—'))}</span>
      </div>
    `;
  }

  private formatValue(value: string | number | boolean): string {
    return typeof value === 'number' ? value.toFixed(3).replace(/\.000$/, '') : String(value);
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('pt-BR').format(value);
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
    this.destroyed = true;
    this.renderVersion++;
    this.unsubscribeState?.();
    this.eventUnsubscribers.forEach(unsubscribe => unsubscribe());
    this.container.innerHTML = '';
  }
}
