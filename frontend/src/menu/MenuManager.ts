import { eventBus, EventType } from '../core/EventBus';
import { commandRegistry } from '../commands/CommandRegistry';
import { CommandId } from '../commands/Command';
import {
  TopLevelMenu,
  MenuItem,
  MenuItemDefinition,
  MenuItemType,
  MenuItemAction,
  MenuState,
  MenuConfig,
  ContextMenu,
  ModalConfig,
  ShortcutMap,
  DEFAULT_SHORTCUTS
} from './MenuTypes';

/**
 * MenuManager - Gerenciador central de menus
 * 
 * Responsabilidades:
 * - Registrar menus de nível superior
 * - Gerenciar estado de menus (aberto/fechado)
 * - Dispatch de comandos via shortcuts
 * - Controlar context menus e modals
 * - Atualizar menus baseado em AppState
 * 
 * Padrões: Singleton, Manager, Observer
 */
export class MenuManager {
  private static instance: MenuManager;
  
  private topLevelMenus: Map<string, TopLevelMenu> = new Map();
  private contextMenus: Map<string, ContextMenu> = new Map();
  private modals: Map<string, ModalConfig> = new Map();
  
  private state: MenuState = {
    activeMenuId: null,
    activeSubmenuId: null,
    contextMenuVisible: false,
    modalStack: []
  };
  
  private config: MenuConfig = {
    shortcuts: true,
    animations: true,
    closeOnClickOutside: true,
    closeOnEsc: true,
    hoverDelay: 300 // ms
  };
  
  private shortcuts: ShortcutMap = { ...DEFAULT_SHORTCUTS };
  
  private constructor() {
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    console.log('📋 MenuManager initialized');
  }
  
  /**
   * Singleton instance
   */
  public static getInstance(): MenuManager {
    if (!MenuManager.instance) {
      MenuManager.instance = new MenuManager();
    }
    return MenuManager.instance;
  }
  
  // ==================== Menu Registration ====================
  
  /**
   * Registra menu de nível superior
   */
  public registerTopLevelMenu(menu: TopLevelMenu): void {
    this.topLevelMenus.set(menu.id, menu);
    console.log(`✅ Top-level menu registered: ${menu.id}`);
    // Removed: MENU_OPENED emission (registering ≠ opening)
  }
  
  /**
   * Remove menu de nível superior
   */
  public unregisterTopLevelMenu(menuId: string): void {
    this.topLevelMenus.delete(menuId);
    console.log(`❌ Top-level menu unregistered: ${menuId}`);
  }
  
  /**
   * Retorna todos os menus de nível superior (ordenados)
   */
  public getTopLevelMenus(): TopLevelMenu[] {
    return Array.from(this.topLevelMenus.values())
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }
  
  /**
   * Retorna menu específico
   */
  public getMenu(menuId: string): TopLevelMenu | undefined {
    return this.topLevelMenus.get(menuId);
  }
  
  // ==================== Menu State ====================
  
  /**
   * Abre menu
   */
  public openMenu(menuId: string): void {
    if (this.state.activeMenuId !== menuId) {
      this.closeMenu(); // Fecha menu anterior
      this.state.activeMenuId = menuId;
      eventBus.emit(EventType.MENU_OPENED, { menuId });
    }
  }
  
  /**
   * Fecha menu ativo
   */
  public closeMenu(): void {
    if (this.state.activeMenuId) {
      const menuId = this.state.activeMenuId;
      this.state.activeMenuId = null;
      this.state.activeSubmenuId = null;
      eventBus.emit(EventType.MENU_CLOSED, { menuId });
    }
  }
  
  /**
   * Toggle menu
   */
  public toggleMenu(menuId: string): void {
    if (this.state.activeMenuId === menuId) {
      this.closeMenu();
    } else {
      this.openMenu(menuId);
    }
  }
  
  /**
   * Retorna estado atual
   */
  public getState(): MenuState {
    return { ...this.state };
  }
  
  /**
   * Verifica se menu está aberto
   */
  public isMenuOpen(menuId: string): boolean {
    return this.state.activeMenuId === menuId;
  }
  
  // ==================== Context Menu ====================
  
  /**
   * Mostra context menu
   */
  public showContextMenu(menu: ContextMenu, x: number, y: number): void {
    this.contextMenus.set(menu.id, {
      ...menu,
      position: { x, y }
    });
    
    this.state.contextMenuVisible = true;
    eventBus.emit(EventType.MENU_OPENED, { menuId: menu.id });
  }
  
  /**
   * Fecha context menu
   */
  public closeContextMenu(): void {
    this.contextMenus.clear();
    this.state.contextMenuVisible = false;
  }
  
  /**
   * Retorna context menu ativo
   */
  public getActiveContextMenu(): ContextMenu | null {
    return Array.from(this.contextMenus.values())[0] || null;
  }
  
  // ==================== Modals ====================
  
  /**
   * Mostra modal
   */
  public showModal(modal: ModalConfig): void {
    this.modals.set(modal.id, modal);
    this.state.modalStack.push(modal.id);
    eventBus.emit(EventType.MENU_OPENED, { menuId: modal.id });
  }
  
  /**
   * Fecha modal
   */
  public closeModal(modalId: string): void {
    const modal = this.modals.get(modalId);
    if (modal) {
      modal.onClose?.();
      this.modals.delete(modalId);
      
      const index = this.state.modalStack.indexOf(modalId);
      if (index > -1) {
        this.state.modalStack.splice(index, 1);
      }
      
      eventBus.emit(EventType.MENU_CLOSED, { menuId: modalId });
    }
  }
  
  /**
   * Fecha modal do topo
   */
  public closeTopModal(): void {
    const topModalId = this.state.modalStack[this.state.modalStack.length - 1];
    if (topModalId) {
      this.closeModal(topModalId);
    }
  }
  
  /**
   * Retorna modal ativo
   */
  public getTopModal(): ModalConfig | null {
    const topModalId = this.state.modalStack[this.state.modalStack.length - 1];
    return topModalId ? this.modals.get(topModalId) || null : null;
  }
  
  // ==================== Menu Actions ====================
  
  /**
   * Executa ação de menu item
   */
  public async executeMenuItem(item: MenuItemDefinition): Promise<void> {
    // Emit evento
    eventBus.emit(EventType.MENU_ITEM_CLICKED, {
      menuId: this.state.activeMenuId || 'unknown',
      itemId: item.id
    });

    switch (item.type) {
      case MenuItemType.ACTION: {
        const actionItem = item as MenuItemAction;
        this.closeMenu();
        await commandRegistry.execute(actionItem.commandId, actionItem.payload);
        break;
      }

      case MenuItemType.TOGGLE: {
        const toggleItem = item as any; // MenuItemToggle
        toggleItem.checked = !toggleItem.checked;
        
        // Call onChange if provided
        if (toggleItem.onChange) {
          await toggleItem.onChange(toggleItem.checked);
        }
        
        // Or execute commandId if provided (unified pattern)
        if (toggleItem.commandId) {
          await commandRegistry.execute(toggleItem.commandId, { checked: toggleItem.checked });
        }
        
        // Don't close menu for toggles (keep open)
        break;
      }

      case MenuItemType.RADIO_GROUP: {
        const radioItem = item as any; // MenuItemRadioGroup
        // Radio selection handled by UI (individual option click)
        // This shouldn't be called directly, but handle gracefully
        if (radioItem.onChange) {
          await radioItem.onChange(radioItem.selected);
        }
        break;
      }

      case MenuItemType.SUBMENU: {
        // Update activeSubmenuId (don't close menu, just navigate)
        this.state.activeSubmenuId = item.id;
        // Submenu opening handled by UI renderer
        break;
      }

      case MenuItemType.SEPARATOR:
        // No-op
        break;
    }
  }
  
  /**
   * Atualiza enabled/disabled de menu item baseado em estado
   */
  public updateMenuItem(menuId: string, itemId: string, updates: Partial<MenuItem>): void {
    const menu = this.topLevelMenus.get(menuId);
    if (!menu) return;
    
    // Encontra item recursivamente
    const item = this.findMenuItem(menu.items, itemId);
    if (item) {
      Object.assign(item, updates);
    }
  }
  
  /**
   * Encontra menu item por ID (busca recursiva)
   */
  private findMenuItem(items: MenuItemDefinition[], itemId: string): MenuItemDefinition | null {
    for (const item of items) {
      if (item.id === itemId) {
        return item;
      }
      
      if (item.type === MenuItemType.SUBMENU) {
        const found = this.findMenuItem((item as any).items, itemId);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  // ==================== Dynamic State Updates (FASE 5) ====================
  
  /**
   * Atualiza todos os menus baseado no AppState
   * CRITICAL: Este método deve ser chamado sempre que AppState mudar
   */
  public updateMenuStates(appState: any): void {
    this.topLevelMenus.forEach(menu => {
      this.updateMenuItemStates(menu.items, appState);
    });
  }
  
  /**
   * Atualiza estados de items recursivamente
   */
  private updateMenuItemStates(items: MenuItemDefinition[], appState: any): void {
    items.forEach(item => {
      // Atualiza enabled
      if (item.enabledWhen) {
        item.enabled = item.enabledWhen(appState);
      }
      
      // Atualiza visible
      if (item.visibleWhen) {
        item.visible = item.visibleWhen(appState);
      }
      
      // Atualiza label (dinâmico)
      if (item.labelProvider) {
        item.label = item.labelProvider(appState);
      }
      
      // Atualiza icon (dinâmico)
      if (item.iconProvider) {
        item.icon = item.iconProvider(appState);
      }
      
      // Atualiza checked (TOGGLE only)
      if (item.type === MenuItemType.TOGGLE) {
        const toggleItem = item as any; // MenuItemToggle
        if (toggleItem.checkedWhen) {
          toggleItem.checked = toggleItem.checkedWhen(appState);
        }
      }
      
      // Recursivo para submenus
      if (item.type === MenuItemType.SUBMENU) {
        this.updateMenuItemStates((item as any).items, appState);
      }
    });
  }
  
  /**
   * Retorna item de menu com estado atualizado
   */
  public getMenuItem(menuId: string, itemId: string, appState?: any): MenuItemDefinition | null {
    const menu = this.topLevelMenus.get(menuId);
    if (!menu) return null;
    
    const item = this.findMenuItem(menu.items, itemId);
    if (!item) return null;
    
    // Se AppState fornecido, atualiza estado do item
    if (appState) {
      // Cria cópia para não mudar original
      const itemCopy = { ...item };
      
      if (itemCopy.enabledWhen) {
        itemCopy.enabled = itemCopy.enabledWhen(appState);
      }
      
      if (itemCopy.visibleWhen) {
        itemCopy.visible = itemCopy.visibleWhen(appState);
      }
      
      if (itemCopy.labelProvider) {
        itemCopy.label = itemCopy.labelProvider(appState);
      }
      
      if (itemCopy.iconProvider) {
        itemCopy.icon = itemCopy.iconProvider(appState);
      }
      
      return itemCopy;
    }
    
    return item;
  }
  
  // ==================== Keyboard Shortcuts ====================
  
  
  /**
   * Configura listeners de keyboard shortcuts
   */
  private setupKeyboardShortcuts(): void {
    if (!this.config.shortcuts) return;
    
    document.addEventListener('keydown', (e) => {
      // Block if typing in UI (input/textarea/contentEditable)
      if (this.isTypingInInput()) {
        return;
      }
      
      // Constrói shortcut key
      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');
      
      // Key name
      let keyName = e.key;
      if (keyName === ' ') keyName = 'Space';
      if (keyName === '?') keyName = '/'; // Normalize ? to / (Ctrl+? -> Ctrl+/)
      if (keyName.length === 1) keyName = keyName.toUpperCase();
      
      parts.push(keyName);
      
      const shortcut = parts.join('+');
      
      // Procura comando
      const commandId = this.shortcuts[shortcut];
      if (commandId) {
        e.preventDefault();
        e.stopPropagation();
        
        // Executa comando
        commandRegistry.execute(commandId);
      }
    });
    
    console.log('⌨️  Keyboard shortcuts enabled');
  }
  
  /**
   * Registra shortcut customizado
   */
  public registerShortcut(shortcut: string, commandId: CommandId): void {
    this.shortcuts[shortcut] = commandId;
  }
  
  /**
   * Remove shortcut
   */
  public unregisterShortcut(shortcut: string): void {
    delete this.shortcuts[shortcut];
  }
  
  /**
   * Verifica se usuário está digitando em input/textarea
   */
  private isTypingInInput(): boolean {
    const activeElement = document.activeElement;
    if (!activeElement) return false;
    
    const tagName = activeElement.tagName.toLowerCase();
    const isContentEditable = (activeElement as HTMLElement).isContentEditable;
    
    return tagName === 'input' || 
           tagName === 'textarea' || 
           tagName === 'select' ||
           isContentEditable;
  }
  
  /**
   * Retorna todos os shortcuts
   */
  public getShortcuts(): ShortcutMap {
    return { ...this.shortcuts };
  }
  
  // ==================== Event Listeners ====================
  
  /**
   * Configura event listeners
   */
  private setupEventListeners(): void {
    // ESC fecha menus/modals
    if (this.config.closeOnEsc) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (this.state.modalStack.length > 0) {
            this.closeTopModal();
          } else if (this.state.contextMenuVisible) {
            this.closeContextMenu();
          } else if (this.state.activeMenuId) {
            this.closeMenu();
          }
        }
      });
    }
    
    // Click fora fecha menus
    if (this.config.closeOnClickOutside) {
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        
        // Verifica se clicou fora do menu
        if (!target.closest('.menu-dropdown') && !target.closest('.menu-button')) {
          if (this.state.activeMenuId) {
            this.closeMenu();
          }
        }
        
        // Verifica se clicou fora do context menu
        if (!target.closest('.context-menu')) {
          if (this.state.contextMenuVisible) {
            this.closeContextMenu();
          }
        }
      });
    }
  }
  
  // ==================== Configuration ====================
  
  /**
   * Atualiza configuração
   */
  public updateConfig(updates: Partial<MenuConfig>): void {
    Object.assign(this.config, updates);
  }
  
  /**
   * Retorna configuração
   */
  public getConfig(): MenuConfig {
    return { ...this.config };
  }
  
  // ==================== Utility ====================
  
  /**
   * Limpa todos os menus
   */
  public clear(): void {
    this.topLevelMenus.clear();
    this.contextMenus.clear();
    this.modals.clear();
    this.state = {
      activeMenuId: null,
      activeSubmenuId: null,
      contextMenuVisible: false,
      modalStack: []
    };
  }
  
  /**
   * Dispose
   */
  public dispose(): void {
    this.clear();
    console.log('MenuManager disposed');
  }
}

// Export singleton instance
export const menuManager = MenuManager.getInstance();
