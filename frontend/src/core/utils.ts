import { Layer, ProjectContext, IFCElement } from './types';

/**
 * Utilitários auxiliares para o core do ArxisVR
 * Helpers para criação e validação de objetos de estado
 */
export class StateHelpers {
  /**
   * Cria uma nova camada com valores padrão
   */
  static createLayer(name: string, color?: string): Layer {
    return {
      id: `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      visible: true,
      locked: false,
      color: color || '#ffffff',
      opacity: 1.0
    };
  }

  /**
   * Valida o contexto de um projeto
   */
  static validateProjectContext(context: Partial<ProjectContext>): boolean {
    if (!context.projectName || context.projectName.trim().length === 0) {
      return false;
    }

    if (context.modelLoaded && (!context.modelName || context.modelName.trim().length === 0)) {
      return false;
    }

    if (context.projectPath && !this.isValidPath(context.projectPath)) {
      return false;
    }

    return true;
  }

  /**
   * Valida um caminho de arquivo/diretório
   */
  private static isValidPath(path: string): boolean {
    // Validação básica de path - pode ser expandida conforme necessário
    const invalidChars = /[<>"|?*]/;
    return !invalidChars.test(path);
  }

  /**
   * Cria um contexto de projeto com valores padrão
   */
  static createDefaultProjectContext(projectName: string = 'Projeto sem nome'): ProjectContext {
    return {
      projectName,
      projectPath: '',
      modelLoaded: false,
      modelName: ''
    };
  }

  /**
   * Mescla layers, evitando duplicatas por ID
   */
  static mergeLayers(existing: Layer[], newLayers: Layer[]): Layer[] {
    const layerMap = new Map<string, Layer>();
    
    // Adiciona layers existentes
    existing.forEach(layer => layerMap.set(layer.id, layer));
    
    // Sobrescreve com novos layers (ou adiciona se não existir)
    newLayers.forEach(layer => layerMap.set(layer.id, layer));
    
    return Array.from(layerMap.values());
  }

  /**
   * Valida um elemento IFC
   */
  static validateIFCElement(element: Partial<IFCElement>): boolean {
    return !!(
      element.expressID !== undefined &&
      element.type &&
      element.globalId &&
      element.properties
    );
  }

  /**
   * Gera um ID único para layers, elementos, etc.
   */
  static generateUniqueId(prefix: string = 'id'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Formata bytes em formato legível
   */
  static formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Converte timestamp para formato legível
   */
  static formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  }
}

/**
 * Constantes do sistema
 */
export const CONSTANTS = {
  // Limites de performance
  MAX_LAYERS: 100,
  MAX_SELECTED_OBJECTS: 1000,
  MAX_BATCH_UPDATES: 50,
  
  // Defaults
  DEFAULT_FPS_TARGET: 60,
  DEFAULT_LOD_DISTANCE: 100,
  DEFAULT_CAMERA_FOV: 75,
  DEFAULT_CAMERA_NEAR: 0.1,
  DEFAULT_CAMERA_FAR: 10000,
  
  // IDs reservados
  DEFAULT_LAYER_ID: 'layer_default',
  TEMP_LAYER_ID: 'layer_temp',
  
  // Performance thresholds
  LOW_FPS_THRESHOLD: 30,
  HIGH_FPS_THRESHOLD: 55,
  
  // Batch update delay (ms)
  BATCH_UPDATE_DEBOUNCE: 16, // ~60fps
  
  // Storage keys
  STORAGE_KEY_PREFIX: 'arxisvr_',
  STORAGE_KEY_THEME: 'arxisvr_theme',
  STORAGE_KEY_SETTINGS: 'arxisvr_settings',
  STORAGE_KEY_RECENT_PROJECTS: 'arxisvr_recent_projects'
} as const;

/**
 * Type guards para verificação de tipos em runtime
 */
export class TypeGuards {
  static isLayer(obj: any): obj is Layer {
    return obj &&
      typeof obj.id === 'string' &&
      typeof obj.name === 'string' &&
      typeof obj.visible === 'boolean' &&
      typeof obj.locked === 'boolean' &&
      typeof obj.opacity === 'number';
  }

  static isProjectContext(obj: any): obj is ProjectContext {
    return obj &&
      typeof obj.projectName === 'string' &&
      typeof obj.projectPath === 'string' &&
      typeof obj.modelLoaded === 'boolean' &&
      typeof obj.modelName === 'string';
  }

  static isIFCElement(obj: any): obj is IFCElement {
    return obj &&
      typeof obj.expressID === 'number' &&
      typeof obj.type === 'string' &&
      typeof obj.globalId === 'string' &&
      typeof obj.name === 'string' &&
      Array.isArray(obj.properties);
  }
}
