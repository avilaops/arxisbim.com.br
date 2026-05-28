/**
 * WorkspaceTopBar - barra superior operacional do viewer.
 *
 * Mantém contexto, breadcrumb e ações primárias sem competir com o canvas.
 */

import {
  Box,
  ChevronRight,
  Focus,
  FolderOpen,
  MessageSquare,
  MousePointer2,
  PanelLeft,
  Ruler,
  Search,
  Settings,
  Scissors,
  createElement,
  type IconNode,
} from 'lucide';
import { uiStore, type UIState, type ViewType } from './state/uiStore';
import { appController } from './AppController';
import { eventBus, EventType, ToolType } from '../core';

const VIEW_LABELS: Record<ViewType, string> = {
  explorer: 'Projetos',
  search: 'Busca BIM',
  layers: 'Camadas',
  properties: 'Inspector',
  tools: 'Ferramentas',
  settings: 'Configurações',
};

const TOOL_LABELS: Record<string, string> = {
  [ToolType.NONE]: 'Sem ferramenta',
  [ToolType.SELECTION]: 'Seleção',
  [ToolType.MEASUREMENT]: 'Medição',
  [ToolType.CUT]: 'Corte',
  [ToolType.ANNOTATION]: 'Anotação',
  [ToolType.NAVIGATION]: 'Navegação',
  [ToolType.LAYER]: 'Camadas'
};

interface CoordinationAction {
  id: string;
  label: string;
  icon: IconNode;
  view: ViewType;
  title: string;
  tool?: ToolType;
  command?: 'isolate-selection' | 'open-comments';
  requiresModel?: boolean;
}

const COORDINATION_ACTIONS: CoordinationAction[] = [
  { id: 'select', label: 'Selecionar', icon: MousePointer2, view: 'properties', title: 'Selecionar e inspecionar elementos', tool: ToolType.SELECTION },
  { id: 'measure', label: 'Medir', icon: Ruler, view: 'tools', title: 'Ativar medição no modelo', tool: ToolType.MEASUREMENT, requiresModel: true },
  { id: 'section', label: 'Cortar', icon: Scissors, view: 'tools', title: 'Ativar plano de corte', tool: ToolType.CUT, requiresModel: true },
  { id: 'isolate', label: 'Isolar', icon: Focus, view: 'layers', title: 'Isolar seleção atual ou abrir camadas', tool: ToolType.LAYER, command: 'isolate-selection' },
  { id: 'comments', label: 'Comentários', icon: MessageSquare, view: 'search', title: 'Abrir comentários e contexto de coordenação', tool: ToolType.ANNOTATION, command: 'open-comments' },
];

export class WorkspaceTopBar {
  private readonly container: HTMLElement;
  private unsubscribe?: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.subscribeToState();
    this.update(uiStore.getState());
  }

  private render(): void {
    this.container.innerHTML = '';
    this.container.className = 'app-topbar';

    const left = document.createElement('div');
    left.className = 'app-topbar__left';

    const sidebarButton = this.createIconButton(PanelLeft, 'Alternar painel lateral', () => {
      uiStore.toggleSidebar();
    });
    sidebarButton.classList.add('app-topbar__sidebar-toggle');

    const brand = document.createElement('div');
    brand.className = 'app-topbar__brand';
    brand.appendChild(this.createIcon(Box));

    const brandText = document.createElement('span');
    brandText.textContent = 'ArxisVR';
    brand.appendChild(brandText);

    const breadcrumb = document.createElement('nav');
    breadcrumb.className = 'app-topbar__breadcrumb';
    breadcrumb.setAttribute('aria-label', 'Contexto do workspace');
    breadcrumb.id = 'workspace-breadcrumb';

    left.appendChild(sidebarButton);
    left.appendChild(brand);
    left.appendChild(breadcrumb);

    const center = document.createElement('div');
    center.className = 'app-topbar__center';

    const toolbar = document.createElement('div');
    toolbar.className = 'app-topbar__coordination-tools';
    toolbar.setAttribute('aria-label', 'Ferramentas de coordenação BIM');

    COORDINATION_ACTIONS.forEach((action) => {
      const button = document.createElement('button');
      button.className = 'app-topbar__tool-button';
      button.type = 'button';
      button.title = action.title;
      button.dataset.view = action.view;
      button.dataset.action = action.id;
      if (action.tool) {
        button.dataset.tool = action.tool;
      }
      button.appendChild(this.createIcon(action.icon));
      button.appendChild(document.createTextNode(action.label));
      button.addEventListener('click', () => this.handleCoordinationAction(action));
      toolbar.appendChild(button);
    });

    center.appendChild(toolbar);

    const right = document.createElement('div');
    right.className = 'app-topbar__right';

    const searchButton = this.createIconButton(Search, 'Abrir busca', () => {
      uiStore.setActiveView('search');
    });

    const fileContext = document.createElement('div');
    fileContext.className = 'app-topbar__file-context';
    fileContext.id = 'workspace-file-context';

    const openButton = document.createElement('button');
    openButton.className = 'app-topbar__button app-topbar__button--primary';
    openButton.type = 'button';
    openButton.appendChild(this.createIcon(FolderOpen));
    openButton.appendChild(document.createTextNode('Abrir IFC'));
    openButton.addEventListener('click', () => {
      uiStore.openModal('loadFile');
    });

    const settingsButton = this.createIconButton(Settings, 'Abrir configurações', () => {
      uiStore.setActiveView('settings');
    });

    right.appendChild(fileContext);
    right.appendChild(searchButton);
    right.appendChild(openButton);
    right.appendChild(settingsButton);

    this.container.appendChild(left);
    this.container.appendChild(center);
    this.container.appendChild(right);
  }

  private subscribeToState(): void {
    this.unsubscribe = uiStore.subscribe((state) => {
      this.update(state);
    });
  }

  private update(state: UIState): void {
    this.container.dataset.activeView = state.activeView;

    const sidebarButton = this.container.querySelector('.app-topbar__sidebar-toggle');
    sidebarButton?.setAttribute('aria-pressed', String(!state.sidebarCollapsed));

    const breadcrumb = this.container.querySelector('#workspace-breadcrumb');
    if (breadcrumb) {
      breadcrumb.innerHTML = '';
      const projectName = this.getProjectLabel(state);
      const modelName = this.getModelLabel(state);
      const revisionName = state.projectContext.revisionName?.trim();

      this.appendBreadcrumbItem(breadcrumb, projectName, !modelName && !revisionName);
      this.appendBreadcrumbSeparator(breadcrumb);
      this.appendBreadcrumbItem(breadcrumb, modelName || 'Nenhum modelo', !revisionName);

      if (revisionName) {
        this.appendBreadcrumbSeparator(breadcrumb);
        this.appendBreadcrumbItem(breadcrumb, revisionName, true);
      }
    }

    const toolButtons = this.container.querySelectorAll('.app-topbar__tool-button');
    toolButtons.forEach((button) => {
      const action = COORDINATION_ACTIONS.find((item) => item.id === button.getAttribute('data-action'));
      if (!action) return;

      const isToolActive = action.tool ? state.toolState.activeTool === action.tool : false;
      const isViewActionActive = !action.tool && action.view === state.activeView;
      const isCommentsActive = action.command === 'open-comments' && state.activeView === 'search';
      const disabled = Boolean(action.requiresModel && !state.activeModel.loaded);

      button.toggleAttribute('disabled', disabled);
      button.setAttribute('aria-disabled', String(disabled));
      button.setAttribute('aria-pressed', String(isToolActive || isViewActionActive || isCommentsActive));
    });

    const fileContext = this.container.querySelector('#workspace-file-context');
    if (fileContext) {
      const fileName = state.projectContext.fileName || state.statusBar.fileName || 'Nenhum modelo carregado';
      const cameraMode = state.statusBar.cameraMode || 'FPS';
      const selected = state.statusBar.selectedCount ?? 0;
      const activeTool = TOOL_LABELS[state.toolState.activeTool || ToolType.NONE] || state.toolState.activeTool || 'Ferramenta';

      fileContext.textContent = `${VIEW_LABELS[state.activeView]} · ${activeTool} · ${cameraMode} · ${selected} selecionado${selected === 1 ? '' : 's'}`;
      fileContext.title = fileName;
    }
  }

  private handleCoordinationAction(action: CoordinationAction): void {
    uiStore.setActiveView(action.view);

    if (action.tool) {
      const canActivateTool = appController.toolManager.isToolRegistered(action.tool);

      if (canActivateTool) {
        appController.activateTool(action.tool);
      } else if (action.tool !== ToolType.ANNOTATION) {
        console.warn(`[WorkspaceTopBar] Ferramenta não registrada: ${action.tool}`);
      }
    }

    if (action.command === 'isolate-selection') {
      this.isolateCurrentSelection();
    }

    if (action.command === 'open-comments') {
      this.openCoordinationComments();
    }
  }

  private isolateCurrentSelection(): void {
    const selectedObjects = appController.getState().selectedObjects;

    if (selectedObjects.length > 0) {
      eventBus.emit(EventType.MODEL_ISOLATE_SELECTED, {
        objects: selectedObjects.map(item => item.object.uuid)
      });
    }
  }

  private openCoordinationComments(): void {
    if (appController.toolManager.isToolRegistered(ToolType.ANNOTATION)) {
      appController.activateTool(ToolType.ANNOTATION);
      return;
    }

    eventBus.emit(EventType.AI_CHAT_TOGGLE, {});
  }

  private getProjectLabel(state: UIState): string {
    return this.normalizeLabel(state.projectContext.projectName) || 'Sem projeto';
  }

  private getModelLabel(state: UIState): string {
    return this.normalizeLabel(state.projectContext.modelName)
      || this.normalizeLabel(state.activeModel.fileName)
      || '';
  }

  private normalizeLabel(value?: string): string {
    const normalized = value?.trim();
    return normalized && normalized !== 'Untitled' ? normalized : '';
  }

  private appendBreadcrumbItem(parent: Element, label: string, active = false): void {
    const item = document.createElement('span');
    item.className = active ? 'app-topbar__breadcrumb-item is-active' : 'app-topbar__breadcrumb-item';
    item.textContent = label;
    parent.appendChild(item);
  }

  private appendBreadcrumbSeparator(parent: Element): void {
    const separator = document.createElement('span');
    separator.className = 'app-topbar__breadcrumb-separator';
    separator.appendChild(this.createIcon(ChevronRight));
    parent.appendChild(separator);
  }

  private createIconButton(icon: IconNode, label: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'app-topbar__button app-topbar__button--icon';
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.title = label;
    button.appendChild(this.createIcon(icon));
    button.addEventListener('click', onClick);
    return button;
  }

  private createIcon(icon: IconNode): HTMLElement {
    const wrapper = document.createElement('span');
    wrapper.className = 'icon';
    wrapper.appendChild(createElement(icon, {
      class: 'app-topbar__svg',
      'aria-hidden': 'true',
      focusable: 'false',
    }));
    return wrapper;
  }

  public destroy(): void {
    this.unsubscribe?.();
    this.container.innerHTML = '';
  }
}