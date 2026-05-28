import { CommandId } from '../commands/Command';
import { TopLevelMenu, MenuItemType } from './MenuTypes';

/**
 * Default Menus - Menus Profissionais Completos com Estados Dinâmicos
 * 
 * FASE 5: Menus que reagem ao AppState automaticamente
 */

export const FILE_MENU: TopLevelMenu = {
  id: 'file',
  label: 'File',
  order: 0,
  items: [
    {
      type: MenuItemType.ACTION,
      id: 'file.new',
      label: 'New Project',
      icon: '📄',
      shortcut: 'Ctrl+N',
      commandId: CommandId.FILE_NEW
    },
    {
      type: MenuItemType.SUBMENU,
      id: 'file.open',
      label: 'Open...',
      icon: '📁',
      items: [
        { type: MenuItemType.ACTION, id: 'file.open.ifc', label: 'Open IFC...', icon: '🏗️', shortcut: 'Ctrl+Shift+O', commandId: CommandId.FILE_OPEN_IFC },
        { type: MenuItemType.ACTION, id: 'file.open.gltf', label: 'Open GLTF/GLB...', icon: '📦', commandId: CommandId.FILE_OPEN_GLTF },
        { type: MenuItemType.ACTION, id: 'file.open.obj', label: 'Open OBJ/FBX...', icon: '📐', commandId: CommandId.FILE_OPEN_OBJ },
        { type: MenuItemType.SEPARATOR, id: 'file.open.sep' },
        { type: MenuItemType.ACTION, id: 'file.open.project', label: 'Open Project...', icon: '📂', shortcut: 'Ctrl+O', commandId: CommandId.FILE_OPEN }
      ]
    },
    { type: MenuItemType.SEPARATOR, id: 'file.sep1' },
    { type: MenuItemType.ACTION, id: 'file.save', label: 'Save Project', icon: '💾', shortcut: 'Ctrl+S', commandId: CommandId.FILE_SAVE, enabledWhen: (s) => s.projectContext?.modelLoaded },
    { type: MenuItemType.ACTION, id: 'file.saveas', label: 'Save As...', icon: '💾', shortcut: 'Ctrl+Shift+S', commandId: CommandId.FILE_SAVE_AS, enabledWhen: (s) => s.projectContext?.modelLoaded },
    { type: MenuItemType.SEPARATOR, id: 'file.sep2' },
    {
      type: MenuItemType.SUBMENU,
      id: 'file.export',
      label: 'Export',
      icon: '📤',
      items: [
        { type: MenuItemType.ACTION, id: 'file.export.glb', label: 'Export Scene as GLB...', icon: '📦', commandId: CommandId.FILE_EXPORT_GLB, enabledWhen: (s) => s.projectContext?.modelLoaded },
        { type: MenuItemType.ACTION, id: 'file.export.sel', label: 'Export Selection...', icon: '📦', commandId: CommandId.FILE_EXPORT_SELECTION, enabledWhen: (s) => s.selectedObjects?.length > 0 },
        { type: MenuItemType.SEPARATOR, id: 'file.export.sep' },
        { type: MenuItemType.ACTION, id: 'file.export.ss', label: 'Screenshot (PNG)...', icon: '📸', shortcut: 'Ctrl+P', commandId: CommandId.FILE_EXPORT_SCREENSHOT }
      ]
    },
    { type: MenuItemType.SEPARATOR, id: 'file.sep3' },
    { type: MenuItemType.ACTION, id: 'file.close', label: 'Close Project', icon: '✖️', shortcut: 'Ctrl+W', commandId: CommandId.FILE_CLOSE, enabledWhen: (s) => s.projectContext?.modelLoaded }
  ]
};

export const EDIT_MENU: TopLevelMenu = {
  id: 'edit',
  label: 'Edit',
  order: 1,
  items: [
    { type: MenuItemType.ACTION, id: 'edit.undo', label: 'Undo', icon: '↶', shortcut: 'Ctrl+Z', commandId: CommandId.EDIT_UNDO },
    { type: MenuItemType.ACTION, id: 'edit.redo', label: 'Redo', icon: '↷', shortcut: 'Ctrl+Y', commandId: CommandId.EDIT_REDO },
    { type: MenuItemType.SEPARATOR, id: 'edit.sep1' },
    { type: MenuItemType.ACTION, id: 'edit.cut', label: 'Cut', icon: '✂️', shortcut: 'Ctrl+X', commandId: CommandId.EDIT_CUT, enabledWhen: (s) => s.selectedObjects?.length > 0 },
    { type: MenuItemType.ACTION, id: 'edit.copy', label: 'Copy', icon: '📋', shortcut: 'Ctrl+C', commandId: CommandId.EDIT_COPY, enabledWhen: (s) => s.selectedObjects?.length > 0 },
    { type: MenuItemType.ACTION, id: 'edit.paste', label: 'Paste', icon: '📌', shortcut: 'Ctrl+V', commandId: CommandId.EDIT_PASTE },
    { type: MenuItemType.ACTION, id: 'edit.delete', label: 'Delete', icon: '🗑️', shortcut: 'Delete', commandId: CommandId.EDIT_DELETE, enabledWhen: (s) => s.selectedObjects?.length > 0 },
    { type: MenuItemType.SEPARATOR, id: 'edit.sep2' },
    { type: MenuItemType.ACTION, id: 'edit.selectAll', label: 'Select All', icon: '✅', shortcut: 'Ctrl+A', commandId: CommandId.EDIT_SELECT_ALL, enabledWhen: (s) => s.projectContext?.modelLoaded },
    { type: MenuItemType.ACTION, id: 'edit.deselectAll', label: 'Deselect All', icon: '⬜', shortcut: 'Ctrl+D', commandId: CommandId.EDIT_DESELECT_ALL, enabledWhen: (s) => s.selectedObjects?.length > 0 }
  ]
};

export const VIEW_MENU: TopLevelMenu = {
  id: 'view',
  label: 'View',
  order: 2,
  items: [
    {
      type: MenuItemType.SUBMENU, id: 'view.camera', label: 'Camera', icon: '📷',
      items: [
        { type: MenuItemType.ACTION, id: 'view.top', label: 'Top', icon: '⬆️', shortcut: '7', commandId: CommandId.VIEW_TOP },
        { type: MenuItemType.ACTION, id: 'view.front', label: 'Front', icon: '➡️', shortcut: '1', commandId: CommandId.VIEW_FRONT },
        { type: MenuItemType.ACTION, id: 'view.side', label: 'Side', icon: '⬅️', shortcut: '3', commandId: CommandId.VIEW_SIDE },
        { type: MenuItemType.ACTION, id: 'view.iso', label: 'Isometric', icon: '📐', shortcut: '5', commandId: CommandId.VIEW_ISOMETRIC }
      ]
    },
    { type: MenuItemType.ACTION, id: 'view.focus', label: 'Focus Selection', icon: '🎯', shortcut: 'F', commandId: CommandId.VIEW_FOCUS_SELECTION, enabledWhen: (s) => s.selectedObjects?.length > 0 },
    { type: MenuItemType.ACTION, id: 'view.frameAll', label: 'Frame All', icon: '🖼️', shortcut: 'H', commandId: CommandId.VIEW_FRAME_ALL, enabledWhen: (s) => s.projectContext?.modelLoaded },
    { type: MenuItemType.SEPARATOR, id: 'view.sep1' },
    { 
      type: MenuItemType.TOGGLE, 
      id: 'view.grid', 
      label: 'Grid', 
      icon: '#️⃣', 
      shortcut: 'G', 
      checked: true, 
      commandId: CommandId.VIEW_TOGGLE_GRID,
      checkedWhen: (s) => s.viewSettings?.gridVisible ?? true 
    },
    { 
      type: MenuItemType.TOGGLE, 
      id: 'view.axes', 
      label: 'Axes', 
      icon: '📍', 
      shortcut: 'X', 
      checked: true, 
      commandId: CommandId.VIEW_TOGGLE_AXES,
      checkedWhen: (s) => s.viewSettings?.axesVisible ?? true 
    },
    { 
      type: MenuItemType.TOGGLE, 
      id: 'view.stats', 
      label: 'Stats', 
      icon: '📊', 
      shortcut: 'Shift+S', 
      checked: false, 
      commandId: CommandId.VIEW_TOGGLE_STATS,
      checkedWhen: (s) => s.viewSettings?.statsVisible ?? false 
    },
    { type: MenuItemType.SEPARATOR, id: 'view.sep2' },
    { type: MenuItemType.ACTION, id: 'view.fullscreen', label: 'Fullscreen', icon: '⛶', shortcut: 'F11', commandId: CommandId.VIEW_FULLSCREEN }
  ]
};

export const MODEL_MENU: TopLevelMenu = {
  id: 'model',
  label: 'Model',
  order: 3,
  items: [
    { type: MenuItemType.ACTION, id: 'model.showAll', label: 'Show All', icon: '👁️', commandId: CommandId.MODEL_SHOW_ALL, enabledWhen: (s) => s.projectContext?.modelLoaded },
    { type: MenuItemType.ACTION, id: 'model.hide', label: 'Hide Selected', icon: '🙈', commandId: CommandId.MODEL_HIDE_SELECTED, enabledWhen: (s) => s.selectedObjects?.length > 0 },
    { type: MenuItemType.ACTION, id: 'model.isolate', label: 'Isolate Selected', icon: '🔒', commandId: CommandId.MODEL_ISOLATE_SELECTED, enabledWhen: (s) => s.selectedObjects?.length > 0 },
    { type: MenuItemType.SEPARATOR, id: 'model.sep1' },
    {
      type: MenuItemType.SUBMENU, id: 'model.filter', label: 'Filter by Class', icon: '🏗️',
      items: [
        { type: MenuItemType.ACTION, id: 'model.filter.wall', label: 'Walls', commandId: CommandId.MODEL_SHOW_BY_CLASS, payload: { ifcClass: 'IfcWall' } },
        { type: MenuItemType.ACTION, id: 'model.filter.door', label: 'Doors', commandId: CommandId.MODEL_SHOW_BY_CLASS, payload: { ifcClass: 'IfcDoor' } },
        { type: MenuItemType.ACTION, id: 'model.filter.window', label: 'Windows', commandId: CommandId.MODEL_SHOW_BY_CLASS, payload: { ifcClass: 'IfcWindow' } }
      ]
    },
    { type: MenuItemType.SEPARATOR, id: 'model.sep2' },
    { type: MenuItemType.ACTION, id: 'model.props', label: 'Properties', icon: 'ℹ️', shortcut: 'I', commandId: CommandId.MODEL_PROPERTIES, enabledWhen: (s) => s.selectedObject !== null }
  ]
};

export const TOOLS_MENU: TopLevelMenu = {
  id: 'tools',
  label: 'Tools',
  order: 4,
  items: [
    { type: MenuItemType.ACTION, id: 'tools.select', label: 'Selection', icon: '👆', shortcut: 'Q', commandId: CommandId.TOOL_SELECT },
    { type: MenuItemType.ACTION, id: 'tools.nav', label: 'Navigation', icon: '🚶', shortcut: 'W', commandId: CommandId.TOOL_NAVIGATE },
    { type: MenuItemType.ACTION, id: 'tools.measure', label: 'Measurement', icon: '📏', shortcut: 'E', commandId: CommandId.TOOL_MEASURE },
    { type: MenuItemType.ACTION, id: 'tools.layer', label: 'Layer', icon: '📚', shortcut: 'R', commandId: CommandId.TOOL_LAYER },
    { type: MenuItemType.SEPARATOR, id: 'tools.sep1' },
    { type: MenuItemType.ACTION, id: 'tools.avatar', label: 'Customize Avatar', icon: '👤', shortcut: 'K', commandId: CommandId.TOOL_AVATAR }
  ]
};

export const ENVIRONMENT_MENU: TopLevelMenu = {
  id: 'environment',
  label: 'Environment',
  order: 5,
  items: [
    { type: MenuItemType.ACTION, id: 'env.skybox', label: 'Skybox', icon: '🌄' },
    {
      type: MenuItemType.SUBMENU,
      id: 'env.skybox.submenu',
      label: 'Skybox Presets',
      icon: '🌄',
      children: [
        { type: MenuItemType.ACTION, id: 'env.skybox.neutral', label: 'Neutral Studio', icon: '⚪', commandId: CommandId.ENV_SKYBOX_NEUTRAL },
        { type: MenuItemType.ACTION, id: 'env.skybox.nature', label: 'Natural Outdoor', icon: '🌲', commandId: CommandId.ENV_SKYBOX_NATURE },
        { type: MenuItemType.ACTION, id: 'env.skybox.urban', label: 'Urban Environment', icon: '🏙️', commandId: CommandId.ENV_SKYBOX_URBAN },
        { type: MenuItemType.ACTION, id: 'env.skybox.sunset', label: 'Sunset Premium', icon: '🌅', commandId: CommandId.ENV_SKYBOX_SUNSET }
      ]
    },
    { type: MenuItemType.SEPARATOR, id: 'env.sep1' },
    { type: MenuItemType.ACTION, id: 'env.fog', label: 'Toggle Fog', icon: '🌫️', commandId: CommandId.ENV_TOGGLE_FOG },
    { type: MenuItemType.ACTION, id: 'env.exposure', label: 'Adjust Exposure', icon: '💡', commandId: CommandId.ENV_ADJUST_EXPOSURE }
  ]
};

export const XR_MENU: TopLevelMenu = {
  id: 'xr',
  label: 'XR',
  order: 6,
  items: [
    { type: MenuItemType.ACTION, id: 'xr.toggle', labelProvider: (s) => s.xrState?.active ? 'Exit VR' : 'Enter VR', iconProvider: (s) => s.xrState?.active ? '🥽✓' : '🥽', shortcut: 'V', commandId: CommandId.XR_TOGGLE, enabledWhen: (s) => s.xrState?.supported }
  ]
};

export const NETWORK_MENU: TopLevelMenu = {
  id: 'network',
  label: 'Network',
  order: 7,
  items: [
    { 
      type: MenuItemType.ACTION, id: 'network.connect', 
      labelProvider: (s) => {
        const st = s.networkState?.status || 'disconnected';
        return st === 'connecting' ? 'Connecting...' : st === 'connected' ? 'Connected' : st === 'inRoom' ? 'Leave Room' : st === 'error' ? 'Retry' : 'Connect';
      },
      iconProvider: (s) => {
        const st = s.networkState?.status || 'disconnected';
        return st === 'connected' || st === 'inRoom' ? '🌐✓' : st === 'connecting' ? '🌐⏳' : st === 'error' ? '🌐❌' : '🌐';
      },
      commandId: CommandId.NET_CONNECT, 
      enabledWhen: (s) => s.networkState?.status !== 'connecting' 
    },
    { type: MenuItemType.SEPARATOR, id: 'network.sep', visibleWhen: (s) => s.networkState?.status === 'connected' || s.networkState?.status === 'inRoom' },
    { type: MenuItemType.ACTION, id: 'network.create', label: 'Create Room', icon: '🚪➕', commandId: CommandId.NET_CREATE_ROOM, visibleWhen: (s) => s.networkState?.status === 'connected' },
    { type: MenuItemType.ACTION, id: 'network.join', label: 'Join Room', icon: '🚪➡️', commandId: CommandId.NET_JOIN_ROOM, visibleWhen: (s) => s.networkState?.status === 'connected' },
    { type: MenuItemType.ACTION, id: 'network.leave', label: 'Leave Room', icon: '🚪⬅️', commandId: CommandId.NET_LEAVE_ROOM, visibleWhen: (s) => s.networkState?.status === 'inRoom' }
  ]
};

export const HELP_MENU: TopLevelMenu = {
  id: 'help',
  label: 'Help',
  order: 8,
  items: [
    { type: MenuItemType.ACTION, id: 'help.docs', label: 'Documentation', icon: '📚', shortcut: 'F1', commandId: CommandId.HELP_DOCS },
    { type: MenuItemType.ACTION, id: 'help.shortcuts', label: 'Keyboard Shortcuts', icon: '⌨️', commandId: CommandId.HELP_SHORTCUTS },
    { type: MenuItemType.SEPARATOR, id: 'help.sep' },
    { type: MenuItemType.ACTION, id: 'help.about', label: 'About ArxisVR', icon: 'ℹ️', commandId: CommandId.HELP_ABOUT }
  ]
};

export const DEFAULT_MENUS: TopLevelMenu[] = [
  FILE_MENU,
  EDIT_MENU,
  VIEW_MENU,
  MODEL_MENU,
  TOOLS_MENU,
  ENVIRONMENT_MENU,
  XR_MENU,
  NETWORK_MENU,
  HELP_MENU
];

