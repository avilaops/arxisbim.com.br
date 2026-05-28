import * as THREE from 'three';
import { appController } from '../app/AppController';
import { appState } from '../core/AppState';

/**
 * ViewerStateSnapshot - Captura resumo do estado atual do viewer
 * 
 * Fornece contexto para o assistente AI sem enviar dados massivos.
 * Inclui apenas informação relevante para tomada de decisão.
 */
export interface ViewerSnapshot {
  // Seleção
  selection: {
    count: number;
    elementIds: string[];
    classes: string[];
  };
  
  // Cena
  scene: {
    totalObjects: number;
    visibleObjects: number;
    ifcClasses: string[];
    bounds?: {
      min: [number, number, number];
      max: [number, number, number];
      center: [number, number, number];
    };
  };
  
  // Câmera
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    fov?: number;
  };
  
  // Performance
  performance: {
    fps: number;
    drawCalls?: number;
    triangles?: number;
    memory?: string;
  };
  
  // Estado da aplicação
  app: {
    currentTool?: string;
    theme: string;
    uiVisible: boolean;
    projectName?: string;
  };
  
  // Timestamp
  timestamp: number;
}

export class ViewerStateSnapshot {
  /**
   * Captura snapshot completo do estado atual
   */
  static capture(
    scene: THREE.Scene,
    camera: THREE.Camera,
    fps: number = 60
  ): ViewerSnapshot {
    return {
      selection: this.captureSelection(),
      scene: this.captureScene(scene),
      camera: this.captureCamera(camera),
      performance: this.capturePerformance(fps),
      app: this.captureAppState(),
      timestamp: Date.now()
    };
  }
  
  /**
   * Captura estado da seleção
   */
  private static captureSelection() {
    const selectedObject = appController.selectionManager.getSelectedObject();
    const selectedObjects = selectedObject ? [selectedObject] : [];
    
    return {
      count: selectedObjects.length,
      elementIds: selectedObjects.map((obj: THREE.Object3D) => obj.uuid),
      classes: this.extractClasses(selectedObjects)
    };
  }
  
  /**
   * Captura estado da cena
   */
  private static captureScene(scene: THREE.Scene) {
    const objects: THREE.Object3D[] = [];
    const visibleObjects: THREE.Object3D[] = [];
    const ifcClasses = new Set<string>();
    
    scene.traverse((obj) => {
      objects.push(obj);
      
      if (obj.visible) {
        visibleObjects.push(obj);
      }
      
      // Extrai classe IFC se existir
      if ((obj as any).userData?.ifcClass) {
        ifcClasses.add((obj as any).userData.ifcClass);
      }
    });
    
    const bounds = this.calculateBounds(objects);
    
    return {
      totalObjects: objects.length,
      visibleObjects: visibleObjects.length,
      ifcClasses: Array.from(ifcClasses),
      bounds
    };
  }
  
  /**
   * Captura estado da câmera
   */
  private static captureCamera(camera: THREE.Camera) {
    const position = camera.position.toArray() as [number, number, number];
    
    // Calcula target (ponto que a câmera olha)
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const target = camera.position.clone().add(direction.multiplyScalar(10));
    
    const result: any = {
      position,
      target: target.toArray() as [number, number, number]
    };
    
    // Se for perspective camera, adiciona FOV
    if (camera instanceof THREE.PerspectiveCamera) {
      result.fov = camera.fov;
    }
    
    return result;
  }
  
  /**
   * Captura métricas de performance
   */
  private static capturePerformance(fps: number) {
    const memory = (performance as any).memory;
    
    return {
      fps: Math.round(fps),
      drawCalls: undefined, // Pode ser capturado do renderer
      triangles: undefined,
      memory: memory ? this.formatMemory(memory.usedJSHeapSize) : undefined
    };
  }
  
  /**
   * Captura estado da aplicação
   */
  private static captureAppState() {
    return {
      currentTool: (appState as any).currentTool || 'navigation',
      theme: (appState as any).currentTheme || 'default',
      uiVisible: appState.uiVisible,
      projectName: (appState as any).projectName || undefined
    };
  }
  
  /**
   * Extrai classes IFC de objetos
   */
  private static extractClasses(objects: THREE.Object3D[]): string[] {
    const classes = new Set<string>();
    
    objects.forEach((obj) => {
      const ifcClass = (obj as any).userData?.ifcClass;
      if (ifcClass) {
        classes.add(ifcClass);
      }
    });
    
    return Array.from(classes);
  }
  
  /**
   * Calcula bounding box da cena
   */
  private static calculateBounds(objects: THREE.Object3D[]) {
    if (objects.length === 0) {
      return undefined;
    }
    
    const box = new THREE.Box3();
    
    objects.forEach((obj) => {
      if ((obj as any).geometry) {
        box.expandByObject(obj);
      }
    });
    
    if (box.isEmpty()) {
      return undefined;
    }
    
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    return {
      min: box.min.toArray() as [number, number, number],
      max: box.max.toArray() as [number, number, number],
      center: center.toArray() as [number, number, number]
    };
  }
  
  /**
   * Formata memória em string legível
   */
  private static formatMemory(bytes: number): string {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)}MB`;
  }
  
  /**
   * Gera prompt context para o assistente
   */
  static toPromptContext(snapshot: ViewerSnapshot): string {
    return `
Estado atual do ArxisVR:

Seleção:
- ${snapshot.selection.count} objetos selecionados
- Classes: ${snapshot.selection.classes.join(', ') || 'nenhuma'}

Cena:
- ${snapshot.scene.totalObjects} objetos no total
- ${snapshot.scene.visibleObjects} objetos visíveis
- Classes IFC presentes: ${snapshot.scene.ifcClasses.join(', ') || 'nenhuma'}
${snapshot.scene.bounds ? `- Centro da cena: [${snapshot.scene.bounds.center.map(n => n.toFixed(2)).join(', ')}]` : ''}

Câmera:
- Posição: [${snapshot.camera.position.map(n => n.toFixed(2)).join(', ')}]
- Alvo: [${snapshot.camera.target.map(n => n.toFixed(2)).join(', ')}]

Performance:
- FPS: ${snapshot.performance.fps}
${snapshot.performance.memory ? `- Memória: ${snapshot.performance.memory}` : ''}

Aplicação:
- Ferramenta ativa: ${snapshot.app.currentTool || 'nenhuma'}
- Tema: ${snapshot.app.theme}
- Projeto: ${snapshot.app.projectName || 'sem nome'}
`.trim();
  }
  
  /**
   * Versão resumida para prompts menores
   */
  static toShortContext(snapshot: ViewerSnapshot): string {
    return `Seleção: ${snapshot.selection.count} | Visível: ${snapshot.scene.visibleObjects}/${snapshot.scene.totalObjects} | FPS: ${snapshot.performance.fps} | Tool: ${snapshot.app.currentTool || 'N/A'}`;
  }
}
