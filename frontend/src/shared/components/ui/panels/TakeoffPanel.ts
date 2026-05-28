/**
 * TakeoffPanel — sidebar panel that runs a takeoff over the scene meshes
 * and renders an aggregated table (by IFC type × quantity name).
 *
 *   user clicks "Calcular"
 *     ─▶ meshesToIfcElements(opts.getObjects())
 *     ─▶ TakeoffManager.run(elements)
 *     ─▶ render byType table
 *     ─▶ user clicks "Exportar CSV" → blob download
 */

import type { Object3D } from 'three';
import {
  TakeoffManager,
  meshesToIfcElements,
  type TakeoffResult,
} from '../../../../features/bim-4d/bim/5d';

export interface TakeoffPanelOptions {
  /** Returns the candidate scene objects (usually meshes with IFC userData). */
  getObjects: () => Object3D[];
  /** Optional injected manager (tests). */
  manager?: TakeoffManager;
  /** Optional download trigger (tests stub it out). Default: programmatic <a download>. */
  downloader?: (filename: string, csv: string) => void;
}

export class TakeoffPanel {
  private container: HTMLElement;
  private opts: TakeoffPanelOptions;
  private manager: TakeoffManager;
  private downloader: (filename: string, csv: string) => void;
  private lastResult: TakeoffResult | null = null;
  private lastError: string | null = null;
  private running = false;

  constructor(container: HTMLElement, opts: TakeoffPanelOptions) {
    this.container = container;
    this.opts = opts;
    this.manager = opts.manager ?? new TakeoffManager();
    this.downloader = opts.downloader ?? defaultDownloader;
    this.render();
  }

  private render(): void {
    const status = this.lastError
      ? `<div class="takeoff-panel__status takeoff-panel__status--error">Erro: ${escapeHtml(this.lastError)}</div>`
      : this.running
        ? '<div class="takeoff-panel__status">Calculando…</div>'
        : this.lastResult
          ? `<div class="takeoff-panel__status">${this.lastResult.quantities.length} quantitativos em ${this.lastResult.durationMs.toFixed(1)} ms · ${this.lastResult.skippedElementIds.length} ignorados</div>`
          : '<div class="takeoff-panel__status takeoff-panel__status--muted">Carregue um modelo IFC e gere os quantitativos.</div>';

    this.container.innerHTML = `
      <div class="panel takeoff-panel">
        <div class="panel__section">
          <div class="takeoff-panel__actions">
            <button type="button" class="btn btn--primary" id="takeoff-run" ${this.running ? 'disabled' : ''}>Gerar quantitativos</button>
            <button type="button" class="btn btn--ghost" id="takeoff-export" ${this.lastResult ? '' : 'disabled'}>Exportar CSV</button>
          </div>
          ${status}
        </div>
        <div class="panel__section">
          <div class="panel__section-title">Quantitativos por tipo</div>
          <div class="takeoff-panel__results" id="takeoff-results">
            ${this.renderTable()}
          </div>
        </div>
      </div>
    `;
    this.attach();
  }

  private renderTable(): string {
    if (!this.lastResult) return '<div class="panel__empty">—</div>';
    const types = Object.keys(this.lastResult.byType).sort();
    if (types.length === 0) return '<div class="panel__empty">Nenhum quantitativo extraído.</div>';

    const rows: string[] = [];
    for (const ifcType of types) {
      const props = this.lastResult.byType[ifcType];
      const names = Object.keys(props).sort();
      for (const name of names) {
        const cell = props[name];
        rows.push(
          `<tr>
             <td class="takeoff-panel__cell-type">${escapeHtml(ifcType)}</td>
             <td>${escapeHtml(name)}</td>
             <td class="takeoff-panel__cell-num">${cell.sum.toFixed(2)}</td>
             <td>${escapeHtml(cell.unit)}</td>
             <td class="takeoff-panel__cell-num">${cell.count}</td>
           </tr>`,
        );
      }
    }

    return `
      <table class="takeoff-panel__table">
        <thead>
          <tr><th>Tipo</th><th>Quantidade</th><th>Soma</th><th>Unidade</th><th>Elementos</th></tr>
        </thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    `;
  }

  private attach(): void {
    this.container.querySelector<HTMLButtonElement>('#takeoff-run')?.addEventListener('click', () => {
      void this.run();
    });
    this.container.querySelector<HTMLButtonElement>('#takeoff-export')?.addEventListener('click', () => {
      this.exportCsv();
    });
  }

  /** Public for tests. */
  async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.lastError = null;
    this.render();

    try {
      const meshes = this.opts.getObjects();
      const { elements } = meshesToIfcElements(meshes);
      this.lastResult = await this.manager.run(elements);
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err);
      this.lastResult = null;
    } finally {
      this.running = false;
      this.render();
    }
  }

  /** Public for tests. */
  exportCsv(): void {
    if (!this.lastResult) return;
    const csv = takeoffResultToCsv(this.lastResult);
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    this.downloader(`takeoff-${ts}.csv`, csv);
  }

  /** Returns the last TakeoffResult produced by `run()`, or null. */
  getLastResult(): TakeoffResult | null {
    return this.lastResult;
  }
}

export function takeoffResultToCsv(result: TakeoffResult): string {
  const header = ['ifc_type', 'quantity_name', 'sum', 'unit', 'element_count'];
  const rows: string[][] = [header];
  for (const ifcType of Object.keys(result.byType).sort()) {
    const props = result.byType[ifcType];
    for (const name of Object.keys(props).sort()) {
      const cell = props[name];
      rows.push([ifcType, name, String(cell.sum), cell.unit, String(cell.count)]);
    }
  }
  return rows.map((r) => r.map(escapeCsvCell).join(',')).join('\n');
}

function escapeCsvCell(raw: string): string {
  const s = raw ?? '';
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function defaultDownloader(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
