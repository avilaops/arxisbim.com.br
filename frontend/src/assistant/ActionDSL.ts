/**
 * Action DSL - Domain Specific Language para ações do Viewer
 * 
 * Define comandos fechados que o assistente AI pode executar.
 * Previne execução de comandos arbitrários e garante segurança.
 */

// ========== Action Types ==========

export enum ViewerActionType {
  FOCUS_SELECTION = 'FOCUS_SELECTION',
  ISOLATE_ELEMENTS = 'ISOLATE_ELEMENTS',
  HIDE_BY_CLASS = 'HIDE_BY_CLASS',
  SHOW_ALL = 'SHOW_ALL',
  APPLY_CLIP_PLANE = 'APPLY_CLIP_PLANE',
  MEASURE_DISTANCE = 'MEASURE_DISTANCE',
  TAKE_SCREENSHOT = 'TAKE_SCREENSHOT',
  EXPORT_REPORT = 'EXPORT_REPORT',
  SET_CAMERA = 'SET_CAMERA',
  TOGGLE_TOOL = 'TOGGLE_TOOL'
}

// ========== Action Interfaces ==========

export interface BaseAction {
  type: ViewerActionType;
  description?: string;
}

export interface FocusSelectionAction extends BaseAction {
  type: ViewerActionType.FOCUS_SELECTION;
  elementIds: string[];
}

export interface IsolateElementsAction extends BaseAction {
  type: ViewerActionType.ISOLATE_ELEMENTS;
  elementIds: string[];
}

export interface HideByClassAction extends BaseAction {
  type: ViewerActionType.HIDE_BY_CLASS;
  ifcClass: string;
}

export interface ShowAllAction extends BaseAction {
  type: ViewerActionType.SHOW_ALL;
}

export interface ApplyClipPlaneAction extends BaseAction {
  type: ViewerActionType.APPLY_CLIP_PLANE;
  normal: [number, number, number];
  constant: number;
}

export interface MeasureDistanceAction extends BaseAction {
  type: ViewerActionType.MEASURE_DISTANCE;
  pointA: [number, number, number];
  pointB: [number, number, number];
}

export interface TakeScreenshotAction extends BaseAction {
  type: ViewerActionType.TAKE_SCREENSHOT;
  quality: 'low' | 'medium' | 'high';
}

export interface ExportReportAction extends BaseAction {
  type: ViewerActionType.EXPORT_REPORT;
  format: 'json' | 'md' | 'csv';
  sections?: string[];
}

export interface SetCameraAction extends BaseAction {
  type: ViewerActionType.SET_CAMERA;
  position?: [number, number, number];
  target?: [number, number, number];
  preset?: 'top' | 'front' | 'side' | 'isometric';
}

export interface ToggleToolAction extends BaseAction {
  type: ViewerActionType.TOGGLE_TOOL;
  toolName: 'selection' | 'measurement' | 'navigation' | 'layer';
}

// ========== Union Type ==========

export type ViewerAction =
  | FocusSelectionAction
  | IsolateElementsAction
  | HideByClassAction
  | ShowAllAction
  | ApplyClipPlaneAction
  | MeasureDistanceAction
  | TakeScreenshotAction
  | ExportReportAction
  | SetCameraAction
  | ToggleToolAction;

// ========== Assistant Response ==========

export interface AssistantResponse {
  message: string;
  actions: ViewerAction[];
  metadata?: {
    confidence?: number;
    reasoning?: string;
    warnings?: string[];
  };
}

// ========== Action Result ==========

export interface ActionResult {
  action: ViewerAction;
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

// ========== JSON Schema para OpenAI ==========

export const ASSISTANT_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    message: {
      type: 'string',
      description: 'Mensagem em português para o usuário explicando o que será feito'
    },
    actions: {
      type: 'array',
      description: 'Lista de ações a executar no viewer',
      items: {
        oneOf: [
          {
            type: 'object',
            properties: {
              type: { const: 'FOCUS_SELECTION' },
              elementIds: { 
                type: 'array',
                items: { type: 'string' }
              },
              description: { type: 'string' }
            },
            required: ['type', 'elementIds']
          },
          {
            type: 'object',
            properties: {
              type: { const: 'ISOLATE_ELEMENTS' },
              elementIds: { 
                type: 'array',
                items: { type: 'string' }
              },
              description: { type: 'string' }
            },
            required: ['type', 'elementIds']
          },
          {
            type: 'object',
            properties: {
              type: { const: 'HIDE_BY_CLASS' },
              ifcClass: { type: 'string' },
              description: { type: 'string' }
            },
            required: ['type', 'ifcClass']
          },
          {
            type: 'object',
            properties: {
              type: { const: 'SHOW_ALL' },
              description: { type: 'string' }
            },
            required: ['type']
          },
          {
            type: 'object',
            properties: {
              type: { const: 'TAKE_SCREENSHOT' },
              quality: { 
                type: 'string',
                enum: ['low', 'medium', 'high']
              },
              description: { type: 'string' }
            },
            required: ['type', 'quality']
          },
          {
            type: 'object',
            properties: {
              type: { const: 'SET_CAMERA' },
              preset: {
                type: 'string',
                enum: ['top', 'front', 'side', 'isometric']
              },
              description: { type: 'string' }
            },
            required: ['type']
          },
          {
            type: 'object',
            properties: {
              type: { const: 'TOGGLE_TOOL' },
              toolName: {
                type: 'string',
                enum: ['selection', 'measurement', 'navigation', 'layer']
              },
              description: { type: 'string' }
            },
            required: ['type', 'toolName']
          }
        ]
      }
    },
    metadata: {
      type: 'object',
      properties: {
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        reasoning: { type: 'string' },
        warnings: { 
          type: 'array',
          items: { type: 'string' }
        }
      }
    }
  },
  required: ['message', 'actions']
};

// ========== Action Validator ==========

export class ActionValidator {
  /**
   * Valida se uma ação é válida
   */
  static validate(action: any): action is ViewerAction {
    if (!action || typeof action !== 'object') {
      return false;
    }
    
    if (!Object.values(ViewerActionType).includes(action.type)) {
      return false;
    }
    
    // Validações específicas por tipo
    switch (action.type) {
      case ViewerActionType.FOCUS_SELECTION:
      case ViewerActionType.ISOLATE_ELEMENTS:
        return Array.isArray(action.elementIds) && 
               action.elementIds.every((id: any) => typeof id === 'string');
      
      case ViewerActionType.HIDE_BY_CLASS:
        return typeof action.ifcClass === 'string';
      
      case ViewerActionType.SHOW_ALL:
        return true;
      
      case ViewerActionType.TAKE_SCREENSHOT:
        return ['low', 'medium', 'high'].includes(action.quality);
      
      case ViewerActionType.SET_CAMERA:
        return !action.preset || ['top', 'front', 'side', 'isometric'].includes(action.preset);
      
      case ViewerActionType.TOGGLE_TOOL:
        return ['selection', 'measurement', 'navigation', 'layer'].includes(action.toolName);
      
      default:
        return false;
    }
  }
  
  /**
   * Valida resposta do assistente
   */
  static validateResponse(response: any): response is AssistantResponse {
    if (!response || typeof response !== 'object') {
      return false;
    }
    
    if (typeof response.message !== 'string') {
      return false;
    }
    
    if (!Array.isArray(response.actions)) {
      return false;
    }
    
    return response.actions.every((action: any) => this.validate(action));
  }
  
  /**
   * Sanitiza resposta
   */
  static sanitize(response: any): AssistantResponse | null {
    if (!this.validateResponse(response)) {
      return null;
    }
    
    return {
      message: response.message,
      actions: response.actions.filter((action: any) => this.validate(action)),
      metadata: response.metadata
    };
  }
}
