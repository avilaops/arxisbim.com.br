import { appController } from '../../app/AppController';
import { eventBus, EventType } from '../../core';
import { commandRegistry } from '../../commands';
import { CommandId } from '../../commands/Command';
import { menuManager } from '../../menu/MenuManager';
import { DEFAULT_MENUS } from '../../menu/DefaultMenus';

/**
 * TopBar - Barra de menu superior
 * File / Edit / View / Help / Settings / Theme
 */
export class TopBar {
private container: HTMLElement;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container ${containerId} not found`);
    }
    
    this.container = container;
    this.init();
  }

  /**
   * Inicializa a barra
   */
  private init(): void {
    this.container.className = 'top-bar';
    this.applyStyles();
    this.setupEventListeners();
    // Registra menus padrão no MenuManager (uma vez)
    DEFAULT_MENUS.forEach(m => menuManager.registerTopLevelMenu(m));
    this.render();
    
    console.log('TopBar initialized');
  }

  /**
   * Aplica estilos CSS
   */
  private applyStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .top-bar {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 50px;
        background: rgba(255, 255, 255, 0.96);
        backdrop-filter: blur(16px);
        border-bottom: 1px solid #e5e7eb;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
        display: flex;
        align-items: center;
        padding: 0 20px;
        gap: 20px;
        z-index: 200;
        color: #111827;
      }
      
      .top-bar-logo {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 18px;
        font-weight: bold;
        color: #111827;
        margin-right: 20px;
        cursor: pointer;
        transition: all 0.3s;
      }
      
      .top-bar-logo svg {
        flex-shrink: 0;
      }
      
      .top-bar-logo:hover {
        transform: scale(1.05);
      }
      
      .top-bar-menus {
        display: flex;
        gap: 5px;
        flex: 1;
      }
      
      .top-bar-menu {
        position: relative;
      }
      
      .top-bar-menu-btn {
        background: transparent;
        border: none;
        color: #374151;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .top-bar-menu-btn:hover {
        background: #f3f4f6;
      }
      
      .top-bar-menu-btn.active {
        background: #e0ecff;
        color: #1d4ed8;
      }
      
      .top-bar-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        min-width: 200px;
        background: #ffffff;
        backdrop-filter: blur(16px);
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
        margin-top: 5px;
        padding: 8px 0;
        display: none;
        z-index: 300;
      }
      
      .top-bar-dropdown.visible {
        display: block;
        animation: dropdownFadeIn 0.2s ease;
      }
      
      @keyframes dropdownFadeIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .top-bar-dropdown-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 16px;
        color: #111827;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
        background: transparent;
        width: 100%;
        text-align: left;
      }
      
      .top-bar-dropdown-item:hover {
        background: #eff6ff;
        color: #1d4ed8;
      }
      
      .top-bar-dropdown-item.disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      
      .top-bar-dropdown-item.disabled:hover {
        background: transparent;
      }
      
      .top-bar-dropdown-separator {
        height: 1px;
        background: #e5e7eb;
        margin: 8px 0;
      }
      
      .top-bar-dropdown-shortcut {
        font-size: 12px;
        opacity: 0.6;
        margin-left: 20px;
      }
      
      .top-bar-right {
        display: flex;
        gap: 10px;
        align-items: center;
        margin-left: auto;
      }
      
      .top-bar-icon-btn {
        background: #f9fafb;
        border: 1px solid #d1d5db;
        color: #374151;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        transition: all 0.3s;
      }
      
      .top-bar-icon-btn:hover:not(:disabled) {
        background: #eff6ff;
        border-color: #93c5fd;
        color: #1d4ed8;
      }
      
      .top-bar-icon-btn:disabled {
        cursor: not-allowed;
        opacity: 0.4;
      }
      
      .top-bar-theme-indicator {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #2563eb;
        box-shadow: inset 0 0 0 4px #dbeafe;
      }
    `;
    
    if (!document.getElementById('top-bar-styles')) {
      style.id = 'top-bar-styles';
      document.head.appendChild(style);
    }
  }

  /**
   * Configura event listeners
   */
  private setupEventListeners(): void {
    // Fecha dropdowns ao clicar fora
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target as Node)) {
        this.closeAllDropdowns();
      }
    });
    
    // ESC fecha dropdowns
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllDropdowns();
      }
    });
  }

  /**
   * Renderiza o conteúdo
   */
  private render(): void {
    this.container.innerHTML = `
      <div class="top-bar-logo" data-action="home">
        <svg width="28" height="28" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="topbarGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#2563eb"/>
              <stop offset="100%" style="stop-color:#1d4ed8"/>
            </linearGradient>
            <linearGradient id="topbarGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#059669"/>
              <stop offset="100%" style="stop-color:#047857"/>
            </linearGradient>
          </defs>
          <g>
            <path d="M 32 16 L 48 24 L 48 40 L 32 48 L 16 40 L 16 24 Z" fill="url(#topbarGrad1)" opacity="0.9"/>
            <path d="M 32 16 L 48 24 L 32 32 L 16 24 Z" fill="#60a5fa" opacity="0.7"/>
            <path d="M 48 24 L 48 40 L 32 48 L 32 32 Z" fill="#1d4ed8" opacity="0.5"/>
            <line x1="32" y1="32" x2="32" y2="48" stroke="#2563eb" stroke-width="2"/>
          </g>
          <g transform="translate(48, 12)">
            <circle cx="0" cy="0" r="8" fill="#1e1e1e"/>
            <circle cx="0" cy="0" r="6" fill="none" stroke="url(#topbarGrad2)" stroke-width="1.5"/>
            <path d="M -3 0 L 0 -3 L 3 0" fill="none" stroke="url(#topbarGrad2)" stroke-width="1.5"/>
            <circle cx="0" cy="1.5" r="1" fill="url(#topbarGrad2)"/>
          </g>
        </svg>
        <span>ArxisVR</span>
      </div>
      
      <div class="top-bar-menus">
        <div class="top-bar-menu" data-menu="file">
          <button class="top-bar-menu-btn" data-action="toggle-menu" data-menu="file">
            Arquivo
          </button>
          <div class="top-bar-dropdown">
            ${this.renderFileMenu()}
          </div>
        </div>
        
        <div class="top-bar-menu" data-menu="edit">
          <button class="top-bar-menu-btn" data-action="toggle-menu" data-menu="edit">
            Editar
          </button>
          <div class="top-bar-dropdown">
            ${this.renderEditMenu()}
          </div>
        </div>
        
        <div class="top-bar-menu" data-menu="view">
          <button class="top-bar-menu-btn" data-action="toggle-menu" data-menu="view">
            Visualização
          </button>
          <div class="top-bar-dropdown">
            ${this.renderViewMenu()}
          </div>
        </div>
        
        <div class="top-bar-menu" data-menu="help">
          <button class="top-bar-menu-btn" data-action="toggle-menu" data-menu="help">
            Ajuda
          </button>
          <div class="top-bar-dropdown">
            ${this.renderHelpMenu()}
          </div>
        </div>
      </div>
      
      <div class="top-bar-right">
        <div class="top-bar-theme-indicator" title="Tema atual"></div>
        <button class="top-bar-icon-btn" id="network-btn" data-action="network" title="Colaboração">
          NET
        </button>
        <button class="top-bar-icon-btn" id="xr-btn" data-action="xr" title="Entrar em XR">
          XR
        </button>
        <button class="top-bar-icon-btn" data-action="theme" title="Alterar tema">
          UI
        </button>
        <button class="top-bar-icon-btn" data-action="settings" title="Configurações">
          CFG
        </button>
      </div>
    `;
    
    this.attachEventListeners();
  }

  /**
   * Renderiza menu File
   */
  private renderFileMenu(): string {
    return `
      <button class="top-bar-dropdown-item" data-command="${CommandId.FILE_NEW}">
        <span>Novo projeto</span>
        <span class="top-bar-dropdown-shortcut">Ctrl+N</span>
      </button>
      <button class="top-bar-dropdown-item" data-command="${CommandId.FILE_OPEN}">
        <span>Abrir...</span>
        <span class="top-bar-dropdown-shortcut">Ctrl+O</span>
      </button>
      <div class="top-bar-dropdown-separator"></div>
      <button class="top-bar-dropdown-item" data-command="${CommandId.FILE_OPEN_IFC}">
        <span>Importar IFC</span>
      </button>
      <button class="top-bar-dropdown-item" data-command="${CommandId.FILE_OPEN_GLTF}">
        <span>Importar glTF</span>
      </button>
      <button class="top-bar-dropdown-item" data-command="${CommandId.FILE_OPEN_OBJ}">
        <span>Importar OBJ</span>
      </button>
      <div class="top-bar-dropdown-separator"></div>
      <button class="top-bar-dropdown-item" data-command="${CommandId.FILE_SAVE}">
        <span>Salvar</span>
        <span class="top-bar-dropdown-shortcut">Ctrl+S</span>
      </button>
      <button class="top-bar-dropdown-item" data-command="${CommandId.FILE_SAVE_AS}">
        <span>Salvar como...</span>
        <span class="top-bar-dropdown-shortcut">Ctrl+Shift+S</span>
      </button>
      <div class="top-bar-dropdown-separator"></div>
      <button class="top-bar-dropdown-item" data-command="${CommandId.FILE_EXPORT_SCREENSHOT}">
        <span>Exportar imagem</span>
      </button>
      <button class="top-bar-dropdown-item" data-command="${CommandId.FILE_CLOSE}">
        <span>Fechar</span>
      </button>
    `;
  }

  /**
   * Renderiza menu Edit
   */
  private renderEditMenu(): string {
    return `
      <button class="top-bar-dropdown-item" data-command="${CommandId.EDIT_UNDO}">
        <span>Desfazer</span>
        <span class="top-bar-dropdown-shortcut">Ctrl+Z</span>
      </button>
      <button class="top-bar-dropdown-item" data-command="${CommandId.EDIT_REDO}">
        <span>Refazer</span>
        <span class="top-bar-dropdown-shortcut">Ctrl+Y</span>
      </button>
      <div class="top-bar-dropdown-separator"></div>
      <button class="top-bar-dropdown-item" data-command="${CommandId.EDIT_CUT}">
        <span>Recortar</span>
        <span class="top-bar-dropdown-shortcut">Ctrl+X</span>
      </button>
      <button class="top-bar-dropdown-item" data-command="${CommandId.EDIT_COPY}">
        <span>Copiar</span>
        <span class="top-bar-dropdown-shortcut">Ctrl+C</span>
      </button>
      <button class="top-bar-dropdown-item" data-command="${CommandId.EDIT_PASTE}">
        <span>Colar</span>
        <span class="top-bar-dropdown-shortcut">Ctrl+V</span>
      </button>
      <button class="top-bar-dropdown-item" data-command="${CommandId.EDIT_DELETE}">
        <span>Excluir</span>
        <span class="top-bar-dropdown-shortcut">Del</span>
      </button>
      <div class="top-bar-dropdown-separator"></div>
      <button class="top-bar-dropdown-item" data-command="${CommandId.EDIT_SELECT_ALL}">
        <span>Selecionar tudo</span>
        <span class="top-bar-dropdown-shortcut">Ctrl+A</span>
      </button>
      <button class="top-bar-dropdown-item" data-command="${CommandId.EDIT_DESELECT_ALL}">
        <span>Limpar seleção</span>
        <span class="top-bar-dropdown-shortcut">Ctrl+D</span>
      </button>
    `;
  }

  /**
   * Renderiza menu View
   */
  private renderViewMenu(): string {
    return `
      <button class="top-bar-dropdown-item" data-command="${CommandId.VIEW_TOP}">
        <span>Vista superior</span>
        <span class="top-bar-dropdown-shortcut">7</span>
      </button>
      <button class="top-bar-dropdown-item" data-command="${CommandId.VIEW_FRONT}">
        <span>Vista frontal</span>
        <span class="top-bar-dropdown-shortcut">1</span>
      </button>
      <button class="top-bar-dropdown-item" data-command="${CommandId.VIEW_SIDE}">
        <span>Vista lateral</span>
        <span class="top-bar-dropdown-shortcut">3</span>
      </button>
      <button class="top-bar-dropdown-item" data-command="${CommandId.VIEW_ISOMETRIC}">
        <span>Isométrica</span>
        <span class="top-bar-dropdown-shortcut">5</span>
      </button>
      <div class="top-bar-dropdown-separator"></div>
      <button class="top-bar-dropdown-item" data-command="${CommandId.VIEW_FOCUS_SELECTION}">
        <span>Focar seleção</span>
        <span class="top-bar-dropdown-shortcut">F</span>
      </button>
      <button class="top-bar-dropdown-item" data-command="${CommandId.VIEW_FRAME_ALL}">
        <span>Enquadrar tudo</span>
        <span class="top-bar-dropdown-shortcut">Home</span>
      </button>
      <div class="top-bar-dropdown-separator"></div>
      <button class="top-bar-dropdown-item" data-command="${CommandId.VIEW_TOGGLE_GRID}">
        <span>Alternar grade</span>
        <span class="top-bar-dropdown-shortcut">G</span>
      </button>
      <button class="top-bar-dropdown-item" data-command="${CommandId.VIEW_TOGGLE_AXES}">
        <span>Alternar eixos</span>
      </button>
      <button class="top-bar-dropdown-item" data-command="${CommandId.VIEW_FULLSCREEN}">
        <span>Tela cheia</span>
        <span class="top-bar-dropdown-shortcut">F11</span>
      </button>
    `;
  }

  /**
   * Renderiza menu Help
   */
  private renderHelpMenu(): string {
    return `
      <button class="top-bar-dropdown-item" data-command="${CommandId.HELP_DOCS}">
        <span>Documentação</span>
      </button>
      <button class="top-bar-dropdown-item" data-command="${CommandId.HELP_SHORTCUTS}">
        <span>Atalhos de teclado</span>
      </button>
      <div class="top-bar-dropdown-separator"></div>
      <button class="top-bar-dropdown-item" data-command="${CommandId.HELP_ABOUT}">
        <span>Sobre o ArxisVR</span>
      </button>
    `;
  }

  /**
   * Anexa event listeners aos elementos
   */
  private attachEventListeners(): void {
    // Toggle menus
    this.container.querySelectorAll('[data-action="toggle-menu"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menuId = (btn as HTMLElement).dataset.menu;
        this.toggleMenu(menuId!);
      });
    });
    
    // Comandos
    this.container.querySelectorAll('[data-command]').forEach(btn => {
      btn.addEventListener('click', () => {
        const commandId = (btn as HTMLElement).dataset.command as CommandId;
        this.executeCommand(commandId);
        this.closeAllDropdowns();
      });
    });
    
    // Ações especiais
    this.container.querySelector('[data-action="home"]')?.addEventListener('click', () => {
      this.executeCommand(CommandId.VIEW_FRAME_ALL);
    });
    
    this.container.querySelector('[data-action="theme"]')?.addEventListener('click', () => {
      this.executeCommand(CommandId.THEME_SELECT);
    });
    
    this.container.querySelector('[data-action="settings"]')?.addEventListener('click', () => {
      eventBus.emit(EventType.UI_SETTINGS_OPEN, {});
    });
    
    // FASE 5: Network button
    this.container.querySelector('[data-action="network"]')?.addEventListener('click', () => {
      const state = appController.getState();
      if (state.networkState.status === 'disconnected' || state.networkState.status === 'error') {
        this.executeCommand(CommandId.NET_CONNECT);
      } else if (state.networkState.status === 'connected') {
        // TODO: Show room join/create modal
        this.executeCommand(CommandId.NET_CREATE_ROOM);
      } else if (state.networkState.status === 'inRoom') {
        this.executeCommand(CommandId.NET_DISCONNECT);
      }
    });
    
    // FASE 5: XR button
    this.container.querySelector('[data-action="xr"]')?.addEventListener('click', () => {
      const state = appController.getState();
      if (!state.xrState.supported) {
        alert('WebXR not supported on this device/browser');
        return;
      }
      
      if (state.xrState.active) {
        this.executeCommand(CommandId.XR_EXIT);
      } else {
        this.executeCommand(CommandId.XR_ENTER);
      }
    });
    
    // Listen to state changes to update button states
    eventBus.on(EventType.XR_SESSION_STARTED, () => this.updateButtonStates());
    eventBus.on(EventType.XR_SESSION_ENDED, () => this.updateButtonStates());
    // TODO: Add proper network events when defined
    // eventBus.on(EventType.NET_CONNECTED, () => this.updateButtonStates());
    // eventBus.on(EventType.NET_DISCONNECTED, () => this.updateButtonStates());
  }

  /**
   * Toggle menu dropdown
   */
  private toggleMenu(menuId: string): void {
    const menu = this.container.querySelector(`[data-menu="${menuId}"]`);
    if (!menu) return;
    
    const dropdown = menu.querySelector('.top-bar-dropdown') as HTMLElement;
    const btn = menu.querySelector('.top-bar-menu-btn') as HTMLElement;
    
    if (dropdown.classList.contains('visible')) {
      this.closeAllDropdowns();
      menuManager.closeMenu();
    } else {
      this.closeAllDropdowns();
      menuManager.openMenu(menuId);
      dropdown.classList.add('visible');
      btn.classList.add('active');
    }
  }

  /**
   * Fecha todos os dropdowns
   */
  private closeAllDropdowns(): void {
    this.container.querySelectorAll('.top-bar-dropdown').forEach(dropdown => {
      dropdown.classList.remove('visible');
    });
    
    this.container.querySelectorAll('.top-bar-menu-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Sincroniza estado com MenuManager
    menuManager.closeMenu();
  }

  /**
   * Executa comando
   */
  private executeCommand(commandId: CommandId): void {
    try {
      commandRegistry.execute(commandId);
      // Fecha menu ativo após executar comando
      menuManager.closeMenu();
    } catch (error) {
      console.error(`Failed to execute command ${commandId}:`, error);
    }
  }

  /**
   * Atualiza estados dos botões XR e Network baseado no AppState
   */
  private updateButtonStates(): void {
    const state = appController.getState();
    
    // XR Button
    const xrBtn = this.container.querySelector('#xr-btn') as HTMLButtonElement;
    if (xrBtn) {
      if (!state.xrState.supported) {
        xrBtn.disabled = true;
        xrBtn.style.opacity = '0.4';
        xrBtn.title = 'WebXR não suportado';
      } else if (state.xrState.active) {
        xrBtn.textContent = 'SAIR';
        xrBtn.title = 'Sair do XR';
        xrBtn.style.backgroundColor = '#fee2e2';
      } else {
        xrBtn.textContent = 'XR';
        xrBtn.title = 'Entrar em XR';
        xrBtn.style.backgroundColor = '#eff6ff';
        xrBtn.disabled = false;
        xrBtn.style.opacity = '1';
      }
    }
    
    // Network Button
    const netBtn = this.container.querySelector('#network-btn') as HTMLButtonElement;
    if (netBtn) {
      const netState = state.networkState;
      
      switch (netState.status) {
        case 'disconnected':
        case 'error':
          netBtn.textContent = 'NET';
          netBtn.title = 'Conectar colaboração';
          netBtn.style.backgroundColor = '#f9fafb';
          break;
          
        case 'connecting':
          netBtn.textContent = 'SYNC';
          netBtn.title = 'Conectando...';
          netBtn.style.backgroundColor = '#fef3c7';
          netBtn.disabled = true;
          break;
          
        case 'connected':
          netBtn.textContent = 'SALA';
          netBtn.title = 'Criar ou entrar em sala';
          netBtn.style.backgroundColor = '#dcfce7';
          netBtn.disabled = false;
          break;
          
        case 'inRoom':
          netBtn.textContent = 'SAIR';
          netBtn.title = `Sair da sala (${netState.peersCount} participantes)`;
          netBtn.style.backgroundColor = '#fee2e2';
          netBtn.disabled = false;
          break;
      }
    }
  }

  /**
   * Mostra/esconde a barra
   */
  public setVisible(visible: boolean): void {
    this.container.style.display = visible ? 'flex' : 'none';
  }
  
  /**
   * Atualiza estado dos botões (FASE 5)
   */
  public update(): void {
    this.updateButtonStates();
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    this.closeAllDropdowns();
  }
}
