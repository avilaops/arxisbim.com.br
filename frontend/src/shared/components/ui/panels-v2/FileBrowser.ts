/**
 * File Browser
 * Navegador de arquivos do projeto
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import { Select } from '../design-system/components/Select';

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  extension?: string;
  size?: number;
  modifiedAt: number;
  createdAt: number;
  path: string;
  thumbnail?: string;
  isFavorite?: boolean;
}

export class FileBrowser {
  private card: Card;
  private currentPath: string = '/';
  private files: FileItem[] = [];
  private viewMode: 'list' | 'grid' = 'list';
  private sortBy: 'name' | 'date' | 'size' = 'name';
  private onFileOpen?: (file: FileItem) => void;

  constructor(options?: {
    onFileOpen?: (file: FileItem) => void;
  }) {
    this.onFileOpen = options?.onFileOpen;
    
    this.card = new Card({
      title: '📁 Navegador de Arquivos',
      variant: 'glass'
    });

    this.loadFiles();
    this.render();
  }

  private loadFiles(): void {
    const now = Date.now();
    this.files = [
      {
        id: 'folder-1',
        name: 'Estrutura',
        type: 'folder',
        path: '/Estrutura',
        modifiedAt: now - 86400000,
        createdAt: now - 2592000000
      },
      {
        id: 'folder-2',
        name: 'Arquitetura',
        type: 'folder',
        path: '/Arquitetura',
        modifiedAt: now - 172800000,
        createdAt: now - 2592000000
      },
      {
        id: 'folder-3',
        name: 'Instalações',
        type: 'folder',
        path: '/Instalações',
        modifiedAt: now - 259200000,
        createdAt: now - 2592000000
      },
      {
        id: 'file-1',
        name: 'Projeto_Estrutural_Rev08.ifc',
        type: 'file',
        extension: 'ifc',
        size: 45678901,
        path: '/Projeto_Estrutural_Rev08.ifc',
        modifiedAt: now - 86400000,
        createdAt: now - 1296000000,
        isFavorite: true
      },
      {
        id: 'file-2',
        name: 'Arquitetura_Executivo.rvt',
        type: 'file',
        extension: 'rvt',
        size: 123456789,
        path: '/Arquitetura_Executivo.rvt',
        modifiedAt: now - 172800000,
        createdAt: now - 2592000000,
        isFavorite: true
      },
      {
        id: 'file-3',
        name: 'Hidraulico_Pavimento_Tipo.dwg',
        type: 'file',
        extension: 'dwg',
        size: 8765432,
        path: '/Hidraulico_Pavimento_Tipo.dwg',
        modifiedAt: now - 432000000,
        createdAt: now - 1728000000,
        isFavorite: false
      },
      {
        id: 'file-4',
        name: 'Memorial_Descritivo.pdf',
        type: 'file',
        extension: 'pdf',
        size: 2345678,
        path: '/Memorial_Descritivo.pdf',
        modifiedAt: now - 604800000,
        createdAt: now - 1728000000,
        isFavorite: false
      },
      {
        id: 'file-5',
        name: 'Render_Fachada_Sul.jpg',
        type: 'file',
        extension: 'jpg',
        size: 1234567,
        path: '/Render_Fachada_Sul.jpg',
        modifiedAt: now - 864000000,
        createdAt: now - 864000000,
        isFavorite: false
      }
    ];
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    // Toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'arxis-filebrowser__toolbar';

    // Breadcrumb
    const breadcrumb = document.createElement('div');
    breadcrumb.className = 'arxis-filebrowser__breadcrumb';
    const paths = this.currentPath.split('/').filter(Boolean);
    
    const homeBtn = document.createElement('span');
    homeBtn.className = 'arxis-filebrowser__breadcrumb-item';
    homeBtn.textContent = '🏠';
    homeBtn.addEventListener('click', () => this.navigateTo('/'));
    breadcrumb.appendChild(homeBtn);

    paths.forEach((path, index) => {
      const separator = document.createElement('span');
      separator.textContent = ' / ';
      separator.style.color = 'rgba(255, 255, 255, 0.3)';
      breadcrumb.appendChild(separator);

      const item = document.createElement('span');
      item.className = 'arxis-filebrowser__breadcrumb-item';
      item.textContent = path;
      item.addEventListener('click', () => {
        const targetPath = '/' + paths.slice(0, index + 1).join('/');
        this.navigateTo(targetPath);
      });
      breadcrumb.appendChild(item);
    });

    toolbar.appendChild(breadcrumb);
    body.appendChild(toolbar);

    // Controls
    const controls = document.createElement('div');
    controls.className = 'arxis-filebrowser__controls';

    const uploadBtn = new Button({ text: '📤 Upload', variant: 'primary', size: 'sm' });
    uploadBtn.getElement().addEventListener('click', () => this.uploadFile());

    const newFolderBtn = new Button({ text: '📁 Nova Pasta', variant: 'secondary', size: 'sm' });
    newFolderBtn.getElement().addEventListener('click', () => this.createFolder());

    const sortSelect = new Select({
      label: 'Ordenar:',
      options: [
        { value: 'name', label: 'Nome' },
        { value: 'date', label: 'Data' },
        { value: 'size', label: 'Tamanho' }
      ],
      value: this.sortBy,
      onChange: (value) => {
        this.sortBy = value as any;
        this.render();
      }
    });

    const viewListBtn = new Button({ text: '📄', variant: this.viewMode === 'list' ? 'primary' : 'secondary', size: 'sm' });
    viewListBtn.getElement().addEventListener('click', () => {
      this.viewMode = 'list';
      this.render();
    });

    const viewGridBtn = new Button({ text: '▦', variant: this.viewMode === 'grid' ? 'primary' : 'secondary', size: 'sm' });
    viewGridBtn.getElement().addEventListener('click', () => {
      this.viewMode = 'grid';
      this.render();
    });

    controls.appendChild(uploadBtn.getElement());
    controls.appendChild(newFolderBtn.getElement());
    controls.appendChild(sortSelect.getElement());
    controls.appendChild(viewListBtn.getElement());
    controls.appendChild(viewGridBtn.getElement());
    body.appendChild(controls);

    // Files container
    const container = document.createElement('div');
    container.className = this.viewMode === 'list' 
      ? 'arxis-filebrowser__list'
      : 'arxis-filebrowser__grid';

    const sorted = this.getSortedFiles();

    sorted.forEach(file => {
      const item = this.viewMode === 'list' 
        ? this.createListItem(file)
        : this.createGridItem(file);
      container.appendChild(item);
    });

    body.appendChild(container);
    this.injectStyles();
  }

  private getSortedFiles(): FileItem[] {
    const sorted = [...this.files];
    
    // Folders first
    sorted.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      
      switch (this.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return b.modifiedAt - a.modifiedAt;
        case 'size':
          return (b.size || 0) - (a.size || 0);
        default:
          return 0;
      }
    });

    return sorted;
  }

  private createListItem(file: FileItem): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'arxis-filebrowser__list-item';

    const icon = document.createElement('div');
    icon.className = 'arxis-filebrowser__icon';
    icon.textContent = this.getFileIcon(file);
    item.appendChild(icon);

    const info = document.createElement('div');
    info.className = 'arxis-filebrowser__info';

    const name = document.createElement('div');
    name.className = 'arxis-filebrowser__name';
    if (file.isFavorite) {
      const star = document.createElement('span');
      star.textContent = '⭐ ';
      name.appendChild(star);
    }
    name.appendChild(document.createTextNode(file.name));

    const meta = document.createElement('div');
    meta.className = 'arxis-filebrowser__meta';
    meta.innerHTML = `
      ${file.size ? `<span>${this.formatSize(file.size)}</span>` : ''}
      <span>${this.formatDate(file.modifiedAt)}</span>
    `;

    info.appendChild(name);
    info.appendChild(meta);
    item.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'arxis-filebrowser__actions';

    const favoriteBtn = new Button({ 
      text: file.isFavorite ? '⭐' : '☆', 
      variant: 'secondary', 
      size: 'sm' 
    });
    favoriteBtn.getElement().addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleFavorite(file);
    });

    const downloadBtn = new Button({ text: '⬇️', variant: 'secondary', size: 'sm' });
    downloadBtn.getElement().addEventListener('click', (e) => {
      e.stopPropagation();
      this.downloadFile(file);
    });

    const deleteBtn = new Button({ text: '🗑️', variant: 'danger', size: 'sm' });
    deleteBtn.getElement().addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteFile(file);
    });

    actions.appendChild(favoriteBtn.getElement());
    if (file.type === 'file') {
      actions.appendChild(downloadBtn.getElement());
    }
    actions.appendChild(deleteBtn.getElement());
    item.appendChild(actions);

    item.addEventListener('click', () => this.openFile(file));

    return item;
  }

  private createGridItem(file: FileItem): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'arxis-filebrowser__grid-item';

    const thumbnail = document.createElement('div');
    thumbnail.className = 'arxis-filebrowser__thumbnail';
    thumbnail.textContent = this.getFileIcon(file);
    item.appendChild(thumbnail);

    const name = document.createElement('div');
    name.className = 'arxis-filebrowser__grid-name';
    name.textContent = file.name;
    item.appendChild(name);

    if (file.isFavorite) {
      const star = document.createElement('div');
      star.className = 'arxis-filebrowser__favorite-badge';
      star.textContent = '⭐';
      item.appendChild(star);
    }

    item.addEventListener('click', () => this.openFile(file));

    return item;
  }

  private getFileIcon(file: FileItem): string {
    if (file.type === 'folder') return '📁';
    
    const icons: Record<string, string> = {
      ifc: '🏗️',
      rvt: '🏛️',
      dwg: '📐',
      pdf: '📄',
      jpg: '🖼️',
      png: '🖼️',
      zip: '📦',
      txt: '📝'
    };
    
    return icons[file.extension || ''] || '📄';
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  }

  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private navigateTo(path: string): void {
    this.currentPath = path;
    this.render();
  }

  private openFile(file: FileItem): void {
    if (file.type === 'folder') {
      this.navigateTo(file.path);
    } else {
      this.onFileOpen?.(file);
      console.log('Abrindo arquivo:', file.name);
    }
  }

  private toggleFavorite(file: FileItem): void {
    file.isFavorite = !file.isFavorite;
    this.render();
  }

  private uploadFile(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ifc,.rvt,.dwg,.pdf,.jpg,.png';
    input.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        console.log('Uploading:', file.name);
      }
    });
    input.click();
  }

  private createFolder(): void {
    const name = prompt('Nome da pasta:');
    if (name) {
      console.log('Criando pasta:', name);
    }
  }

  private downloadFile(file: FileItem): void {
    console.log('Baixando:', file.name);
  }

  private deleteFile(file: FileItem): void {
    if (confirm(`Excluir "${file.name}"?`)) {
      this.files = this.files.filter(f => f.id !== file.id);
      this.render();
    }
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.card.destroy();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-filebrowser-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-filebrowser-styles';
    style.textContent = `
      .arxis-filebrowser__toolbar {
        margin-bottom: 12px;
      }

      .arxis-filebrowser__breadcrumb {
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 6px;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.8);
        overflow-x: auto;
        white-space: nowrap;
      }

      .arxis-filebrowser__breadcrumb-item {
        cursor: pointer;
        transition: color 0.2s;
      }

      .arxis-filebrowser__breadcrumb-item:hover {
        color: #00d4ff;
      }

      .arxis-filebrowser__controls {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 16px;
        flex-wrap: wrap;
      }

      .arxis-filebrowser__list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 500px;
        overflow-y: auto;
      }

      .arxis-filebrowser__list-item {
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 12px;
        background: rgba(255, 255, 255, 0.04);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .arxis-filebrowser__list-item:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateX(3px);
      }

      .arxis-filebrowser__icon {
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        flex-shrink: 0;
      }

      .arxis-filebrowser__info {
        flex: 1;
        min-width: 0;
      }

      .arxis-filebrowser__name {
        font-size: 14px;
        font-weight: 500;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .arxis-filebrowser__meta {
        display: flex;
        gap: 12px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
        margin-top: 4px;
      }

      .arxis-filebrowser__actions {
        display: flex;
        gap: 4px;
        flex-shrink: 0;
      }

      .arxis-filebrowser__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 12px;
        max-height: 500px;
        overflow-y: auto;
      }

      .arxis-filebrowser__grid-item {
        position: relative;
        padding: 16px;
        background: rgba(255, 255, 255, 0.04);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: center;
      }

      .arxis-filebrowser__grid-item:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateY(-3px);
      }

      .arxis-filebrowser__thumbnail {
        font-size: 48px;
        margin-bottom: 8px;
      }

      .arxis-filebrowser__grid-name {
        font-size: 12px;
        color: #fff;
        word-break: break-word;
        line-height: 1.3;
      }

      .arxis-filebrowser__favorite-badge {
        position: absolute;
        top: 8px;
        right: 8px;
        font-size: 16px;
      }
    `;
    document.head.appendChild(style);
  }
}
