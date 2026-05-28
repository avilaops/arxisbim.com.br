import * as THREE from 'three';
import { eventBus, EventType } from '../core';

/**
 * ModelOperations - Operações em modelos 3D
 * 
 * Show, Hide, Isolate, Filter por classe IFC
 */
export class ModelOperations {
  private static instance: ModelOperations;
  
  private scene: THREE.Scene | null = null;
  private hiddenObjects: Set<string> = new Set();
  private isolatedObjects: Set<string> = new Set();
  private isIsolateMode: boolean = false;
  
  private constructor() {
    console.log('👁️ ModelOperations initialized');
  }
  
  public static getInstance(): ModelOperations {
    if (!ModelOperations.instance) {
      ModelOperations.instance = new ModelOperations();
    }
    return ModelOperations.instance;
  }
  
  /**
   * Inicializa com referência da cena
   */
  public initialize(scene: THREE.Scene): void {
    this.scene = scene;
    console.log('✅ ModelOperations initialized with scene');
  }
  
  /**
   * Mostra todos os objetos
   */
  public showAll(): void {
    if (!this.scene) return;
    
    this.scene.traverse(obj => {
      obj.visible = true;
    });
    
    this.hiddenObjects.clear();
    this.isolatedObjects.clear();
    this.isIsolateMode = false;
    
    eventBus.emit(EventType.MODEL_SHOW_ALL, {});
    console.log('👁️ All objects shown');
  }
  
  /**
   * Esconde objetos selecionados
   */
  public hideSelected(objects: THREE.Object3D[]): void {
    objects.forEach(obj => {
      obj.visible = false;
      this.hiddenObjects.add(obj.uuid);
    });
    
    eventBus.emit(EventType.MODEL_HIDE_SELECTED, { objects: objects.map(o => o.uuid) });
    console.log(`🙈 Hidden ${objects.length} objects`);
  }
  
  /**
   * Mostra objetos específicos
   */
  public showObjects(objects: THREE.Object3D[]): void {
    objects.forEach(obj => {
      obj.visible = true;
      this.hiddenObjects.delete(obj.uuid);
    });
    
    console.log(`👁️ Shown ${objects.length} objects`);
  }
  
  /**
   * Isola objetos selecionados (esconde todo o resto)
   */
  public isolateSelected(objects: THREE.Object3D[]): void {
    if (!this.scene || objects.length === 0) return;
    
    // Guarda UUIDs dos objetos isolados
    this.isolatedObjects.clear();
    objects.forEach(obj => this.isolatedObjects.add(obj.uuid));
    
    // Esconde todos exceto os selecionados
    this.scene.traverse(obj => {
      if (this.isolatedObjects.has(obj.uuid)) {
        obj.visible = true;
      } else if (obj.type !== 'Scene' && !this.isHelper(obj)) {
        obj.visible = false;
      }
    });
    
    this.isIsolateMode = true;
    
    eventBus.emit(EventType.MODEL_ISOLATE_SELECTED, { objects: objects.map(o => o.uuid) });
    console.log(`🔒 Isolated ${objects.length} objects`);
  }
  
  /**
   * Sai do modo de isolamento
   */
  public exitIsolateMode(): void {
    this.showAll();
  }
  
  /**
   * Esconde por classe IFC
   */
  public hideByClass(ifcClass: string): void {
    if (!this.scene) return;
    
    let count = 0;
    
    this.scene.traverse(obj => {
      const userData = obj.userData;
      if (userData.ifcClass === ifcClass || userData.type === ifcClass) {
        obj.visible = false;
        this.hiddenObjects.add(obj.uuid);
        count++;
      }
    });
    
    eventBus.emit(EventType.MODEL_HIDE_BY_CLASS, { ifcClass });
    console.log(`🏗️ Hidden ${count} objects of class: ${ifcClass}`);
  }
  
  /**
   * Mostra por classe IFC
   */
  public showByClass(ifcClass: string): void {
    if (!this.scene) return;
    
    let count = 0;
    
    this.scene.traverse(obj => {
      const userData = obj.userData;
      if (userData.ifcClass === ifcClass || userData.type === ifcClass) {
        obj.visible = true;
        this.hiddenObjects.delete(obj.uuid);
        count++;
      }
    });
    
    console.log(`👁️ Shown ${count} objects of class: ${ifcClass}`);
  }
  
  /**
   * Filtra por múltiplas classes IFC
   */
  public filterByClasses(classes: string[], visible: boolean): void {
    if (!this.scene) return;
    
    let count = 0;
    
    this.scene.traverse(obj => {
      const userData = obj.userData;
      const objClass = userData.ifcClass || userData.type;
      
      if (classes.includes(objClass)) {
        obj.visible = visible;
        if (visible) {
          this.hiddenObjects.delete(obj.uuid);
        } else {
          this.hiddenObjects.add(obj.uuid);
        }
        count++;
      }
    });
    
    console.log(`${visible ? '👁️' : '🙈'} Filtered ${count} objects by ${classes.length} classes`);
  }
  
  /**
   * Retorna objetos por classe IFC
   */
  public getObjectsByClass(ifcClass: string): THREE.Object3D[] {
    if (!this.scene) return [];
    
    const objects: THREE.Object3D[] = [];
    
    this.scene.traverse(obj => {
      const userData = obj.userData;
      if (userData.ifcClass === ifcClass || userData.type === ifcClass) {
        objects.push(obj);
      }
    });
    
    return objects;
  }
  
  /**
   * Retorna todas as classes IFC presentes na cena
   */
  public getAvailableClasses(): string[] {
    if (!this.scene) return [];
    
    const classes = new Set<string>();
    
    this.scene.traverse(obj => {
      const userData = obj.userData;
      const objClass = userData.ifcClass || userData.type;
      if (objClass && !this.isHelper(obj)) {
        classes.add(objClass);
      }
    });
    
    return Array.from(classes).sort();
  }
  
  /**
   * Verifica se é helper
   */
  private isHelper(obj: THREE.Object3D): boolean {
    return obj.type.includes('Helper') || obj.name.includes('Helper') || obj.name.includes('Grid');
  }
  
  /**
   * Retorna estado atual
   */
  public getState(): {
    isIsolateMode: boolean;
    hiddenCount: number;
    isolatedCount: number;
  } {
    return {
      isIsolateMode: this.isIsolateMode,
      hiddenCount: this.hiddenObjects.size,
      isolatedCount: this.isolatedObjects.size
    };
  }
}

// Export singleton
export const modelOperations = ModelOperations.getInstance();
