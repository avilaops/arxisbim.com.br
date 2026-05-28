/**
 * Charts Panel
 * Painel de gráficos (bar, pie, line) com dados do projeto
 */

import { Card } from '../design-system/components/Card';
import { Select } from '../design-system/components/Select';

export interface ChartData {
  label: string;
  value: number;
  color?: string;
}

export type ChartType = 'bar' | 'pie' | 'line';

export class ChartsPanel {
  private card: Card;
  private chartType: ChartType = 'bar';
  private data: ChartData[] = [];
  private canvas?: HTMLCanvasElement;

  constructor() {
    this.card = new Card({
      title: '📈 Gráficos',
      variant: 'glass'
    });

    this.loadSampleData();
    this.render();
  }

  private loadSampleData(): void {
    this.data = [
      { label: 'Paredes', value: 245, color: '#00d4ff' },
      { label: 'Portas', value: 128, color: '#7b2ff7' },
      { label: 'Janelas', value: 187, color: '#ff9800' },
      { label: 'Vigas', value: 342, color: '#4caf50' },
      { label: 'Pilares', value: 96, color: '#f44336' },
      { label: 'Lajes', value: 24, color: '#9c27b0' }
    ];
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    // Chart type selector
    const controls = document.createElement('div');
    controls.className = 'arxis-charts__controls';

    const typeSelector = new Select({
      options: [
        { value: 'bar', label: '📊 Barras' },
        { value: 'pie', label: '🥧 Pizza' },
        { value: 'line', label: '📈 Linha' }
      ],
      value: this.chartType,
      onChange: (value) => {
        this.chartType = value as ChartType;
        this.renderChart();
      }
    });

    controls.appendChild(typeSelector.getElement());
    body.appendChild(controls);

    // Chart container
    const chartContainer = document.createElement('div');
    chartContainer.className = 'arxis-charts__container';

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'arxis-charts__canvas';
    this.canvas.width = 500;
    this.canvas.height = 300;

    chartContainer.appendChild(this.canvas);
    body.appendChild(chartContainer);

    // Legend
    const legend = document.createElement('div');
    legend.className = 'arxis-charts__legend';

    this.data.forEach(item => {
      const legendItem = document.createElement('div');
      legendItem.className = 'arxis-charts__legend-item';

      const colorBox = document.createElement('div');
      colorBox.className = 'arxis-charts__legend-color';
      colorBox.style.background = item.color || '#00d4ff';

      const label = document.createElement('span');
      label.className = 'arxis-charts__legend-label';
      label.textContent = `${item.label}: ${item.value}`;

      legendItem.appendChild(colorBox);
      legendItem.appendChild(label);
      legend.appendChild(legendItem);
    });

    body.appendChild(legend);

    this.renderChart();
    this.injectStyles();
  }

  private renderChart(): void {
    if (!this.canvas) return;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    switch (this.chartType) {
      case 'bar':
        this.renderBarChart(ctx);
        break;
      case 'pie':
        this.renderPieChart(ctx);
        break;
      case 'line':
        this.renderLineChart(ctx);
        break;
    }
  }

  private renderBarChart(ctx: CanvasRenderingContext2D): void {
    const padding = 40;
    const chartWidth = this.canvas!.width - padding * 2;
    const chartHeight = this.canvas!.height - padding * 2;
    const maxValue = Math.max(...this.data.map(d => d.value));
    const barWidth = chartWidth / this.data.length - 10;

    this.data.forEach((item, index) => {
      const barHeight = (item.value / maxValue) * chartHeight;
      const x = padding + index * (chartWidth / this.data.length);
      const y = padding + chartHeight - barHeight;

      // Bar
      ctx.fillStyle = item.color || '#00d4ff';
      ctx.fillRect(x, y, barWidth, barHeight);

      // Value label
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.value.toString(), x + barWidth / 2, y - 5);

      // Category label
      ctx.save();
      ctx.translate(x + barWidth / 2, padding + chartHeight + 10);
      ctx.rotate(-Math.PI / 6);
      ctx.fillText(item.label, 0, 0);
      ctx.restore();
    });
  }

  private renderPieChart(ctx: CanvasRenderingContext2D): void {
    const centerX = this.canvas!.width / 2;
    const centerY = this.canvas!.height / 2;
    const radius = Math.min(centerX, centerY) - 40;
    
    const total = this.data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = -Math.PI / 2;

    this.data.forEach(item => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = item.color || '#00d4ff';
      ctx.fill();

      // Percentage label
      const labelAngle = currentAngle + sliceAngle / 2;
      const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
      const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
      const percentage = ((item.value / total) * 100).toFixed(1);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${percentage}%`, labelX, labelY);

      currentAngle += sliceAngle;
    });
  }

  private renderLineChart(ctx: CanvasRenderingContext2D): void {
    const padding = 40;
    const chartWidth = this.canvas!.width - padding * 2;
    const chartHeight = this.canvas!.height - padding * 2;
    const maxValue = Math.max(...this.data.map(d => d.value));

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 3;

    this.data.forEach((item, index) => {
      const x = padding + (index / (this.data.length - 1)) * chartWidth;
      const y = padding + chartHeight - (item.value / maxValue) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw points
    this.data.forEach((item, index) => {
      const x = padding + (index / (this.data.length - 1)) * chartWidth;
      const y = padding + chartHeight - (item.value / maxValue) * chartHeight;

      ctx.beginPath();
      ctx.arc(x, y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = item.color || '#00d4ff';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Value label
      ctx.fillStyle = '#fff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.value.toString(), x, y - 15);
    });
  }

  public setData(data: ChartData[]): void {
    this.data = data;
    this.renderChart();
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.card.destroy();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-charts-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-charts-styles';
    style.textContent = `
      .arxis-charts__controls {
        margin-bottom: 16px;
      }

      .arxis-charts__container {
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 16px;
        display: flex;
        justify-content: center;
      }

      .arxis-charts__canvas {
        max-width: 100%;
        height: auto;
      }

      .arxis-charts__legend {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 8px;
      }

      .arxis-charts__legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        background: rgba(255, 255, 255, 0.04);
        border-radius: 6px;
      }

      .arxis-charts__legend-color {
        width: 16px;
        height: 16px;
        border-radius: 4px;
        flex-shrink: 0;
      }

      .arxis-charts__legend-label {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.8);
      }
    `;
    document.head.appendChild(style);
  }
}
