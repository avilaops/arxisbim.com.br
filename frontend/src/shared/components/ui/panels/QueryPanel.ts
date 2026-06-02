/**
 * QueryPanel — sidebar panel that runs SQL-like queries against the
 * current IFC scene and surfaces matches.
 *
 * Architecture:
 *   user text ─▶ QueryParser ─▶ [Local QueryEngine OR Backend API] ─▶ matches
 *                 (or parser error shown in red)
 *               + meshesToQueryableElements(scene meshes)
 *               + batchSelectionService.selectMany(matched uuids)
 *
 * Supports both:
 *   - Local engine (fast, client-side)
 *   - Backend API (complex queries, persistent data)
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
import { BIMQueryAPIService } from '../../../../api/v1/services/bim-query.service';
import type { BIMQueryResult } from '../../../../api/v1/services/bim-query.types';

const DEFAULT_SAMPLE = 'SELECT * FROM IfcWall WHERE LoadBearing = true LIMIT 50';

export interface QueryPanelOptions {
  /** Returns the candidate objects (usually scene meshes with IFC userData). */
  getObjects: () => Object3D[];
  /** Optional: Project and model IDs for backend queries */
  projectId?: string;
  modelId?: string;
  /** Use backend API instead of local engine (default: auto-detect) */
  useBackend?: boolean;
}

export class QueryPanel {
  private container: HTMLElement;
  private opts: QueryPanelOptions;
  private engine = new QueryEngine();
  private parser = new QueryParser();
  private lastMap = new Map<string, Object3D>();
  private lastResult: QueryResult | BIMQueryResult | null = null;
  private lastError: string | null = null;
  private useBackend = false;

  constructor(container: HTMLElement, opts: QueryPanelOptions) {
    this.container = container;
    this.opts = opts;
    // Auto-detect backend usage
    this.useBackend = opts.useBackend ?? !!(opts.projectId && opts.modelId);
    this.render();
  }

  private render(): void {
    const status = this.lastError
      ? `<div class="query-panel__status query-panel__status--error">Erro: ${escapeHtml(this.lastError)}</div>`
      : this.lastResult
        ? this.renderStatus(this.lastResult)
        : '<div class="query-panel__status query-panel__status--muted">Pronto para consultar o modelo.</div>';

    const modeToggle = this.opts.projectId && this.opts.modelId
      ? `<label class="query-panel__mode-toggle">
           <input type="checkbox" id="query-mode-toggle" ${this.useBackend ? 'checked' : ''}>
           <span>Usar API Backend (queries complexas)</span>
         </label>`
      : '';

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
          ${modeToggle}
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

  private renderStatus(result: QueryResult | BIMQueryResult): string {
    if ('matched' in result) {
      // Local QueryResult
      return `<div class="query-panel__status">Encontrados <strong>${result.matched}</strong> em ${result.durationMs.toFixed(1)} ms</div>`;
    } else {
      // Backend BIMQueryResult
      const cached = result.cached ? ' (cache)' : '';
      return `<div class="query-panel__status">Encontrados <strong>${result.totalCount}</strong> em ${result.executionTime.toFixed(1)} ms${cached}</div>`;
    }
  }

  private renderResultList(): string {
    if (!this.lastResult) return '<li class="panel__empty">—</li>';

    const elements = this.getElementsFromResult(this.lastResult);
    if (elements.length === 0) {
      return '<li class="panel__empty">Nenhum elemento corresponde.</li>';
    }

    return elements
      .map(
        (el) => `
        <li class="query-panel__result-item" data-id="${escapeHtml(String(el.expressID || el.expressId))}">
          <span class="query-panel__result-type">${escapeHtml(el.ifcType || el.type)}</span>
          <span class="query-panel__result-id">#${escapeHtml(String(el.expressID || el.expressId))}</span>
        </li>`,
      )
      .join('');
  }

  private getElementsFromResult(result: QueryResult | BIMQueryResult): any[] {
    if ('matched' in result) {
      return result.elements || [];
    } else {
      return result.elements || [];
    }
  }

  private attach(): void {
    const run = this.container.querySelector<HTMLButtonElement>('#query-run');
    const clear = this.container.querySelector<HTMLButtonElement>('#query-clear');
    const input = this.container.querySelector<HTMLTextAreaElement>('#query-input');
    const modeToggle = this.container.querySelector<HTMLInputElement>('#query-mode-toggle');

    run?.addEventListener('click', () => this.run());
    clear?.addEventListener('click', () => {
      batchSelectionService.clearAll();
    });

    modeToggle?.addEventListener('change', (e) => {
      this.useBackend = (e.target as HTMLInputElement).checked;
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
  async run(): Promise<void> {
    const input = this.container.querySelector<HTMLTextAreaElement>('#query-input');
    const text = input?.value?.trim() ?? '';
    if (!text) {
      this.lastError = 'Consulta vazia.';
      this.lastResult = null;
      this.render();
      return;
    }

    if (this.useBackend) {
      await this.runBackend(text);
    } else {
      this.runLocal(text);
    }
  }

  /** Run query using local engine */
  private runLocal(text: string): void {
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

  /** Run query using backend API */
  private async runBackend(text: string): Promise<void> {
    if (!this.opts.projectId || !this.opts.modelId) {
      this.lastError = 'Backend query requires projectId and modelId';
      this.lastResult = null;
      this.render();
      return;
    }

    try {
      const result = await BIMQueryAPIService.executeQueryString(
        this.opts.projectId,
        this.opts.modelId,
        text
      );

      this.lastError = null;
      this.lastResult = result;

      // Map elements to scene objects (if available)
      const objects = this.opts.getObjects();
      const { elementToObject } = meshesToQueryableElements(objects);
      this.lastMap = elementToObject;

      if (result.elements) {
        const uuids = result.elements
          .map((e) => this.lastMap.get(String(e.expressId))?.uuid)
          .filter((u): u is string => !!u);

        if (uuids.length > 0) {
          batchSelectionService.selectMany(uuids);
        }
      }

      this.render();
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
      this.lastResult = null;
      this.render();
    }
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
