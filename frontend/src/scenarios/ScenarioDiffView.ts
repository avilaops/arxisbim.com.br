import { getScenariosService } from '../api/v1/services/scenarios.service';

export class ScenarioDiffView {
  private container: HTMLElement;
  private projectId: string;
  private scenarioIdA: string;
  private scenarioIdB: string;
  private diffEl: HTMLElement | null = null;

  constructor(
    container: HTMLElement,
    projectId: string,
    scenarioIdA: string,
    scenarioIdB: string
  ) {
    this.container = container;
    this.projectId = projectId;
    this.scenarioIdA = scenarioIdA;
    this.scenarioIdB = scenarioIdB;

    this.init();
  }

  private async init(): Promise<void> {
    this.injectStyles();
    this.diffEl = document.createElement('div');
    this.diffEl.className = 'scenario-diff-dashboard';
    this.container.appendChild(this.diffEl);

    await this.loadAndRender();
  }

  private async loadAndRender(): Promise<void> {
    if (!this.diffEl) return;
    this.diffEl.innerHTML = `<div class="diff-loading">⌛ Analisando diferenças estruturais...</div>`;

    try {
      const service = getScenariosService();
      const diff = await service.getDiff(this.scenarioIdA, this.scenarioIdB, this.projectId);
      this.render(diff);
    } catch (err) {
      this.diffEl.innerHTML = `<div class="diff-error">❌ Falha ao calcular diff: ${String(err)}</div>`;
    }
  }

  private injectStyles(): void {
    if (document.getElementById('scenario-diff-styles')) return;

    const style = document.createElement('style');
    style.id = 'scenario-diff-styles';
    style.textContent = `
      .scenario-diff-dashboard {
        background: rgba(15, 23, 42, 0.75);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 24px;
        color: #f8fafc;
        font-family: 'Inter', -apple-system, sans-serif;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
        display: flex;
        flex-direction: column;
        gap: 20px;
        width: 100%;
        box-sizing: border-box;
      }

      .diff-loading {
        text-align: center;
        padding: 40px;
        font-size: 14px;
        color: #94a3b8;
      }

      .diff-error {
        text-align: center;
        padding: 40px;
        font-size: 14px;
        color: #f87171;
      }

      .diff-metrics-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }

      .diff-card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .diff-card-label {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        color: #94a3b8;
        letter-spacing: 0.05em;
      }

      .diff-card-value {
        font-size: 22px;
        font-weight: 800;
        color: #f1f5f9;
        display: flex;
        align-items: baseline;
        gap: 8px;
      }

      .diff-card-delta {
        font-size: 13px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 6px;
      }

      .delta-positive {
        background: rgba(239, 68, 68, 0.15);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.25);
      }

      .delta-negative {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.25);
      }

      .delta-neutral {
        background: rgba(255, 255, 255, 0.05);
        color: #cbd5e1;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .diff-section-title {
        font-size: 14px;
        font-weight: 700;
        color: #cbd5e1;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        padding-bottom: 6px;
        margin-top: 8px;
      }

      .diff-table-container {
        max-height: 200px;
        overflow-y: auto;
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.1);
      }

      .diff-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }

      .diff-table th {
        background: rgba(255, 255, 255, 0.04);
        padding: 8px 12px;
        text-align: left;
        font-weight: 600;
        color: #94a3b8;
      }

      .diff-table td {
        padding: 8px 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        color: #e2e8f0;
      }

      .diff-row-added {
        background: rgba(16, 185, 129, 0.05);
      }
      .diff-row-removed {
        background: rgba(239, 68, 68, 0.05);
      }
      .diff-row-changed {
        background: rgba(245, 158, 11, 0.05);
      }

      .change-tag {
        font-family: monospace;
        font-size: 11px;
        padding: 1px 4px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.08);
      }

      .field-change {
        font-size: 11px;
        color: #f59e0b;
        margin-top: 2px;
      }
    `;
    document.head.appendChild(style);
  }

  private render(diff: any): void {
    if (!this.diffEl) return;

    // Timeline calculation
    const deltaDays = diff.schedule.deltaDays;
    let deltaDaysHtml = '';
    if (deltaDays === null) {
      deltaDaysHtml = `<span class="diff-card-delta delta-neutral">-</span>`;
    } else if (deltaDays > 0) {
      deltaDaysHtml = `<span class="diff-card-delta delta-positive">+${deltaDays}d (Atraso)</span>`;
    } else if (deltaDays < 0) {
      deltaDaysHtml = `<span class="diff-card-delta delta-negative">${deltaDays}d (Aceleração)</span>`;
    } else {
      deltaDaysHtml = `<span class="diff-card-delta delta-neutral">Sem alteração</span>`;
    }

    // Cost calculation
    const deltaCost = Number(diff.cost.deltaCost);
    let deltaCostHtml = '';
    if (deltaCost > 0) {
      deltaCostHtml = `<span class="diff-card-delta delta-positive">+R$ ${deltaCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>`;
    } else if (deltaCost < 0) {
      deltaCostHtml = `<span class="diff-card-delta delta-negative">-R$ ${Math.abs(deltaCost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>`;
    } else {
      deltaCostHtml = `<span class="diff-card-delta delta-neutral">R$ 0,00</span>`;
    }

    // Activities table
    const acts = diff.schedule.activities;
    let activitiesRows = '';

    for (const act of acts.added) {
      activitiesRows += `
        <tr class="diff-row-added">
          <td><span class="change-tag" style="color:#34d399">Adicionado</span></td>
          <td>${act.external_id || '-'}</td>
          <td>${act.name}</td>
          <td>De: - <br>Para: ${act.planned_start} até ${act.planned_end}</td>
        </tr>
      `;
    }

    for (const act of acts.removed) {
      activitiesRows += `
        <tr class="diff-row-removed">
          <td><span class="change-tag" style="color:#f87171">Removido</span></td>
          <td>${act.external_id || '-'}</td>
          <td>${act.name}</td>
          <td>Removido de: ${act.planned_start} até ${act.planned_end}</td>
        </tr>
      `;
    }

    for (const act of acts.changed) {
      const changesHtml = act.changes.map((c: any) => {
        return `<div class="field-change"><strong>${c.field}:</strong> ${c.oldValue} ➔ ${c.newValue}</div>`;
      }).join('');

      activitiesRows += `
        <tr class="diff-row-changed">
          <td><span class="change-tag" style="color:#fbbf24">Alterado</span></td>
          <td>${act.externalId || '-'}</td>
          <td>${act.name}</td>
          <td>${changesHtml}</td>
        </tr>
      `;
    }

    // Cost items table
    const items = diff.cost.items;
    let costItemRows = '';

    for (const item of items.added) {
      costItemRows += `
        <tr class="diff-row-added">
          <td><span class="change-tag" style="color:#34d399">Adicionado</span></td>
          <td>${item.code || '-'}</td>
          <td>${item.description}</td>
          <td>Preço: R$ ${Number(item.unit_price).toFixed(2)} / ${item.unit}</td>
        </tr>
      `;
    }

    for (const item of items.removed) {
      costItemRows += `
        <tr class="diff-row-removed">
          <td><span class="change-tag" style="color:#f87171">Removido</span></td>
          <td>${item.code || '-'}</td>
          <td>${item.description}</td>
          <td>Preço: R$ ${Number(item.unit_price).toFixed(2)} / ${item.unit}</td>
        </tr>
      `;
    }

    for (const item of items.changed) {
      const changesHtml = item.changes.map((c: any) => {
        return `<div class="field-change"><strong>${c.field}:</strong> ${c.oldValue} ➔ ${c.newValue}</div>`;
      }).join('');

      costItemRows += `
        <tr class="diff-row-changed">
          <td><span class="change-tag" style="color:#fbbf24">Alterado</span></td>
          <td>${item.code || '-'}</td>
          <td>${item.description}</td>
          <td>${changesHtml}</td>
        </tr>
      `;
    }

    this.diffEl.innerHTML = `
      <div class="diff-metrics-grid">
        <div class="diff-card">
          <div class="diff-card-label">Duração Planejada (CPM)</div>
          <div class="diff-card-value">
            ${diff.schedule.completionDateB || 'Sem Data'}
            ${deltaDaysHtml}
          </div>
        </div>
        <div class="diff-card">
          <div class="diff-card-label">Orçamento Total Calculado</div>
          <div class="diff-card-value">
            R$ ${Number(diff.cost.totalCostB).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            ${deltaCostHtml}
          </div>
        </div>
      </div>

      <div class="diff-section-title">📅 Alterações de Cronograma (Tarefas)</div>
      <div class="diff-table-container">
        <table class="diff-table">
          <thead>
            <tr>
              <th style="width: 100px;">Status</th>
              <th style="width: 100px;">ID Ext</th>
              <th>Nome da Tarefa</th>
              <th>Modificações</th>
            </tr>
          </thead>
          <tbody>
            ${activitiesRows || '<tr><td colspan="4" style="text-align:center;color:#64748b">Sem alterações de tarefas</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="diff-section-title">💰 Alterações de Itens de Custo</div>
      <div class="diff-table-container">
        <table class="diff-table">
          <thead>
            <tr>
              <th style="width: 100px;">Status</th>
              <th style="width: 100px;">Código</th>
              <th>Item de Custo</th>
              <th>Modificações</th>
            </tr>
          </thead>
          <tbody>
            ${costItemRows || '<tr><td colspan="4" style="text-align:center;color:#64748b">Sem alterações de itens de custo</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }
}
