import { getScenariosService } from '../api/v1/services/scenarios.service';
import { ScoreCard } from './ScoreCard';

function formatCurrency(val: string | number): string {
  const num = Number(val);
  const fixed = num.toFixed(2);
  const [integers, decimals] = fixed.split('.');
  const formattedIntegers = integers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${formattedIntegers},${decimals}`;
}

export class FinancialComparison {
  private container: HTMLElement;
  private projectId: string;
  private scenarioIdA: string;
  private scenarioIdB: string;
  private el: HTMLElement | null = null;
  private scoreCard: ScoreCard | null = null;

  private costWeight: number = 0.6;
  private timeWeight: number = 0.4;

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

  private init(): void {
    this.injectStyles();
    this.el = document.createElement('div');
    this.el.className = 'financial-comparison-dashboard';
    this.container.appendChild(this.el);

    this.loadAndRender();
  }

  private async loadAndRender(): Promise<void> {
    if (!this.el) return;
    this.el.innerHTML = `<div class="fin-loading">⌛ Processando comparativo financeiro 5D...</div>`;

    try {
      const service = getScenariosService();
      const data = await service.getFinancialComparison(
        this.scenarioIdA,
        this.scenarioIdB,
        this.projectId,
        this.costWeight,
        this.timeWeight
      );
      this.render(data);
    } catch (err) {
      this.el.innerHTML = `<div class="fin-error">❌ Falha ao processar dados financeiros: ${String(err)}</div>`;
    }
  }

  private injectStyles(): void {
    if (document.getElementById('financial-comparison-styles')) return;

    const style = document.createElement('style');
    style.id = 'financial-comparison-styles';
    style.textContent = `
      .financial-comparison-dashboard {
        background: rgba(15, 23, 42, 0.7);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 24px;
        color: #f8fafc;
        font-family: 'Inter', -apple-system, sans-serif;
        box-shadow: 0 20px 48px rgba(0, 0, 0, 0.4);
        display: flex;
        flex-direction: column;
        gap: 20px;
        width: 100%;
        box-sizing: border-box;
      }

      .fin-loading {
        text-align: center;
        padding: 40px;
        font-size: 13px;
        color: #94a3b8;
      }

      .fin-error {
        text-align: center;
        padding: 40px;
        font-size: 13px;
        color: #f87171;
      }

      .fin-grid-kpi {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }

      .fin-kpi-card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .fin-kpi-label {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        color: #94a3b8;
        letter-spacing: 0.05em;
      }

      .fin-kpi-value {
        font-size: 20px;
        font-weight: 800;
        color: #f1f5f9;
        display: flex;
        align-items: baseline;
        gap: 8px;
        flex-wrap: wrap;
      }

      .fin-kpi-sub {
        font-size: 11px;
        color: #64748b;
        font-weight: 500;
      }

      .fin-delta-badge {
        font-size: 12px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 6px;
      }

      .fin-delta-green {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.25);
      }

      .fin-delta-red {
        background: rgba(239, 68, 68, 0.15);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.25);
      }

      .fin-visuals {
        display: grid;
        grid-template-columns: 1fr 1.2fr;
        gap: 20px;
      }

      @media (max-width: 768px) {
        .fin-visuals {
          grid-template-columns: 1fr;
        }
      }

      .fin-panel-box {
        background: rgba(255, 255, 255, 0.01);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .fin-panel-title {
        font-size: 13px;
        font-weight: 700;
        color: #cbd5e1;
      }

      .fin-cat-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .fin-cat-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .fin-cat-meta {
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        color: #94a3b8;
      }

      .fin-cat-bars {
        position: relative;
        height: 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        overflow: hidden;
      }

      .fin-bar-a {
        position: absolute;
        top: 0;
        left: 0;
        height: 50%;
        background: #6366f1;
        border-bottom: 1px solid rgba(0, 0, 0, 0.15);
        transition: width 0.3s ease;
      }

      .fin-bar-b {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 50%;
        background: #94a3b8;
        transition: width 0.3s ease;
      }

      .fin-legend {
        display: flex;
        gap: 12px;
        font-size: 11px;
        color: #64748b;
        margin-top: 4px;
      }

      .fin-legend-indicator {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .fin-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }

      .s-curve-svg {
        background: rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.04);
        border-radius: 8px;
        width: 100%;
        height: 180px;
      }

      .s-curve-line-a {
        stroke: #6366f1;
        stroke-width: 2.5;
        fill: none;
        stroke-linecap: round;
      }

      .s-curve-line-b {
        stroke: #94a3b8;
        stroke-width: 2.5;
        fill: none;
        stroke-linecap: round;
        stroke-dasharray: 4 4;
      }

      .s-curve-dot-a {
        fill: #6366f1;
        cursor: pointer;
      }

      .s-curve-dot-b {
        fill: #94a3b8;
        cursor: pointer;
      }

      .export-btn-container {
        display: flex;
        justify-content: flex-end;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        padding-top: 16px;
      }

      .export-pdf-btn {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 10px 18px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
        transition: all 0.2s ease;
      }

      .export-pdf-btn:hover {
        transform: scale(1.02);
        box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
      }
    `;
    document.head.appendChild(style);
  }

  private render(data: any): void {
    if (!this.el) return;

    // Delta badges
    const isCostGain = Number(data.deltaCost) <= 0;
    const isTimeGain = data.deltaDays <= 0;

    const deltaCostBadge = isCostGain
      ? `<span class="fin-delta-badge fin-delta-green">${formatCurrency(data.deltaCost)}</span>`
      : `<span class="fin-delta-badge fin-delta-red">+${formatCurrency(data.deltaCost)}</span>`;

    const deltaDaysBadge = isTimeGain
      ? `<span class="fin-delta-badge fin-delta-green">${data.deltaDays} dias</span>`
      : `<span class="fin-delta-badge fin-delta-red">+${data.deltaDays} dias</span>`;

    // Category breakdown
    const categories = ['structure', 'mep', 'architecture', 'other'];
    const catLabels: Record<string, string> = {
      structure: 'Estrutura',
      mep: 'Instalações (MEP)',
      architecture: 'Arquitetura',
      other: 'Outros'
    };

    const valA = categories.map(c => Number(data.scenarioA.categoryBreakdown[c] || 0));
    const valB = categories.map(c => Number(data.scenarioB.categoryBreakdown[c] || 0));
    const maxValCat = Math.max(...valA, ...valB, 1);

    let catHtml = '';
    categories.forEach((cat, idx) => {
      const percentA = (valA[idx] / maxValCat) * 100;
      const percentB = (valB[idx] / maxValCat) * 100;

      catHtml += `
        <div class="fin-cat-item">
          <div class="fin-cat-meta">
            <span>${catLabels[cat]}</span>
            <span>A: ${formatCurrency(valA[idx])} vs B: ${formatCurrency(valB[idx])}</span>
          </div>
          <div class="fin-cat-bars">
            <div class="fin-bar-a" style="width: ${percentA}%"></div>
            <div class="fin-bar-b" style="width: ${percentB}%"></div>
          </div>
        </div>
      `;
    });

    // Render S-Curve SVG
    const sCurveSvgHtml = this.generateSCurveSvg(data.scenarioA.sCurve, data.scenarioB.sCurve);

    this.el.innerHTML = `
      <div class="fin-grid-kpi">
        <div class="fin-kpi-card">
          <span class="fin-kpi-label">Orçamento Total Calculado</span>
          <span class="fin-kpi-value">
            ${formatCurrency(data.scenarioB.totalCost)}
            ${deltaCostBadge}
          </span>
          <span class="fin-kpi-sub">Referência A: ${formatCurrency(data.scenarioA.totalCost)}</span>
        </div>
        <div class="fin-kpi-card">
          <span class="fin-kpi-label">Prazo Final Real (CPM)</span>
          <span class="fin-kpi-value">
            ${data.scenarioB.durationDays} dias
            ${deltaDaysBadge}
          </span>
          <span class="fin-kpi-sub">Referência A: ${data.scenarioA.durationDays} dias</span>
        </div>
      </div>

      <div class="fin-visuals">
        <div class="fin-panel-box">
          <span class="fin-panel-title">📊 Distribuição por Categoria</span>
          <div class="fin-cat-list">
            ${catHtml}
          </div>
          <div class="fin-legend">
            <div class="fin-legend-indicator">
              <span class="fin-dot" style="background: #6366f1;"></span>
              <span>Cenário A</span>
            </div>
            <div class="fin-legend-indicator">
              <span class="fin-dot" style="background: #94a3b8;"></span>
              <span>Cenário B</span>
            </div>
          </div>
        </div>

        <div class="fin-panel-box">
          <span class="fin-panel-title">📈 Curva S Acumulada</span>
          ${sCurveSvgHtml}
        </div>
      </div>

      <div id="recommendation-mount-point"></div>

      <div class="export-btn-container">
        <button class="export-pdf-btn" id="export-pdf-trigger">
          <span>📄 Exportar Relatório Comparativo PDF</span>
        </button>
      </div>
    `;

    // Instantiate recommendation ScoreCard
    const recMount = this.el.querySelector('#recommendation-mount-point') as HTMLElement;
    const scoreA = data.recommendation.scores[0].composite;
    const scoreB = data.recommendation.scores[1].composite;

    this.scoreCard = new ScoreCard(
      recMount,
      scoreA,
      scoreB,
      data.recommendation.explanation,
      this.costWeight,
      this.timeWeight,
      async (cw, tw) => {
        this.costWeight = cw;
        this.timeWeight = tw;
        await this.recalculateRecommendation();
      }
    );

    // Bind PDF Export trigger
    this.el.querySelector('#export-pdf-trigger')?.addEventListener('click', () => {
      this.triggerPdfDownload();
    });
  }

  private generateSCurveSvg(curveA: any[], curveB: any[]): string {
    const months = Array.from(new Set([
      ...curveA.map(p => p.month),
      ...curveB.map(p => p.month)
    ])).sort();

    if (months.length === 0) {
      return `
        <div style="height:180px;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:12px;">
          Nenhum dado de cronograma / Curva S disponível
        </div>
      `;
    }

    const valA = curveA.map(p => Number(p.cumulative));
    const valB = curveB.map(p => Number(p.cumulative));
    const maxVal = Math.max(...valA, ...valB, 1);

    const svgW = 360;
    const svgH = 180;
    const paddingL = 50;
    const paddingR = 20;
    const paddingB = 30;
    const paddingT = 20;
    const innerW = svgW - paddingL - paddingR;
    const innerH = svgH - paddingB - paddingT;

    const getCoordsString = (points: any[]) => {
      return points.map(p => {
        const mIdx = months.indexOf(p.month);
        const x = paddingL + (months.length > 1 ? (mIdx / (months.length - 1)) * innerW : innerW / 2);
        const y = paddingT + innerH - (Number(p.cumulative) / maxVal) * innerH;
        return `${x},${y}`;
      }).join(' ');
    };

    const getDotsHtml = (points: any[], isA: boolean) => {
      const cls = isA ? 's-curve-dot-a' : 's-curve-dot-b';
      return points.map(p => {
        const mIdx = months.indexOf(p.month);
        const x = paddingL + (months.length > 1 ? (mIdx / (months.length - 1)) * innerW : innerW / 2);
        const y = paddingT + innerH - (Number(p.cumulative) / maxVal) * innerH;
        return `
          <circle class="${cls}" cx="${x}" cy="${y}" r="4">
            <title>${p.month}: ${formatCurrency(p.cumulative)}</title>
          </circle>
        `;
      }).join('');
    };

    const coordsA = getCoordsString(curveA);
    const coordsB = getCoordsString(curveB);

    // Y Axis Ticks
    let yTicks = '';
    const ticks = [0, 0.25, 0.5, 0.75, 1];
    ticks.forEach(t => {
      const y = paddingT + innerH * (1 - t);
      const val = maxVal * t;
      let tickText = '';
      if (val >= 1000000) tickText = `${(val / 1000000).toFixed(1)}M`;
      else if (val >= 1000) tickText = `${(val / 1000).toFixed(0)}k`;
      else tickText = val.toFixed(0);

      yTicks += `
        <line x1="${paddingL}" y1="${y}" x2="${svgW - paddingR}" y2="${y}" stroke="rgba(255,255,255,0.06)" stroke-width="1" />
        <text x="5" y="${y + 4}" fill="#64748b" font-size="9" font-family="monospace">${tickText}</text>
      `;
    });

    // X Axis Ticks (Months shorthand e.g. "Jun/26")
    let xTicks = '';
    if (months.length > 0) {
      const maxTicks = 4;
      const step = Math.max(Math.floor(months.length / maxTicks), 1);
      for (let i = 0; i < months.length; i += step) {
        const m = months[i];
        const x = paddingL + (months.length > 1 ? (i / (months.length - 1)) * innerW : innerW / 2);
        const [yy, mm] = m.split('-');
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const label = `${monthNames[Number(mm) - 1]}/${yy.slice(2)}`;

        xTicks += `
          <text x="${x}" y="${svgH - 8}" fill="#64748b" font-size="9" text-anchor="middle">${label}</text>
        `;
      }
    }

    return `
      <svg class="s-curve-svg" viewBox="0 0 ${svgW} ${svgH}">
        <!-- Axis grid -->
        ${yTicks}
        
        <!-- Lines -->
        ${coordsA ? `<polyline class="s-curve-line-a" points="${coordsA}" />` : ''}
        ${coordsB ? `<polyline class="s-curve-line-b" points="${coordsB}" />` : ''}

        <!-- Dots -->
        ${getDotsHtml(curveA, true)}
        ${getDotsHtml(curveB, false)}

        <!-- X ticks labels -->
        ${xTicks}
      </svg>
    `;
  }

  private async recalculateRecommendation(): Promise<void> {
    try {
      const service = getScenariosService();
      const data = await service.getFinancialComparison(
        this.scenarioIdA,
        this.scenarioIdB,
        this.projectId,
        this.costWeight,
        this.timeWeight
      );

      const scoreA = data.recommendation.scores[0].composite;
      const scoreB = data.recommendation.scores[1].composite;

      this.scoreCard?.updateData(scoreA, scoreB, data.recommendation.explanation);
    } catch (err) {
      console.warn('Failed to recalculate recommendation scores:', err);
    }
  }

  private triggerPdfDownload(): void {
    const service = getScenariosService();
    const url = service.getComparisonPdfUrl(
      this.scenarioIdA,
      this.scenarioIdB,
      this.projectId,
      this.costWeight,
      this.timeWeight
    );
    window.open(url, '_blank');
  }

  public destroy(): void {
    this.scoreCard?.destroy();
    this.el?.remove();
  }
}
