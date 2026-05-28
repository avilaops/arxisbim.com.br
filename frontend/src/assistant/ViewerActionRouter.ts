import * as THREE from 'three';
import { appController } from '../app/AppController';
import { ToolType } from '../core/types';
import {
  ViewerAction,
  ViewerActionType,
  ActionResult,
  FocusSelectionAction,
  IsolateElementsAction,
  HideByClassAction,
  TakeScreenshotAction,
  SetCameraAction,
  ToggleToolAction
} from './ActionDSL';

/**
 * ViewerActionRouter - Executa ações do assistente no viewer
 * 
 * Valida e executa comandos de forma segura.
 * Retorna resultados estruturados para feedback.
 */
export class ViewerActionRouter {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer | null;
  private canvas: HTMLCanvasElement | null;
  
  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    options?: {
      renderer?: THREE.WebGLRenderer | null;
      canvas?: HTMLCanvasElement | null;
    }
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = options?.renderer ?? null;
    this.canvas = options?.canvas ?? (options?.renderer?.domElement as HTMLCanvasElement | undefined) ?? null;
  }
  
  /**
   * Executa uma ação
   */
  public async execute(action: ViewerAction): Promise<ActionResult> {
    console.log(`Executing assistant action: ${action.type}`);
    
    try {
      switch (action.type) {
        case ViewerActionType.FOCUS_SELECTION:
          return await this.executeFocusSelection(action);
        
        case ViewerActionType.ISOLATE_ELEMENTS:
          return await this.executeIsolateElements(action);
        
        case ViewerActionType.HIDE_BY_CLASS:
          return await this.executeHideByClass(action);
        
        case ViewerActionType.SHOW_ALL:
          return await this.executeShowAll();
        
        case ViewerActionType.TAKE_SCREENSHOT:
          return await this.executeTakeScreenshot(action);
        
        case ViewerActionType.SET_CAMERA:
          return await this.executeSetCamera(action);
        
        case ViewerActionType.TOGGLE_TOOL:
          return await this.executeToggleTool(action);
        
        default:
          return {
            action,
            success: false,
            error: `Action type not implemented: ${(action as any).type}`
          };
      }
    } catch (error) {
      console.error('Error executing assistant action:', error);
      return {
        action,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Executa múltiplas ações
   */
  public async executeAll(actions: ViewerAction[]): Promise<ActionResult[]> {
    const results: ActionResult[] = [];
    
    for (const action of actions) {
      const result = await this.execute(action);
      results.push(result);
      
      // Mantém a sequência de ações e registra o resultado individual.
      if (!result.success) {
        console.warn('Assistant action failed but execution continued:', result.error);
      }
    }
    
    return results;
  }
  
  // ========== Action Implementations ==========
  
  /**
   * Foca nos elementos selecionados
   */
  private async executeFocusSelection(action: FocusSelectionAction): Promise<ActionResult> {
    if (action.elementIds.length === 0) {
      return {
        action,
        success: false,
        error: 'No elements to focus'
      };
    }
    
    // Encontra objetos
    const objects: THREE.Object3D[] = [];
    action.elementIds.forEach((id) => {
      const obj = this.scene.getObjectByProperty('uuid', id);
      if (obj) {
        objects.push(obj);
      }
    });
    
    if (objects.length === 0) {
      return {
        action,
        success: false,
        error: 'Elements not found in scene'
      };
    }
    
    // Calcula bounding box
    const box = new THREE.Box3();
    objects.forEach((obj) => {
      box.expandByObject(obj);
    });
    
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = (this.camera as THREE.PerspectiveCamera).fov || 50;
    const cameraZ = Math.abs(maxDim / 2 / Math.tan((fov / 2) * Math.PI / 180)) * 1.5;
    const cameraObject = this.camera as any;
    
    // Move câmera
    cameraObject.position.set(
      center.x + cameraZ,
      center.y + cameraZ,
      center.z + cameraZ
    );
    cameraObject.lookAt(center);
    
    return {
      action,
      success: true,
      message: `Focused on ${objects.length} elements`,
      data: { center: center.toArray(), objectCount: objects.length }
    };
  }
  
  /**
   * Isola elementos (esconde todo o resto)
   */
  private async executeIsolateElements(action: IsolateElementsAction): Promise<ActionResult> {
    if (action.elementIds.length === 0) {
      return {
        action,
        success: false,
        error: 'No elements to isolate'
      };
    }
    
    const isolatedIds = new Set(action.elementIds);
    let hiddenCount = 0;
    
    this.scene.traverse((obj: THREE.Object3D) => {
      if (obj !== this.scene && obj.type !== 'GridHelper' && obj.type !== 'AxesHelper') {
        if (!isolatedIds.has(obj.uuid)) {
          obj.visible = false;
          hiddenCount++;
        } else {
          obj.visible = true;
        }
      }
    });
    
    return {
      action,
      success: true,
      message: `Isolated ${action.elementIds.length} elements, hid ${hiddenCount} others`,
      data: { isolated: action.elementIds.length, hidden: hiddenCount }
    };
  }
  
  /**
   * Esconde objetos por classe IFC
   */
  private async executeHideByClass(action: HideByClassAction): Promise<ActionResult> {
    let hiddenCount = 0;
    
    this.scene.traverse((obj: THREE.Object3D) => {
      const ifcClass = (obj as any).userData?.ifcClass;
      if (ifcClass === action.ifcClass) {
        obj.visible = false;
        hiddenCount++;
      }
    });
    
    return {
      action,
      success: true,
      message: `Hid ${hiddenCount} objects of class ${action.ifcClass}`,
      data: { hidden: hiddenCount, class: action.ifcClass }
    };
  }
  
  /**
   * Mostra todos os objetos
   */
  private async executeShowAll(): Promise<ActionResult> {
    let shownCount = 0;
    
    this.scene.traverse((obj: THREE.Object3D) => {
      if (!obj.visible && obj !== this.scene) {
        obj.visible = true;
        shownCount++;
      }
    });
    
    return {
      action: { type: ViewerActionType.SHOW_ALL },
      success: true,
      message: `Showed ${shownCount} objects`,
      data: { shown: shownCount }
    };
  }
  
  /**
   * Captura screenshot
   */
  private async executeTakeScreenshot(action: TakeScreenshotAction): Promise<ActionResult> {
    try {
      const quality = action.quality === 'high' ? 1.0 : action.quality === 'medium' ? 0.8 : 0.6;
      let dataUrl: string | null = null;

      if (this.renderer) {
        this.renderer.render(this.scene, this.camera);
        dataUrl = (this.renderer.domElement as HTMLCanvasElement).toDataURL('image/png', quality);
      } else if (this.canvas) {
        dataUrl = this.canvas.toDataURL('image/png', quality);
      } else {
        return {
          action,
          success: false,
          error: 'No render target available to capture screenshot'
        };
      }

      if (!dataUrl) {
        return {
          action,
          success: false,
          error: 'Screenshot data was not generated'
        };
      }
      
      // Cria link de download
      const link = document.createElement('a');
      link.download = `arxisvr-screenshot-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      
      return {
        action,
        success: true,
        message: `Screenshot saved (${action.quality} quality)`,
        data: { dataUrl, quality: action.quality }
      };
    } catch (error) {
      return {
        action,
        success: false,
        error: 'Failed to capture screenshot'
      };
    }
  }
  
  /**
   * Configura câmera
   */
  private async executeSetCamera(action: SetCameraAction): Promise<ActionResult> {
    if (action.preset) {
      // Calcula centro da cena
      const box = new THREE.Box3();
      this.scene.traverse((obj: THREE.Object3D) => {
        if ((obj as any).geometry) {
          box.expandByObject(obj);
        }
      });
      const cameraObject = this.camera as any;
      
      const center = new THREE.Vector3();
      box.getCenter(center);
      
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const distance = maxDim * 2;
      
      switch (action.preset) {
        case 'top':
          cameraObject.position.set(center.x, center.y + distance, center.z);
          break;
        case 'front':
          cameraObject.position.set(center.x, center.y, center.z + distance);
          break;
        case 'side':
          cameraObject.position.set(center.x + distance, center.y, center.z);
          break;
        case 'isometric':
          cameraObject.position.set(
            center.x + distance / 1.5,
            center.y + distance / 1.5,
            center.z + distance / 1.5
          );
          break;
      }
      
      cameraObject.lookAt(center);
      
      return {
        action,
        success: true,
        message: `Camera set to ${action.preset} view`,
        data: { preset: action.preset }
      };
    }
    
    if (action.position) {
      const cameraObject = this.camera as any;
      cameraObject.position.set(...action.position);
      
      if (action.target) {
        cameraObject.lookAt(new THREE.Vector3(...action.target));
      }
      
      return {
        action,
        success: true,
        message: 'Camera position set',
        data: { position: action.position, target: action.target }
      };
    }
    
    return {
      action,
      success: false,
      error: 'No preset or position specified'
    };
  }
  
  /**
   * Alterna ferramenta
   */
  private async executeToggleTool(action: ToggleToolAction): Promise<ActionResult> {
    const toolMap: Record<string, ToolType> = {
      selection: ToolType.SELECTION,
      measurement: ToolType.MEASUREMENT,
      navigation: ToolType.NAVIGATION,
      layer: ToolType.LAYER
    };
    
    const toolType = toolMap[action.toolName];
    
    if (!toolType) {
      return {
        action,
        success: false,
        error: `Unknown tool: ${action.toolName}`
      };
    }
    
    appController.activateTool(toolType);
    
    return {
      action,
      success: true,
      message: `Activated ${action.toolName} tool`,
      data: { tool: action.toolName }
    };
  }
}
