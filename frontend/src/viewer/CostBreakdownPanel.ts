/**
 * CostBreakdownPanel - Lit element showing cost summary and drill-down
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { getAPIClient } from '../api/v1/client.js';

@customElement('cost-breakdown-panel')
export class CostBreakdownPanel extends LitElement {
  @property() declare scenarioId: string;
  @state() declare private breakdown: any;
  @state() declare private totalCost: string;
  @state() declare private activeTab: 'summary' | 'type' | 'storey' | 'category';
  @state() declare private loading: boolean;
  @state() declare private selectedElement: any;

  constructor() {
    super();
    this.scenarioId = '';
    this.breakdown = null;
    this.totalCost = '0.00';
    this.activeTab = 'summary';
    this.loading = false;
    this.selectedElement = null;
  }

  static styles = css`
    :host {
      display: block;
      position: absolute;
      right: 20px;
      top: 80px;
      width: 380px;
      max-height: 600px;
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      z-index: 1000;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .header {
      padding: 16px;
      border-bottom: 1px solid #eee;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .header h3 {
      margin: 0 0 8px 0;
      font-size: 18px;
      font-weight: 600;
    }

    .total-cost {
      font-size: 24px;
      font-weight: 700;
      font-family: 'Courier New', monospace;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid #eee;
      background: #f9f9f9;
      padding: 0 8px;
    }

    .tab-button {
      flex: 1;
      padding: 12px 8px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      color: #666;
      border-bottom: 3px solid transparent;
      transition: all 0.2s;
    }

    .tab-button.active {
      color: #667eea;
      border-bottom-color: #667eea;
    }

    .content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .breakdown-item {
      padding: 8px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #f0f0f0;
    }

    .breakdown-item:last-child {
      border-bottom: none;
    }

    .item-name {
      font-weight: 500;
      color: #333;
      font-size: 13px;
    }

    .item-cost {
      font-family: 'Courier New', monospace;
      font-weight: 600;
      color: #667eea;
      font-size: 13px;
    }

    .summary-stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }

    .stat-card {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 6px;
      border-left: 4px solid #667eea;
    }

    .stat-label {
      font-size: 11px;
      color: #999;
      text-transform: uppercase;
      font-weight: 500;
    }

    .stat-value {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      font-family: 'Courier New', monospace;
      margin-top: 4px;
    }

    .element-detail {
      background: #f9f9f9;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 12px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      padding: 4px 0;
    }

    .detail-label {
      color: #666;
    }

    .detail-value {
      font-weight: 600;
      color: #333;
      font-family: 'Courier New', monospace;
    }

    .loading {
      text-align: center;
      padding: 20px;
      color: #999;
    }

    .error {
      color: #d32f2f;
      padding: 16px;
      background: #ffebee;
    }
  `;

  async connectedCallback() {
    super.connectedCallback();
    await this.loadCostData();
  }

  private async loadCostData() {
    if (!this.scenarioId) return;
    this.loading = true;

    try {
      const client = getAPIClient();
      const res = await client.get(
        `/scenarios/${this.scenarioId}/cost-calculation`
      );

      this.totalCost = res.data.total_cost || '0.00';
      this.breakdown = res.data.breakdown || {};
    } catch (err) {
      console.error('[CostBreakdownPanel] Error:', err);
    } finally {
      this.loading = false;
    }
  }

  private formatCurrency(value: string | number): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `R$ ${num.toFixed(2)}`;
  }

  private renderSummary() {
    const stats = this.calculateStats();

    return html`
      <div class="summary-stats">
        <div class="stat-card">
          <div class="stat-label">Custo Total</div>
          <div class="stat-value">${this.formatCurrency(this.totalCost)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Elementos</div>
          <div class="stat-value">${stats.count}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Custo Min</div>
          <div class="stat-value">${this.formatCurrency(stats.minCost)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Custo Máx</div>
          <div class="stat-value">${this.formatCurrency(stats.maxCost)}</div>
        </div>
      </div>

      ${this.selectedElement
        ? html`
            <div class="element-detail">
              <strong>${this.selectedElement.ifc_type}</strong>
              <div class="detail-row">
                <span class="detail-label">Global ID:</span>
                <span class="detail-value">${this.selectedElement.global_id}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Quantidade:</span>
                <span class="detail-value">${this.selectedElement.quantity} ${this.selectedElement.unit}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Preço Unitário:</span>
                <span class="detail-value">${this.formatCurrency(this.selectedElement.unit_price)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Custo Total:</span>
                <span class="detail-value">${this.formatCurrency(this.selectedElement.total_cost)}</span>
              </div>
            </div>
          `
        : ''}
    `;
  }

  private renderByType() {
    if (!this.breakdown || !this.breakdown.by_type) return html`<div class="loading">Sem dados</div>`;

    const items = Object.entries(this.breakdown.by_type).map(
      ([type, data]: [string, any]) => html`
        <div class="breakdown-item">
          <div>
            <div class="item-name">${type}</div>
            <div style="font-size: 11px; color: #999;">
              ${data.count} elemento(s) × ${data.quantity} ${data.unit}
            </div>
          </div>
          <div class="item-cost">${this.formatCurrency(data.total_cost)}</div>
        </div>
      `
    );

    return html`<div>${items}</div>`;
  }

  private renderByStorey() {
    if (!this.breakdown || !this.breakdown.by_storey) return html`<div class="loading">Sem dados</div>`;

    const items = Object.entries(this.breakdown.by_storey).map(
      ([storey, data]: [string, any]) => html`
        <div class="breakdown-item">
          <div class="item-name">Pavimento ${storey === 'null' ? '?' : storey}</div>
          <div class="item-cost">${this.formatCurrency(data.total_cost)}</div>
        </div>
      `
    );

    return html`<div>${items}</div>`;
  }

  private renderByCategory() {
    if (!this.breakdown || !this.breakdown.by_category) return html`<div class="loading">Sem dados</div>`;

    const categoryLabels: Record<string, string> = {
      structure: '🏗️ Estrutura',
      mep: '⚙️ MEP',
      architecture: '🪟 Arquitetura',
      other: '📦 Outros',
    };

    const items = Object.entries(this.breakdown.by_category).map(
      ([cat, data]: [string, any]) => html`
        <div class="breakdown-item">
          <div class="item-name">${categoryLabels[cat] || cat}</div>
          <div class="item-cost">${this.formatCurrency(data.total_cost)}</div>
        </div>
      `
    );

    return html`<div>${items}</div>`;
  }

  private calculateStats() {
    let count = 0;
    let minCost = Infinity;
    let maxCost = -Infinity;

    if (this.breakdown && this.breakdown.by_type) {
      for (const data of Object.values(this.breakdown.by_type)) {
        const d = data as any;
        count += d.count || 0;
        const cost = parseFloat(d.total_cost);
        minCost = Math.min(minCost, cost);
        maxCost = Math.max(maxCost, cost);
      }
    }

    return {
      count: count || 0,
      minCost: minCost === Infinity ? 0 : minCost,
      maxCost: maxCost === -Infinity ? 0 : maxCost,
    };
  }

  render() {
    if (this.loading) {
      return html`<div class="loading">Carregando custos...</div>`;
    }

    return html`
      <div class="header">
        <h3>💰 Custos</h3>
        <div class="total-cost">${this.formatCurrency(this.totalCost)}</div>
      </div>

      <div class="tabs">
        <button
          class="tab-button ${this.activeTab === 'summary' ? 'active' : ''}"
          @click="${() => (this.activeTab = 'summary')}"
        >
          Resumo
        </button>
        <button
          class="tab-button ${this.activeTab === 'type' ? 'active' : ''}"
          @click="${() => (this.activeTab = 'type')}"
        >
          Por Tipo
        </button>
        <button
          class="tab-button ${this.activeTab === 'storey' ? 'active' : ''}"
          @click="${() => (this.activeTab = 'storey')}"
        >
          Por Pavimento
        </button>
        <button
          class="tab-button ${this.activeTab === 'category' ? 'active' : ''}"
          @click="${() => (this.activeTab = 'category')}"
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
    `;
  }

  setSelectedElement(element: any) {
    this.selectedElement = element;
  }
}
