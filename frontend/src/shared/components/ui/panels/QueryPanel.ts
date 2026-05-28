/**
 * QueryPanel — sidebar panel that runs SQL-like queries against the
 * current IFC scene and surfaces matches.
 *
 * Architecture:
 *   user text ─▶ QueryParser ─▶ QueryEngine ─▶ matches
 *                 (or parser error shown in red)
 *               + meshesToQueryableElements(scene meshes)
 *               + batchSelectionService.selectMany(matched uuids)
 *
 * Wires through the Sprint 4 + Sprint 5 modules without touching the
 * Three.js renderer directly — visual highlight is the subscriber's job.
 */

import type { Object3D } from 'three';
import {
  QueryEngine,
  QueryParser,
  meshesToQueryableElements,
  type Query,
  type QueryableElement,
  type QueryResult,
} from '../../../../features/bim-4d/bim/query';
import { batchSelectionService } from '../../../../inspector/BatchSelectionService';

const DEFAULT_SAMPLE = 'SELECT * FROM IfcWall WHERE LoadBearing = true LIMIT 50';

export interface QueryPanelOptions {
  /** Returns the candidate objects (usually scene meshes with IFC userData). */
  getObjects: () => Object3D[];
}

export class QueryPanel {
  private container: HTMLElement;
  private opts: QueryPanelOptions;
  private engine = new QueryEngine();
  private parser = new QueryParser();
  private lastMap = new Map<string, Object3D>();
  private lastResult: QueryResult | null = null;
  private lastError: string | null = null;

  constructor(container: HTMLElement, opts: QueryPanelOptions) {
    this.container = container;
    this.opts = opts;
    this.render();
  }

  private render(): void {
    const status = this.lastError
      ? `<div class="query-panel__status query-panel__status--error">Erro: ${escapeHtml(this.lastError)}</div>`
      : this.lastResult
        ? `<div class="query-panel__status">Encontrados <strong>${this.lastResult.matched}</strong> em ${this.lastResult.durationMs.toFixed(1)} ms</div>`
        : '<div class="query-panel__status query-panel__status--muted">Pronto para consultar o modelo.</div>';

    this.container.innerHTML = `
      <div class="panel query-panel">
        <div class="panel__section">
          <div class="panel__section-title">Consulta BIM</div>
          <textarea
            id="query-input"
            class="query-panel__input"
            rows="4"
            placeholder="Ex.: SELECT * FROM IfcWall WHERE FireRating = '60min'"
          >${escapeHtml(DEFAULT_SAMPLE)}</textarea>
          <div class="query-panel__actions">
            <button type="button" class="btn btn--primary" id="query-run">Executar</button>
            <button type="button" class="btn btn--ghost" id="query-clear">Limpar seleção</button>
          </div>
          ${status}
        </div>
        <div class="panel__section">
          <div class="panel__section-title">Resultados</div>
          <ul class="query-panel__results" id="query-results">
            ${this.renderResultList()}
          </ul>
        </div>
      </div>
    `;
    this.attach();
  }

  private renderResultList(): string {
    if (!this.lastResult) return '<li class="panel__empty">—</li>';
    if (this.lastResult.elements.length === 0) {
      return '<li class="panel__empty">Nenhum elemento corresponde.</li>';
    }
    return this.lastResult.elements
      .map(
        (el) => `
        <li class="query-panel__result-item" data-id="${escapeHtml(String(el.expressID))}">
          <span class="query-panel__result-type">${escapeHtml(el.ifcType)}</span>
          <span class="query-panel__result-id">#${escapeHtml(String(el.expressID))}</span>
        </li>`,
      )
      .join('');
  }

  private attach(): void {
    const run = this.container.querySelector<HTMLButtonElement>('#query-run');
    const clear = this.container.querySelector<HTMLButtonElement>('#query-clear');
    const input = this.container.querySelector<HTMLTextAreaElement>('#query-input');

    run?.addEventListener('click', () => this.run());
    clear?.addEventListener('click', () => {
      batchSelectionService.clearAll();
    });
    input?.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Enter executa.
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        this.run();
      }
    });

    this.container
      .querySelectorAll<HTMLLIElement>('.query-panel__result-item')
      .forEach((li) => {
        li.addEventListener('click', () => {
          const id = li.dataset.id;
          if (!id) return;
          const obj = this.lastMap.get(id);
          if (obj) batchSelectionService.selectMany([obj.uuid]);
        });
      });
  }

  /** Public for tests + Ctrl+Enter handler. */
  run(): void {
    const input = this.container.querySelector<HTMLTextAreaElement>('#query-input');
    const text = input?.value?.trim() ?? '';
    if (!text) {
      this.lastError = 'Consulta vazia.';
      this.lastResult = null;
      this.render();
      return;
    }

    let query: Query;
    try {
      query = this.parser.parse(text);
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
      this.lastResult = null;
      this.render();
      return;
    }

    const objects = this.opts.getObjects();
    const { elements, elementToObject } = meshesToQueryableElements(objects);
    this.lastMap = elementToObject;

    const result: QueryResult = this.engine.execute(elements as QueryableElement[], query);
    this.lastError = null;
    this.lastResult = result;

    const uuids = result.elements
      .map((e) => this.lastMap.get(String(e.expressID))?.uuid)
      .filter((u): u is string => !!u);
    batchSelectionService.selectMany(uuids);

    this.render();
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
