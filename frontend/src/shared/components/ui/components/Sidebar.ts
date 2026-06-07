/**
 * Sidebar - Painel lateral com conteúdo dinâmico baseado na view ativa
 */

import { uiStore } from '../../../../app/state/uiStore';
import type { ViewType } from '../../../../app/state/uiStore';
import { ExplorerPanel } from '../panels/ExplorerPanel';
import { SearchPanel } from '../panels/SearchPanel';
import { LayersPanel } from '../panels/LayersPanel';
import { PropertiesPanel } from '../panels/PropertiesPanel';
import { ToolsPanel } from '../panels/ToolsPanel';
import { ScenariosPanel } from '../panels/ScenariosPanel';
import { SettingsPanel } from '../panels/SettingsPanel';
import { CollaborationPanel } from '../../../../app/CollaborationPanel';

type PanelConstructor = new (container: HTMLElement) => IPanel;

interface IPanel {
  destroy(): void;
}

const PANELS: Record<ViewType, PanelConstructor> = {
  explorer: ExplorerPanel,
  search: SearchPanel,
  layers: LayersPanel,
  properties: PropertiesPanel,
  tools: ToolsPanel,
  scenarios: ScenariosPanel,
  settings: SettingsPanel,
  collaboration: CollaborationPanel,
};

/**
 * Sidebar component
 */
export class Sidebar {
  private container: HTMLElement;
  private currentPanel?: IPanel;
  private unsubscribe?: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.subscribeToState();
  }

  private render(): void {
    this.container.innerHTML = '';
    this.container.className = 'sidebar';

    // Header
    const header = document.createElement('div');
    header.className = 'sidebar__header';

    const title = document.createElement('h2');
    title.className = 'sidebar__title';
    title.id = 'sidebar-title';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'sidebar__title-group';

    const eyebrow = document.createElement('span');
    eyebrow.className = 'sidebar__eyebrow';
    eyebrow.textContent = 'Coordenação';

    const actions = document.createElement('div');
    actions.className = 'sidebar__actions';

    const collapseBtn = document.createElement('button');
    collapseBtn.className = 'sidebar__action-btn';
    collapseBtn.setAttribute('aria-label', 'Recolher painel lateral');
    collapseBtn.title = 'Recolher painel lateral';
    collapseBtn.innerHTML = '×';
    collapseBtn.addEventListener('click', () => {
      uiStore.toggleSidebar();
    });

    actions.appendChild(collapseBtn);
    titleGroup.appendChild(eyebrow);
    titleGroup.appendChild(title);

    header.appendChild(titleGroup);
    header.appendChild(actions);

    // Content (dinâmico)
    const content = document.createElement('div');
    content.className = 'sidebar__content';
    content.id = 'sidebar-content';

    this.container.appendChild(header);
    this.container.appendChild(content);

    // Load initial panel
    this.loadPanel(uiStore.getState().activeView);
  }

  private subscribeToState(): void {
    this.unsubscribe = uiStore.subscribe((state) => {
      this.loadPanel(state.activeView);
    });
  }

  private loadPanel(view: ViewType): void {
    // Destroy current panel
    if (this.currentPanel) {
      this.currentPanel.destroy();
      this.currentPanel = undefined;
    }

    // Update title
    const title = this.container.querySelector('#sidebar-title') as HTMLElement;
    if (title) {
      title.textContent = this.getPanelTitle(view);
    }

    // Load new panel
    const content = this.container.querySelector('#sidebar-content') as HTMLElement;
    if (content) {
      content.innerHTML = '';
      
      const PanelClass = PANELS[view];
      if (PanelClass) {
        this.currentPanel = new PanelClass(content);
      }
    }
  }

  private getPanelTitle(view: ViewType): string {
    const titles: Record<ViewType, string> = {
      explorer: 'Projetos',
      search: 'Busca BIM',
      layers: 'Camadas',
      properties: 'Inspector',
      tools: 'Ferramentas',
      scenarios: 'Cenas',
      settings: 'Configurações',
      collaboration: 'Colaboração'
    };
    return titles[view];
  }

  public destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.currentPanel) {
      this.currentPanel.destroy();
    }
  }
}
