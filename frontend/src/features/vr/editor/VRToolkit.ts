import * as THREE from 'three';

/**
 * VRToolkit - Ferramentas para manipulação em VR
 * Fornece utilitários para interação 3D imersiva
 */
export class VRToolkit {
  /**
   * Cria um gizmo de transformação 3D
   */
  public static createTransformGizmo(): THREE.Group {
    const gizmo = new THREE.Group();
    gizmo.name = 'transformGizmo';
    
    // Eixo X (vermelho)
    const xAxis = this.createArrow(new THREE.Color(0xff0000), new THREE.Vector3(1, 0, 0));
    gizmo.add(xAxis);
    
    // Eixo Y (verde)
    const yAxis = this.createArrow(new THREE.Color(0x00ff00), new THREE.Vector3(0, 1, 0));
    gizmo.add(yAxis);
    
    // Eixo Z (azul)
    const zAxis = this.createArrow(new THREE.Color(0x0000ff), new THREE.Vector3(0, 0, 1));
    gizmo.add(zAxis);
    
    return gizmo;
  }
  
  /**
   * Cria uma seta colorida para eixo
   */
  private static createArrow(color: THREE.Color, direction: THREE.Vector3): THREE.ArrowHelper {
    return new THREE.ArrowHelper(direction, new THREE.Vector3(0, 0, 0), 1, color.getHex(), 0.2, 0.1);
  }
  
  /**
   * Cria um grid 3D para snap
   */
  public static createSnapGrid(size: number = 10, divisions: number = 10): THREE.GridHelper {
    const grid = new THREE.GridHelper(size, divisions);
    grid.name = 'snapGrid';
    return grid;
  }
  
  /**
   * Snap para grid
   */
  public static snapToGrid(value: number, gridSize: number = 0.5): number {
    return Math.round(value / gridSize) * gridSize;
  }
  
  /**
   * Snap posição para grid
   */
  public static snapPositionToGrid(position: THREE.Vector3, gridSize: number = 0.5): THREE.Vector3 {
    return new THREE.Vector3(
      this.snapToGrid(position.x, gridSize),
      this.snapToGrid(position.y, gridSize),
      this.snapToGrid(position.z, gridSize)
    );
  }
  
  /**
   * Cria uma bounding box visual
   */
  public static createBoundingBox(object: THREE.Object3D): THREE.Box3Helper {
    const box = new THREE.Box3().setFromObject(object);
    const helper = new THREE.Box3Helper(box, new THREE.Color(0xffff00));
    helper.name = 'boundingBox';
    return helper;
  }
  
  /**
   * Calcula distância entre dois pontos 3D
   */
  public static calculateDistance(point1: THREE.Vector3, point2: THREE.Vector3): number {
    return point1.distanceTo(point2);
  }
  
  /**
   * Cria uma linha de medição visual
   */
  public static createMeasurementLine(start: THREE.Vector3, end: THREE.Vector3): THREE.Line {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2 });
    const line = new THREE.Line(geometry, material);
    line.name = 'measurementLine';
    return line;
  }
  
  /**
   * Cria um label 3D para texto
   */
  public static createTextLabel(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 128;
    
    context.fillStyle = '#000000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = '48px Arial';
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2, 1, 1);
    sprite.name = 'textLabel';
    
    return sprite;
  }
  
  /**
   * Clona um objeto com suas propriedades
   */
  public static cloneObject(object: THREE.Object3D): THREE.Object3D {
    const clone = object.clone(true);
    clone.name = `${object.name}_clone`;
    return clone;
  }
  
  /**
   * Alinha objeto a outro objeto
   */
  public static alignObjects(source: THREE.Object3D, target: THREE.Object3D, axis: 'x' | 'y' | 'z'): void {
    switch (axis) {
      case 'x':
        source.position.x = target.position.x;
        break;
      case 'y':
        source.position.y = target.position.y;
        break;
      case 'z':
        source.position.z = target.position.z;
        break;
    }
  }
  
  /**
   * Cria uma cópia espelhada
   */
  public static mirrorObject(object: THREE.Object3D, axis: 'x' | 'y' | 'z'): THREE.Object3D {
    const mirror = this.cloneObject(object);
    
    switch (axis) {
      case 'x':
        mirror.scale.x *= -1;
        break;
      case 'y':
        mirror.scale.y *= -1;
        break;
      case 'z':
        mirror.scale.z *= -1;
        break;
    }
    
    return mirror;
  }
  
  /**
   * Agrupa múltiplos objetos
   */
  public static groupObjects(objects: THREE.Object3D[]): THREE.Group {
    const group = new THREE.Group();
    group.name = 'group_' + Date.now();
    
    objects.forEach(obj => {
      group.add(obj);
    });
    
    return group;
  }
  
  /**
   * Reseta transformações de um objeto
   */
  public static resetTransform(object: THREE.Object3D): void {
    object.position.set(0, 0, 0);
    object.rotation.set(0, 0, 0);
    object.scale.set(1, 1, 1);
  }
}
