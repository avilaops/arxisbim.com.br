import * as THREE from 'three';
import { BaseTool } from './Tool';
import { ToolType } from '../core';
import { appController } from '../app/AppController';
import { SectionType } from '../app/SectionManager';

/**
 * SectionTool - Ferramenta interativa para criar e manipular seções/clipping
 * Implementa SUB-EPIC 1.3 - Seções, Cortes e Clipping
 */
export class SectionTool extends BaseTool {
  public readonly name = 'Section Tool';
  public readonly type = ToolType.CUT;

  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private mouse: THREE.Vector2;
  
  // Modo de criação
  private creationMode: 'x-axis' | 'y-axis' | 'z-axis' | 'custom' = 'y-axis';
  
  // Geometrias e materiais para feedback visual
  private previewPlane: THREE.Mesh | null = null;
  private previewMaterial: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.mouse = new THREE.Vector2();

    // Material de preview
    this.previewMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthTest: false
    });
  }

  public activate(): void {
    super.activate();
    document.body.style.cursor = 'crosshair';
    console.log('✂️ Section Tool: Click to place section plane. Use X/Y/Z keys to change axis. Press ESC to exit.');
    this.createPreviewPlane();
    
    // Ativa helpers do SectionManager/ClippingGeometry
    appController.sectionManager.setHelpersVisible(true);
  }

  public deactivate(): void {
    super.deactivate();
    document.body.style.cursor = 'default';
    this.removePreviewPlane();
    
    // Mantém helpers visíveis quando desativa a tool (usuário pode querer ver as seções)
    // Para ocultar, usar appController.sectionManager.setHelpersVisible(false)
  }

  /**
   * Cria plano de preview
   */
  private createPreviewPlane(): void {
    const geometry = new THREE.PlaneGeometry(20, 20);
    this.previewPlane = new THREE.Mesh(geometry, this.previewMaterial);
    this.previewPlane.visible = false;
    this.scene.add(this.previewPlane);
  }

  /**
   * Remove plano de preview
   */
  private removePreviewPlane(): void {
    if (this.previewPlane) {
      this.scene.remove(this.previewPlane);
      this.previewPlane.geometry.dispose();
      this.previewPlane = null;
    }
  }

  public onPointerMove(event: PointerEvent, raycaster: THREE.Raycaster): void {
    if (!this.isActive || !this.previewPlane) return;

    // Atualiza posição do mouse
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Raycast para obter posição no espaço 3D
    raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      
      // Posiciona e orienta o preview baseado no modo
      this.updatePreviewPlane(point);
      this.previewPlane.visible = true;
    } else {
      this.previewPlane.visible = false;
    }
  }

  /**
   * Atualiza posição e orientação do plano de preview
   */
  private updatePreviewPlane(point: THREE.Vector3): void {
    if (!this.previewPlane) return;

    switch (this.creationMode) {
      case 'x-axis':
        this.previewPlane.position.set(point.x, 0, 0);
        this.previewPlane.rotation.set(0, Math.PI / 2, 0);
        break;
      case 'y-axis':
        this.previewPlane.position.set(0, point.y, 0);
        this.previewPlane.rotation.set(Math.PI / 2, 0, 0);
        break;
      case 'z-axis':
        this.previewPlane.position.set(0, 0, point.z);
        this.previewPlane.rotation.set(0, 0, 0);
        break;
      case 'custom':
        // Para modo custom, usar a normal da superfície intersectada
        this.previewPlane.position.copy(point);
        break;
    }
  }

  public onPointerDown(event: PointerEvent, raycaster: THREE.Raycaster): void {
    if (!this.isActive) return;

    // Ignora se clicou em UI
    const target = event.target as HTMLElement;
    if (this.isUIElement(target)) {
      return;
    }

    // Calcula posição do mouse
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Raycast
    raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      this.createSection(point);
    }
  }

  /**
   * Cria uma nova seção na posição especificada
   */
  private createSection(point: THREE.Vector3): void {
    const sectionManager = appController.sectionManager;
    
    let type: SectionType;
    let position: number;

    switch (this.creationMode) {
      case 'x-axis':
        type = SectionType.X_AXIS;
        position = point.x;
        break;
      case 'y-axis':
        type = SectionType.Y_AXIS;
        position = point.y;
        break;
      case 'z-axis':
        type = SectionType.Z_AXIS;
        position = point.z;
        break;
      default:
        type = SectionType.CUSTOM;
        position = 0;
    }

    const section = sectionManager.createSection(type, position);
    console.log(`✂️ Section created at ${this.creationMode}: ${position.toFixed(2)}`, section);
    
    // Gera section lines reais com ClippingGeometry
    sectionManager.generateSectionLines(true);
    
    // Feedback visual
    this.flashPreviewPlane();
  }

  /**
   * Flash no plano de preview para feedback visual
   */
  private flashPreviewPlane(): void {
    if (!this.previewPlane) return;

    const originalOpacity = this.previewMaterial.opacity;
    this.previewMaterial.opacity = 0.5;

    setTimeout(() => {
      if (this.previewMaterial) {
        this.previewMaterial.opacity = originalOpacity;
      }
    }, 150);
  }

  public onKeyDown(event: KeyboardEvent): void {
    if (!this.isActive) return;

    // Muda o eixo de criação
    switch (event.key.toLowerCase()) {
      case 'x':
        this.creationMode = 'x-axis';
        this.previewMaterial.color.set(0xff0000); // Vermelho
        console.log('✂️ Section axis: X (Red)');
        break;
      case 'y':
        this.creationMode = 'y-axis';
        this.previewMaterial.color.set(0x00ff00); // Verde
        console.log('✂️ Section axis: Y (Green)');
        break;
      case 'z':
        this.creationMode = 'z-axis';
        this.previewMaterial.color.set(0x0000ff); // Azul
        console.log('✂️ Section axis: Z (Blue)');
        break;
      case 'c':
        this.creationMode = 'custom';
        this.previewMaterial.color.set(0xffff00); // Amarelo
        console.log('✂️ Section mode: Custom');
        break;
      case 'escape':
        // Limpa todas as seções
        appController.sectionManager.clearSections();
        console.log('✂️ All sections cleared');
        break;
      case 'delete':
      case 'backspace': {
        // Remove última seção
        const sections = appController.sectionManager.getSections();
        if (sections.length > 0) {
          const lastSection = sections[sections.length - 1];
          appController.sectionManager.removeSection(lastSection.id);
          console.log('✂️ Last section removed');
        }
        break;
      }
    }
  }

  /**
   * Define o modo de criação
   */
  public setCreationMode(mode: 'x-axis' | 'y-axis' | 'z-axis' | 'custom'): void {
    this.creationMode = mode;
    
    // Atualiza cor do preview
    switch (mode) {
      case 'x-axis':
        this.previewMaterial.color.set(0xff0000);
        break;
      case 'y-axis':
        this.previewMaterial.color.set(0x00ff00);
        break;
      case 'z-axis':
        this.previewMaterial.color.set(0x0000ff);
        break;
      case 'custom':
        this.previewMaterial.color.set(0xffff00);
        break;
    }
  }

  /**
   * Verifica se um elemento é parte da UI
   */
  private isUIElement(element: HTMLElement): boolean {
    // Verifica se o elemento ou algum ancestral é parte da UI
    let current: HTMLElement | null = element;
    while (current) {
      if (
        current.classList.contains('left-panel') ||
        current.classList.contains('right-inspector') ||
        current.classList.contains('top-bar') ||
        current.classList.contains('bottom-dock') ||
        current.tagName === 'BUTTON' ||
        current.tagName === 'INPUT'
      ) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    this.removePreviewPlane();
    this.previewMaterial.dispose();
  }
}
