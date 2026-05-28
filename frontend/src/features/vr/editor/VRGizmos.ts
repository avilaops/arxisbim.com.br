import * as THREE from 'three';

/**
 * VRGizmos - Sistema de gizmos para manipulação visual
 * Fornece handles interativos para transformar objetos em VR
 */
export class VRGizmos {
private gizmo: THREE.Group;
private mode: 'translate' | 'rotate' | 'scale' = 'translate';
  
  constructor() {
    this.gizmo = new THREE.Group();
    this.gizmo.name = 'VRGizmo';
    this.createTranslateGizmo();
  }
  
  /**
   * Cria gizmo de translação
   */
  private createTranslateGizmo(): void {
    const arrowLength = 1;
    const arrowRadius = 0.05;
    const coneLength = 0.2;
    const coneRadius = 0.1;
    
    // Eixo X (Vermelho)
    const xAxis = this.createAxisArrow(
      new THREE.Color(0xff0000),
      new THREE.Vector3(1, 0, 0),
      arrowLength,
      arrowRadius,
      coneLength,
      coneRadius
    );
    xAxis.userData.axis = 'x';
    this.gizmo.add(xAxis);
    
    // Eixo Y (Verde)
    const yAxis = this.createAxisArrow(
      new THREE.Color(0x00ff00),
      new THREE.Vector3(0, 1, 0),
      arrowLength,
      arrowRadius,
      coneLength,
      coneRadius
    );
    yAxis.userData.axis = 'y';
    this.gizmo.add(yAxis);
    
    // Eixo Z (Azul)
    const zAxis = this.createAxisArrow(
      new THREE.Color(0x0000ff),
      new THREE.Vector3(0, 0, 1),
      arrowLength,
      arrowRadius,
      coneLength,
      coneRadius
    );
    zAxis.userData.axis = 'z';
    this.gizmo.add(zAxis);
    
    // Centro (branco)
    const centerSphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    centerSphere.userData.axis = 'center';
    this.gizmo.add(centerSphere);
  }
  
  /**
   * Cria uma seta para eixo
   */
  private createAxisArrow(
    color: THREE.Color,
    direction: THREE.Vector3,
    length: number,
    radius: number,
    coneLength: number,
    coneRadius: number
  ): THREE.Group {
    const group = new THREE.Group();
    
    // Cilindro (shaft)
    const shaftGeometry = new THREE.CylinderGeometry(radius, radius, length - coneLength, 8);
    const shaftMaterial = new THREE.MeshBasicMaterial({ color });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    
    // Posiciona shaft
    shaft.position.copy(direction.clone().multiplyScalar((length - coneLength) / 2));
    shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    
    // Cone (ponta)
    const coneGeometry = new THREE.ConeGeometry(coneRadius, coneLength, 8);
    const coneMaterial = new THREE.MeshBasicMaterial({ color });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    
    // Posiciona cone
    cone.position.copy(direction.clone().multiplyScalar(length - coneLength / 2));
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    
    group.add(shaft);
    group.add(cone);
    
    return group;
  }
  
  /**
   * Cria gizmo de rotação
   */
  private createRotateGizmo(): void {
    this.clearGizmo();
    
    const radius = 1;
    const tubeRadius = 0.05;
    
    // Anel X (Vermelho)
    const xRing = this.createTorusRing(new THREE.Color(0xff0000), radius, tubeRadius);
    xRing.rotation.y = Math.PI / 2;
    xRing.userData.axis = 'x';
    this.gizmo.add(xRing);
    
    // Anel Y (Verde)
    const yRing = this.createTorusRing(new THREE.Color(0x00ff00), radius, tubeRadius);
    yRing.rotation.x = Math.PI / 2;
    yRing.userData.axis = 'y';
    this.gizmo.add(yRing);
    
    // Anel Z (Azul)
    const zRing = this.createTorusRing(new THREE.Color(0x0000ff), radius, tubeRadius);
    zRing.userData.axis = 'z';
    this.gizmo.add(zRing);
  }
  
  /**
   * Cria um anel torus
   */
  private createTorusRing(color: THREE.Color, radius: number, tubeRadius: number): THREE.Mesh {
    const geometry = new THREE.TorusGeometry(radius, tubeRadius, 16, 64);
    const material = new THREE.MeshBasicMaterial({ color });
    return new THREE.Mesh(geometry, material);
  }
  
  /**
   * Cria gizmo de escala
   */
  private createScaleGizmo(): void {
    this.clearGizmo();
    
    const length = 1;
    const cubeSize = 0.15;
    
    // Eixo X (Vermelho)
    const xAxis = this.createScaleAxis(new THREE.Color(0xff0000), new THREE.Vector3(1, 0, 0), length, cubeSize);
    xAxis.userData.axis = 'x';
    this.gizmo.add(xAxis);
    
    // Eixo Y (Verde)
    const yAxis = this.createScaleAxis(new THREE.Color(0x00ff00), new THREE.Vector3(0, 1, 0), length, cubeSize);
    yAxis.userData.axis = 'y';
    this.gizmo.add(yAxis);
    
    // Eixo Z (Azul)
    const zAxis = this.createScaleAxis(new THREE.Color(0x0000ff), new THREE.Vector3(0, 0, 1), length, cubeSize);
    zAxis.userData.axis = 'z';
    this.gizmo.add(zAxis);
    
    // Centro (escala uniforme)
    const centerCube = new THREE.Mesh(
      new THREE.BoxGeometry(cubeSize * 1.5, cubeSize * 1.5, cubeSize * 1.5),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    centerCube.userData.axis = 'uniform';
    this.gizmo.add(centerCube);
  }
  
  /**
   * Cria eixo de escala
   */
  private createScaleAxis(color: THREE.Color, direction: THREE.Vector3, length: number, cubeSize: number): THREE.Group {
    const group = new THREE.Group();
    
    // Linha
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      direction.clone().multiplyScalar(length)
    ]);
    const lineMaterial = new THREE.LineBasicMaterial({ color });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    group.add(line);
    
    // Cubo na ponta
    const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    const cubeMaterial = new THREE.MeshBasicMaterial({ color });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.copy(direction.clone().multiplyScalar(length));
    group.add(cube);
    
    return group;
  }
  
  /**
   * Limpa gizmo atual
   */
  private clearGizmo(): void {
    while (this.gizmo.children.length > 0) {
      const child = this.gizmo.children[0];
      this.gizmo.remove(child);
      
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
  }
  
  /**
   * Muda modo do gizmo
   */
  public setMode(mode: 'translate' | 'rotate' | 'scale'): void {
    this.mode = mode;
    
    switch (mode) {
      case 'translate':
        this.createTranslateGizmo();
        break;
      case 'rotate':
        this.createRotateGizmo();
        break;
      case 'scale':
        this.createScaleGizmo();
        break;
    }
  }
  
  /**
   * Anexa gizmo a um objeto
   */
  public attachTo(object: THREE.Object3D): void {
    object.add(this.gizmo);
    this.gizmo.position.set(0, 0, 0);
  }
  
  /**
   * Remove gizmo do objeto
   */
  public detach(): void {
    if (this.gizmo.parent) {
      this.gizmo.parent.remove(this.gizmo);
    }
  }
  
  /**
   * Verifica interseção com gizmo
   */
  public intersect(raycaster: THREE.Raycaster): { axis: string | null; distance: number } {
    const intersects = raycaster.intersectObject(this.gizmo, true);
    
    if (intersects.length > 0) {
      const object = intersects[0].object;
      return {
        axis: object.userData.axis || null,
        distance: intersects[0].distance
      };
    }
    
    return { axis: null, distance: Infinity };
  }
  
  /**
   * Destaca eixo ativo
   */
  public highlightAxis(axis: 'x' | 'y' | 'z' | 'center' | 'uniform' | null): void {
    // Reseta todas as cores
    this.gizmo.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial;
        
        if (child.userData.axis === axis) {
          material.emissive = new THREE.Color(0xffffff);
          material.emissiveIntensity = 0.5;
        } else {
          material.emissive = new THREE.Color(0x000000);
          material.emissiveIntensity = 0;
        }
      }
    });
  }
  
  /**
   * Retorna gizmo
   */
  public getGizmo(): THREE.Group {
    return this.gizmo;
  }
  
  /**
   * Retorna modo atual
   */
  public getMode(): 'translate' | 'rotate' | 'scale' {
    return this.mode;
  }
  
  /**
   * Dispose
   */
  public dispose(): void {
    this.clearGizmo();
  }
}
