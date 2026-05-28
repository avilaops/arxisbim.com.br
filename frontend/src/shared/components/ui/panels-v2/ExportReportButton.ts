/**
 * Export Report Button
 * Botão de exportação de relatórios em vários formatos
 */

import { Button } from '../design-system/components/Button';
import { ContextMenu, ContextMenuItem } from './ContextMenu';

export type ExportFormat = 'pdf' | 'excel' | 'word' | 'csv' | 'json' | 'html';

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeImages?: boolean;
  includeProperties?: boolean;
  template?: string;
}

export class ExportReportButton {
  private button: Button;
  private contextMenu?: ContextMenu;
  private onExport?: (options: ExportOptions) => void;

  constructor(options?: {
    text?: string;
    onExport?: (options: ExportOptions) => void;
  }) {
    this.onExport = options?.onExport;
    
    this.button = new Button({
      text: options?.text || '📤 Exportar Relatório',
      variant: 'primary',
      size: 'md'
    });

    this.setupEventListeners();
    this.injectStyles();
  }

  private setupEventListeners(): void {
    this.button.getElement().addEventListener('click', (e) => {
      this.showExportMenu(e);
    });
  }

  private showExportMenu(e: MouseEvent): void {
    const menuItems: ContextMenuItem[] = [
      {
        id: 'pdf',
        name: 'Exportar como PDF',
        icon: '📄',
        description: 'Documento portátil',
        action: () => this.exportAs('pdf')
      },
      {
        id: 'excel',
        name: 'Exportar como Excel',
        icon: '📊',
        description: 'Planilha editável',
        action: () => this.exportAs('excel')
      },
      {
        id: 'word',
        name: 'Exportar como Word',
        icon: '📝',
        description: 'Documento editável',
        action: () => this.exportAs('word')
      },
      { id: 'sep1', name: '', separator: true, action: () => {} },
      {
        id: 'csv',
        name: 'Exportar como CSV',
        icon: '📋',
        description: 'Valores separados por vírgula',
        action: () => this.exportAs('csv')
      },
      {
        id: 'json',
        name: 'Exportar como JSON',
        icon: '{}',
        description: 'Formato de dados estruturados',
        action: () => this.exportAs('json')
      },
      {
        id: 'html',
        name: 'Exportar como HTML',
        icon: '🌐',
        description: 'Página web',
        action: () => this.exportAs('html')
      },
      { id: 'sep2', name: '', separator: true, action: () => {} },
      {
        id: 'advanced',
        name: 'Opções Avançadas...',
        icon: '⚙️',
        action: () => this.showAdvancedOptions()
      }
    ];

    if (this.contextMenu) {
      this.contextMenu.destroy();
    }

    this.contextMenu = new ContextMenu(menuItems);
    this.contextMenu.show(e.clientX, e.clientY);
  }

  private exportAs(format: ExportFormat): void {
    const options: ExportOptions = {
      format,
      filename: `relatorio_${Date.now()}`,
      includeImages: true,
      includeProperties: true
    };

    this.onExport?.(options);
    this.showExportProgress(format);
  }

  private showExportProgress(format: ExportFormat): void {
    const overlay = document.createElement('div');
    overlay.className = 'arxis-export__overlay';

    const modal = document.createElement('div');
    modal.className = 'arxis-export__modal';

    const icon = document.createElement('div');
    icon.className = 'arxis-export__icon';
    icon.textContent = '📤';

    const text = document.createElement('div');
    text.className = 'arxis-export__text';
    text.textContent = `Exportando relatório como ${format.toUpperCase()}...`;

    const progress = document.createElement('div');
    progress.className = 'arxis-export__progress';
    const progressBar = document.createElement('div');
    progressBar.className = 'arxis-export__progress-bar';
    progress.appendChild(progressBar);

    modal.appendChild(icon);
    modal.appendChild(text);
    modal.appendChild(progress);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Simulate progress
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      progressBar.style.width = `${currentProgress}%`;

      if (currentProgress >= 100) {
        clearInterval(interval);
        
        text.textContent = '✓ Exportação concluída!';
        icon.textContent = '✅';
        
        setTimeout(() => {
          overlay.remove();
        }, 1500);
      }
    }, 200);
  }

  private showAdvancedOptions(): void {
    const overlay = document.createElement('div');
    overlay.className = 'arxis-export__overlay';

    const modal = document.createElement('div');
    modal.className = 'arxis-export__advanced-modal';

    const title = document.createElement('h3');
    title.textContent = '⚙️ Opções Avançadas de Exportação';
    title.style.marginTop = '0';
    modal.appendChild(title);

    // Options
    const options = [
      { id: 'images', label: 'Incluir imagens', checked: true },
      { id: 'properties', label: 'Incluir propriedades', checked: true },
      { id: 'metadata', label: 'Incluir metadados', checked: true },
      { id: 'annotations', label: 'Incluir anotações', checked: true },
      { id: 'history', label: 'Incluir histórico', checked: false }
    ];

    options.forEach(opt => {
      const optionDiv = document.createElement('div');
      optionDiv.style.marginBottom = '12px';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `export-${opt.id}`;
      checkbox.checked = opt.checked;
      checkbox.style.marginRight = '8px';

      const label = document.createElement('label');
      label.htmlFor = `export-${opt.id}`;
      label.textContent = opt.label;
      label.style.cursor = 'pointer';
      label.style.color = 'rgba(255,255,255,0.9)';

      optionDiv.appendChild(checkbox);
      optionDiv.appendChild(label);
      modal.appendChild(optionDiv);
    });

    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '8px';
    buttonContainer.style.marginTop = '20px';

    const cancelBtn = new Button({ text: 'Cancelar', variant: 'secondary', size: 'sm' });
    cancelBtn.getElement().addEventListener('click', () => overlay.remove());

    const exportBtn = new Button({ text: '📤 Exportar', variant: 'primary', size: 'sm' });
    exportBtn.getElement().addEventListener('click', () => {
      overlay.remove();
      this.exportAs('pdf');
    });

    buttonContainer.appendChild(cancelBtn.getElement());
    buttonContainer.appendChild(exportBtn.getElement());
    modal.appendChild(buttonContainer);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  public getElement(): HTMLElement {
    return this.button.getElement();
  }

  public destroy(): void {
    if (this.contextMenu) {
      this.contextMenu.destroy();
    }
    this.button.destroy();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-export-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-export-styles';
    style.textContent = `
      .arxis-export__overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(5px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
      }

      .arxis-export__modal {
        background: rgba(20, 20, 30, 0.98);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 16px;
        padding: 32px;
        min-width: 300px;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
      }

      .arxis-export__advanced-modal {
        background: rgba(20, 20, 30, 0.98);
        border: 1px solid rgba(0, 212, 255, 0.3);
        border-radius: 16px;
        padding: 24px;
        min-width: 400px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
        color: #fff;
      }

      .arxis-export__icon {
        font-size: 64px;
        margin-bottom: 16px;
        animation: float 2s ease-in-out infinite;
      }

      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }

      .arxis-export__text {
        font-size: 16px;
        color: rgba(255, 255, 255, 0.9);
        margin-bottom: 20px;
      }

      .arxis-export__progress {
        width: 100%;
        height: 8px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        overflow: hidden;
      }

      .arxis-export__progress-bar {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #00d4ff, #7b2ff7);
        transition: width 0.3s ease;
      }
    `;
    document.head.appendChild(style);
  }
}
