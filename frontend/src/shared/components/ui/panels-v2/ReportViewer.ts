/**
 * Report Viewer
 * Visualizador de relatórios PDF/HTML
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';

export interface Report {
  id: string;
  title: string;
  type: 'pdf' | 'html' | 'excel';
  date: number;
  author: string;
  content?: string;
  url?: string;
  pages?: number;
}

export class ReportViewer {
  private card: Card;
  private reports: Report[] = [];
  private currentReport?: Report;

  constructor() {
    this.card = new Card({
      title: '📄 Relatórios',
      variant: 'glass'
    });

    this.loadReports();
    this.render();
  }

  private loadReports(): void {
    const now = Date.now();
    this.reports = [
      {
        id: 'r1',
        title: 'Relatório de Elementos Estruturais',
        type: 'pdf',
        date: now - 3600000,
        author: 'João Silva',
        pages: 24,
        url: '#'
      },
      {
        id: 'r2',
        title: 'Análise de Interferências',
        type: 'pdf',
        date: now - 86400000,
        author: 'Maria Santos',
        pages: 12,
        url: '#'
      },
      {
        id: 'r3',
        title: 'Planilha de Quantitativos',
        type: 'excel',
        date: now - 172800000,
        author: 'Carlos Souza',
        url: '#'
      },
      {
        id: 'r4',
        title: 'Resumo do Projeto',
        type: 'html',
        date: now - 259200000,
        author: 'Ana Lima',
        content: '<h1>Resumo do Projeto</h1><p>Este é um relatório HTML de exemplo...</p>',
        url: '#'
      }
    ];
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    if (!this.currentReport) {
      // Report list
      const list = document.createElement('div');
      list.className = 'arxis-reports__list';

      this.reports.forEach(report => {
        const item = this.createReportItem(report);
        list.appendChild(item);
      });

      body.appendChild(list);
    } else {
      // Report viewer
      this.renderReportViewer(body);
    }

    this.injectStyles();
  }

  private createReportItem(report: Report): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'arxis-reports__item';

    const icon = document.createElement('div');
    icon.className = 'arxis-reports__icon';
    icon.textContent = this.getTypeIcon(report.type);
    icon.style.color = this.getTypeColor(report.type);
    item.appendChild(icon);

    const info = document.createElement('div');
    info.className = 'arxis-reports__info';

    const title = document.createElement('h4');
    title.className = 'arxis-reports__title';
    title.textContent = report.title;

    const meta = document.createElement('div');
    meta.className = 'arxis-reports__meta';
    meta.innerHTML = `
      <span>👤 ${report.author}</span>
      <span>📅 ${this.formatDate(report.date)}</span>
      ${report.pages ? `<span>📄 ${report.pages} páginas</span>` : ''}
    `;

    info.appendChild(title);
    info.appendChild(meta);
    item.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'arxis-reports__actions';

    const viewBtn = new Button({ text: '👁️', variant: 'primary', size: 'sm' });
    viewBtn.getElement().addEventListener('click', () => this.viewReport(report));

    const downloadBtn = new Button({ text: '⬇️', variant: 'secondary', size: 'sm' });
    downloadBtn.getElement().addEventListener('click', () => this.downloadReport(report));

    actions.appendChild(viewBtn.getElement());
    actions.appendChild(downloadBtn.getElement());
    item.appendChild(actions);

    return item;
  }

  private renderReportViewer(container: HTMLElement): void {
    // Header
    const header = document.createElement('div');
    header.className = 'arxis-reports__viewer-header';

    const backBtn = new Button({ text: '◀ Voltar', variant: 'secondary', size: 'sm' });
    backBtn.getElement().addEventListener('click', () => {
      this.currentReport = undefined;
      this.render();
    });

    const title = document.createElement('h3');
    title.className = 'arxis-reports__viewer-title';
    title.textContent = this.currentReport!.title;

    const downloadBtn = new Button({ text: '⬇️ Baixar', variant: 'primary', size: 'sm' });
    downloadBtn.getElement().addEventListener('click', () => this.downloadReport(this.currentReport!));

    header.appendChild(backBtn.getElement());
    header.appendChild(title);
    header.appendChild(downloadBtn.getElement());
    container.appendChild(header);

    // Content
    const viewer = document.createElement('div');
    viewer.className = 'arxis-reports__viewer';

    if (this.currentReport!.type === 'pdf') {
      const pdfPlaceholder = document.createElement('div');
      pdfPlaceholder.className = 'arxis-reports__pdf-placeholder';
      pdfPlaceholder.innerHTML = `
        <div class="arxis-reports__pdf-icon">📄</div>
        <div class="arxis-reports__pdf-text">
          <div>Visualizador de PDF</div>
          <div style="font-size: 13px; color: rgba(255,255,255,0.6); margin-top: 8px;">
            ${this.currentReport!.pages} páginas
          </div>
          <div style="font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 12px;">
            Em produção, aqui seria renderizado o PDF usando PDF.js ou similar
          </div>
        </div>
      `;
      viewer.appendChild(pdfPlaceholder);
    } else if (this.currentReport!.type === 'html') {
      const htmlContent = document.createElement('div');
      htmlContent.className = 'arxis-reports__html-content';
      htmlContent.innerHTML = this.currentReport!.content || '<p>Conteúdo HTML</p>';
      viewer.appendChild(htmlContent);
    } else if (this.currentReport!.type === 'excel') {
      const excelPlaceholder = document.createElement('div');
      excelPlaceholder.className = 'arxis-reports__pdf-placeholder';
      excelPlaceholder.innerHTML = `
        <div class="arxis-reports__pdf-icon">📊</div>
        <div class="arxis-reports__pdf-text">
          <div>Planilha Excel</div>
          <div style="font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 12px;">
            Clique em "Baixar" para abrir no Excel
          </div>
        </div>
      `;
      viewer.appendChild(excelPlaceholder);
    }

    container.appendChild(viewer);
  }

  private getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      pdf: '📄',
      html: '🌐',
      excel: '📊'
    };
    return icons[type] || '📄';
  }

  private getTypeColor(type: string): string {
    const colors: Record<string, string> = {
      pdf: '#ff4444',
      html: '#00d4ff',
      excel: '#4caf50'
    };
    return colors[type] || '#fff';
  }

  private formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private viewReport(report: Report): void {
    this.currentReport = report;
    this.render();
  }

  private downloadReport(report: Report): void {
    console.log('Baixando relatório:', report.title);
    // Simular download
    const a = document.createElement('a');
    a.href = report.url || '#';
    a.download = `${report.title}.${report.type}`;
    a.click();
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.card.destroy();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-reports-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-reports-styles';
    style.textContent = `
      .arxis-reports__list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: 500px;
        overflow-y: auto;
      }

      .arxis-reports__item {
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 14px;
        background: rgba(255, 255, 255, 0.04);
        border-radius: 8px;
        transition: all 0.2s;
      }

      .arxis-reports__item:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateX(3px);
      }

      .arxis-reports__icon {
        font-size: 32px;
        width: 48px;
        text-align: center;
        flex-shrink: 0;
      }

      .arxis-reports__info {
        flex: 1;
        min-width: 0;
      }

      .arxis-reports__title {
        margin: 0 0 6px 0;
        font-size: 15px;
        font-weight: 600;
        color: #fff;
      }

      .arxis-reports__meta {
        display: flex;
        gap: 12px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }

      .arxis-reports__actions {
        display: flex;
        gap: 4px;
        flex-shrink: 0;
      }

      .arxis-reports__viewer-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .arxis-reports__viewer-title {
        flex: 1;
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #fff;
      }

      .arxis-reports__viewer {
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        padding: 20px;
        min-height: 400px;
      }

      .arxis-reports__pdf-placeholder {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 400px;
        gap: 20px;
      }

      .arxis-reports__pdf-icon {
        font-size: 64px;
        opacity: 0.5;
      }

      .arxis-reports__pdf-text {
        text-align: center;
        font-size: 16px;
        color: rgba(255, 255, 255, 0.8);
      }

      .arxis-reports__html-content {
        color: rgba(255, 255, 255, 0.9);
        line-height: 1.6;
      }

      .arxis-reports__html-content h1,
      .arxis-reports__html-content h2,
      .arxis-reports__html-content h3 {
        color: #fff;
      }
    `;
    document.head.appendChild(style);
  }
}
