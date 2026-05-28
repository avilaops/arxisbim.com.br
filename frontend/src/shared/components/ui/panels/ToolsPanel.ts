/**
 * ToolsPanel - Ferramentas de medição, seção, etc.
 */

import { appController } from '../../../../app/AppController';
import { ToolType, eventBus, EventType } from '../../../../core';
import { uiStore } from '../../../../app/state/uiStore';

type ToolIcon = 'select' | 'measure' | 'section' | 'isolate' | 'show-all' | 'frame' | 'focus';

export class ToolsPanel {
  private container: HTMLElement;
  private activeTool: ToolType | null = null;
  private unsubscribeState?: () => void;
  private readonly eventUnsubscribers: Array<() => void> = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.setupEventListeners();
  }

  private render(): void {
    const state = uiStore.getState();
    const hasModel = state.activeModel.loaded;
    const hasSelection = state.selection.hasSelection;

    this.container.innerHTML = `
      <div class="panel tools-panel">
        <div class="panel__section">
          <h3 class="panel__section-title">Seleção</h3>
          <div class="tool-grid">
            ${this.toolButton('selection', 'select', 'Selecionar elemento', ToolType.SELECTION, true)}
          </div>
        </div>

        <div class="panel__section">
          <h3 class="panel__section-title">Medição e análise</h3>
          <div class="tool-grid">
            ${this.toolButton('measurement', 'measure', 'Medir distância', ToolType.MEASUREMENT, hasModel)}
            ${this.toolButton('section', 'section', 'Plano de corte', ToolType.CUT, hasModel)}
          </div>
        </div>

        <div class="panel__section">
          <h3 class="panel__section-title">Isolamento</h3>
          <div class="tool-grid">
            ${this.commandButton('isolate', 'isolate', 'Isolar seleção', hasSelection)}
            ${this.commandButton('show-all', 'show-all', 'Mostrar tudo', hasModel)}
          </div>
        </div>

        <div class="panel__section">
          <h3 class="panel__section-title">Navegação</h3>
          <div class="tool-grid">
            ${this.commandButton('frame-all', 'frame', 'Enquadrar modelo', hasModel)}
            ${this.commandButton('focus-selection', 'focus', 'Focar seleção', hasSelection)}
          </div>
        </div>

        <div class="tools-panel__summary">
          Modelo: <strong>${hasModel ? 'carregado' : 'aguardando IFC'}</strong><br>
          Seleção: <strong>${hasSelection ? 'ativa' : 'nenhuma'}</strong><br>
          Ferramenta: <strong>${this.escape(state.toolState.activeTool || 'Nenhuma')}</strong>
        </div>
      </div>
    `;
  }

  private setupEventListeners(): void {
    this.container.addEventListener('click', this.handleClick);

    // Listener para mudanças de ferramenta (atualiza UI)
    const onToolActivated = ({ toolType }: { toolType: string }) => {
      this.updateActiveButton(toolType);
    };
    eventBus.on(EventType.TOOL_ACTIVATED, onToolActivated);

    const onToolChanged = ({ newTool }: { newTool: string }) => {
      this.updateActiveButton(newTool);
    };
    eventBus.on(EventType.TOOL_CHANGED, onToolChanged);

    this.eventUnsubscribers.push(() => {
      eventBus.off(EventType.TOOL_ACTIVATED, onToolActivated);
      eventBus.off(EventType.TOOL_CHANGED, onToolChanged);
    });

    this.unsubscribeState = uiStore.subscribe(() => {
      this.render();
      this.updateActiveButton(uiStore.getState().toolState.activeTool);
    });
  }

  private readonly handleClick = (event: Event): void => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-tool], [data-command]');
    if (!target || target.disabled) return;

    const tool = target.dataset.tool;
    if (tool) {
      const toolMap: Record<string, ToolType> = {
        selection: ToolType.SELECTION,
        measurement: ToolType.MEASUREMENT,
        section: ToolType.CUT
      };
      this.activateTool(toolMap[tool]);
      return;
    }

    this.executeCommand(target.dataset.command || '');
  };

  private executeCommand(command: string): void {
    const selected = appController.selectionManager.getSelectedObject();

    switch (command) {
      case 'isolate':
        if (selected) eventBus.emit(EventType.MODEL_ISOLATE_SELECTED, { objects: [selected.uuid] });
        break;
      case 'show-all':
        eventBus.emit(EventType.MODEL_SHOW_ALL, {});
        break;
      case 'frame-all':
        eventBus.emit(EventType.CAMERA_FRAME_ALL, {});
        break;
      case 'focus-selection':
        eventBus.emit(EventType.CAMERA_FOCUS_SELECTION, {});
        break;
      default:
        break;
    }
  }

  private activateTool(toolType: ToolType): void {
    const success = appController.activateTool(toolType);
    
    if (success) {
      this.activeTool = toolType;
      this.updateActiveButton(toolType);
      
      // Feedback visual
      const toolNames: Partial<Record<ToolType, string>> = {
        [ToolType.MEASUREMENT]: 'Measurement',
        [ToolType.CUT]: 'Section',
        [ToolType.SELECTION]: 'Selection'
      };
      
      console.log(`[ToolsPanel] ${toolNames[toolType] || 'Tool'} activated`);
    } else {
      console.warn(`[ToolsPanel] Failed to activate tool: ${toolType}`);
    }
  }

  private updateActiveButton(toolType: ToolType | string): void {
    // Remove active de todos os botões
    this.container.querySelectorAll('[data-tool]').forEach(btn => {
      btn.classList.remove('btn--active');
      btn.classList.remove('toolbar-button--active');
      btn.setAttribute('aria-pressed', 'false');
    });

    // Adiciona active ao botão correto
    const toolMap: Partial<Record<ToolType, string>> = {
      [ToolType.SELECTION]: 'selection',
      [ToolType.MEASUREMENT]: 'measurement',
      [ToolType.CUT]: 'section'
    };

    const toolAttr = toolMap[toolType as ToolType];
    if (toolAttr) {
      const btn = this.container.querySelector(`[data-tool="${toolAttr}"]`);
      btn?.classList.add('btn--active');
      btn?.classList.add('toolbar-button--active');
      btn?.setAttribute('aria-pressed', 'true');
    }
  }

  private toolButton(id: string, icon: ToolIcon, label: string, toolType: ToolType, enabled: boolean): string {
    const activeClass = this.activeTool === toolType ? ' toolbar-button--active btn--active' : '';
    const pressed = this.activeTool === toolType ? 'true' : 'false';
    return `
      <button class="toolbar-button tool-action${activeClass}" data-tool="${id}" type="button" aria-pressed="${pressed}" ${enabled ? '' : 'disabled'}>
        <span class="icon" aria-hidden="true">${this.icon(icon)}</span>
        <span class="toolbar-button__label">${this.escape(label)}</span>
      </button>
    `;
  }

  private commandButton(id: string, icon: ToolIcon, label: string, enabled: boolean): string {
    return `
      <button class="toolbar-button tool-action" data-command="${id}" type="button" ${enabled ? '' : 'disabled'}>
        <span class="icon" aria-hidden="true">${this.icon(icon)}</span>
        <span class="toolbar-button__label">${this.escape(label)}</span>
      </button>
    `;
  }

  private icon(icon: ToolIcon): string {
    const paths: Record<ToolIcon, string> = {
      select: '<path d="M4 3l7.5 17 2-7 7-2L4 3z"/><path d="M13 13l5 5"/>',
      measure: '<path d="M3 17l14-14 4 4L7 21l-4-4z"/><path d="M14 6l2 2"/><path d="M11 9l2 2"/><path d="M8 12l2 2"/>',
      section: '<path d="M4 14l12-12"/><path d="M4 4l16 16"/><path d="M14 4h6v6"/><path d="M4 14v6h6"/>',
      isolate: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
      'show-all': '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/>',
      frame: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M21 16v3a2 2 0 0 1-2 2h-3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/>',
      focus: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/>',
    };

    return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[icon]}</svg>`;
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  public destroy(): void {
    this.container.removeEventListener('click', this.handleClick);
    this.unsubscribeState?.();
    this.eventUnsubscribers.forEach(unsubscribe => unsubscribe());
    this.container.innerHTML = '';
  }
}
