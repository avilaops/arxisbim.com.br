/**
 * QuickActionsToolbar - Barra de ações rápidas contextuais
 * Exibe ações relevantes baseadas no contexto (seleção, ferramenta ativa, etc)
 */

import { eventBus, EventType, ToolType } from '../../core';
import { uiStore } from '../../app/state/uiStore';

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  tooltip: string;
  shortcut?: string;
  onClick: () => void;
  condition?: () => boolean;
}

export class QuickActionsToolbar {
  private container: HTMLElement;
  private actionsContainer: HTMLElement;
  private isVisible: boolean = false;
  private currentContext: 'default' | 'selection' | 'tool' = 'default';
  private hasSelection: boolean = false;
  private activeTool: ToolType = ToolType.NONE;

  constructor() {
    this.container = this.createContainer();
    this.actionsContainer = this.container.querySelector('.quick-actions__actions') as HTMLElement;
    this.applyStyles();
    this.setupEventListeners();
    this.updateActions();
    
    // Inicia visível
    this.show();
    
    console.log('QuickActionsToolbar initialized');
  }

  private createContainer(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'quick-actions-toolbar';
    toolbar.innerHTML = `
      <div class="quick-actions__actions"></div>
    `;
    document.body.appendChild(toolbar);
    return toolbar;
  }

  private setupEventListeners(): void {
    // Atualiza quando há seleção
    eventBus.on(EventType.OBJECT_SELECTED, ({ object, expressID }) => {
      this.hasSelection = true;
      this.currentContext = 'selection';
      this.updateActions();
    });

    eventBus.on(EventType.OBJECT_DESELECTED, () => {
      this.hasSelection = false;
      this.currentContext = 'default';
      this.updateActions();
    });

    // Atualiza quando ferramenta muda
    eventBus.on(EventType.TOOL_ACTIVATED, ({ toolType }) => {
      this.activeTool = toolType;
      if (!this.hasSelection) {
        this.currentContext = 'tool';
      }
      this.updateActions();
    });

    eventBus.on(EventType.TOOL_CHANGED, ({ newTool }) => {
      this.activeTool = newTool;
      if (!this.hasSelection) {
        this.currentContext = 'tool';
      }
      this.updateActions();
    });

    eventBus.on(EventType.TOOL_DEACTIVATED, () => {
      this.activeTool = ToolType.NONE;
      if (!this.hasSelection) {
        this.currentContext = 'default';
      }
      this.updateActions();
    });
  }

  private getActions(): QuickAction[] {
    const actions: QuickAction[] = [];

    // Ações para quando há seleção
    if (this.hasSelection) {
      actions.push({
        id: 'focus',
        icon: 'F',
        label: 'Focar',
        tooltip: 'Focar na seleção (F)',
        shortcut: 'F',
        onClick: () => {
          eventBus.emit('CAMERA_FOCUS_SELECTION' as any, {});
          console.log('Focando na seleção...');
        }
      });

      actions.push({
        id: 'isolate',
        icon: 'ISO',
        label: 'Isolar',
        tooltip: 'Isolar elemento selecionado',
        onClick: () => {
          eventBus.emit('ISOLATE_SELECTION' as any, {});
          console.log('Isolando seleção...');
        }
      });

      actions.push({
        id: 'hide',
        icon: 'OCU',
        label: 'Ocultar',
        tooltip: 'Ocultar elemento',
        onClick: () => {
          eventBus.emit('HIDE_SELECTION' as any, {});
          console.log('Ocultando seleção...');
        }
      });

      actions.push({
        id: 'measure',
        icon: 'MED',
        label: 'Medir',
        tooltip: 'Ativar ferramenta de medição (E)',
        shortcut: 'E',
        onClick: () => {
          eventBus.emit(EventType.TOOL_ACTIVATED, { toolType: ToolType.MEASUREMENT });
          console.log('Ativando ferramenta de medição...');
        }
      });

      actions.push({
        id: 'section',
        icon: 'CUT',
        label: 'Seção',
        tooltip: 'Criar seção no elemento',
        onClick: () => {
          eventBus.emit(EventType.TOOL_ACTIVATED, { toolType: ToolType.CUT });
          console.log('Ativando ferramenta de seção...');
        }
      });
    } else if (this.activeTool === ToolType.MEASUREMENT) {
      // Ações para ferramenta de medição
      actions.push({
        id: 'clear-measurements',
        icon: 'CLR',
        label: 'Limpar',
        tooltip: 'Limpar medições (ESC)',
        shortcut: 'ESC',
        onClick: () => {
          eventBus.emit('CLEAR_MEASUREMENTS' as any, {});
          console.log('Limpando medições...');
        }
      });

      actions.push({
        id: 'deactivate-tool',
        icon: '✕',
        label: 'Sair',
        tooltip: 'Desativar ferramenta',
        onClick: () => {
          eventBus.emit(EventType.TOOL_DEACTIVATED, {});
          console.log('✕ Desativando ferramenta...');
        }
      });
    } else if (this.activeTool === ToolType.CUT) {
      // Ações para ferramenta de seção
      actions.push({
        id: 'flip-section',
        icon: 'INV',
        label: 'Inverter',
        tooltip: 'Inverter direção da seção',
        onClick: () => {
          eventBus.emit('FLIP_ACTIVE_SECTION' as any, {});
          console.log('Invertendo seção...');
        }
      });

      actions.push({
        id: 'clear-sections',
        icon: 'CLR',
        label: 'Limpar',
        tooltip: 'Remover todas as seções',
        onClick: () => {
          eventBus.emit('CLEAR_SECTIONS' as any, {});
          console.log('Limpando seções...');
        }
      });

      actions.push({
        id: 'deactivate-tool',
        icon: '✕',
        label: 'Sair',
        tooltip: 'Desativar ferramenta',
        onClick: () => {
          eventBus.emit(EventType.TOOL_DEACTIVATED, {});
          console.log('✕ Desativando ferramenta...');
        }
      });
    } else {
      // Ações padrão (nenhuma seleção, nenhuma ferramenta)
      actions.push({
        id: 'load-file',
        icon: 'ARQ',
        label: 'Abrir',
        tooltip: 'Abrir arquivo IFC (Ctrl+O)',
        shortcut: 'Ctrl+O',
        onClick: () => {
          uiStore.openModal('loadFile', {});
          console.log('Abrindo modal de carregamento...');
        }
      });

      actions.push({
        id: 'view-top',
        icon: 'SUP',
        label: 'Vista Superior',
        tooltip: 'Vista superior (7)',
        shortcut: '7',
        onClick: () => {
          eventBus.emit('SET_CAMERA_VIEW' as any, { view: 'top' });
          console.log('Vista superior...');
        }
      });

      actions.push({
        id: 'view-front',
        icon: 'FRT',
        label: 'Vista Frontal',
        tooltip: 'Vista frontal (1)',
        shortcut: '1',
        onClick: () => {
          eventBus.emit('SET_CAMERA_VIEW' as any, { view: 'front' });
          console.log('Vista frontal...');
        }
      });

      actions.push({
        id: 'frame-all',
        icon: 'ALL',
        label: 'Enquadrar',
        tooltip: 'Enquadrar tudo (H)',
        shortcut: 'H',
        onClick: () => {
          eventBus.emit('CAMERA_FRAME_ALL' as any, {});
          console.log('Enquadrando tudo...');
        }
      });

      actions.push({
        id: 'toggle-grid',
        icon: '⊞',
        label: 'Grid',
        tooltip: 'Alternar grid (G)',
        shortcut: 'G',
        onClick: () => {
          eventBus.emit('TOGGLE_GRID' as any, {});
          console.log('⊞ Alternando grid...');
        }
      });
    }

    return actions;
  }

  private updateActions(): void {
    if (!this.actionsContainer) return;

    const actions = this.getActions();
    this.actionsContainer.innerHTML = '';

    actions.forEach(action => {
      const button = document.createElement('button');
      button.className = 'quick-action';
      button.setAttribute('data-action', action.id);
      button.setAttribute('title', action.tooltip);
      button.innerHTML = `
        <span class="quick-action__icon">${action.icon}</span>
        <span class="quick-action__label">${action.label}</span>
        ${action.shortcut ? `<span class="quick-action__shortcut">${action.shortcut}</span>` : ''}
      `;
      button.addEventListener('click', action.onClick);
      this.actionsContainer.appendChild(button);
    });

    // Atualiza classes baseado no contexto
    this.container.setAttribute('data-context', this.currentContext);
  }

  private applyStyles(): void {
    if (document.getElementById('quick-actions-toolbar-styles')) return;

    const style = document.createElement('style');
    style.id = 'quick-actions-toolbar-styles';
    style.textContent = `
      .quick-actions-toolbar {
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 255, 255, 0.96);
        -webkit-backdrop-filter: blur(10px);
        backdrop-filter: blur(10px);
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 8px;
        box-shadow: 0 16px 32px rgba(15, 23, 42, 0.12);
        z-index: 9998;
        opacity: 0;
        animation: slideUp 0.3s ease forwards;
        pointer-events: all;
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }

      .quick-actions-toolbar[data-context="selection"] {
        border-color: #93c5fd;
        box-shadow: 0 16px 32px rgba(37, 99, 235, 0.16);
      }

      .quick-actions-toolbar[data-context="tool"] {
        border-color: #bfdbfe;
        box-shadow: 0 16px 32px rgba(37, 99, 235, 0.12);
      }

      .quick-actions__actions {
        display: flex;
        gap: 4px;
        align-items: center;
      }

      .quick-action {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 8px 12px;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 8px;
        color: #111827;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 60px;
      }

      .quick-action:hover {
        background: #eff6ff;
        border-color: #bfdbfe;
        transform: translateY(-2px);
      }

      .quick-action:active {
        transform: translateY(0);
      }

      .quick-action__icon {
        font-size: 20px;
        line-height: 1;
      }

      .quick-action__label {
        font-size: 11px;
        font-weight: 500;
        white-space: nowrap;
      }

      .quick-action__shortcut {
        font-size: 9px;
        opacity: 0.5;
        font-family: monospace;
        background: rgba(255, 255, 255, 0.1);
        padding: 2px 4px;
        border-radius: 3px;
        margin-top: 2px;
      }

      /* Responsivo */
      @media (max-width: 768px) {
        .quick-actions-toolbar {
          bottom: 60px;
          padding: 6px;
        }

        .quick-action {
          min-width: 50px;
          padding: 6px 8px;
        }

        .quick-action__label {
          font-size: 10px;
        }

        .quick-action__icon {
          font-size: 18px;
        }

        .quick-action__shortcut {
          display: none;
        }
      }
    `;
    document.head.appendChild(style);
  }

  public show(): void {
    if (this.isVisible) return;
    this.container.style.display = 'block';
    this.isVisible = true;
  }

  public hide(): void {
    if (!this.isVisible) return;
    this.container.style.display = 'none';
    this.isVisible = false;
  }

  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  public destroy(): void {
    this.container.remove();
  }
}
