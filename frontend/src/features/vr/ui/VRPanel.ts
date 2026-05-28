import * as THREE from 'three';

/**
 * VRPanel - Painel de informação 3D para VR
 * Interface de propriedades espacial
 * 
 * Features:
 * - Text rendering
 * - Property display
 * - Scrollable content
 * - Resizable
 * - Auto-update
 */
export class VRPanel {
  private panelGroup: THREE.Group;
  private panelMesh: THREE.Mesh | null = null;
  private textCanvas: HTMLCanvasElement;
  private textContext: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture | null = null;
  
  private width: number;
  private height: number;
  private resolution: number = 512;
  
  private isVisible: boolean = false;
  private content: Map<string, string> = new Map();
  
  constructor(width: number = 1.0, height: number = 0.8) {
    this.width = width;
    this.height = height;
    
    this.panelGroup = new THREE.Group();
    this.panelGroup.name = 'VRPanel';
    
    // Cria canvas para texto
    this.textCanvas = document.createElement('canvas');
    this.textCanvas.width = this.resolution;
    this.textCanvas.height = this.resolution;
    this.textContext = this.textCanvas.getContext('2d')!;
    
    this.createPanel();
    
    console.log('📄 VR Panel initialized');
  }
  
  /**
   * Cria painel 3D
   */
  private createPanel(): void {
    const geometry = new THREE.PlaneGeometry(this.width, this.height);
    
    // Cria texture do canvas
    this.texture = new THREE.CanvasTexture(this.textCanvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    
    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      side: THREE.DoubleSide,
      transparent: true
    });
    
    this.panelMesh = new THREE.Mesh(geometry, material);
    this.panelGroup.add(this.panelMesh);
    
    // Adiciona borda
    this.addBorder();
  }
  
  /**
   * Adiciona borda ao painel
   */
  private addBorder(): void {
    const borderGeometry = new THREE.EdgesGeometry(new THREE.PlaneGeometry(this.width, this.height));
    const borderMaterial = new THREE.LineBasicMaterial({ color: 0x4444ff, linewidth: 2 });
    const border = new THREE.LineSegments(borderGeometry, borderMaterial);
    
    this.panelGroup.add(border);
  }
  
  /**
   * Renderiza texto no canvas
   */
  private renderText(): void {
    const ctx = this.textContext;
    const canvas = this.textCanvas;
    
    // Limpa canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Configurações de texto
    ctx.font = '24px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    // Renderiza conteúdo
    let y = 20;
    const lineHeight = 30;
    const padding = 20;
    
    this.content.forEach((value, key) => {
      // Key (bold)
      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = '#aaaaff';
      ctx.fillText(`${key}:`, padding, y);
      
      // Value
      ctx.font = '24px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(value, padding + 150, y);
      
      y += lineHeight;
      
      // Quebra de linha se necessário
      if (y > canvas.height - lineHeight) {
        return; // Para se chegar no fim
      }
    });
    
    // Atualiza texture
    if (this.texture) {
      this.texture.needsUpdate = true;
    }
  }
  
  /**
   * Define título do painel
   */
  public setTitle(title: string): void {
    const ctx = this.textContext;
    
    // Renderiza título no topo
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(title, this.textCanvas.width / 2, 20);
    
    if (this.texture) {
      this.texture.needsUpdate = true;
    }
  }
  
  /**
   * Define conteúdo do painel
   */
  public setContent(content: Map<string, string>): void {
    this.content = new Map(content);
    this.renderText();
  }
  
  /**
   * Adiciona propriedade
   */
  public addProperty(key: string, value: string): void {
    this.content.set(key, value);
    this.renderText();
  }
  
  /**
   * Remove propriedade
   */
  public removeProperty(key: string): void {
    this.content.delete(key);
    this.renderText();
  }
  
  /**
   * Limpa conteúdo
   */
  public clearContent(): void {
    this.content.clear();
    this.renderText();
  }
  
  /**
   * Mostra painel
   */
  public show(position: THREE.Vector3, rotation?: THREE.Euler): void {
    this.isVisible = true;
    this.panelGroup.visible = true;
    this.panelGroup.position.copy(position);
    
    if (rotation) {
      this.panelGroup.rotation.copy(rotation);
    }
    
    console.log('👁️ VR Panel shown');
  }
  
  /**
   * Esconde painel
   */
  public hide(): void {
    this.isVisible = false;
    this.panelGroup.visible = false;
    
    console.log('🙈 VR Panel hidden');
  }
  
  /**
   * Toggle visibilidade
   */
  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      console.log('⚠️ Use show(position) to display panel');
    }
  }
  
  /**
   * Posiciona painel na frente da câmera
   */
  public positionInFrontOfCamera(camera: THREE.Camera, distance: number = 1.5, offset: THREE.Vector3 = new THREE.Vector3()): void {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    
    const position = camera.position.clone().add(direction.multiplyScalar(distance)).add(offset);
    
    // Faz painel olhar para câmera
    this.panelGroup.position.copy(position);
    this.panelGroup.lookAt(camera.position);
  }
  
  /**
   * Adiciona painel à cena
   */
  public addToScene(scene: THREE.Scene): void {
    scene.add(this.panelGroup);
    this.panelGroup.visible = this.isVisible;
  }
  
  /**
   * Remove painel da cena
   */
  public removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.panelGroup);
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
    if (this.panelMesh) {
      this.panelMesh.geometry.dispose();
      (this.panelMesh.material as THREE.Material).dispose();
    }
    
    if (this.texture) {
      this.texture.dispose();
    }
    
    this.content.clear();
  }
}
