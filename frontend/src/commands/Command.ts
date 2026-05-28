/**
 * CommandId - Identificadores únicos para todos os comandos da aplicação
 * 
 * Organizados por categoria para fácil navegação e manutenção.
 */
export enum CommandId {
// ========== FILE ==========
FILE_NEW = 'file.new',
FILE_OPEN = 'file.open',
FILE_OPEN_IFC = 'file.open.ifc',
FILE_OPEN_GLTF = 'file.open.gltf',
FILE_OPEN_OBJ = 'file.open.obj',
FILE_SAVE = 'file.save',
FILE_SAVE_AS = 'file.saveAs',
FILE_EXPORT_OBJ = 'file.export.obj',
FILE_EXPORT_GLTF = 'file.export.gltf',
FILE_EXPORT_GLB = 'file.export.glb',
FILE_EXPORT_IFC = 'file.export.ifc',
FILE_EXPORT_SCREENSHOT = 'file.export.screenshot',
FILE_EXPORT_SELECTION = 'file.export.selection',
FILE_RECENT = 'file.recent',
FILE_CLOSE = 'file.close',
  
  // ========== EDIT ==========
  EDIT_UNDO = 'edit.undo',
  EDIT_REDO = 'edit.redo',
  EDIT_CUT = 'edit.cut',
  EDIT_COPY = 'edit.copy',
  EDIT_PASTE = 'edit.paste',
  EDIT_DELETE = 'edit.delete',
  EDIT_SELECT_ALL = 'edit.selectAll',
  EDIT_DESELECT_ALL = 'edit.deselectAll',
  
  // ========== VIEW ==========
  VIEW_TOP = 'view.camera.top',
  VIEW_FRONT = 'view.camera.front',
  VIEW_SIDE = 'view.camera.side',
  VIEW_ISOMETRIC = 'view.camera.isometric',
  VIEW_FOCUS_SELECTION = 'view.focus.selection',
  VIEW_FRAME_ALL = 'view.frame.all',
  VIEW_TOGGLE_GRID = 'view.toggle.grid',
  VIEW_TOGGLE_AXES = 'view.toggle.axes',
  VIEW_TOGGLE_STATS = 'view.toggle.stats',
  VIEW_FULLSCREEN = 'view.fullscreen',
  VIEW_SET_RENDER_QUALITY = 'view.setRenderQuality',
  VIEW_SET_CAMERA_MODE = 'view.setCameraMode',
  
  // ========== ENVIRONMENT/SKYBOX ==========
  ENV_SKYBOX_NEUTRAL = 'env.skybox.neutral',
  ENV_SKYBOX_NATURE = 'env.skybox.nature',
  ENV_SKYBOX_URBAN = 'env.skybox.urban',
  ENV_SKYBOX_SUNSET = 'env.skybox.sunset',
  ENV_TOGGLE_FOG = 'env.fog.toggle',
  ENV_ADJUST_EXPOSURE = 'env.exposure.adjust',
  
  // ========== SECTIONS & CLIPPING ==========
  SECTION_CREATE_X = 'section.create.x',
  SECTION_CREATE_Y = 'section.create.y',
  SECTION_CREATE_Z = 'section.create.z',
  SECTION_TOGGLE_LINES = 'section.toggle.lines',
  SECTION_TOGGLE_PLANES = 'section.toggle.planes',
  SECTION_CLEAR_ALL = 'section.clear.all',
  SECTION_FLIP_ACTIVE = 'section.flip.active',
  SECTION_BOX_CLIPPING = 'section.box.clipping',
  
  // ========== MODEL ==========
  MODEL_SHOW_ALL = 'model.show.all',
  MODEL_HIDE_SELECTED = 'model.hide.selected',
  MODEL_ISOLATE_SELECTED = 'model.isolate.selected',
  MODEL_HIDE_BY_CLASS = 'model.hide.byClass',
  MODEL_SHOW_BY_CLASS = 'model.show.byClass',
  MODEL_PROPERTIES = 'model.properties',
  
  // ========== TOOLS ==========
  TOOL_SELECT = 'tool.select',
  TOOL_MEASURE = 'tool.measure',
  TOOL_LAYER = 'tool.layer',
  TOOL_NAVIGATE = 'tool.navigate',
  TOOL_AVATAR = 'tool.avatar',
  
  // ========== XR/VR ==========
  XR_ENTER = 'xr.enter',
  XR_EXIT = 'xr.exit',
  XR_TOGGLE = 'xr.toggle',
  XR_RECENTER = 'xr.recenter',
  
  // ========== NETWORK ==========
  NET_CONNECT = 'network.connect',
  NET_DISCONNECT = 'network.disconnect',
  NET_CREATE_ROOM = 'network.room.create',
  NET_JOIN_ROOM = 'network.room.join',
  NET_LEAVE_ROOM = 'network.room.leave',
  NET_TOGGLE_VOIP = 'network.voip.toggle',
  NET_TOGGLE_VOICE = 'network.voice.toggle',
  NET_START_SCREEN_SHARE = 'network.screenshare.start',
  NET_STOP_SCREEN_SHARE = 'network.screenshare.stop',
  
  // ========== THEME ==========
  THEME_SELECT = 'theme.select',
  THEME_DARK = 'theme.dark',
  THEME_LIGHT = 'theme.light',
  THEME_HIGH_CONTRAST = 'theme.highContrast',
  
  // ========== AI ==========
  AI_OPEN_CHAT = 'ai.chat.open',
  AI_CLOSE_CHAT = 'ai.chat.close',
  AI_TOGGLE_CHAT = 'ai.chat.toggle',
  AI_CLEAR_HISTORY = 'ai.chat.clearHistory',
  
  // ========== SCRIPT ==========
  SCRIPT_RUN = 'script.run',
  SCRIPT_STOP = 'script.stop',
  SCRIPT_RELOAD = 'script.reload',
  
  // ========== HELP ==========
  HELP_DOCS = 'help.docs',
  HELP_SHORTCUTS = 'help.shortcuts',
  HELP_ABOUT = 'help.about',
}

/**
 * Command - Interface base para todos os comandos
 */
export interface Command {
  id: CommandId;
  label: string;
  description?: string;
  shortcut?: string;
  icon?: string;
  enabled?: boolean;
  visible?: boolean;
  category?: string; // FASE 5: Adicionar suporte a categoria
}

/**
 * CommandPayload - Dados passados com o comando
 */
export type CommandPayload = Record<string, any>;

/**
 * CommandHandler - Função que executa um comando
 */
export type CommandHandler = (payload?: CommandPayload) => void | Promise<void>;

/**
 * CommandResult - Resultado da execução de um comando
 */
export interface CommandResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

/**
 * CommandContext - Contexto disponível para handlers
 */
export interface CommandContext {
  state: any; // AppState
  controller: any; // AppController
  scene: any; // SceneManager
  camera: any; // CameraSystem
}

/**
 * RegisteredCommand - Comando completo com handler
 */
export interface RegisteredCommand extends Command {
  handler: CommandHandler;
  context?: CommandContext;
}
