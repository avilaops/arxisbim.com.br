import { CommandId } from '../commands/Command';

/**
 * Menu Types - Tipos de componentes de menu
 * 
 * Seguindo padrões de apps corporativos (VSCode, Unity, Blender):
 * - TopLevelMenuButton: Botões principais ("File", "View", etc.)
 * - DropdownMenu: Lista de ações com ícones e atalhos
 * - MenuItem variants: Action, Toggle, RadioGroup, Submenu, Separator
 * - ContextMenu: Menu contextual no viewport
 * - Modal/Dialog: Popups para inputs complexos
 */

/**
 * MenuItemType - Tipos de items de menu
 */
export enum MenuItemType {
  ACTION = 'action',           // Executa comando
  TOGGLE = 'toggle',          // Alterna booleano
  RADIO_GROUP = 'radio',      // Escolha exclusiva
  SUBMENU = 'submenu',        // Abre submenu
  SEPARATOR = 'separator'     // Divisor visual
}

/**
 * MenuItem - Item base de menu
 */
export interface MenuItem {
  type: MenuItemType;
  id: string;
  label?: string;
  icon?: string;
  shortcut?: string;
  enabled?: boolean;
  visible?: boolean;
  
  // FASE 5: Estados dinâmicos
  // Funções para avaliar enabled/visible baseado em AppState
  enabledWhen?: (state: any) => boolean;
  visibleWhen?: (state: any) => boolean;
  labelProvider?: (state: any) => string;
  iconProvider?: (state: any) => string;
}

/**
 * MenuItemAction - Item que executa comando
 */
export interface MenuItemAction extends MenuItem {
  type: MenuItemType.ACTION;
  commandId: CommandId;
  payload?: any;
}

/**
 * MenuItemToggle - Item que alterna booleano no estado
 */
export interface MenuItemToggle extends MenuItem {
  type: MenuItemType.TOGGLE;
  checked: boolean;
  onChange?: (checked: boolean) => void | Promise<void>;
  commandId?: CommandId; // Optional: unified command pattern
  checkedWhen?: (state: any) => boolean; // FASE 5: Dynamic checked state
}

/**
 * MenuItemRadioOption - Opção de radio group
 */
export interface MenuItemRadioOption {
  id: string;
  label: string;
  value: any;
}

/**
 * MenuItemRadioGroup - Item de escolha exclusiva
 */
export interface MenuItemRadioGroup extends MenuItem {
  type: MenuItemType.RADIO_GROUP;
  options: MenuItemRadioOption[];
  selected: string;
  onChange: (value: any) => void;
}

/**
 * MenuItemSubmenu - Item que abre submenu
 */
export interface MenuItemSubmenu extends MenuItem {
  type: MenuItemType.SUBMENU;
  items: MenuItemDefinition[];
}

/**
 * MenuItemSeparator - Divisor visual
 */
export interface MenuItemSeparator extends MenuItem {
  type: MenuItemType.SEPARATOR;
}

/**
 * MenuItemDefinition - Union type de todos os items
 */
export type MenuItemDefinition =
  | MenuItemAction
  | MenuItemToggle
  | MenuItemRadioGroup
  | MenuItemSubmenu
  | MenuItemSeparator;

/**
 * TopLevelMenu - Menu de nível superior (File, Edit, View, etc.)
 */
export interface TopLevelMenu {
  id: string;
  label: string;
  items: MenuItemDefinition[];
  order?: number;
}

/**
 * ContextMenu - Menu contextual no viewport
 */
export interface ContextMenu {
  id: string;
  items: MenuItemDefinition[];
  position?: { x: number; y: number };
  target?: any;
}

/**
 * ModalConfig - Configuração de modal/dialog
 */
export interface ModalConfig {
  id: string;
  title: string;
  content: HTMLElement | string;
  buttons?: ModalButton[];
  width?: string;
  height?: string;
  closable?: boolean;
  onClose?: () => void;
}

/**
 * ModalButton - Botão de modal
 */
export interface ModalButton {
  label: string;
  action: () => void | Promise<void>;
  primary?: boolean;
  danger?: boolean;
}

/**
 * MenuState - Estado do sistema de menus
 */
export interface MenuState {
  activeMenuId: string | null;
  activeSubmenuId: string | null;
  contextMenuVisible: boolean;
  modalStack: string[];
}

/**
 * MenuConfig - Configuração do menu system
 */
export interface MenuConfig {
  shortcuts: boolean;
  animations: boolean;
  closeOnClickOutside: boolean;
  closeOnEsc: boolean;
  hoverDelay: number; // ms para trocar submenu
}

/**
 * Keyboard shortcuts map
 */
export interface ShortcutMap {
  [key: string]: CommandId;
}

/**
 * Default shortcuts
 */
export const DEFAULT_SHORTCUTS: ShortcutMap = {
  // File
  'Ctrl+O': CommandId.FILE_OPEN, // Universal "Open..." chooser
  'Ctrl+S': CommandId.FILE_SAVE,
  'Ctrl+Shift+S': CommandId.FILE_SAVE_AS,
  'Ctrl+W': CommandId.FILE_CLOSE,
  
  // Edit
  'Ctrl+Z': CommandId.EDIT_UNDO,
  'Ctrl+Y': CommandId.EDIT_REDO,
  'Ctrl+Shift+Z': CommandId.EDIT_REDO,
  'Ctrl+X': CommandId.EDIT_CUT,
  'Ctrl+C': CommandId.EDIT_COPY,
  'Ctrl+V': CommandId.EDIT_PASTE,
  'Delete': CommandId.EDIT_DELETE,
  'Ctrl+A': CommandId.EDIT_SELECT_ALL,
  'Ctrl+D': CommandId.EDIT_DESELECT_ALL,
  
  // View
  'F': CommandId.VIEW_FOCUS_SELECTION,
  'H': CommandId.VIEW_FRAME_ALL,
  'G': CommandId.VIEW_TOGGLE_GRID,
  'X': CommandId.VIEW_TOGGLE_AXES,
  'F11': CommandId.VIEW_FULLSCREEN,
  
  // Tools
  'Q': CommandId.TOOL_SELECT,
  'W': CommandId.TOOL_NAVIGATE,
  'E': CommandId.TOOL_MEASURE,
  'R': CommandId.TOOL_LAYER,
  'K': CommandId.TOOL_AVATAR,
  
  // AI
  'Ctrl+K': CommandId.AI_TOGGLE_CHAT,
  
  // Help
  'F1': CommandId.HELP_DOCS,
  'Ctrl+/': CommandId.HELP_SHORTCUTS // Changed from Ctrl+? (more reliable)
};
