import React from 'react';
import { Document, Page, Text, View, StyleSheet, renderToBuffer, Svg, Rect, Polyline, Line, Circle } from '@react-pdf/renderer';
import type { FinancialComparisonResult, SCurvePoint } from './financial-comparison.service.js';

function formatCurrency(val: string | number): string {
  const num = Number(val);
  const fixed = num.toFixed(2);
  const [integers, decimals] = fixed.split('.');
  const formattedIntegers = integers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${formattedIntegers},${decimals}`;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 12,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  metaText: {
    fontSize: 8,
    color: '#64748b',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 4,
    marginBottom: 8,
  },
  recommendationBox: {
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  recommendationTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6d28d9',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 8.5,
    color: '#4c1d95',
    lineHeight: 1.3,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#f8fafc',
  },
  kpiLabel: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  kpiValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  kpiValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  kpiSubvalue: {
    fontSize: 8,
    color: '#64748b',
  },
  table: {
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    padding: 6,
    fontWeight: 'bold',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    padding: 6,
  },
  tableCellCode: { width: '15%' },
  tableCellDesc: { width: '35%' },
  tableCellVal: { width: '15%', textAlign: 'right' },
  tableCellDiff: { width: '20%', textAlign: 'right', fontWeight: 'bold' },
  chartContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  chartWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 8,
  },
});

export class ScenarioPdfService {
  public static async generateReportBuffer(
    projectName: string,
    tenantName: string,
    result: FinancialComparisonResult,
    top10Diffs: any[]
  ): Promise<Buffer> {
    const doc = React.createElement(Document, {}, 
      React.createElement(Page, { size: 'A4', style: styles.page },
        // Header
        React.createElement(View, { style: styles.header },
          React.createElement(View, { style: styles.headerLeft },
            React.createElement(Text, { style: styles.title }, 'Relatório Comparativo de Cenários'),
            React.createElement(Text, { style: styles.subtitle }, `Projeto: ${projectName}`)
          ),
          React.createElement(View, { style: styles.headerRight },
            React.createElement(Text, { style: styles.metaText }, `Organização: ${tenantName}`),
            React.createElement(Text, { style: styles.metaText }, `Data: ${new Date().toLocaleDateString('pt-BR')}`)
          )
        ),

        // Recommendation Box
        React.createElement(View, { style: styles.recommendationBox },
          React.createElement(Text, { style: styles.recommendationTitle }, 'RECOMENDAÇÃO ARXISVR'),
          React.createElement(Text, { style: styles.recommendationText }, 
            result.recommendation.explanation.replace(/\*\*/g, '')
          )
        ),

        // KPI Comparison Grid
        React.createElement(View, { style: styles.grid },
          React.createElement(View, { style: styles.kpiCard },
            React.createElement(Text, { style: styles.kpiLabel }, 'Custo Total'),
            React.createElement(View, { style: styles.kpiValueRow },
              React.createElement(View, {},
                React.createElement(Text, { style: styles.kpiSubvalue }, `A: ${formatCurrency(result.scenarioA.totalCost)}`),
                React.createElement(Text, { style: styles.kpiSubvalue }, `B: ${formatCurrency(result.scenarioB.totalCost)}`)
              ),
              React.createElement(Text, { style: [styles.kpiValue, { color: Number(result.deltaCost) <= 0 ? '#10b981' : '#ef4444' }] },
                `${Number(result.deltaCost) > 0 ? '+' : ''}${formatCurrency(result.deltaCost)}`
              )
            )
          ),
          React.createElement(View, { style: styles.kpiCard },
            React.createElement(Text, { style: styles.kpiLabel }, 'Prazo Final'),
            React.createElement(View, { style: styles.kpiValueRow },
              React.createElement(View, {},
                React.createElement(Text, { style: styles.kpiSubvalue }, `A: ${result.scenarioA.durationDays} dias`),
                React.createElement(Text, { style: styles.kpiSubvalue }, `B: ${result.scenarioB.durationDays} dias`)
              ),
              React.createElement(Text, { style: [styles.kpiValue, { color: result.deltaDays <= 0 ? '#10b981' : '#ef4444' }] },
                `${result.deltaDays > 0 ? '+' : ''}${result.deltaDays} dias`
              )
            )
          ),
          React.createElement(View, { style: styles.kpiCard },
            React.createElement(Text, { style: styles.kpiLabel }, 'Score de Decisão'),
            React.createElement(View, { style: styles.kpiValueRow },
              React.createElement(View, {},
                React.createElement(Text, { style: styles.kpiSubvalue }, `A: ${result.recommendation.scores[0].composite}/100`),
                React.createElement(Text, { style: styles.kpiSubvalue }, `B: ${result.recommendation.scores[1].composite}/100`)
              ),
              React.createElement(Text, { style: [styles.kpiValue, { color: '#6366f1' }] },
                result.recommendation.winningScenarioId === result.scenarioA.id ? 'A Vence' : 'B Vence'
              )
            )
          )
        ),

        // SVG Charts Side by Side
        React.createElement(View, { style: styles.chartContainer },
          // Category Chart
          React.createElement(View, { style: styles.chartWrapper },
            React.createElement(Text, { style: styles.chartTitle }, 'Breakdown por Categoria (A vs B)'),
            this.renderCategoryChartSVG(result.scenarioA.categoryBreakdown, result.scenarioB.categoryBreakdown)
          ),
          // S-Curve Chart
          React.createElement(View, { style: styles.chartWrapper },
            React.createElement(Text, { style: styles.chartTitle }, 'Curva S Acumulada'),
            this.renderSCurveSVG(result.scenarioA.sCurve, result.scenarioB.sCurve)
          )
        ),

        // Top 10 Cost Item Changes Table
        React.createElement(View, { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, 'Maiores Divergências Financeiras (Top 10 Itens)'),
          top10Diffs.length === 0 
            ? React.createElement(Text, { style: { fontSize: 8, color: '#64748b', fontStyle: 'italic' } }, 'Nenhuma divergência de custo encontrada.')
            : React.createElement(View, { style: styles.table },
                // Header
                React.createElement(View, { style: styles.tableHeader },
                  React.createElement(Text, { style: styles.tableCellCode }, 'Código'),
                  React.createElement(Text, { style: styles.tableCellDesc }, 'Descrição'),
                  React.createElement(Text, { style: styles.tableCellVal }, 'Cenário A'),
                  React.createElement(Text, { style: styles.tableCellVal }, 'Cenário B'),
                  React.createElement(Text, { style: styles.tableCellDiff }, 'Diferença')
                ),
                // Rows
                ...top10Diffs.map((diff, index) => 
                  React.createElement(View, { key: index, style: [styles.tableRow, { backgroundColor: index % 2 === 1 ? '#f8fafc' : '#ffffff' }] },
                    React.createElement(Text, { style: styles.tableCellCode }, diff.code || '—'),
                    React.createElement(Text, { style: styles.tableCellDesc }, diff.description),
                    React.createElement(Text, { style: styles.tableCellVal }, formatCurrency(diff.priceA)),
                    React.createElement(Text, { style: styles.tableCellVal }, formatCurrency(diff.priceB)),
                    React.createElement(Text, { style: [styles.tableCellDiff, { color: Number(diff.diff) < 0 ? '#10b981' : '#ef4444' }] }, 
                      `${Number(diff.diff) > 0 ? '+' : ''}${formatCurrency(diff.diff)}`
                    )
                  )
                )
              )
        )
      )
    );

    return renderToBuffer(doc);
  }

  private static renderCategoryChartSVG(breakdownA: Record<string, string>, breakdownB: Record<string, string>): any {
    const categories = ['structure', 'mep', 'architecture', 'other'];
    const catLabels: Record<string, string> = {
      structure: 'Estrutura',
      mep: 'Instalações',
      architecture: 'Arq.',
      other: 'Outros'
    };

    const valA = categories.map(c => Number(breakdownA[c] || 0));
    const valB = categories.map(c => Number(breakdownB[c] || 0));
    const maxVal = Math.max(...valA, ...valB, 1);

    const chartW = 200;
    const chartH = 100;
    const barMaxW = 120;
    const barH = 8;
    const spacing = 22;

    const barAColor = '#6366f1';
    const barBColor = '#94a3b8';

    const elements: any[] = [];

    categories.forEach((cat, idx) => {
      const y = 10 + idx * spacing;
      const label = catLabels[cat];
      const wA = (valA[idx] / maxVal) * barMaxW;
      const wB = (valB[idx] / maxVal) * barMaxW;

      // Label
      elements.push(
        React.createElement(Text, {
          key: `lbl-${cat}`,
          x: 5,
          y: y + 6,
          style: { fontSize: 7, fill: '#475569', fontWeight: 'bold' }
        } as any, label)
      );

      // Bar Scenario A
      elements.push(
        React.createElement(Rect, {
          key: `barA-${cat}`,
          x: 50,
          y: y,
          width: Math.max(wA, 1),
          height: barH,
          fill: barAColor,
          rx: 2
        } as any)
      );

      // Bar Scenario B
      elements.push(
        React.createElement(Rect, {
          key: `barB-${cat}`,
          x: 50,
          y: y + barH + 2,
          width: Math.max(wB, 1),
          height: barH,
          fill: barBColor,
          rx: 2
        } as any)
      );
    });

    // Legend
    elements.push(
      React.createElement(Rect, { key: 'leg-rectA', x: 50, y: 92, width: 6, height: 6, fill: barAColor } as any),
      React.createElement(Text, { key: 'leg-txtA', x: 60, y: 97, style: { fontSize: 6, fill: '#64748b' } } as any, 'Cenário A'),
      React.createElement(Rect, { key: 'leg-rectB', x: 110, y: 92, width: 6, height: 6, fill: barBColor } as any),
      React.createElement(Text, { key: 'leg-txtB', x: 120, y: 97, style: { fontSize: 6, fill: '#64748b' } } as any, 'Cenário B')
    );

    return React.createElement(Svg, { width: chartW, height: chartH } as any, elements);
  }

  private static renderSCurveSVG(sCurveA: SCurvePoint[], sCurveB: SCurvePoint[]): any {
    const months = Array.from(new Set([
      ...sCurveA.map(p => p.month),
      ...sCurveB.map(p => p.month)
    ])).sort();

    const chartW = 200;
    const chartH = 100;
    const paddingL = 35;
    const paddingR = 10;
    const paddingB = 15;
    const paddingT = 8;
    const innerW = chartW - paddingL - paddingR;
    const innerH = chartH - paddingB - paddingT;

    if (months.length === 0) {
      return React.createElement(Svg, { width: chartW, height: chartH } as any,
        React.createElement(Text, { x: 60, y: 50, style: { fontSize: 8, fill: '#94a3b8' } } as any, 'Sem dados de Curva S')
      );
    }

    const maxValA = sCurveA.length > 0 ? Number(sCurveA[sCurveA.length - 1].cumulative) : 0;
    const maxValB = sCurveB.length > 0 ? Number(sCurveB[sCurveB.length - 1].cumulative) : 0;
    const maxVal = Math.max(maxValA, maxValB, 1);

    const getCoordinates = (points: SCurvePoint[]) => {
      return points.map(p => {
        const mIdx = months.indexOf(p.month);
        const x = paddingL + (months.length > 1 ? (mIdx / (months.length - 1)) * innerW : innerW / 2);
        const y = paddingT + innerH - (Number(p.cumulative) / maxVal) * innerH;
        return { x, y };
      });
    };

    const coordsA = getCoordinates(sCurveA);
    const coordsB = getCoordinates(sCurveB);

    const elements: any[] = [];

    // Grid Lines (Y-axis grid)
    const gridT = [0, 0.25, 0.5, 0.75, 1];
    gridT.forEach(t => {
      const y = paddingT + innerH * t;
      elements.push(
        React.createElement(Line, {
          key: `grid-${t}`,
          x1: paddingL,
          y1: y,
          x2: chartW - paddingR,
          y2: y,
          stroke: '#e2e8f0',
          strokeWidth: 0.5
        } as any)
      );

      // Y ticks
      const tickVal = maxVal * (1 - t);
      let tickText = '';
      if (tickVal >= 1000000) tickText = `${(tickVal / 1000000).toFixed(1)}M`;
      else if (tickVal >= 1000) tickText = `${(tickVal / 1000).toFixed(0)}k`;
      else tickText = tickVal.toFixed(0);

      elements.push(
        React.createElement(Text, {
          key: `tick-${t}`,
          x: 5,
          y: y + 2,
          style: { fontSize: 6, fill: '#64748b' }
        } as any, tickText)
      );
    });

    // Draw lines
    const drawCurve = (coords: typeof coordsA, stroke: string, keyPrefix: string) => {
      const lineElements: any[] = [];
      for (let i = 0; i < coords.length - 1; i++) {
        lineElements.push(
          React.createElement(Line, {
            key: `${keyPrefix}-l-${i}`,
            x1: coords[i].x,
            y1: coords[i].y,
            x2: coords[i + 1].x,
            y2: coords[i + 1].y,
            stroke: stroke,
            strokeWidth: 1.5
          } as any)
        );
      }
      coords.forEach((c, i) => {
        lineElements.push(
          React.createElement(Circle, {
            key: `${keyPrefix}-c-${i}`,
            cx: c.x,
            cy: c.y,
            r: 2,
            fill: stroke
          } as any)
        );
      });
      return lineElements;
    };

    elements.push(...drawCurve(coordsA, '#6366f1', 'curveA'));
    elements.push(...drawCurve(coordsB, '#94a3b8', 'curveB'));

    // X Axis ticks
    if (months.length > 0) {
      const maxTicks = 4;
      const step = Math.max(Math.floor(months.length / maxTicks), 1);
      for (let i = 0; i < months.length; i += step) {
        const m = months[i];
        const x = paddingL + (months.length > 1 ? (i / (months.length - 1)) * innerW : innerW / 2);
        
        // Month shorthand e.g. "Jun/26"
        const [yy, mm] = m.split('-');
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const label = `${monthNames[Number(mm) - 1]}/${yy.slice(2)}`;

        elements.push(
          React.createElement(Text, {
            key: `x-tick-${i}`,
            x: x - 10,
            y: chartH - 5,
            style: { fontSize: 5, fill: '#64748b' }
          } as any, label)
        );
      }
    }

    return React.createElement(Svg, { width: chartW, height: chartH } as any, elements);
  }
}
