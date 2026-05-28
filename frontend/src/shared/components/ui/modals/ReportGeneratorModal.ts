/**
 * ReportGeneratorModal - Gerador de relatórios
 * Cria relatórios PDF/Excel personalizados
 */

import { Modal } from '../design-system/components/Modal';
import { Button } from '../design-system/components/Button';
import { Select } from '../design-system/components/Select';
import { Checkbox } from '../design-system/components/Checkbox';
import { Input } from '../design-system/components/Input';
import { showLoading, hideLoading } from '../components/ProgressBar';

export type ReportFormat = 'pdf' | 'xlsx' | 'docx';
export type ReportType = 'executive' | 'technical' | 'cost' | 'schedule' | 'quality' | 'custom';

export interface ReportOptions {
  type: ReportType;
  format: ReportFormat;
  title: string;
  sections: string[];
  includeImages: boolean;
  includeCharts: boolean;
  includeTables: boolean;
  logo?: string;
}

export class ReportGeneratorModal {
  private modal: Modal;
  private options: ReportOptions;

  constructor() {
    this.options = {
      type: 'executive',
      format: 'pdf',
      title: 'Relatório de Projeto',
      sections: ['summary', 'progress', 'costs'],
      includeImages: true,
      includeCharts: true,
      includeTables: true
    };

    this.modal = new Modal({
      title: '📄 Gerar Relatório',
      size: 'md',
      closeOnEscape: true
    });

    this.buildUI();
    this.applyStyles();
  }

  private buildUI(): void {
    const container = document.createElement('div');
    container.className = 'report-modal';

    // Report type
    const typeSection = this.createTypeSection();
    container.appendChild(typeSection);

    // Format selection
    const formatSection = this.createFormatSection();
    container.appendChild(formatSection);

    // Options
    const optionsSection = this.createOptionsSection();
    container.appendChild(optionsSection);

    // Sections
    const sectionsSection = this.createSectionsSection();
    container.appendChild(sectionsSection);

    // Footer
    const footer = this.createFooter();
    container.appendChild(footer);

    this.modal.setContent(container);
  }

  private createTypeSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'report-section';

    const typeSelect = new Select({
      label: 'Tipo de Relatório',
      options: [
        { value: 'executive', label: '👔 Executivo - Visão geral do projeto' },
        { value: 'technical', label: '🔧 Técnico - Detalhes de engenharia' },
        { value: 'cost', label: '💰 Custos - Orçamento e despesas' },
        { value: 'schedule', label: '📅 Cronograma - Progresso temporal' },
        { value: 'quality', label: '✅ Qualidade - Inspeções e não-conformidades' },
        { value: 'custom', label: '⚙️ Personalizado' }
      ],
      value: this.options.type,
      onChange: (value) => {
        this.options.type = value as ReportType;
        this.updateSections();
      }
    });

    section.appendChild(typeSelect.getElement());

    return section;
  }

  private createFormatSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'report-section';

    const title = document.createElement('div');
    title.className = 'report-section-title';
    title.textContent = 'Formato de Saída';
    section.appendChild(title);

    const formats = document.createElement('div');
    formats.className = 'report-format-grid';

    const formatOptions = [
      { value: 'pdf', icon: '📄', label: 'PDF', desc: 'Documento portátil' },
      { value: 'xlsx', icon: '📊', label: 'Excel', desc: 'Planilha editável' },
      { value: 'docx', icon: '📝', label: 'Word', desc: 'Documento editável' }
    ];

    formatOptions.forEach(format => {
      const card = document.createElement('div');
      card.className = 'report-format-card';
      
      if (this.options.format === format.value) {
        card.classList.add('report-format-card--selected');
      }

      card.innerHTML = `
        <div class="report-format-icon">${format.icon}</div>
        <div class="report-format-label">${format.label}</div>
        <div class="report-format-desc">${format.desc}</div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.report-format-card').forEach(c => {
          c.classList.remove('report-format-card--selected');
        });
        card.classList.add('report-format-card--selected');
        this.options.format = format.value as ReportFormat;
      });

      formats.appendChild(card);
    });

    section.appendChild(formats);

    return section;
  }

  private createOptionsSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'report-section';

    const titleInput = new Input({
      label: 'Título do Relatório',
      value: this.options.title,
      fullWidth: true,
      onChange: (value) => {
        this.options.title = value;
      }
    });
    section.appendChild(titleInput.getElement());

    const optionsTitle = document.createElement('div');
    optionsTitle.className = 'report-section-title';
    optionsTitle.textContent = 'Opções de Conteúdo';
    section.appendChild(optionsTitle);

    const checkboxes = [
      { key: 'includeImages', label: '🖼️ Incluir imagens e capturas' },
      { key: 'includeCharts', label: '📊 Incluir gráficos' },
      { key: 'includeTables', label: '📋 Incluir tabelas de dados' }
    ];

    checkboxes.forEach(({ key, label }) => {
      const checkbox = new Checkbox({
        label,
        checked: (this.options as any)[key],
        onChange: (checked) => {
          (this.options as any)[key] = checked;
        }
      });
      section.appendChild(checkbox.getElement());
    });

    return section;
  }

  private createSectionsSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'report-section';

    const title = document.createElement('div');
    title.className = 'report-section-title';
    title.textContent = 'Seções do Relatório';
    section.appendChild(title);

    const sectionsContainer = document.createElement('div');
    sectionsContainer.className = 'report-sections-list';
    sectionsContainer.id = 'report-sections';

    this.renderSections(sectionsContainer);

    section.appendChild(sectionsContainer);

    return section;
  }

  private renderSections(container: HTMLElement): void {
    const allSections = [
      { id: 'summary', label: 'Resumo Executivo' },
      { id: 'progress', label: 'Progresso da Obra' },
      { id: 'costs', label: 'Análise de Custos' },
      { id: 'schedule', label: 'Cronograma' },
      { id: 'quantities', label: 'Quantitativos' },
      { id: 'quality', label: 'Controle de Qualidade' },
      { id: 'conflicts', label: 'Interferências' },
      { id: 'photos', label: 'Registro Fotográfico' }
    ];

    container.innerHTML = '';

    allSections.forEach(section => {
      const checkbox = new Checkbox({
        label: section.label,
        checked: this.options.sections.includes(section.id),
        onChange: (checked) => {
          if (checked) {
            this.options.sections.push(section.id);
          } else {
            this.options.sections = this.options.sections.filter(s => s !== section.id);
          }
        }
      });
      container.appendChild(checkbox.getElement());
    });
  }

  private updateSections(): void {
    const presets: Record<ReportType, string[]> = {
      executive: ['summary', 'progress', 'costs'],
      technical: ['progress', 'quantities', 'conflicts', 'quality'],
      cost: ['costs', 'quantities'],
      schedule: ['schedule', 'progress'],
      quality: ['quality', 'conflicts', 'photos'],
      custom: this.options.sections
    };

    this.options.sections = presets[this.options.type] || [];
    
    const container = document.getElementById('report-sections');
    if (container) {
      this.renderSections(container);
    }
  }

  private createFooter(): HTMLElement {
    const footer = document.createElement('div');
    footer.className = 'report-footer';

    const cancelBtn = new Button({
      text: 'Cancelar',
      variant: 'ghost',
      onClick: () => this.modal.close()
    });

    const generateBtn = new Button({
      text: '📄 Gerar Relatório',
      variant: 'primary',
      onClick: () => this.generateReport()
    });

    footer.appendChild(cancelBtn.getElement());
    footer.appendChild(generateBtn.getElement());

    return footer;
  }

  private async generateReport(): Promise<void> {
    showLoading('Gerando relatório...');

    try {
      // Simular geração
      await new Promise(resolve => setTimeout(resolve, 2000));

      hideLoading();
      this.modal.close();
      
      console.log('✅ Relatório gerado!', this.options);
    } catch (error) {
      hideLoading();
      console.error('❌ Erro ao gerar relatório:', error);
    }
  }

  public open(): void {
    this.modal.open();
  }

  private applyStyles(): void {
    if (document.getElementById('report-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'report-modal-styles';
    style.textContent = `
      .report-modal {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .report-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .report-section-title {
        font-size: 14px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
        margin-top: 8px;
      }

      .report-format-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }

      .report-format-card {
        padding: 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        border: 2px solid transparent;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: center;
      }

      .report-format-card:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .report-format-card--selected {
        border-color: var(--theme-accent, #00ff88);
        background: rgba(0, 255, 136, 0.1);
      }

      .report-format-icon {
        font-size: 32px;
        margin-bottom: 8px;
      }

      .report-format-label {
        font-size: 14px;
        font-weight: 600;
        color: var(--theme-foreground, #fff);
        margin-bottom: 4px;
      }

      .report-format-desc {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
      }

      .report-sections-list {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }

      .report-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding-top: 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
    `;
    document.head.appendChild(style);
  }

  public destroy(): void {
    this.modal.destroy();
  }
}

export function openReportGeneratorModal(): ReportGeneratorModal {
  const modal = new ReportGeneratorModal();
  modal.open();
  return modal;
}
