/**
 * ExportModal Component - Exportar projeto
 * Exportação para GLTF, IFC, DWG, BCF, PDF
 */

import { Modal } from '../design-system/components/Modal';
import { Button } from '../design-system/components/Button';
import { Select } from '../design-system/components/Select';
import { Input } from '../design-system/components/Input';
import { Checkbox } from '../design-system/components/Checkbox';
import { Toggle } from '../design-system/components/Toggle';
import { showLoading, hideLoading } from '../components/ProgressBar';

export type ExportFormat = 'gltf' | 'glb' | 'ifc' | 'dwg' | 'bcf' | 'pdf' | 'xlsx';

export interface ExportOptions {
  format: ExportFormat;
  filename: string;
  includeMetadata: boolean;
  includeTextures: boolean;
  includeHierarchy: boolean;
  compressFiles: boolean;
  selectedOnly: boolean;
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

export class ExportModal {
  private modal: Modal;
  private options: ExportOptions;
  private onExport?: (options: ExportOptions) => Promise<void>;

  constructor(onExport?: (options: ExportOptions) => Promise<void>) {
    this.onExport = onExport;
    
    this.options = {
      format: 'gltf',
      filename: `projeto_${Date.now()}`,
      includeMetadata: true,
      includeTextures: true,
      includeHierarchy: true,
      compressFiles: true,
      selectedOnly: false,
      quality: 'high'
    };

    this.modal = new Modal({
      title: 'Exportar projeto',
      size: 'md',
      closeOnEscape: true
    });

    this.buildUI();
    this.applyStyles();
  }

  /**
   * Constrói a UI
   */
  private buildUI(): void {
    const container = document.createElement('div');
    container.className = 'export-modal';

    // Format selector
    const formatSection = this.createFormatSection();
    container.appendChild(formatSection);

    // Options section
    const optionsSection = this.createOptionsSection();
    container.appendChild(optionsSection);

    // Advanced options
    const advancedSection = this.createAdvancedSection();
    container.appendChild(advancedSection);

    // Preview info
    const previewSection = this.createPreviewSection();
    container.appendChild(previewSection);

    // Footer
    const footer = this.createFooter();
    container.appendChild(footer);

    this.modal.setContent(container);
  }

  /**
   * Cria seção de formato
   */
  private createFormatSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'export-section';

    const title = document.createElement('h3');
    title.className = 'export-section-title';
    title.textContent = 'Formato de Exportação';
    section.appendChild(title);

    // Format grid
    const formatGrid = document.createElement('div');
    formatGrid.className = 'export-format-grid';

    const formats = [
      { value: 'gltf', label: 'GLTF', icon: '3D', desc: 'Formato 3D web padrão' },
      { value: 'glb', label: 'GLB', icon: 'BIN', desc: 'GLTF binário compacto' },
      { value: 'ifc', label: 'IFC', icon: 'IFC', desc: 'Industry Foundation Classes' },
      { value: 'dwg', label: 'DWG', icon: 'CAD', desc: 'AutoCAD Drawing' },
      { value: 'bcf', label: 'BCF', icon: 'BCF', desc: 'BIM Collaboration Format' },
      { value: 'pdf', label: 'PDF', icon: 'PDF', desc: 'Relatório em PDF' },
      { value: 'xlsx', label: 'Excel', icon: 'XLS', desc: 'Planilha de quantitativos' }
    ];

    formats.forEach(format => {
      const card = document.createElement('div');
      card.className = 'export-format-card';
      
      if (this.options.format === format.value) {
        card.classList.add('export-format-card--selected');
      }

      card.innerHTML = `
        <div class="export-format-icon">${format.icon}</div>
        <div class="export-format-label">${format.label}</div>
        <div class="export-format-desc">${format.desc}</div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.export-format-card').forEach(c => {
          c.classList.remove('export-format-card--selected');
        });
        card.classList.add('export-format-card--selected');
        this.options.format = format.value as ExportFormat;
        this.updatePreview();
      });

      formatGrid.appendChild(card);
    });

    section.appendChild(formatGrid);

    return section;
  }

  /**
   * Cria seção de opções
   */
  private createOptionsSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'export-section';

    const title = document.createElement('h3');
    title.className = 'export-section-title';
    title.textContent = 'Opções de Exportação';
    section.appendChild(title);

    // Filename
    const filenameInput = new Input({
      label: 'Nome do Arquivo',
      placeholder: 'projeto_export',
      value: this.options.filename,
      fullWidth: true,
      onChange: (value) => {
        this.options.filename = value;
        this.updatePreview();
      }
    });
    section.appendChild(filenameInput.getElement());

    // Quality selector
    const qualitySelect = new Select({
      label: 'Qualidade',
      options: [
        { value: 'low', label: 'Baixa (rápido)' },
        { value: 'medium', label: 'Média' },
        { value: 'high', label: 'Alta' },
        { value: 'ultra', label: 'Ultra (lento)' }
      ],
      value: this.options.quality,
      onChange: (value) => {
        this.options.quality = value as any;
        this.updatePreview();
      }
    });
    section.appendChild(qualitySelect.getElement());

    // Checkboxes
    const checkboxes = [
      { key: 'selectedOnly', label: 'Apenas elementos selecionados' },
      { key: 'includeMetadata', label: 'Incluir metadados IFC' },
      { key: 'includeTextures', label: 'Incluir texturas' },
      { key: 'includeHierarchy', label: 'Manter hierarquia' },
      { key: 'compressFiles', label: 'Comprimir arquivos' }
    ];

    checkboxes.forEach(({ key, label }) => {
      const checkbox = new Checkbox({
        label,
        checked: (this.options as any)[key],
        onChange: (checked) => {
          (this.options as any)[key] = checked;
          this.updatePreview();
        }
      });
      section.appendChild(checkbox.getElement());
    });

    return section;
  }

  /**
   * Cria seção avançada
   */
  private createAdvancedSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'export-section export-section--collapsible';

    const header = document.createElement('div');
    header.className = 'export-section-header';
    header.innerHTML = '<span>Opções avançadas</span><span class="export-section-toggle">▼</span>';
    header.addEventListener('click', () => {
      section.classList.toggle('export-section--expanded');
    });
    section.appendChild(header);

    const content = document.createElement('div');
    content.className = 'export-section-content';
    content.innerHTML = `
      <div class="export-advanced-option">
        <label>Coordenadas:</label>
        <select>
          <option>Globais</option>
          <option>Locais</option>
          <option>Projeto</option>
        </select>
      </div>
      <div class="export-advanced-option">
        <label>Unidades:</label>
        <select>
          <option>Metros</option>
          <option>Centímetros</option>
          <option>Milímetros</option>
        </select>
      </div>
      <div class="export-advanced-option">
        <label>Sistema de cores:</label>
        <select>
          <option>Original</option>
          <option>Por tipo</option>
          <option>Por material</option>
        </select>
      </div>
    `;
    section.appendChild(content);

    return section;
  }

  /**
   * Cria seção de preview
   */
  private createPreviewSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'export-preview';
    section.id = 'export-preview';

    this.updatePreview();

    return section;
  }

  /**
   * Atualiza preview
   */
  private updatePreview(): void {
    const preview = document.getElementById('export-preview');
    if (!preview) return;

    const estimatedSize = this.estimateFileSize();
    const extension = this.getFileExtension();

    preview.innerHTML = `
      <div class="export-preview-item">
        <span class="export-preview-label">Arquivo:</span>
        <span class="export-preview-value">${this.options.filename}${extension}</span>
      </div>
      <div class="export-preview-item">
        <span class="export-preview-label">Formato:</span>
        <span class="export-preview-value">${this.options.format.toUpperCase()}</span>
      </div>
      <div class="export-preview-item">
        <span class="export-preview-label">Tamanho estimado:</span>
        <span class="export-preview-value">${estimatedSize}</span>
      </div>
      <div class="export-preview-item">
        <span class="export-preview-label">Qualidade:</span>
        <span class="export-preview-value">${this.options.quality}</span>
      </div>
    `;
  }

  /**
   * Estima tamanho do arquivo
   */
  private estimateFileSize(): string {
    const baseSizes: Record<ExportFormat, number> = {
      gltf: 5.2,
      glb: 3.8,
      ifc: 12.5,
      dwg: 8.3,
      bcf: 0.5,
      pdf: 2.1,
      xlsx: 1.2
    };

    let size = baseSizes[this.options.format] || 5;

    if (this.options.includeTextures) size *= 2.5;
    if (this.options.quality === 'ultra') size *= 1.8;
    if (this.options.quality === 'low') size *= 0.5;
    if (this.options.compressFiles) size *= 0.6;
    if (this.options.selectedOnly) size *= 0.3;

    if (size < 1) return `${(size * 1024).toFixed(0)} KB`;
    return `${size.toFixed(1)} MB`;
  }

  /**
   * Retorna extensão do arquivo
   */
  private getFileExtension(): string {
    const extensions: Record<ExportFormat, string> = {
      gltf: '.gltf',
      glb: '.glb',
      ifc: '.ifc',
      dwg: '.dwg',
      bcf: '.bcfzip',
      pdf: '.pdf',
      xlsx: '.xlsx'
    };
    return extensions[this.options.format];
  }

  /**
   * Cria footer
   */
  private createFooter(): HTMLElement {
    const footer = document.createElement('div');
    footer.className = 'export-footer';

    const cancelBtn = new Button({
      text: 'Cancelar',
      variant: 'ghost',
      onClick: () => this.modal.close()
    });

    const exportBtn = new Button({
      text: 'Exportar',
      variant: 'primary',
      onClick: () => this.handleExport()
    });

    footer.appendChild(cancelBtn.getElement());
    footer.appendChild(exportBtn.getElement());

    return footer;
  }

  /**
   * Manipula exportação
   */
  private async handleExport(): Promise<void> {
    showLoading(`Exportando ${this.options.format.toUpperCase()}...`);

    try {
      if (this.onExport) {
        await this.onExport(this.options);
      } else {
        // Simular exportação
        await this.simulateExport();
      }

      hideLoading();
      this.modal.close();
      
      // Success notification
      console.log('Exportação concluída!');
    } catch (error) {
      hideLoading();
      console.error('Erro na exportação:', error);
    }
  }

  /**
   * Simula exportação
   */
  private async simulateExport(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });
  }

  /**
   * Abre o modal
   */
  public open(): void {
    this.modal.open();
  }

  /**
   * Aplica estilos CSS
   */
  private applyStyles(): void {
    if (document.getElementById('export-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'export-modal-styles';
    style.textContent = `
      .export-modal {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .export-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .export-section-title {
        font-size: 15px;
        font-weight: 600;
        color: #111827;
        margin: 0 0 8px 0;
      }

      .export-format-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
      }

      .export-format-card {
        padding: 16px;
        background: #ffffff;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: center;
      }

      .export-format-card:hover {
        background: #f9fafb;
        transform: translateY(-2px);
      }

      .export-format-card--selected {
        border-color: #2563eb;
        background: #eff6ff;
      }

      .export-format-icon {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        color: #1d4ed8;
        margin-bottom: 8px;
      }

      .export-format-label {
        font-size: 14px;
        font-weight: 600;
        color: #111827;
        margin-bottom: 4px;
      }

      .export-format-desc {
        font-size: 11px;
        color: #6b7280;
      }

      .export-section--collapsible .export-section-content {
        display: none;
        margin-top: 12px;
      }

      .export-section--expanded .export-section-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .export-section--expanded .export-section-toggle {
        transform: rotate(180deg);
      }

      .export-section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: #f9fafb;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.15s ease;
      }

      .export-section-header:hover {
        background: #eff6ff;
      }

      .export-section-toggle {
        font-size: 12px;
        transition: transform 0.3s ease;
      }

      .export-advanced-option {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
      }

      .export-advanced-option label {
        font-size: 13px;
        color: #374151;
      }

      .export-advanced-option select {
        padding: 6px 12px;
        background: #ffffff;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        color: #111827;
        font-size: 12px;
      }

      .export-preview {
        padding: 16px;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 8px;
      }

      .export-preview-item {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        font-size: 13px;
      }

      .export-preview-label {
        color: #6b7280;
      }

      .export-preview-value {
        color: #166534;
        font-weight: 600;
        font-family: Inter, system-ui, sans-serif;
      }

      .export-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding-top: 16px;
        border-top: 1px solid #e5e7eb;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Destrói o modal
   */
  public destroy(): void {
    this.modal.destroy();
  }
}

/**
 * Helper para abrir modal de exportação
 */
export function openExportModal(onExport?: (options: ExportOptions) => Promise<void>): ExportModal {
  const modal = new ExportModal(onExport);
  modal.open();
  return modal;
}
