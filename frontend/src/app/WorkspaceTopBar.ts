/**
 * WorkspaceTopBar - barra superior operacional do viewer.
 *
 * Mantém contexto, breadcrumb e ações primárias sem competir com o canvas.
 */

import {
  Box,
  ChevronRight,
  Cpu,
  Focus,
  FolderOpen,
  MessageSquare,
  MousePointer2,
  Mountain,
  PanelLeft,
  Ruler,
  Search,
  Settings,
  Scissors,
  Users,
  createElement,
  type IconNode,
} from 'lucide';
import { uiStore, type UIState, type ViewType } from './state/uiStore';
import { appController } from './AppController';
import { eventBus, EventType, ToolType } from '../core';
import { commandRegistry } from '../commands';
import { CommandId } from '../commands/Command';

interface SkyboxPreset {
  id: string;
  label: string;
  icon: string;
  commandId: CommandId;
}

const SKYBOX_PRESETS: SkyboxPreset[] = [
  { id: 'neutral', label: 'Estúdio neutro', icon: '⚪', commandId: CommandId.ENV_SKYBOX_NEUTRAL },
  { id: 'nature',  label: 'Exterior natural', icon: '🌲', commandId: CommandId.ENV_SKYBOX_NATURE },
  { id: 'urban',   label: 'Urbano', icon: '🏙️', commandId: CommandId.ENV_SKYBOX_URBAN },
  { id: 'sunset',  label: 'Pôr do sol', icon: '🌅', commandId: CommandId.ENV_SKYBOX_SUNSET },
];

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
    brandText.textContent = 'Arxis';
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

    const collaborateButton = this.createIconButton(Users, 'Colaboração em tempo real', () => {
      uiStore.setActiveView('collaboration');
    });
    collaborateButton.classList.add('app-topbar__button--collaborate');

    const environmentButton = this.createEnvironmentDropdown();
    const engineButton = this.createEngineDropdown();

    right.appendChild(fileContext);
    right.appendChild(searchButton);
    right.appendChild(collaborateButton);
    right.appendChild(environmentButton);
    right.appendChild(engineButton);
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
      
      const activeEngine = state.engineMode || 'three';
      const engineLabel = activeEngine === 'three' ? 'Three.js WebGL' : activeEngine === 'webgpu' ? 'Babylon.js WebGPU' : 'Pixel Streaming';

      fileContext.textContent = `${engineLabel} · ${VIEW_LABELS[state.activeView]} · ${activeTool} · ${cameraMode} · ${selected} selecionado${selected === 1 ? '' : 's'}`;
      fileContext.title = fileName;
    }

    const activeEngine = state.engineMode || 'three';
    const engineItems = this.container.querySelectorAll('.app-topbar__engine-menu-item');
    engineItems.forEach((item) => {
      const engineId = item.getAttribute('data-engine-id');
      const isSelected = engineId === activeEngine;
      const labelSpan = item.querySelector('.engine-label') as HTMLElement;
      const checkSpan = item.querySelector('.engine-checkmark') as HTMLElement;
      if (labelSpan) {
        labelSpan.style.fontWeight = isSelected ? '600' : '400';
        labelSpan.style.color = isSelected ? '#2563eb' : '#111827';
      }
      if (checkSpan) {
        checkSpan.innerHTML = isSelected ? '✓' : '';
      }
    });
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

  private createEnvironmentDropdown(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'app-topbar__env';
    wrapper.style.position = 'relative';

    const button = this.createIconButton(Mountain, 'Cenário / Ambiente', () => {
      const open = wrapper.getAttribute('data-open') === 'true';
      wrapper.setAttribute('data-open', String(!open));
      menu.style.display = open ? 'none' : 'block';
    });
    button.classList.add('app-topbar__button--env');

    const menu = document.createElement('div');
    menu.className = 'app-topbar__env-menu';
    menu.setAttribute('role', 'menu');
    menu.style.cssText = [
      'position: absolute',
      'top: calc(100% + 6px)',
      'right: 0',
      'min-width: 200px',
      'background: #ffffff',
      'border: 1px solid #e5e7eb',
      'border-radius: 8px',
      'box-shadow: 0 12px 32px rgba(15,23,42,0.16)',
      'padding: 6px 0',
      'display: none',
      'z-index: 400',
    ].join(';');

    SKYBOX_PRESETS.forEach((preset) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.setAttribute('role', 'menuitem');
      item.style.cssText = [
        'display: flex',
        'align-items: center',
        'gap: 10px',
        'width: 100%',
        'padding: 8px 14px',
        'background: transparent',
        'border: none',
        'color: #111827',
        'font-size: 14px',
        'cursor: pointer',
        'text-align: left',
      ].join(';');
      item.innerHTML = `<span style="font-size:16px">${preset.icon}</span><span>${preset.label}</span>`;
      item.addEventListener('mouseenter', () => { item.style.background = '#eff6ff'; });
      item.addEventListener('mouseleave', () => { item.style.background = 'transparent'; });
      item.addEventListener('click', () => {
        commandRegistry.execute(preset.commandId);
        menu.style.display = 'none';
        wrapper.setAttribute('data-open', 'false');
      });
      menu.appendChild(item);
    });

    const sep = document.createElement('div');
    sep.style.cssText = 'height:1px;background:#e5e7eb;margin:6px 0;';
    menu.appendChild(sep);

    const fogItem = document.createElement('button');
    fogItem.type = 'button';
    fogItem.setAttribute('role', 'menuitem');
    fogItem.style.cssText = [
      'display: flex',
      'align-items: center',
      'gap: 10px',
      'width: 100%',
      'padding: 8px 14px',
      'background: transparent',
      'border: none',
      'color: #111827',
      'font-size: 14px',
      'cursor: pointer',
      'text-align: left',
    ].join(';');
    fogItem.innerHTML = `<span style="font-size:16px">🌫️</span><span>Alternar névoa</span>`;
    fogItem.addEventListener('mouseenter', () => { fogItem.style.background = '#eff6ff'; });
    fogItem.addEventListener('mouseleave', () => { fogItem.style.background = 'transparent'; });
    fogItem.addEventListener('click', () => {
      commandRegistry.execute(CommandId.ENV_TOGGLE_FOG);
      menu.style.display = 'none';
      wrapper.setAttribute('data-open', 'false');
    });
    menu.appendChild(fogItem);

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target as Node)) {
        menu.style.display = 'none';
        wrapper.setAttribute('data-open', 'false');
      }
    });

    wrapper.appendChild(button);
    wrapper.appendChild(menu);
    return wrapper;
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

  private createEngineDropdown(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'app-topbar__engine';
    wrapper.style.position = 'relative';

    const button = this.createIconButton(Cpu, 'Tecnologia 3D / Motor Gráfico', () => {
      const open = wrapper.getAttribute('data-open') === 'true';
      wrapper.setAttribute('data-open', String(!open));
      menu.style.display = open ? 'none' : 'block';
    });
    button.classList.add('app-topbar__button--engine');

    const menu = document.createElement('div');
    menu.className = 'app-topbar__engine-menu';
    menu.setAttribute('role', 'menu');
    menu.style.cssText = [
      'position: absolute',
      'top: calc(100% + 6px)',
      'right: 0',
      'min-width: 220px',
      'background: #ffffff',
      'border: 1px solid #e5e7eb',
      'border-radius: 8px',
      'box-shadow: 0 12px 32px rgba(15,23,42,0.16)',
      'padding: 6px 0',
      'display: none',
      'z-index: 400',
    ].join(';');

    const modes = [
      { id: 'three', label: 'WebGL (Three.js)', icon: '🌐' },
      { id: 'webgpu', label: 'WebGPU (Babylon.js)', icon: '⚡' },
      { id: 'pixel_streaming', label: 'Pixel Streaming (Unreal Cloud)', icon: '☁️' }
    ] as const;

    modes.forEach((mode) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.setAttribute('role', 'menuitem');
      item.setAttribute('data-engine-id', mode.id);
      item.className = 'app-topbar__engine-menu-item';
      item.style.cssText = [
        'display: flex',
        'align-items: center',
        'justify-content: space-between',
        'width: 100%',
        'padding: 10px 14px',
        'background: transparent',
        'border: none',
        'color: #111827',
        'font-size: 14px',
        'cursor: pointer',
        'text-align: left',
      ].join(';');
      
      const isSelected = uiStore.getState().engineMode === mode.id;
      
      item.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:16px">${mode.icon}</span>
          <span class="engine-label" style="${isSelected ? 'font-weight:600;color:#2563eb;' : 'color:#111827;'}">${mode.label}</span>
        </div>
        <span class="engine-checkmark" style="color:#2563eb;font-weight:bold;">${isSelected ? '✓' : ''}</span>
      `;
      
      item.addEventListener('mouseenter', () => { item.style.background = '#eff6ff'; });
      item.addEventListener('mouseleave', () => { item.style.background = 'transparent'; });
      item.addEventListener('click', () => {
        uiStore.setEngineMode(mode.id);
        menu.style.display = 'none';
        wrapper.setAttribute('data-open', 'false');
      });
      menu.appendChild(item);
    });

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target as Node)) {
        menu.style.display = 'none';
        wrapper.setAttribute('data-open', 'false');
      }
    });

    wrapper.appendChild(button);
    wrapper.appendChild(menu);
    return wrapper;
  }

  public destroy(): void {
    this.unsubscribe?.();
    this.container.innerHTML = '';
  }
}