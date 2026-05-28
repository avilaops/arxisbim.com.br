/**
 * ScriptingEvents - Eventos do sistema de scripts
 */

export enum ScriptEventType {
  // Script Lifecycle
  SCRIPT_LOADED = 'SCRIPT_LOADED',
  SCRIPT_UNLOADED = 'SCRIPT_UNLOADED',
  SCRIPT_ERROR = 'SCRIPT_ERROR',
  SCRIPT_EXECUTED = 'SCRIPT_EXECUTED',
  
  // Hot-Reload
  SCRIPT_RELOADED = 'SCRIPT_RELOADED',
  SCRIPT_MODIFIED = 'SCRIPT_MODIFIED',
  
  // Runtime
  SCRIPT_STARTED = 'SCRIPT_STARTED',
  SCRIPT_STOPPED = 'SCRIPT_STOPPED',
  SCRIPT_PAUSED = 'SCRIPT_PAUSED',
  SCRIPT_RESUMED = 'SCRIPT_RESUMED'
}

export interface ScriptEventData {
  [ScriptEventType.SCRIPT_LOADED]: { scriptId: string; scriptPath: string };
  [ScriptEventType.SCRIPT_UNLOADED]: { scriptId: string };
  [ScriptEventType.SCRIPT_ERROR]: { scriptId: string; error: Error };
  [ScriptEventType.SCRIPT_EXECUTED]: { scriptId: string; result: any };
  [ScriptEventType.SCRIPT_RELOADED]: { scriptId: string };
  [ScriptEventType.SCRIPT_MODIFIED]: { scriptId: string; scriptPath: string };
  [ScriptEventType.SCRIPT_STARTED]: { scriptId: string };
  [ScriptEventType.SCRIPT_STOPPED]: { scriptId: string };
  [ScriptEventType.SCRIPT_PAUSED]: { scriptId: string };
  [ScriptEventType.SCRIPT_RESUMED]: { scriptId: string };
}

/**
 * Script metadata
 */
export interface ScriptMetadata {
  id: string;
  name: string;
  version: string;
  author?: string;
  description?: string;
  dependencies?: string[];
}

/**
 * Script context
 */
export interface ScriptContext {
  scene: any;
  camera: any;
  renderer: any;
  eventBus: any;
  appState: any;
  api: any;
}
