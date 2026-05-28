import * as THREE from 'three';

/**
 * ObjectPalette - Paleta de objetos para VR
 * Interface flutuante com primitivas e assets disponíveis
 */
export class ObjectPalette {
  private paletteGroup: THREE.Group;
  private items: Array<{
    type: string;
    mesh: THREE.Mesh;
    label: THREE.Sprite;
  }> = [];
  
  private isVisible: boolean = false;
  private selectedIndex: number = -1;
  
  constructor() {
    this.paletteGroup = new THREE.Group();
    this.paletteGroup.name = 'objectPalette';
    
    this.createPalette();
    
    console.log('🎨 Object Palette initialized');
  }
  
  /**
   * Cria paleta com primitivas
   */
  private createPalette(): void {
    const primitives = [
      { type: 'box', geometry: new THREE.BoxGeometry(0.3, 0.3, 0.3), label: '📦 Box' },
      { type: 'sphere', geometry: new THREE.SphereGeometry(0.15, 16, 16), label: '🔵 Sphere' },
      { type: 'cylinder', geometry: new THREE.CylinderGeometry(0.15, 0.15, 0.3, 16), label: '⬆️ Cylinder' },
      { type: 'plane', geometry: new THREE.PlaneGeometry(0.3, 0.3), label: '⬜ Plane' },
      { type: 'cone', geometry: new THREE.ConeGeometry(0.15, 0.3, 16), label: '🔺 Cone' },
      { type: 'torus', geometry: new THREE.TorusGeometry(0.15, 0.05, 8, 16), label: '⭕ Torus' }
    ];
    
    primitives.forEach((primitive, index) => {
      const material = new THREE.MeshStandardMaterial({
        color: 0x808080,
        roughness: 0.7,
        metalness: 0.3
      });
      
      const mesh = new THREE.Mesh(primitive.geometry, material);
      mesh.userData.primitiveType = primitive.type;
      
      // Posiciona em grid
      const x = (index % 3) * 0.5 - 0.5;
      const y = Math.floor(index / 3) * -0.5;
      mesh.position.set(x, y, 0);
      
      // Cria label
      const label = this.createLabel(primitive.label);
      label.position.set(x, y - 0.25, 0);
      
      this.paletteGroup.add(mesh);
      this.paletteGroup.add(label);
      
      this.items.push({
        type: primitive.type,
        mesh,
        label
      });
    });
  }
  
  /**
   * Cria label de texto
   */
  private createLabel(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;
    
    // Background
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Texto
    context.font = '24px Arial';
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.8, 0.2, 1);
    
    return sprite;
  }
  
  /**
   * Mostra paleta
   */
  public show(position: THREE.Vector3, rotation: THREE.Euler): void {
    this.isVisible = true;
    this.paletteGroup.visible = true;
    this.paletteGroup.position.copy(position);
    this.paletteGroup.rotation.copy(rotation);
    
    console.log('👁️ Palette shown');
  }
  
  /**
   * Esconde paleta
   */
  public hide(): void {
    this.isVisible = false;
    this.paletteGroup.visible = false;
    this.clearSelection();
    
    console.log('🙈 Palette hidden');
  }
  
  /**
   * Toggle visibilidade
   */
  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      // Posiciona na frente da câmera (precisa ser chamado com posição)
      console.log('⚠️ Use show(position, rotation) to display palette');
    }
  }
  
  /**
   * Seleciona item da paleta
   */
  public selectItem(index: number): string | null {
    if (index < 0 || index >= this.items.length) return null;
    
    this.clearSelection();
    this.selectedIndex = index;
    
    const item = this.items[index];
    const material = item.mesh.material as THREE.MeshStandardMaterial;
    material.emissive = new THREE.Color(0x00ff00);
    material.emissiveIntensity = 0.5;
    
    console.log('✅ Selected:', item.type);
    return item.type;
  }
  
  /**
   * Limpa seleção
   */
  public clearSelection(): void {
    if (this.selectedIndex >= 0) {
      const item = this.items[this.selectedIndex];
      const material = item.mesh.material as THREE.MeshStandardMaterial;
      material.emissive = new THREE.Color(0x000000);
      material.emissiveIntensity = 0;
      
      this.selectedIndex = -1;
    }
  }
  
  /**
   * Detecta interseção com raycaster
   */
  public intersect(raycaster: THREE.Raycaster): number {
    const intersects = raycaster.intersectObjects(
      this.items.map(item => item.mesh),
      false
    );
    
    if (intersects.length > 0) {
      const selectedMesh = intersects[0].object as THREE.Mesh;
      return this.items.findIndex(item => item.mesh === selectedMesh);
    }
    
    return -1;
  }
  
  /**
   * Adiciona paleta à cena
   */
  public addToScene(scene: THREE.Scene): void {
    scene.add(this.paletteGroup);
    this.paletteGroup.visible = this.isVisible;
  }
  
  /**
   * Remove paleta da cena
   */
  public removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.paletteGroup);
  }
  
  /**
   * Retorna tipo selecionado
   */
  public getSelectedType(): string | null {
    if (this.selectedIndex >= 0) {
      return this.items[this.selectedIndex].type;
    }
    return null;
  }
  
  /**
   * Retorna se está visível
   */
  public getIsVisible(): boolean {
    return this.isVisible;
  }
  
  /**
   * Dispose
   */
  public dispose(): void {
    this.items.forEach(item => {
      item.mesh.geometry.dispose();
      (item.mesh.material as THREE.Material).dispose();
      (item.label.material as THREE.SpriteMaterial).map?.dispose();
      (item.label.material as THREE.SpriteMaterial).dispose();
    });
    
    this.items = [];
  }
}
