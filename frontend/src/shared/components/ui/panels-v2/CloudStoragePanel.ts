/**
 * Cloud Storage Panel
 * Integração com serviços de armazenamento em nuvem
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';
import { Toggle } from '../design-system/components/Toggle';

export interface CloudProvider {
  id: string;
  name: string;
  icon: string;
  isConnected: boolean;
  email?: string;
  usedSpace: number;
  totalSpace: number;
  lastSync?: number;
}

export interface CloudFile {
  id: string;
  name: string;
  path: string;
  size: number;
  modifiedAt: number;
  syncStatus: 'synced' | 'syncing' | 'pending' | 'error';
  provider: string;
}

export class CloudStoragePanel {
  private card: Card;
  private providers: CloudProvider[] = [];
  private files: CloudFile[] = [];
  private autoSync: boolean = true;

  constructor() {
    this.card = new Card({
      title: '☁️ Armazenamento na Nuvem',
      variant: 'glass'
    });

    this.loadProviders();
    this.loadFiles();
    this.render();
  }

  private loadProviders(): void {
    this.providers = [
      {
        id: 'onedrive',
        name: 'OneDrive',
        icon: '📘',
        isConnected: true,
        email: 'usuario@empresa.com',
        usedSpace: 450 * 1024 * 1024 * 1024,
        totalSpace: 1024 * 1024 * 1024 * 1024,
        lastSync: Date.now() - 300000
      },
      {
        id: 'gdrive',
        name: 'Google Drive',
        icon: '📗',
        isConnected: true,
        email: 'usuario@gmail.com',
        usedSpace: 89 * 1024 * 1024 * 1024,
        totalSpace: 200 * 1024 * 1024 * 1024,
        lastSync: Date.now() - 600000
      },
      {
        id: 'dropbox',
        name: 'Dropbox',
        icon: '📦',
        isConnected: false,
        usedSpace: 0,
        totalSpace: 0
      }
    ];
  }

  private loadFiles(): void {
    const now = Date.now();
    this.files = [
      {
        id: 'cf-1',
        name: 'Projeto_Estrutural_Rev08.ifc',
        path: '/OneDrive/Projetos/',
        size: 145678901,
        modifiedAt: now - 3600000,
        syncStatus: 'synced',
        provider: 'onedrive'
      },
      {
        id: 'cf-2',
        name: 'Arquitetura_Executivo.rvt',
        path: '/GoogleDrive/BIM/',
        size: 234567890,
        modifiedAt: now - 7200000,
        syncStatus: 'syncing',
        provider: 'gdrive'
      },
      {
        id: 'cf-3',
        name: 'Plantas_Hidrosanitario.dwg',
        path: '/OneDrive/Projetos/',
        size: 12345678,
        modifiedAt: now - 86400000,
        syncStatus: 'pending',
        provider: 'onedrive'
      }
    ];
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    // Auto-sync toggle
    const syncControl = document.createElement('div');
    syncControl.className = 'arxis-cloud__sync-control';

    const syncToggle = new Toggle({
      label: '🔄 Sincronização Automática',
      checked: this.autoSync,
      onChange: (checked) => {
        this.autoSync = checked;
        if (checked) this.syncAll();
      }
    });

    syncControl.appendChild(syncToggle.getElement());
    body.appendChild(syncControl);

    // Providers
    const providersSection = document.createElement('div');
    providersSection.className = 'arxis-cloud__section';

    const providersTitle = document.createElement('h3');
    providersTitle.className = 'arxis-cloud__title';
    providersTitle.textContent = '🔗 Serviços Conectados';
    providersSection.appendChild(providersTitle);

    this.providers.forEach(provider => {
      const item = this.createProviderItem(provider);
      providersSection.appendChild(item);
    });

    body.appendChild(providersSection);

    // Files
    const filesSection = document.createElement('div');
    filesSection.className = 'arxis-cloud__section';

    const filesHeader = document.createElement('div');
    filesHeader.className = 'arxis-cloud__files-header';

    const filesTitle = document.createElement('h3');
    filesTitle.className = 'arxis-cloud__title';
    filesTitle.textContent = '📁 Arquivos na Nuvem';
    filesHeader.appendChild(filesTitle);

    const syncAllBtn = new Button({ text: '🔄 Sincronizar', variant: 'primary', size: 'sm' });
    syncAllBtn.getElement().addEventListener('click', () => this.syncAll());
    filesHeader.appendChild(syncAllBtn.getElement());

    filesSection.appendChild(filesHeader);

    const filesList = document.createElement('div');
    filesList.className = 'arxis-cloud__files';

    this.files.forEach(file => {
      const item = this.createFileItem(file);
      filesList.appendChild(item);
    });

    filesSection.appendChild(filesList);
    body.appendChild(filesSection);

    this.injectStyles();
  }

  private createProviderItem(provider: CloudProvider): HTMLDivElement {
    const item = document.createElement('div');
    item.className = `arxis-cloud__provider ${provider.isConnected ? 'arxis-cloud__provider--connected' : ''}`;

    const icon = document.createElement('div');
    icon.className = 'arxis-cloud__provider-icon';
    icon.textContent = provider.icon;
    item.appendChild(icon);

    const info = document.createElement('div');
    info.className = 'arxis-cloud__provider-info';

    const name = document.createElement('h4');
    name.className = 'arxis-cloud__provider-name';
    name.textContent = provider.name;

    const status = document.createElement('div');
    status.className = 'arxis-cloud__provider-status';

    if (provider.isConnected) {
      const usage = (provider.usedSpace / provider.totalSpace) * 100;
      status.innerHTML = `
        <div style="font-size: 11px; color: rgba(255,255,255,0.7);">${provider.email}</div>
        <div class="arxis-cloud__storage-bar">
          <div class="arxis-cloud__storage-used" style="width: ${usage}%"></div>
        </div>
        <div style="font-size: 11px; color: rgba(255,255,255,0.6);">
          ${this.formatSize(provider.usedSpace)} / ${this.formatSize(provider.totalSpace)}
        </div>
      `;
    } else {
      status.innerHTML = '<span style="color: rgba(255,255,255,0.5);">Não conectado</span>';
    }

    info.appendChild(name);
    info.appendChild(status);
    item.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'arxis-cloud__provider-actions';

    if (provider.isConnected) {
      const syncBtn = new Button({ text: '🔄', variant: 'secondary', size: 'sm' });
      syncBtn.getElement().addEventListener('click', () => this.syncProvider(provider));

      const disconnectBtn = new Button({ text: '🔌', variant: 'danger', size: 'sm' });
      disconnectBtn.getElement().addEventListener('click', () => this.disconnectProvider(provider));

      actions.appendChild(syncBtn.getElement());
      actions.appendChild(disconnectBtn.getElement());
    } else {
      const connectBtn = new Button({ text: 'Conectar', variant: 'primary', size: 'sm' });
      connectBtn.getElement().addEventListener('click', () => this.connectProvider(provider));
      actions.appendChild(connectBtn.getElement());
    }

    item.appendChild(actions);

    return item;
  }

  private createFileItem(file: CloudFile): HTMLDivElement {
    const item = document.createElement('div');
    item.className = 'arxis-cloud__file';

    const icon = document.createElement('div');
    icon.className = 'arxis-cloud__file-icon';
    icon.textContent = this.getFileIcon(file.name);
    item.appendChild(icon);

    const info = document.createElement('div');
    info.className = 'arxis-cloud__file-info';

    const name = document.createElement('div');
    name.className = 'arxis-cloud__file-name';
    name.textContent = file.name;

    const meta = document.createElement('div');
    meta.className = 'arxis-cloud__file-meta';
    meta.innerHTML = `
      <span>${this.getProviderIcon(file.provider)} ${file.path}</span>
      <span>${this.formatSize(file.size)}</span>
    `;

    info.appendChild(name);
    info.appendChild(meta);
    item.appendChild(info);

    const statusBadge = document.createElement('div');
    statusBadge.className = `arxis-cloud__sync-badge arxis-cloud__sync-badge--${file.syncStatus}`;
    statusBadge.textContent = this.getSyncStatusLabel(file.syncStatus);
    item.appendChild(statusBadge);

    return item;
  }

  private getFileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const icons: Record<string, string> = {
      ifc: '🏗️',
      rvt: '🏛️',
      dwg: '📐',
      pdf: '📄'
    };
    return icons[ext || ''] || '📄';
  }

  private getProviderIcon(provider: string): string {
    const icons: Record<string, string> = {
      onedrive: '📘',
      gdrive: '📗',
      dropbox: '📦'
    };
    return icons[provider] || '☁️';
  }

  private getSyncStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      synced: '✓ Sincronizado',
      syncing: '🔄 Sincronizando...',
      pending: '⏳ Pendente',
      error: '❌ Erro'
    };
    return labels[status] || status;
  }

  private formatSize(bytes: number): string {
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(0)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  }

  private connectProvider(provider: CloudProvider): void {
    console.log('Conectando:', provider.name);
    provider.isConnected = true;
    this.render();
  }

  private disconnectProvider(provider: CloudProvider): void {
    if (confirm(`Desconectar ${provider.name}?`)) {
      provider.isConnected = false;
      this.render();
    }
  }

  private syncProvider(provider: CloudProvider): void {
    console.log('Sincronizando:', provider.name);
    provider.lastSync = Date.now();
  }

  private syncAll(): void {
    console.log('Sincronizando todos os arquivos...');
    this.files.forEach(f => f.syncStatus = 'syncing');
    this.render();
    setTimeout(() => {
      this.files.forEach(f => f.syncStatus = 'synced');
      this.render();
    }, 2000);
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.card.destroy();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-cloud-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-cloud-styles';
    style.textContent = `
      .arxis-cloud__sync-control {
        margin-bottom: 16px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
      }

      .arxis-cloud__section {
        margin-bottom: 20px;
      }

      .arxis-cloud__title {
        margin: 0 0 12px 0;
        font-size: 13px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.8);
      }

      .arxis-cloud__files-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .arxis-cloud__provider {
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 14px;
        background: rgba(255, 255, 255, 0.04);
        border-radius: 8px;
        margin-bottom: 8px;
        transition: all 0.2s;
      }

      .arxis-cloud__provider--connected {
        background: rgba(0, 212, 255, 0.08);
      }

      .arxis-cloud__provider-icon {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        flex-shrink: 0;
      }

      .arxis-cloud__provider-info {
        flex: 1;
        min-width: 0;
      }

      .arxis-cloud__provider-name {
        margin: 0 0 6px 0;
        font-size: 15px;
        font-weight: 600;
        color: #fff;
      }

      .arxis-cloud__provider-status {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .arxis-cloud__storage-bar {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        overflow: hidden;
      }

      .arxis-cloud__storage-used {
        height: 100%;
        background: linear-gradient(90deg, #00d4ff, #7b2ff7);
        transition: width 0.3s;
      }

      .arxis-cloud__provider-actions {
        display: flex;
        gap: 4px;
      }

      .arxis-cloud__files {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 300px;
        overflow-y: auto;
      }

      .arxis-cloud__file {
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 10px;
        background: rgba(255, 255, 255, 0.04);
        border-radius: 6px;
      }

      .arxis-cloud__file-icon {
        font-size: 24px;
        width: 36px;
        text-align: center;
      }

      .arxis-cloud__file-info {
        flex: 1;
        min-width: 0;
      }

      .arxis-cloud__file-name {
        font-size: 13px;
        font-weight: 500;
        color: #fff;
        margin-bottom: 3px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .arxis-cloud__file-meta {
        display: flex;
        gap: 10px;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
      }

      .arxis-cloud__sync-badge {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
        white-space: nowrap;
      }

      .arxis-cloud__sync-badge--synced {
        background: rgba(76, 175, 80, 0.2);
        color: #4caf50;
      }

      .arxis-cloud__sync-badge--syncing {
        background: rgba(0, 212, 255, 0.2);
        color: #00d4ff;
        animation: pulse 1.5s infinite;
      }

      .arxis-cloud__sync-badge--pending {
        background: rgba(255, 170, 0, 0.2);
        color: #ffaa00;
      }

      .arxis-cloud__sync-badge--error {
        background: rgba(255, 68, 68, 0.2);
        color: #ff4444;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `;
    document.head.appendChild(style);
  }
}
