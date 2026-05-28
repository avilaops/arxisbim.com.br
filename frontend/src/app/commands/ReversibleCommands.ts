import * as THREE from 'three';
import { ReversibleCommand, StateSnapshot, commandHistory } from '../CommandHistory';

/**
 * Exemplos de comandos reversíveis concretos
 */

/**
 * TransformCommand - Comando para transformar objeto
 */
export class TransformCommand implements ReversibleCommand {
  public readonly id: string;
  public readonly type = 'transform';
  public readonly timestamp: number;
  
  private object: THREE.Object3D;
  private oldPosition: THREE.Vector3;
  private oldRotation: THREE.Euler;
  private oldScale: THREE.Vector3;
  private newPosition: THREE.Vector3;
  private newRotation: THREE.Euler;
  private newScale: THREE.Vector3;
  
  constructor(
    object: THREE.Object3D,
    newPosition?: THREE.Vector3,
    newRotation?: THREE.Euler,
    newScale?: THREE.Vector3
  ) {
    this.id = `transform_${Date.now()}_${Math.random()}`;
    this.timestamp = Date.now();
    this.object = object;
    
    // Salva estado atual
    this.oldPosition = object.position.clone();
    this.oldRotation = object.rotation.clone();
    this.oldScale = object.scale.clone();
    
    // Novos valores
    this.newPosition = newPosition || object.position.clone();
    this.newRotation = newRotation || object.rotation.clone();
    this.newScale = newScale || object.scale.clone();
  }
  
  execute(): void {
    this.object.position.copy(this.newPosition);
    this.object.rotation.copy(this.newRotation);
    this.object.scale.copy(this.newScale);
  }
  
  undo(): void {
    this.object.position.copy(this.oldPosition);
    this.object.rotation.copy(this.oldRotation);
    this.object.scale.copy(this.oldScale);
  }
  
  redo(): void {
    this.execute();
  }
  
  description(): string {
    return `Transform ${this.object.name || this.object.type}`;
  }
}

/**
 * AddObjectCommand - Comando para adicionar objeto à cena
 */
export class AddObjectCommand implements ReversibleCommand {
  public readonly id: string;
  public readonly type = 'add_object';
  public readonly timestamp: number;
  
  private scene: THREE.Scene;
  private object: THREE.Object3D;
  private parent: THREE.Object3D | null;
  
  constructor(scene: THREE.Scene, object: THREE.Object3D, parent?: THREE.Object3D) {
    this.id = `add_object_${Date.now()}_${Math.random()}`;
    this.timestamp = Date.now();
    this.scene = scene;
    this.object = object;
    this.parent = parent || null;
  }
  
  execute(): void {
    if (this.parent) {
      this.parent.add(this.object);
    } else {
      this.scene.add(this.object);
    }
  }
  
  undo(): void {
    if (this.parent) {
      this.parent.remove(this.object);
    } else {
      this.scene.remove(this.object);
    }
  }
  
  redo(): void {
    this.execute();
  }
  
  description(): string {
    return `Add ${this.object.name || this.object.type}`;
  }
}

/**
 * RemoveObjectCommand - Comando para remover objeto da cena
 */
export class RemoveObjectCommand implements ReversibleCommand {
  public readonly id: string;
  public readonly type = 'remove_object';
  public readonly timestamp: number;
  
  private scene: THREE.Scene;
  private object: THREE.Object3D;
  private parent: THREE.Object3D | null;
  private index: number = -1;
  
  constructor(scene: THREE.Scene, object: THREE.Object3D) {
    this.id = `remove_object_${Date.now()}_${Math.random()}`;
    this.timestamp = Date.now();
    this.scene = scene;
    this.object = object;
    this.parent = object.parent;
    
    // Salva índice para restaurar na mesma posição
    if (this.parent) {
      this.index = this.parent.children.indexOf(object);
    }
  }
  
  execute(): void {
    if (this.parent) {
      this.parent.remove(this.object);
    } else {
      this.scene.remove(this.object);
    }
  }
  
  undo(): void {
    if (this.parent) {
      // Restaura na mesma posição
      if (this.index >= 0 && this.index < this.parent.children.length) {
        this.parent.children.splice(this.index, 0, this.object);
        this.object.parent = this.parent;
      } else {
        this.parent.add(this.object);
      }
    } else {
      this.scene.add(this.object);
    }
  }
  
  redo(): void {
    this.execute();
  }
  
  description(): string {
    return `Remove ${this.object.name || this.object.type}`;
  }
}

/**
 * VisibilityCommand - Comando para alterar visibilidade
 */
export class VisibilityCommand implements ReversibleCommand {
  public readonly id: string;
  public readonly type = 'visibility';
  public readonly timestamp: number;
  
  private object: THREE.Object3D;
  private oldVisible: boolean;
  private newVisible: boolean;
  
  constructor(object: THREE.Object3D, visible: boolean) {
    this.id = `visibility_${Date.now()}_${Math.random()}`;
    this.timestamp = Date.now();
    this.object = object;
    this.oldVisible = object.visible;
    this.newVisible = visible;
  }
  
  execute(): void {
    this.object.visible = this.newVisible;
  }
  
  undo(): void {
    this.object.visible = this.oldVisible;
  }
  
  redo(): void {
    this.execute();
  }
  
  description(): string {
    return `${this.newVisible ? 'Show' : 'Hide'} ${this.object.name || this.object.type}`;
  }
}

/**
 * MaterialChangeCommand - Comando para alterar material
 */
export class MaterialChangeCommand implements ReversibleCommand {
  public readonly id: string;
  public readonly type = 'material_change';
  public readonly timestamp: number;
  
  private mesh: THREE.Mesh;
  private oldMaterial: THREE.Material | THREE.Material[];
  private newMaterial: THREE.Material | THREE.Material[];
  
  constructor(mesh: THREE.Mesh, newMaterial: THREE.Material | THREE.Material[]) {
    this.id = `material_${Date.now()}_${Math.random()}`;
    this.timestamp = Date.now();
    this.mesh = mesh;
    this.oldMaterial = mesh.material;
    this.newMaterial = newMaterial;
  }
  
  execute(): void {
    this.mesh.material = this.newMaterial;
  }
  
  undo(): void {
    this.mesh.material = this.oldMaterial;
  }
  
  redo(): void {
    this.execute();
  }
  
  description(): string {
    return `Change material of ${this.mesh.name || this.mesh.type}`;
  }
}

/**
 * LayerChangeCommand - Comando para mudança de layer
 */
export class LayerChangeCommand implements ReversibleCommand {
  public readonly id: string;
  public readonly type = 'layer_change';
  public readonly timestamp: number;
  
  private object: THREE.Object3D;
  private oldLayer: number;
  private newLayer: number;
  
  constructor(object: THREE.Object3D, newLayer: number) {
    this.id = `layer_${Date.now()}_${Math.random()}`;
    this.timestamp = Date.now();
    this.object = object;
    this.oldLayer = object.layers.mask;
    this.newLayer = newLayer;
  }
  
  execute(): void {
    this.object.layers.mask = this.newLayer;
  }
  
  undo(): void {
    this.object.layers.mask = this.oldLayer;
  }
  
  redo(): void {
    this.execute();
  }
  
  description(): string {
    return `Change layer of ${this.object.name || this.object.type}`;
  }
}

/**
 * BatchCommand - Agrupa múltiplos comandos
 */
export class BatchCommand implements ReversibleCommand {
  public readonly id: string;
  public readonly type = 'batch';
  public readonly timestamp: number;
  
  private commands: ReversibleCommand[];
  private name: string;
  
  constructor(commands: ReversibleCommand[], name: string = 'Batch') {
    this.id = `batch_${Date.now()}_${Math.random()}`;
    this.timestamp = Date.now();
    this.commands = commands;
    this.name = name;
  }
  
  async execute(): Promise<void> {
    for (const command of this.commands) {
      await command.execute();
    }
  }
  
  async undo(): Promise<void> {
    // Undo em ordem reversa
    for (let i = this.commands.length - 1; i >= 0; i--) {
      await this.commands[i].undo();
    }
  }
  
  async redo(): Promise<void> {
    await this.execute();
  }
  
  description(): string {
    return `${this.name} (${this.commands.length} operations)`;
  }
}

/**
 * Helpers para criar comandos comuns
 */
export const CommandFactory = {
  /**
   * Move objeto
   */
  moveObject(object: THREE.Object3D, newPosition: THREE.Vector3): TransformCommand {
    return new TransformCommand(object, newPosition);
  },
  
  /**
   * Rotaciona objeto
   */
  rotateObject(object: THREE.Object3D, newRotation: THREE.Euler): TransformCommand {
    return new TransformCommand(object, undefined, newRotation);
  },
  
  /**
   * Escala objeto
   */
  scaleObject(object: THREE.Object3D, newScale: THREE.Vector3): TransformCommand {
    return new TransformCommand(object, undefined, undefined, newScale);
  },
  
  /**
   * Adiciona objeto
   */
  addObject(scene: THREE.Scene, object: THREE.Object3D, parent?: THREE.Object3D): AddObjectCommand {
    return new AddObjectCommand(scene, object, parent);
  },
  
  /**
   * Remove objeto
   */
  removeObject(scene: THREE.Scene, object: THREE.Object3D): RemoveObjectCommand {
    return new RemoveObjectCommand(scene, object);
  },
  
  /**
   * Toggle visibilidade
   */
  toggleVisibility(object: THREE.Object3D): VisibilityCommand {
    return new VisibilityCommand(object, !object.visible);
  },
  
  /**
   * Mostra objeto
   */
  showObject(object: THREE.Object3D): VisibilityCommand {
    return new VisibilityCommand(object, true);
  },
  
  /**
   * Esconde objeto
   */
  hideObject(object: THREE.Object3D): VisibilityCommand {
    return new VisibilityCommand(object, false);
  },
  
  /**
   * Muda material
   */
  changeMaterial(mesh: THREE.Mesh, newMaterial: THREE.Material | THREE.Material[]): MaterialChangeCommand {
    return new MaterialChangeCommand(mesh, newMaterial);
  },
  
  /**
   * Muda layer
   */
  changeLayer(object: THREE.Object3D, newLayer: number): LayerChangeCommand {
    return new LayerChangeCommand(object, newLayer);
  },
  
  /**
   * Cria batch de comandos
   */
  batch(commands: ReversibleCommand[], name: string = 'Batch'): BatchCommand {
    return new BatchCommand(commands, name);
  }
};
