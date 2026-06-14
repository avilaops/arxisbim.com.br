import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CostService, CostCalculation } from '../api/v1/services/cost.service.js';


@customElement('cost-calculation-panel')
export class CostCalculationPanel extends LitElement {
  @property() scenarioId: string = '';
  @state() calculation: CostCalculation | null = null;
  @state() loading = false;
  @state() error: string | null = null;
  @state() activeTab: 'summary' | 'type' | 'storey' | 'category' = 'summary';

  async loadCalculation() {
    if (!this.scenarioId) return;

    this.loading = true;
    this.error = null;

    try {
      this.calculation = await CostService.getCalculation(this.scenarioId);
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Erro ao carregar cálculo';
    } finally {
      this.loading = false;
    }
  }

  async handleRecalculate() {
    if (!this.scenarioId) return;

    this.loading = true;
    try {
      this.calculation = await CostService.recalculate(this.scenarioId);
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Erro ao recalcular';
    } finally {
      this.loading = false;
    }
  }

  async handleExport() {
    if (!this.scenarioId || !this.calculation) return;

    try {
      const blob = await CostService.exportXLSX(this.scenarioId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cost-breakdown-${this.scenarioId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Erro ao exportar';
    }
  }

  render() {
    if (!this.calculation) {
      return html`
        <div class="empty">
          <p>Nenhum cálculo disponível</p>
          <button @click=${this.loadCalculation}>Carregar</button>
        </div>
      `;
    }

    return html`
      <div class="panel">
        <div class="header">
          <h2>Cálculo de Custos</h2>
          <div class="actions">
            <button @click=${this.handleRecalculate} ?disabled=${this.loading}>
              ${this.loading ? 'Calculando...' : 'Recalcular'}
            </button>
            <button @click=${this.handleExport} class="primary">Exportar XLSX</button>
          </div>
        </div>

        ${this.error ? html`<div class="error">${this.error}</div>` : ''}

        <div class="tabs">
          <button
            class=${this.activeTab === 'summary' ? 'active' : ''}
            @click=${() => this.activeTab = 'summary'}
          >
            Resumo
          </button>
          <button
            class=${this.activeTab === 'type' ? 'active' : ''}
            @click=${() => this.activeTab = 'type'}
          >
            Por Tipo
          </button>
          <button
            class=${this.activeTab === 'storey' ? 'active' : ''}
            @click=${() => this.activeTab = 'storey'}
          >
            Por Pavimento
          </button>
          <button
            class=${this.activeTab === 'category' ? 'active' : ''}
            @click=${() => this.activeTab = 'category'}
          >
            Por Categoria
          </button>
        </div>

        <div class="content">
          ${this.activeTab === 'summary' ? this.renderSummary() : ''}
          ${this.activeTab === 'type' ? this.renderByType() : ''}
          ${this.activeTab === 'storey' ? this.renderByStorey() : ''}
          ${this.activeTab === 'category' ? this.renderByCategory() : ''}
        </div>

        <div class="footer">
          <small>Atualizado: ${new Date(this.calculation.calculated_at).toLocaleString('pt-BR')}</small>
        </div>
      </div>
    `;
  }

  private renderSummary() {
    return html`
      <div class="summary-grid">
        <div class="metric">
          <span class="label">CUSTO TOTAL</span>
          <span class="value">R$ ${this.formatCurrency(this.calculation!.total_cost)}</span>
        </div>
        <div class="metric">
          <span class="label">Itens de Custo</span>
          <span class="value">${Object.keys(this.calculation!.breakdown.by_type).length}</span>
        </div>
        <div class="metric">
          <span class="label">Pavimentos</span>
          <span class="value">${Object.keys(this.calculation!.breakdown.by_storey).length}</span>
        </div>
        <div class="metric">
          <span class="label">Categorias</span>
          <span class="value">${Object.keys(this.calculation!.breakdown.by_category).length}</span>
        </div>
      </div>
    `;
  }

  private renderByType() {
    return html`
      <table class="breakdown-table">
        <thead>
          <tr>
            <th>Tipo IFC</th>
            <th>Qtd</th>
            <th>Unidade</th>
            <th>Total (R$)</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(this.calculation!.breakdown.by_type).map(
            ([type, data]) => html`
              <tr>
                <td>${type}</td>
                <td>${parseInt(data.quantity)}</td>
                <td>${data.unit}</td>
                <td>R$ ${this.formatCurrency(data.total_cost)}</td>
              </tr>
            `
          )}
        </tbody>
      </table>
    `;
  }

  private renderByStorey() {
    return html`
      <table class="breakdown-table">
        <thead>
          <tr>
            <th>Pavimento</th>
            <th>Total (R$)</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(this.calculation!.breakdown.by_storey).map(
            ([storey, data]) => html`
              <tr>
                <td>${storey === 'null' ? 'Sem pavimento' : `Nível ${storey}`}</td>
                <td>R$ ${this.formatCurrency(data.total_cost)}</td>
              </tr>
            `
          )}
        </tbody>
      </table>
    `;
  }

  private renderByCategory() {
    const categoryLabels: Record<string, string> = {
      structure: 'Estrutura',
      mep: 'MEP (Mecânica, Elétrica, Hidráulica)',
      architecture: 'Arquitetura',
      other: 'Outros',
    };

    return html`
      <table class="breakdown-table">
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Total (R$)</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(this.calculation!.breakdown.by_category).map(
            ([cat, data]) => html`
              <tr>
                <td>${categoryLabels[cat] || cat}</td>
                <td>R$ ${this.formatCurrency(data.total_cost)}</td>
              </tr>
            `
          )}
        </tbody>
      </table>
    `;
  }

  private formatCurrency(value: string): string {
    const num = parseFloat(value);
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  static styles = css`
    :host {
      display: block;
      font-family: var(--font-family, system-ui);
    }

    .panel {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    button {
      padding: 8px 16px;
      background: #f5f5f5;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }

    button:hover:not(:disabled) {
      background: #efefef;
    }

    button.primary {
      background: #2196F3;
      color: white;
      border: none;
    }

    button.primary:hover {
      background: #1976D2;
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .error {
      background: #ffebee;
      color: #c62828;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 16px;
      font-size: 13px;
    }

    .tabs {
      display: flex;
      gap: 0;
      margin-bottom: 16px;
      border-bottom: 1px solid #e0e0e0;
    }

    .tabs button {
      flex: 1;
      background: none;
      border: none;
      border-bottom: 3px solid transparent;
      padding: 12px 16px;
      cursor: pointer;
      font-size: 13px;
      border-radius: 0;
    }

    .tabs button.active {
      border-bottom-color: #2196F3;
      color: #2196F3;
    }

    .content {
      min-height: 200px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin: 16px 0;
    }

    .metric {
      display: flex;
      flex-direction: column;
      padding: 16px;
      background: #f9f9f9;
      border-radius: 4px;
    }

    .metric .label {
      font-size: 11px;
      color: #999;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .metric .value {
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }

    .breakdown-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .breakdown-table th {
      background: #f5f5f5;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #e0e0e0;
    }

    .breakdown-table td {
      padding: 12px;
      border-bottom: 1px solid #f0f0f0;
    }

    .breakdown-table tr:hover {
      background: #f9f9f9;
    }

    .footer {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
      color: #999;
      font-size: 12px;
    }

    .empty {
      padding: 40px 20px;
      text-align: center;
      color: #999;
    }
  `;
}
