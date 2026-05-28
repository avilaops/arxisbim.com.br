import * as THREE from 'three';

/**
 * VRMenu - Menu flutuante 3D para VR
 * Interface espacial imersiva
 * 
 * Features:
 * - Menu radial
 * - Buttons 3D
 * - Hover effects
 * - Click detection
 * - Customizable layout
 * - Auto-positioning
 */
export class VRMenu {
  private menuGroup: THREE.Group;
  private buttons: Map<string, THREE.Mesh> = new Map();
  private labels: Map<string, THREE.Sprite> = new Map();
  
  private isVisible: boolean = false;
  private hoveredButton: string | null = null;
  
  // Callbacks
  private clickCallbacks: Map<string, (() => void)[]> = new Map();
  
  constructor() {
    this.menuGroup = new THREE.Group();
    this.menuGroup.name = 'VRMenu';
    
    console.log('📱 VR Menu initialized');
  }
  
  /**
   * Cria menu radial
   */
  public createRadialMenu(items: Array<{ id: string; label: string; icon?: string }>): void {
    const radius = 0.5;
    const angleStep = (Math.PI * 2) / items.length;
    
    items.forEach((item, index) => {
      const angle = angleStep * index - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      this.addButton(item.id, new THREE.Vector3(x, y, 0), item.label);
    });
  }
  
  /**
   * Adiciona botão ao menu
   */
  public addButton(id: string, position: THREE.Vector3, label: string): void {
    // Geometria do botão
    const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.05);
    const material = new THREE.MeshStandardMaterial({
      color: 0x4444ff,
      roughness: 0.7,
      metalness: 0.3
    });
    
    const button = new THREE.Mesh(geometry, material);
    button.position.copy(position);
    button.userData.id = id;
    button.userData.originalColor = 0x4444ff;
    
    // Label do botão
    const sprite = this.createLabel(label);
    sprite.position.copy(position);
    sprite.position.y += 0.15;
    sprite.scale.set(0.3, 0.1, 1);
    
    this.menuGroup.add(button);
    this.menuGroup.add(sprite);
    
    this.buttons.set(id, button);
    this.labels.set(id, sprite);
  }
  
  /**
   * Cria label de texto
   */
  private createLabel(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;
    
    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = '24px Arial';
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    return new THREE.Sprite(material);
  }
  
  /**
   * Mostra menu
   */
  public show(position: THREE.Vector3, rotation?: THREE.Euler): void {
    this.isVisible = true;
    this.menuGroup.visible = true;
    this.menuGroup.position.copy(position);
    
    if (rotation) {
      this.menuGroup.rotation.copy(rotation);
    }
    
    console.log('👁️ VR Menu shown');
  }
  
  /**
   * Esconde menu
   */
  public hide(): void {
    this.isVisible = false;
    this.menuGroup.visible = false;
    this.hoveredButton = null;
    
    console.log('🙈 VR Menu hidden');
  }
  
  /**
   * Toggle visibilidade
   */
  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      console.log('⚠️ Use show(position) to display menu');
    }
  }
  
  /**
   * Detecta hover com raycaster
   */
  public handleHover(raycaster: THREE.Raycaster): string | null {
    if (!this.isVisible) return null;
    
    const intersects = raycaster.intersectObjects(Array.from(this.buttons.values()));
    
    // Reseta hover anterior
    if (this.hoveredButton) {
      const button = this.buttons.get(this.hoveredButton);
      if (button) {
        const material = button.material as THREE.MeshStandardMaterial;
        material.color.setHex(button.userData.originalColor);
        material.emissive.setHex(0x000000);
      }
      this.hoveredButton = null;
    }
    
    // Aplica novo hover
    if (intersects.length > 0) {
      const button = intersects[0].object as THREE.Mesh;
      const id = button.userData.id;
      
      const material = button.material as THREE.MeshStandardMaterial;
      material.emissive.setHex(0x4444ff);
      material.emissiveIntensity = 0.5;
      
      this.hoveredButton = id;
      return id;
    }
    
    return null;
  }
  
  /**
   * Detecta click
   */
  public handleClick(raycaster: THREE.Raycaster): string | null {
    if (!this.isVisible) return null;
    
    const intersects = raycaster.intersectObjects(Array.from(this.buttons.values()));
    
    if (intersects.length > 0) {
      const button = intersects[0].object as THREE.Mesh;
      const id = button.userData.id;
      
      // Efeito visual de click
      const material = button.material as THREE.MeshStandardMaterial;
      material.emissive.setHex(0xffffff);
      material.emissiveIntensity = 1.0;
      
      setTimeout(() => {
        material.emissive.setHex(0x000000);
        material.emissiveIntensity = 0;
      }, 100);
      
      // Chama callbacks
      this.emitClick(id);
      
      console.log(`🖱️ Button clicked: ${id}`);
      return id;
    }
    
    return null;
  }
  
  /**
   * Registra callback de click
   */
  public onClick(buttonId: string, callback: () => void): void {
    if (!this.clickCallbacks.has(buttonId)) {
      this.clickCallbacks.set(buttonId, []);
    }
    
    this.clickCallbacks.get(buttonId)!.push(callback);
  }
  
  /**
   * Emite evento de click
   */
  private emitClick(buttonId: string): void {
    const callbacks = this.clickCallbacks.get(buttonId);
    if (callbacks) {
      callbacks.forEach((callback) => callback());
    }
  }
  
  /**
   * Remove botão
   */
  public removeButton(id: string): void {
    const button = this.buttons.get(id);
    const label = this.labels.get(id);
    
    if (button) {
      this.menuGroup.remove(button);
      button.geometry.dispose();
      (button.material as THREE.Material).dispose();
      this.buttons.delete(id);
    }
    
    if (label) {
      this.menuGroup.remove(label);
      (label.material as THREE.SpriteMaterial).map?.dispose();
      (label.material as THREE.SpriteMaterial).dispose();
      this.labels.delete(id);
    }
  }
  
  /**
   * Limpa menu
   */
  public clear(): void {
    this.buttons.forEach((_, id) => this.removeButton(id));
    this.clickCallbacks.clear();
  }
  
  /**
   * Adiciona menu à cena
   */
  public addToScene(scene: THREE.Scene): void {
    scene.add(this.menuGroup);
    this.menuGroup.visible = this.isVisible;
  }
  
  /**
   * Remove menu da cena
   */
  public removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.menuGroup);
  }
  
  /**
   * Posiciona menu na frente da câmera
   */
  public positionInFrontOfCamera(camera: THREE.Camera, distance: number = 1.5): void {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    
    const position = camera.position.clone().add(direction.multiplyScalar(distance));
    
    // Faz menu olhar para câmera
    this.menuGroup.position.copy(position);
    this.menuGroup.lookAt(camera.position);
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
    this.clear();
  }
}
