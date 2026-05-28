/**
 * BudgetPanel — sidebar UI for creating/editing Budgets and rendering an
 * orçado vs realizado report against the last TakeoffResult.
 *
 *   user creates budget → adds cost items → optionally links selected IFC
 *   elements via batchSelectionService → clicks "Calcular relatório" →
 *   BudgetCalculator runs against the takeoff getter → table renders
 *   deltas → "Exportar CSV" emits BudgetExporter.reportToCsv.
 */

import {
  BudgetManager,
  BudgetCalculator,
  BudgetExporter,
  type Budget,
  type BudgetReport,
  type TakeoffResult,
  type BudgetApiClient,
} from '../../../../features/bim-4d/bim/5d';
import { batchSelectionService } from '../../../../inspector/BatchSelectionService';

export interface BudgetPanelOptions {
  /** Returns the latest TakeoffResult or null when none was computed yet. */
  getTakeoffResult: () => TakeoffResult | null;
  /** Optional manager (DI for tests). */
  manager?: BudgetManager;
  calculator?: BudgetCalculator;
  exporter?: BudgetExporter;
  /** Returns currently selected element ids (default: BatchSelectionService uuids). */
  getSelectedElementIds?: () => Array<string | number>;
  downloader?: (filename: string, csv: string) => void;
  /** When provided, panel mirrors writes to the backend `/api/v1/budgets`. */
  apiClient?: BudgetApiClient;
  /** Project to scope persisted budgets under. Required if `apiClient` is set. */
  projectId?: string;
  /** Auto-load existing budgets from the API on construction (default: true when apiClient is set). */
  autoLoad?: boolean;
}

export class BudgetPanel {
  private container: HTMLElement;
  private opts: BudgetPanelOptions;
  private manager: BudgetManager;
  private calculator: BudgetCalculator;
  private exporter: BudgetExporter;
  private getSelected: () => Array<string | number>;
  private downloader: (filename: string, csv: string) => void;
  private apiClient: BudgetApiClient | null;
  private projectId: string | null;
  private activeBudgetId: string | null = null;
  private lastReport: BudgetReport | null = null;
  private status = '';

  constructor(container: HTMLElement, opts: BudgetPanelOptions) {
    this.container = container;
    this.opts = opts;
    this.manager = opts.manager ?? new BudgetManager();
    this.calculator = opts.calculator ?? new BudgetCalculator();
    this.exporter = opts.exporter ?? new BudgetExporter();
    this.getSelected = opts.getSelectedElementIds ?? (() => batchSelectionService.getSelectedUuids());
    this.downloader = opts.downloader ?? defaultDownloader;
    this.apiClient = opts.apiClient ?? null;
    this.projectId = opts.projectId ?? null;
    this.render();
    if (this.apiClient && (opts.autoLoad ?? true)) {
      void this.loadFromApi();
    }
  }

  /** Fetches existing budgets from the API and seeds the local manager. */
  async loadFromApi(): Promise<void> {
    if (!this.apiClient) return;
    try {
      const remote = await this.apiClient.list(this.projectId ?? undefined);
      // list() returns metadata only; hydrate items for each budget in parallel.
      const detailed = await Promise.all(
        remote.map((b) => this.apiClient!.get(b.id).catch(() => b)),
      );
      for (const b of detailed) {
        if (this.manager.get(b.id)) continue;
        const items = (b.items ?? []).map((i) => ({
          id: i.id,
          description: i.description,
          unit: i.unit,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          linkedElements: i.linkedElements ?? [],
        }));
        this.manager.create({ id: b.id, name: b.name, items });
      }
      this.render();
    } catch (err) {
      this.status = `Falha ao carregar orçamentos: ${(err as Error).message}`;
      this.render();
    }
  }

  private active(): Budget | null {
    return this.activeBudgetId ? this.manager.get(this.activeBudgetId) ?? null : null;
  }

  private render(): void {
    const budgets = this.manager.list();
    const active = this.active();

    this.container.innerHTML = `
      <div class="panel budget-panel">
        <div class="panel__section">
          <div class="budget-panel__create">
            <input type="text" id="budget-name" placeholder="Nome do orçamento" />
            <button type="button" class="btn btn--primary" id="budget-create">Criar</button>
          </div>
          <div class="budget-panel__list">
            ${
              budgets.length === 0
                ? '<div class="panel__empty">Nenhum orçamento.</div>'
                : budgets
                    .map(
                      (b) =>
                        `<div class="budget-panel__list-item ${b.id === this.activeBudgetId ? 'is-active' : ''}" data-budget-id="${escapeHtml(b.id)}">
                          <span>${escapeHtml(b.name)}</span>
                          <span class="budget-panel__list-total">R$ ${b.totalCost.toFixed(2)}</span>
                        </div>`,
                    )
                    .join('')
            }
          </div>
        </div>

        ${active ? this.renderActive(active) : ''}

        ${this.status ? `<div class="budget-panel__status">${escapeHtml(this.status)}</div>` : ''}

        ${this.lastReport ? this.renderReport(this.lastReport) : ''}
      </div>
    `;
    this.attach();
  }

  private renderActive(active: Budget): string {
    return `
      <div class="panel__section">
        <div class="panel__section-title">${escapeHtml(active.name)} — composição</div>
        <div class="budget-panel__additem">
          <input type="text" id="ci-desc" placeholder="Descrição" />
          <input type="text" id="ci-unit" placeholder="un" />
          <input type="number" id="ci-qty" placeholder="Qtd" step="0.01" />
          <input type="number" id="ci-price" placeholder="R$" step="0.01" />
          <button type="button" class="btn" id="ci-add">Adicionar</button>
        </div>
        <button type="button" class="btn btn--ghost" id="ci-link-selected">Vincular selecionados (${this.getSelected().length})</button>
        <table class="budget-panel__table">
          <thead><tr><th>Item</th><th>Qtd.</th><th>Un.</th><th>R$/un</th><th>Total</th><th>Vínculos</th><th></th></tr></thead>
          <tbody>
            ${active.items
              .map(
                (i) => `<tr data-item-id="${escapeHtml(i.id)}">
                  <td><input type="text" class="ci-edit ci-desc" value="${escapeHtml(i.description)}" data-field="description" data-item-id="${escapeHtml(i.id)}" /></td>
                  <td class="num"><input type="number" class="ci-edit ci-qty" value="${i.quantity}" data-field="quantity" data-item-id="${escapeHtml(i.id)}" step="0.01" /></td>
                  <td><input type="text" class="ci-edit ci-unit" value="${escapeHtml(String(i.unit))}" data-field="unit" data-item-id="${escapeHtml(i.id)}" /></td>
                  <td class="num"><input type="number" class="ci-edit ci-price" value="${i.unitPrice.toFixed(2)}" data-field="unitPrice" data-item-id="${escapeHtml(i.id)}" step="0.01" /></td>
                  <td class="num">${i.totalPrice.toFixed(2)}</td>
                  <td class="num">
                    <button type="button" class="ci-link-picker" data-item-id="${escapeHtml(i.id)}" title="Vincular elementos">
                      ${i.linkedElements.length} vínculos
                    </button>
                  </td>
                  <td><button type="button" class="ci-remove" data-item-id="${escapeHtml(i.id)}">×</button></td>
                </tr>`,
              )
              .join('')}
          </tbody>
        </table>
        <div class="budget-panel__actions">
          <button type="button" class="btn btn--primary" id="budget-calc">Calcular relatório</button>
          <button type="button" class="btn btn--ghost" id="budget-export" ${this.lastReport ? '' : 'disabled'}>Exportar CSV</button>
        </div>
      </div>
    `;
  }

  private renderReport(r: BudgetReport): string {
    const rows = r.items
      .map(
        (i) => `<tr>
          <td>${escapeHtml(i.description)}</td>
          <td class="num">${i.budgetedQuantity}</td>
          <td class="num">${i.actualQuantity}</td>
          <td class="num">${i.quantityDelta}</td>
          <td class="num">${i.budgetedCost.toFixed(2)}</td>
          <td class="num">${i.actualCost.toFixed(2)}</td>
          <td class="num">${i.costDelta.toFixed(2)}</td>
          <td>${i.unlinked ? 'Pendente' : ''}</td>
        </tr>`,
      )
      .join('');
    return `
      <div class="panel__section">
        <div class="panel__section-title">Relatório (orçado × realizado)</div>
        <table class="budget-panel__table budget-panel__report">
          <thead><tr><th>Item</th><th>Q.orç</th><th>Q.real</th><th>ΔQ</th><th>R$ orç</th><th>R$ real</th><th>ΔR$</th><th>!</th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td><strong>Total</strong></td><td></td><td></td><td></td>
              <td class="num"><strong>${r.totalBudgeted.toFixed(2)}</strong></td>
              <td class="num"><strong>${r.totalActual.toFixed(2)}</strong></td>
              <td class="num"><strong>${r.totalDelta.toFixed(2)}</strong></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  }

  private attach(): void {
            // Picker visual para linkedElements
            this.container.querySelectorAll<HTMLButtonElement>('.ci-link-picker').forEach((btn) => {
              btn.addEventListener('click', async () => {
                const itemId = btn.dataset.itemId;
                if (!itemId || !this.activeBudgetId) return;
                // Simples: usa seleção atual do batchSelectionService
                const selected = this.getSelected();
                if (selected.length === 0) {
                  this.status = 'Selecione elementos na cena para vincular.';
                  this.render();
                  return;
                }
                btn.disabled = true;
                btn.classList.add('ci-link-picker--loading');
                try {
                  if (this.apiClient) {
                    await this.apiClient.updateItem(this.activeBudgetId, itemId, { linkedElements: selected });
                  }
                  this.manager.linkElements(this.activeBudgetId, itemId, selected);
                  btn.classList.remove('ci-link-picker--loading');
                  btn.classList.add('ci-link-picker--success');
                  setTimeout(() => btn.classList.remove('ci-link-picker--success'), 800);
                  this.status = `${selected.length} elemento(s) vinculados.`;
                  this.render();
                } catch (err) {
                  btn.classList.remove('ci-link-picker--loading');
                  btn.classList.add('ci-link-picker--error');
                  setTimeout(() => btn.classList.remove('ci-link-picker--error'), 1200);
                  this.status = 'Erro ao vincular elementos.';
                  this.render();
                } finally {
                  btn.disabled = false;
                }
              });
            });
        // Edição inline de itens
        this.container.querySelectorAll<HTMLInputElement>('.ci-edit').forEach((input) => {
          let lastValue = input.value;
          input.addEventListener('blur', async () => {
            const itemId = input.dataset.itemId;
            const field = input.dataset.field as 'description' | 'quantity' | 'unit' | 'unitPrice';
            if (!itemId || !field) return;
            let value: string | number = input.value;
            if (field === 'quantity' || field === 'unitPrice') {
              value = parseFloat(value as string);
              if (!Number.isFinite(value)) return;
            }
            if (String(value) === lastValue) return;
            lastValue = String(value);
            input.disabled = true;
            input.classList.add('ci-edit--loading');
            try {
              if (this.apiClient && this.activeBudgetId) {
                const patch: any = { [field]: value };
                await this.apiClient.updateItem(this.activeBudgetId, itemId, patch);
                this.manager.updateItem(this.activeBudgetId, itemId, patch);
              } else if (this.activeBudgetId) {
                this.manager.updateItem(this.activeBudgetId, itemId, { [field]: value });
              }
              input.classList.remove('ci-edit--loading');
              input.classList.add('ci-edit--success');
              setTimeout(() => input.classList.remove('ci-edit--success'), 800);
            } catch (err) {
              input.classList.remove('ci-edit--loading');
              input.classList.add('ci-edit--error');
              setTimeout(() => input.classList.remove('ci-edit--error'), 1200);
            } finally {
              input.disabled = false;
            }
          });
        });
    const q = <T extends HTMLElement>(sel: string): T | null => this.container.querySelector<T>(sel);

    q<HTMLButtonElement>('#budget-create')?.addEventListener('click', () => {
      const input = q<HTMLInputElement>('#budget-name');
      const name = (input?.value ?? '').trim();
      if (!name) {
        this.status = 'Nome obrigatório.';
        this.render();
        return;
      }
      void this.createBudget(name);
    });

    this.container.querySelectorAll<HTMLElement>('.budget-panel__list-item').forEach((el) => {
      el.addEventListener('click', () => {
        this.activeBudgetId = el.dataset.budgetId ?? null;
        this.lastReport = null;
        this.render();
      });
    });

    q<HTMLButtonElement>('#ci-add')?.addEventListener('click', () => {
      if (!this.activeBudgetId) return;
      const desc = (q<HTMLInputElement>('#ci-desc')?.value ?? '').trim();
      const unit = (q<HTMLInputElement>('#ci-unit')?.value ?? 'un').trim();
      const qty = parseFloat(q<HTMLInputElement>('#ci-qty')?.value ?? '0');
      const price = parseFloat(q<HTMLInputElement>('#ci-price')?.value ?? '0');
      if (!desc || !Number.isFinite(qty) || !Number.isFinite(price)) {
        this.status = 'Item inválido.';
        this.render();
        return;
      }
      void this.addCostItem({ description: desc, unit, quantity: qty, unitPrice: price });
    });

    q<HTMLButtonElement>('#ci-link-selected')?.addEventListener('click', () => {
      const active = this.active();
      if (!active) return;
      const sel = this.getSelected();
      if (sel.length === 0 || active.items.length === 0) {
        this.status = 'Selecione elementos e tenha ao menos 1 item.';
        this.render();
        return;
      }
      // link to the last added item (simple UX; future: per-row picker).
      const last = active.items[active.items.length - 1];
      this.manager.linkElements(active.id, last.id, sel);
      this.status = `${sel.length} elemento(s) vinculados a "${last.description}".`;
      this.render();
    });

    this.container.querySelectorAll<HTMLButtonElement>('.ci-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!this.activeBudgetId) return;
        const id = btn.dataset.itemId;
        if (id) void this.removeCostItem(this.activeBudgetId, id);
      });
    });

    q<HTMLButtonElement>('#budget-calc')?.addEventListener('click', () => {
      this.calculate();
    });

    q<HTMLButtonElement>('#budget-export')?.addEventListener('click', () => {
      this.exportReport();
    });
  }

  /** Public for tests. */
  calculate(): BudgetReport | null {
    const active = this.active();
    if (!active) return null;
    const takeoff = this.opts.getTakeoffResult();
    if (!takeoff) {
      this.status = 'Gere os quantitativos antes de calcular o relatório.';
      this.lastReport = null;
      this.render();
      return null;
    }
    this.lastReport = this.calculator.calculate(active, takeoff);
    this.status = '';
    this.render();
    return this.lastReport;
  }

  /** Public for tests. */
  exportReport(): void {
    if (!this.lastReport) return;
    const csv = this.exporter.reportToCsv(this.lastReport);
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    this.downloader(`budget-report-${ts}.csv`, csv);
  }

  /** Public for tests. */
  getManager(): BudgetManager {
    return this.manager;
  }

  private async createBudget(name: string): Promise<void> {
    if (this.apiClient && this.projectId) {
      try {
        const remote = await this.apiClient.create(this.projectId, { name });
        const b = this.manager.create({ id: remote.id, name: remote.name });
        this.activeBudgetId = b.id;
      } catch (err) {
        this.status = `Falha ao criar orçamento: ${(err as Error).message}`;
        this.render();
        return;
      }
    } else {
      const b = this.manager.create({ name });
      this.activeBudgetId = b.id;
    }
    this.lastReport = null;
    this.status = '';
    this.render();
  }

  private async addCostItem(input: {
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
  }): Promise<void> {
    if (!this.activeBudgetId) return;
    if (this.apiClient) {
      try {
        const remote = await this.apiClient.addItem(this.activeBudgetId, input);
        this.manager.addItem(this.activeBudgetId, { id: remote.id, ...input });
      } catch (err) {
        this.status = `Falha ao adicionar item: ${(err as Error).message}`;
        this.render();
        return;
      }
    } else {
      this.manager.addItem(this.activeBudgetId, input);
    }
    this.status = '';
    this.render();
  }

  private async removeCostItem(budgetId: string, itemId: string): Promise<void> {
    if (this.apiClient) {
      try {
        await this.apiClient.removeItem(budgetId, itemId);
      } catch (err) {
        this.status = `Falha ao remover item: ${(err as Error).message}`;
        this.render();
        return;
      }
    }
    this.manager.removeItem(budgetId, itemId);
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
