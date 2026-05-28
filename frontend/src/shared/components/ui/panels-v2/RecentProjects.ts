/**
 * Recent Projects Panel
 * Painel de projetos recentes com acesso rápido
 */

import { Card } from '../design-system/components/Card';
import { Button } from '../design-system/components/Button';

export interface Project {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  lastOpened: number;
  location: 'local' | 'cloud' | 'network';
  path: string;
  size?: number;
  isPinned: boolean;
  collaborators?: string[];
}

export class RecentProjects {
  private card: Card;
  private projects: Project[] = [];
  private onProjectOpen?: (project: Project) => void;

  constructor(options?: {
    onProjectOpen?: (project: Project) => void;
  }) {
    this.onProjectOpen = options?.onProjectOpen;
    
    this.card = new Card({
      title: '🕐 Projetos Recentes',
      variant: 'glass'
    });

    this.loadProjects();
    this.render();
  }

  private loadProjects(): void {
    const now = Date.now();
    this.projects = [
      {
        id: 'proj-1',
        name: 'Residencial Magnussão',
        description: 'Edifício residencial 15 pavimentos',
        thumbnail: '🏢',
        lastOpened: now - 3600000,
        location: 'cloud',
        path: 'cloud://projetos/magnussao.ifc',
        size: 145678901,
        isPinned: true,
        collaborators: ['João Silva', 'Maria Santos']
      },
      {
        id: 'proj-2',
        name: 'Shopping Center Norte',
        description: 'Complexo comercial 3 blocos',
        thumbnail: '🏬',
        lastOpened: now - 86400000,
        location: 'local',
        path: 'C:/Projetos/shopping_norte.rvt',
        size: 234567890,
        isPinned: true,
        collaborators: ['Carlos Souza']
      },
      {
        id: 'proj-3',
        name: 'Hospital Regional',
        description: 'Hospital 200 leitos',
        thumbnail: '🏥',
        lastOpened: now - 172800000,
        location: 'cloud',
        path: 'cloud://projetos/hospital.ifc',
        size: 567890123,
        isPinned: false,
        collaborators: ['Ana Lima', 'Pedro Costa', 'João Silva']
      },
      {
        id: 'proj-4',
        name: 'Escola Municipal',
        description: 'Escola 12 salas',
        thumbnail: '🏫',
        lastOpened: now - 259200000,
        location: 'network',
        path: '//servidor/projetos/escola.ifc',
        size: 89012345,
        isPinned: false
      },
      {
        id: 'proj-5',
        name: 'Ponte Metropolitana',
        description: 'Ponte estaiada 450m',
        thumbnail: '🌉',
        lastOpened: now - 604800000,
        location: 'local',
        path: 'C:/Projetos/ponte.ifc',
        size: 345678901,
        isPinned: false,
        collaborators: ['Maria Santos']
      }
    ];
  }

  private render(): void {
    const body = this.card.getBody();
    body.innerHTML = '';

    // Quick actions
    const actions = document.createElement('div');
    actions.className = 'arxis-recent__actions';

    const newBtn = new Button({ text: '➕ Novo Projeto', variant: 'primary', size: 'sm' });
    newBtn.getElement().addEventListener('click', () => this.createProject());

    const openBtn = new Button({ text: '📂 Abrir...', variant: 'secondary', size: 'sm' });
    openBtn.getElement().addEventListener('click', () => this.browseProjects());

    actions.appendChild(newBtn.getElement());
    actions.appendChild(openBtn.getElement());
    body.appendChild(actions);

    // Pinned projects
    const pinned = this.projects.filter(p => p.isPinned);
    if (pinned.length > 0) {
      const pinnedSection = document.createElement('div');
      pinnedSection.className = 'arxis-recent__section';

      const title = document.createElement('h3');
      title.className = 'arxis-recent__section-title';
      title.textContent = '📌 Fixados';
      pinnedSection.appendChild(title);

      const pinnedGrid = document.createElement('div');
      pinnedGrid.className = 'arxis-recent__grid';
      pinned.forEach(project => {
        pinnedGrid.appendChild(this.createProjectCard(project));
      });
      pinnedSection.appendChild(pinnedGrid);
      body.appendChild(pinnedSection);
    }

    // Recent projects
    const recent = this.projects.filter(p => !p.isPinned);
    if (recent.length > 0) {
      const recentSection = document.createElement('div');
      recentSection.className = 'arxis-recent__section';

      const title = document.createElement('h3');
      title.className = 'arxis-recent__section-title';
      title.textContent = '🕐 Recentes';
      recentSection.appendChild(title);

      const recentList = document.createElement('div');
      recentList.className = 'arxis-recent__list';
      recent.forEach(project => {
        recentList.appendChild(this.createProjectRow(project));
      });
      recentSection.appendChild(recentList);
      body.appendChild(recentSection);
    }

    this.injectStyles();
  }

  private createProjectCard(project: Project): HTMLDivElement {
    const card = document.createElement('div');
    card.className = 'arxis-recent__card';

    const thumbnail = document.createElement('div');
    thumbnail.className = 'arxis-recent__thumbnail';
    thumbnail.textContent = project.thumbnail || '📁';
    card.appendChild(thumbnail);

    const info = document.createElement('div');
    info.className = 'arxis-recent__card-info';

    const name = document.createElement('h4');
    name.className = 'arxis-recent__card-name';
    name.textContent = project.name;

    const meta = document.createElement('div');
    meta.className = 'arxis-recent__card-meta';
    meta.innerHTML = `
      ${this.getLocationIcon(project.location)}
      <span>${this.formatTime(project.lastOpened)}</span>
    `;

    info.appendChild(name);
    info.appendChild(meta);
    card.appendChild(info);

    const pin = document.createElement('div');
    pin.className = 'arxis-recent__pin';
    pin.textContent = '📌';
    card.appendChild(pin);

    card.addEventListener('click', () => this.openProject(project));

    return card;
  }

  private createProjectRow(project: Project): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'arxis-recent__row';

    const icon = document.createElement('div');
    icon.className = 'arxis-recent__icon';
    icon.textContent = project.thumbnail || '📁';
    row.appendChild(icon);

    const info = document.createElement('div');
    info.className = 'arxis-recent__row-info';

    const name = document.createElement('div');
    name.className = 'arxis-recent__row-name';
    name.textContent = project.name;

    const meta = document.createElement('div');
    meta.className = 'arxis-recent__row-meta';
    meta.innerHTML = `
      ${this.getLocationIcon(project.location)}
      <span>${this.formatTime(project.lastOpened)}</span>
      ${project.size ? `<span>${this.formatSize(project.size)}</span>` : ''}
    `;

    info.appendChild(name);
    info.appendChild(meta);
    row.appendChild(info);

    const rowActions = document.createElement('div');
    rowActions.className = 'arxis-recent__row-actions';

    const pinBtn = new Button({ 
      text: project.isPinned ? '📌' : '📍', 
      variant: 'secondary', 
      size: 'sm' 
    });
    pinBtn.getElement().addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePin(project);
    });

    const removeBtn = new Button({ text: '❌', variant: 'danger', size: 'sm' });
    removeBtn.getElement().addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeProject(project);
    });

    rowActions.appendChild(pinBtn.getElement());
    rowActions.appendChild(removeBtn.getElement());
    row.appendChild(rowActions);

    row.addEventListener('click', () => this.openProject(project));

    return row;
  }

  private getLocationIcon(location: string): string {
    const icons = {
      local: '💻',
      cloud: '☁️',
      network: '🌐'
    };
    return icons[location as keyof typeof icons] || '📁';
  }

  private formatTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return 'Agora';
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days}d atrás`;
    return new Date(timestamp).toLocaleDateString('pt-BR');
  }

  private formatSize(bytes: number): string {
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(1)} GB`;
  }

  private openProject(project: Project): void {
    project.lastOpened = Date.now();
    this.onProjectOpen?.(project);
    console.log('Abrindo projeto:', project.name);
  }

  private togglePin(project: Project): void {
    project.isPinned = !project.isPinned;
    this.render();
  }

  private removeProject(project: Project): void {
    if (confirm(`Remover "${project.name}" dos recentes?`)) {
      this.projects = this.projects.filter(p => p.id !== project.id);
      this.render();
    }
  }

  private createProject(): void {
    console.log('Criar novo projeto');
  }

  private browseProjects(): void {
    console.log('Navegar projetos');
  }

  public getElement(): HTMLElement {
    return this.card.getElement();
  }

  public destroy(): void {
    this.card.destroy();
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-recent-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-recent-styles';
    style.textContent = `
      .arxis-recent__actions {
        display: flex;
        gap: 8px;
        margin-bottom: 16px;
      }

      .arxis-recent__section {
        margin-bottom: 20px;
      }

      .arxis-recent__section-title {
        margin: 0 0 12px 0;
        font-size: 13px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.8);
        text-transform: uppercase;
      }

      .arxis-recent__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 12px;
      }

      .arxis-recent__card {
        position: relative;
        padding: 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .arxis-recent__card:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-3px);
      }

      .arxis-recent__thumbnail {
        font-size: 48px;
        text-align: center;
        margin-bottom: 12px;
      }

      .arxis-recent__card-info {
        text-align: center;
      }

      .arxis-recent__card-name {
        margin: 0 0 6px 0;
        font-size: 13px;
        font-weight: 500;
        color: #fff;
        line-height: 1.3;
      }

      .arxis-recent__card-meta {
        display: flex;
        justify-content: center;
        gap: 6px;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.6);
      }

      .arxis-recent__pin {
        position: absolute;
        top: 8px;
        right: 8px;
        font-size: 14px;
      }

      .arxis-recent__list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .arxis-recent__row {
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 12px;
        background: rgba(255, 255, 255, 0.04);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .arxis-recent__row:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateX(3px);
      }

      .arxis-recent__icon {
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

      .arxis-recent__row-info {
        flex: 1;
        min-width: 0;
      }

      .arxis-recent__row-name {
        font-size: 14px;
        font-weight: 500;
        color: #fff;
        margin-bottom: 4px;
      }

      .arxis-recent__row-meta {
        display: flex;
        gap: 10px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }

      .arxis-recent__row-actions {
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.2s;
      }

      .arxis-recent__row:hover .arxis-recent__row-actions {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }
}
