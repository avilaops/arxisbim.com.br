/**
 * LoadFileModal V2 - Enterprise File Subsystem
 * UI pura consumindo FileService
 */

import { Modal } from '../design-system/components/Modal';
import { Button } from '../design-system/components/Button';
import { Input } from '../design-system/components/Input';
import { showLoading, hideLoading } from '../components/ProgressBar';
import { fileService } from '../../../../systems/file';
import type { FileHandle, FileProviderType } from '../../../../systems/file/types';

export class LoadFileModal {
  private modal: Modal;
  private currentProvider: FileProviderType = 'examples' as FileProviderType;
  private files: FileHandle[] = [];
  private selectedFiles: Set<string> = new Set();

  constructor() {
    this.modal = new Modal({
      title: 'Carregar Arquivo',
      size: 'lg',
      closeOnEscape: true,
      onClose: () => this.cleanup()
    });

    this.buildUI();
    this.applyStyles();
    // ✅ Não carrega arquivos de exemplo (privacidade)
    // this.loadFiles();
  }

  /**
   * Carrega arquivos do FileService
   */
  private async loadFiles(): Promise<void> {
    try {
      showLoading('Carregando lista de arquivos...');
      const result = await fileService.list(this.currentProvider);
      this.files = result.items;
      this.refreshFileList();
    } catch (error) {
      console.error('Failed to load files:', error);
      alert(`Erro ao carregar arquivos: ${error}`);
    } finally {
      hideLoading();
    }
  }

  /**
   * Constrói a UI
   */
  private buildUI(): void {
    const container = document.createElement('div');
    container.className = 'load-file-modal';

    // Tabs
    const tabs = this.createTabs();
    container.appendChild(tabs);

    // Content areas
    const browserTab = this.createBrowserTab();
    const uploadTab = this.createUploadTab();
    const recentTab = this.createRecentTab();

    // ✅ Começa na tab Upload (privacidade)
    uploadTab.classList.add('load-file-tab--active');

    container.appendChild(browserTab);
    container.appendChild(uploadTab);
    container.appendChild(recentTab);

    // Footer
    const footer = this.createFooter();
    container.appendChild(footer);

    this.modal.setContent(container);
  }

  /**
   * Cria tabs
   */
  private createTabs(): HTMLElement {
    const tabs = document.createElement('div');
    tabs.className = 'load-file-tabs';

    const tabItems = [
      { id: 'upload', label: '📤 Upload', icon: '📤' },
      { id: 'recent', label: '🕒 Recentes', icon: '🕒' },
      { id: 'browser', label: '📁 Navegar', icon: '📁' }
    ];

    tabItems.forEach((tab, index) => {
      const tabBtn = new Button({
        text: tab.label,
        variant: index === 0 ? 'primary' : 'ghost',
        size: 'sm',
        onClick: () => this.switchTab(tab.id)
      });

      const tabEl = tabBtn.getElement();
      tabEl.setAttribute('data-tab', tab.id);
      tabs.appendChild(tabEl);
    });

    return tabs;
  }

  /**
   * Switch tab
   */
  private switchTab(tabId: string): void {
    // Update tab buttons
    const tabBtns = this.modal.getElement().querySelectorAll('[data-tab]');
    tabBtns.forEach(btn => {
      const btnTabId = btn.getAttribute('data-tab');
      if (btnTabId === tabId) {
        btn.classList.add('arxis-btn--primary');
        btn.classList.remove('arxis-btn--ghost');
      } else {
        btn.classList.add('arxis-btn--ghost');
        btn.classList.remove('arxis-btn--primary');
      }
    });

    // Update content
    const tabs = this.modal.getElement().querySelectorAll('.load-file-tab');
    tabs.forEach(tab => {
      const contentTabId = tab.getAttribute('data-tab-content');
      tab.classList.toggle('load-file-tab--active', contentTabId === tabId);
    });

    // Load data for tab
    if (tabId === 'recent') {
      this.loadRecents();
    }
  }

  /**
   * Cria tab de navegação
   */
  private createBrowserTab(): HTMLElement {
    const tab = document.createElement('div');
    tab.className = 'load-file-tab';
    tab.setAttribute('data-tab-content', 'browser');

    // Search
    const search = new Input({
      placeholder: 'Buscar arquivos de exemplo...',
      icon: '🔍',
      fullWidth: true,
      onChange: (value) => this.searchFiles(value)
    });
    tab.appendChild(search.getElement());

    // File list (vazia)
    const fileList = document.createElement('div');
    fileList.className = 'load-file-list';
    tab.appendChild(fileList);

    return tab;
  }

  /**
   * Atualiza lista de arquivos
   */
  private refreshFileList(): void {
    const fileList = this.modal.getElement().querySelector('.load-file-list') as HTMLElement;
    if (fileList) {
      this.renderFileList(fileList);
    }
  }

  /**
   * Renderiza lista de arquivos
   */
  private renderFileList(container: HTMLElement): void {
    container.innerHTML = '';

    if (this.files.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'load-file-empty';
      empty.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: var(--arxis-text-secondary);">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📁</div>
          <p style="margin: 0;">Nenhum arquivo de exemplo disponível</p>
          <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">Use a aba <strong>Upload</strong> para carregar seus arquivos IFC</p>
        </div>
      `;
      container.appendChild(empty);
      return;
    }

    this.files.forEach(file => {
      const item = this.createFileItem(file);
      container.appendChild(item);
    });
  }

  /**
   * Cria item de arquivo
   */
  private createFileItem(file: FileHandle): HTMLElement {
    const item = document.createElement('div');
    item.className = 'load-file-item';
    
    if (this.selectedFiles.has(file.id)) {
      item.classList.add('load-file-item--selected');
    }

    // Icon
    const icon = document.createElement('div');
    icon.className = 'load-file-icon';
    icon.textContent = this.getFileIcon(file.extension);
    item.appendChild(icon);

    // Info
    const info = document.createElement('div');
    info.className = 'load-file-info';

    const name = document.createElement('div');
    name.className = 'load-file-name';
    name.textContent = file.displayName;
    info.appendChild(name);

    const meta = document.createElement('div');
    meta.className = 'load-file-meta';
    meta.textContent = `${this.formatFileSize(file.size)} • ${this.formatDate(file.modifiedAt)}`;
    info.appendChild(meta);

    item.appendChild(info);

    // Click handler
    item.addEventListener('click', () => {
      this.toggleFileSelection(file.id);
      item.classList.toggle('load-file-item--selected');
    });

    // Double-click to load
    item.addEventListener('dblclick', () => {
      this.loadSelectedFiles();
    });

    return item;
  }

  /**
   * Retorna ícone do arquivo
   */
  private getFileIcon(extension: string): string {
    const icons: Record<string, string> = {
      '.ifc': '🏢',
      '.dwg': '📐',
      '.rvt': '🏗️',
      '.nwd': '📊'
    };
    return icons[extension] || '📄';
  }

  /**
   * Formata tamanho do arquivo
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  /**
   * Formata data
   */
  private formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Hoje';
    if (days === 1) return 'Ontem';
    if (days < 7) return `${days} dias atrás`;
    
    return date.toLocaleDateString('pt-BR');
  }

  /**
   * Toggle seleção de arquivo
   */
  private toggleFileSelection(fileId: string): void {
    if (this.selectedFiles.has(fileId)) {
      this.selectedFiles.delete(fileId);
    } else {
      this.selectedFiles.add(fileId);
    }
  }

  /**
   * Busca arquivos
   */
  private async searchFiles(query: string): Promise<void> {
    if (!query.trim()) {
      this.loadFiles();
      return;
    }

    try {
      showLoading('Buscando...');
      const results = await fileService.search(query, [this.currentProvider]);
      this.files = results;
      this.refreshFileList();
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      hideLoading();
    }
  }

  /**
   * Cria tab de upload
   */
  private createUploadTab(): HTMLElement {
    const tab = document.createElement('div');
    tab.className = 'load-file-tab';
    tab.setAttribute('data-tab-content', 'upload');

    // Drop zone
    const dropZone = document.createElement('div');
    dropZone.className = 'load-file-dropzone';
    dropZone.innerHTML = `
      <div class="load-file-dropzone-icon">📤</div>
      <div class="load-file-dropzone-text">Arraste arquivos aqui</div>
      <div class="load-file-dropzone-hint">ou clique para selecionar</div>
      <div class="load-file-dropzone-formats">IFC, DWG, RVT, NWD</div>
    `;

    // File input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = '.ifc,.dwg,.rvt,.nwd';
    fileInput.style.display = 'none';

    fileInput.addEventListener('change', (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        this.handleFileUpload(Array.from(files));
      }
    });

    dropZone.addEventListener('click', () => fileInput.click());

    // Drag & drop
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('load-file-dropzone--active');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('load-file-dropzone--active');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('load-file-dropzone--active');
      
      const files = Array.from(e.dataTransfer?.files || []);
      this.handleFileUpload(files);
    });

    tab.appendChild(dropZone);
    tab.appendChild(fileInput);

    return tab;
  }

  /**
   * Manipula upload de arquivo (drag&drop ou file input)
   */
  private async handleFileUpload(files: File[]): Promise<void> {
    if (files.length === 0) return;

    try {
      showLoading(`Carregando ${files.length} arquivo(s)...`);

      for (const file of files) {
        // Registra no FileService
        const handle = await fileService.registerLocalFile(file);
        
        // Carrega usando FileService (telemetria completa)
        const result = await fileService.load(handle);
        
        if (!result.success) {
          throw new Error(result.error || 'Load failed');
        }

        console.log('📊 Telemetria:', result.metrics);
      }

      console.log(`✅ ${files.length} arquivo(s) carregado(s)`);
      this.modal.close();
    } catch (error) {
      console.error('❌ Erro ao carregar arquivos:', error);
      alert(`Erro ao carregar arquivos: ${error}`);
    } finally {
      hideLoading();
    }
  }

  /**
   * Cria tab de recentes
   */
  private createRecentTab(): HTMLElement {
    const tab = document.createElement('div');
    tab.className = 'load-file-tab';
    tab.setAttribute('data-tab-content', 'recent');

    const recentFiles = document.createElement('div');
    recentFiles.className = 'load-file-list';
    
    tab.appendChild(recentFiles);

    return tab;
  }

  /**
   * Carrega recentes do FileService
   */
  private loadRecents(): void {
    const recents = fileService.getRecents(10);
    this.files = recents;
    
    const recentList = this.modal.getElement().querySelector('[data-tab-content="recent"] .load-file-list') as HTMLElement;
    if (recentList) {
      this.renderFileList(recentList);
    }
  }

  /**
   * Cria footer
   */
  private createFooter(): HTMLElement {
    const footer = document.createElement('div');
    footer.className = 'load-file-footer';

    const cancelBtn = new Button({
      text: 'Cancelar',
      variant: 'ghost',
      onClick: () => this.modal.close()
    });

    const loadBtn = new Button({
      text: 'Carregar',
      variant: 'primary',
      onClick: () => this.loadSelectedFiles()
    });

    footer.appendChild(cancelBtn.getElement());
    footer.appendChild(loadBtn.getElement());

    return footer;
  }

  /**
   * Carrega arquivos selecionados (via FileService)
   */
  private async loadSelectedFiles(): Promise<void> {
    const selectedHandles = this.files.filter(f => this.selectedFiles.has(f.id));

    if (selectedHandles.length === 0) {
      alert('Selecione pelo menos um arquivo');
      return;
    }

    try {
      showLoading(`Carregando ${selectedHandles.length} arquivo(s)...`);

      for (const handle of selectedHandles) {
        // FileService.load() já chama IFCLoader + telemetria
        const result = await fileService.load(handle);
        
        if (!result.success) {
          console.error(`❌ Falha: ${handle.displayName}`, result.error);
          alert(`Erro ao carregar "${handle.displayName}": ${result.error}`);
          continue;
        }

        console.log(`✅ ${handle.displayName} carregado`);
        console.log('📊 Métricas:', result.metrics);
      }

      this.modal.close();
    } catch (error) {
      console.error('❌ Erro ao carregar arquivos:', error);
      alert(`Erro ao carregar arquivos: ${error}`);
    } finally {
      hideLoading();
    }
  }

  /**
   * Cleanup
   */
  private cleanup(): void {
    this.selectedFiles.clear();
  }

  /**
   * Abre o modal
   */
  public open(): void {
    this.modal.open();
  }

  /**
   * Retorna o elemento (compatibilidade)
   */
  public get element(): HTMLElement {
    return this.modal.getElement();
  }

  /**
   * Destrói o modal
   */
  public destroy(): void {
    this.modal.destroy();
  }

  /**
   * Aplica estilos CSS (reutiliza os mesmos do original)
   */
  private applyStyles(): void {
    if (document.getElementById('load-file-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'load-file-modal-styles';
    style.textContent = `
      .load-file-modal {
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-height: 500px;
      }

      .load-file-tabs {
        display: flex;
        gap: 8px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .load-file-tab {
        display: none;
        flex-direction: column;
        gap: 16px;
        flex: 1;
      }

      .load-file-tab--active {
        display: flex;
      }

      .load-file-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        max-height: 350px;
        overflow-y: auto;
        padding: 4px;
      }

      .load-file-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s ease;
        border: 2px solid transparent;
      }

      .load-file-item:hover {
        background: rgba(255, 255, 255, 0.05);
      }

      .load-file-item--selected {
        background: rgba(102, 126, 234, 0.2);
        border-color: var(--theme-accent, #00ff88);
      }

      .load-file-icon {
        font-size: 32px;
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
      }

      .load-file-info {
        flex: 1;
        min-width: 0;
      }

      .load-file-name {
        font-size: 14px;
        font-weight: 500;
        color: var(--theme-foreground, #fff);
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .load-file-meta {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.5);
      }

      .load-file-empty {
        padding: 60px 20px;
        text-align: center;
        color: rgba(255, 255, 255, 0.5);
        font-size: 14px;
      }

      .load-file-dropzone {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 60px 40px;
        border: 2px dashed rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
        min-height: 300px;
      }

      .load-file-dropzone:hover,
      .load-file-dropzone--active {
        border-color: var(--theme-accent, #00ff88);
        background: rgba(0, 255, 136, 0.05);
      }

      .load-file-dropzone-icon {
        font-size: 64px;
        opacity: 0.8;
      }

      .load-file-dropzone-text {
        font-size: 18px;
        font-weight: 600;
        color: var(--theme-foreground, #fff);
      }

      .load-file-dropzone-hint {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.6);
      }

      .load-file-dropzone-formats {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.4);
        margin-top: 8px;
      }

      .load-file-footer {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding-top: 16px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Helper para abrir modal de carregamento
 */
export function openLoadFileModal(): LoadFileModal {
  const modal = new LoadFileModal();
  modal.open();
  return modal;
}
