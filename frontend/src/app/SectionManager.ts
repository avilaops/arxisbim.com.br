import * as THREE from 'three';
import { eventBus, EventType } from '../core';
import { ClippingGeometry } from '../engine/geometry/ClippingGeometry';
import { SectionPlane } from '../engine/geometry/SectionPlane';

/**
 * Tipo de plano de seção
 */
export enum SectionType {
  X_AXIS = 'x-axis',
  Y_AXIS = 'y-axis',
  Z_AXIS = 'z-axis',
  CUSTOM = 'custom'
}

/**
 * Interface de um plano de seção
 */
export interface Section {
  id: string;
  name: string;
  type: SectionType;
  plane: THREE.Plane;
  helper: THREE.PlaneHelper | null;
  visible: boolean;
  enabled: boolean;
}

/**
 * Opções visuais para seções
 */
export interface SectionVisualOptions {
  showSectionLines: boolean;
  showClippingPlanes: boolean;
  sectionLineColor: string;
  sectionLineWidth: number;
  fillColor: string;
  fillOpacity: number;
}

/**
 * SectionManager - Gerencia planos de seção e clipping
 * Implementa SUB-EPIC 1.3 - Seções, Cortes e Clipping
 * 
 * Usa ClippingGeometry para GPU-accelerated clipping real
 */
export class SectionManager {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer | null;
  private clippingGeometry: ClippingGeometry | null = null;
  
  // Seções ativas
  private sections: Map<string, Section> = new Map();
  private clippingPlanes: THREE.Plane[] = [];
  
  // Opções visuais
  private visualOptions: SectionVisualOptions = {
    showSectionLines: true,
    showClippingPlanes: true,
    sectionLineColor: '#ff0000',
    sectionLineWidth: 2,
    fillColor: '#ffff00',
    fillOpacity: 0.3
  };

  // Seção ativa para edição
  private activeSection: Section | null = null;

  constructor(scene: THREE.Scene, renderer?: THREE.WebGLRenderer | null) {
    this.scene = scene;
    this.renderer = renderer || null;
    
    console.log('SectionManager initialized');
  }
  
  /**
   * Set ClippingGeometry instance (injected from ViewerHost)
   */
  public setClippingGeometry(clippingGeometry: ClippingGeometry): void {
    this.clippingGeometry = clippingGeometry;
    console.log('SectionManager connected to ClippingGeometry');
  }

  /**
   * Cria uma nova seção no eixo especificado
   */
  public createSection(type: SectionType, position: number = 0): Section {
    const id = `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let plane: THREE.Plane;
    let name: string;
    let axis: 'x' | 'y' | 'z' = 'y';
    
    switch (type) {
      case SectionType.X_AXIS:
        plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), -position);
        name = `Section X (${position.toFixed(2)})`;
        axis = 'x';
        break;
      case SectionType.Y_AXIS:
        plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -position);
        name = `Section Y (${position.toFixed(2)})`;
        axis = 'y';
        break;
      case SectionType.Z_AXIS:
        plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -position);
        name = `Section Z (${position.toFixed(2)})`;
        axis = 'z';
        break;
      default:
        plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -position);
        name = `Custom Section`;
        axis = 'y';
    }

    const section: Section = {
      id,
      name,
      type,
      plane,
      helper: null,
      visible: true,
      enabled: true
    };

    // SEMPRE usar ClippingGeometry se disponível (GPU-accelerated clipping real)
    if (this.clippingGeometry && type !== SectionType.CUSTOM) {
      const sectionPlane = this.clippingGeometry.addSectionPlane(
        axis,
        position,
        this.visualOptions.showSectionLines
      );
      
      // Store reference to ClippingGeometry's plane for updates
      section.plane = sectionPlane.toThreePlane();
      
      console.log(`GPU-accelerated section created: ${name}`);
    } else {
      // Fallback: criar helper visual tradicional (apenas se ClippingGeometry não disponível)
      if (this.visualOptions.showClippingPlanes) {
        section.helper = new THREE.PlaneHelper(plane, 20, 0xff0000);
        this.scene.add(section.helper);
      }
      console.log(`Legacy section created: ${name} (ClippingGeometry not available)`);
    }

    this.sections.set(id, section);
    this.updateClippingPlanes();
    
    eventBus.emit(EventType.SECTION_CREATED, section);
    
    return section;
  }

  /**
   * Remove uma seção
   */
  public removeSection(sectionId: string): void {
    const section = this.sections.get(sectionId);
    if (!section) return;

    // Remove do ClippingGeometry se disponível
    if (this.clippingGeometry && section.type !== SectionType.CUSTOM) {
      const axis = section.type === SectionType.X_AXIS ? 'x' :
                    section.type === SectionType.Y_AXIS ? 'y' : 'z';
      this.clippingGeometry.removeSectionPlane(axis);
    }

    // Remove helper da cena (fallback)
    if (section.helper) {
      this.scene.remove(section.helper);
      section.helper.geometry.dispose();
      (section.helper.material as THREE.Material).dispose();
    }

    this.sections.delete(sectionId);
    this.updateClippingPlanes();
    
    eventBus.emit(EventType.SECTION_REMOVED, sectionId);
    console.log(`Section removed: ${section.name}`);
  }

  /**
   * Atualiza a posição de uma seção
   */
  public updateSectionPosition(sectionId: string, position: number): void {
    const section = this.sections.get(sectionId);
    if (!section) return;

    section.plane.constant = -position;
    
    // Atualiza helper
    if (section.helper) {
      section.helper.updateMatrixWorld(true);
    }

    this.updateClippingPlanes();
    eventBus.emit(EventType.SECTION_UPDATED, section);
  }

  /**
   * Inverte a direção de uma seção
   */
  public flipSection(sectionId: string): void {
    const section = this.sections.get(sectionId);
    if (!section) return;

    section.plane.normal.negate();
    section.plane.constant = -section.plane.constant;
    
    if (section.helper) {
      this.scene.remove(section.helper);
      section.helper.geometry.dispose();
      (section.helper.material as THREE.Material).dispose();
      
      section.helper = new THREE.PlaneHelper(section.plane, 20, 0xff0000);
      this.scene.add(section.helper);
    }

    this.updateClippingPlanes();
    eventBus.emit(EventType.SECTION_UPDATED, section);
    console.log(`Section flipped: ${section.name}`);
  }

  /**
   * Ativa/desativa uma seção
   */
  public toggleSection(sectionId: string, enabled: boolean): void {
    const section = this.sections.get(sectionId);
    if (!section) return;

    section.enabled = enabled;
    
    if (section.helper) {
      section.helper.visible = enabled && section.visible;
    }

    this.updateClippingPlanes();
    eventBus.emit(EventType.SECTION_TOGGLED, { sectionId, enabled });
  }

  /**
   * Mostra/oculta o helper visual de uma seção
   */
  public toggleSectionVisibility(sectionId: string, visible: boolean): void {
    const section = this.sections.get(sectionId);
    if (!section) return;

    section.visible = visible;
    
    if (section.helper) {
      section.helper.visible = visible && section.enabled;
    }
  }

  /**
   * Atualiza os planos de clipping do renderer
   */
  private updateClippingPlanes(): void {
    this.clippingPlanes = Array.from(this.sections.values())
      .filter(section => section.enabled)
      .map(section => section.plane);

    // Atualiza renderer se disponível
    if (this.renderer) {
      this.renderer.clippingPlanes = this.clippingPlanes;
      this.renderer.localClippingEnabled = this.clippingPlanes.length > 0;
    }

    // Atualiza materiais dos objetos da cena
    this.scene.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) {
        const mesh = object as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => {
            mat.clippingPlanes = this.clippingPlanes;
          });
        } else if (mesh.material) {
          mesh.material.clippingPlanes = this.clippingPlanes;
        }
      }
    });
  }

  /**
   * Remove todas as seções
   */
  public clearSections(): void {
    this.sections.forEach((section) => {
      if (section.helper) {
        this.scene.remove(section.helper);
        section.helper.geometry.dispose();
        (section.helper.material as THREE.Material).dispose();
      }
    });

    this.sections.clear();
    this.updateClippingPlanes();
    
    eventBus.emit(EventType.SECTIONS_CLEARED);
    console.log('All sections cleared');
  }

  /**
   * Obtém todas as seções
   */
  public getSections(): Section[] {
    return Array.from(this.sections.values());
  }

  /**
   * Obtém uma seção específica
   */
  public getSection(sectionId: string): Section | undefined {
    return this.sections.get(sectionId);
  }

  /**
   * Atualiza opções visuais
   */
  public updateVisualOptions(options: Partial<SectionVisualOptions>): void {
    this.visualOptions = { ...this.visualOptions, ...options };
    
    // Atualiza helpers
    this.sections.forEach((section) => {
      if (this.visualOptions.showClippingPlanes && !section.helper) {
        section.helper = new THREE.PlaneHelper(section.plane, 20, 0xff0000);
        this.scene.add(section.helper);
      } else if (!this.visualOptions.showClippingPlanes && section.helper) {
        this.scene.remove(section.helper);
        section.helper.geometry.dispose();
        (section.helper.material as THREE.Material).dispose();
        section.helper = null;
      }
    });

    eventBus.emit(EventType.SECTION_VISUAL_OPTIONS_UPDATED, this.visualOptions);
  }

  /**
   * Obtém opções visuais atuais
   */
  public getVisualOptions(): SectionVisualOptions {
    return { ...this.visualOptions };
  }

  /**
   * Define a seção ativa para edição
   */
  public setActiveSection(sectionId: string | null): void {
    if (sectionId === null) {
      this.activeSection = null;
      return;
    }

    const section = this.sections.get(sectionId);
    if (section) {
      this.activeSection = section;
      eventBus.emit(EventType.SECTION_ACTIVATED, section);
    }
  }

  /**
   * Obtém a seção ativa
   */
  public getActiveSection(): Section | null {
    return this.activeSection;
  }

  /**
   * Cria preset de box clipping
   */
  public createBoxClipping(min: THREE.Vector3, max: THREE.Vector3): void {
    this.clearSections();
    
    // Se temos ClippingGeometry, usar método otimizado
    if (this.clippingGeometry) {
      this.clippingGeometry.addBoxClipping(min.x, max.x, min.y, max.y, min.z, max.z);
      console.log('Box clipping created with ClippingGeometry');
      return;
    }
    
    // Fallback: cria 6 planos para formar um box
    this.createSection(SectionType.X_AXIS, max.x);
    this.createSection(SectionType.X_AXIS, -min.x);
    this.createSection(SectionType.Y_AXIS, max.y);
    this.createSection(SectionType.Y_AXIS, -min.y);
    this.createSection(SectionType.Z_AXIS, max.z);
    this.createSection(SectionType.Z_AXIS, -min.z);
    
    console.log('Box clipping created');
  }
  
  /**
   * Controla visibilidade dos helpers (PlaneHelpers visuais)
   */
  public setHelpersVisible(visible: boolean): void {
    if (this.clippingGeometry) {
      this.clippingGeometry.setHelpersVisibility(visible);
    }
    
    // Também atualiza helpers locais (fallback)
    this.sections.forEach((section) => {
      if (section.helper) {
        section.helper.visible = visible && section.enabled && section.visible;
      }
    });
  }
  
  /**
   * Gera section lines reais (edges da interseção)
   */
  public generateSectionLines(showLines: boolean): void {
    if (!this.clippingGeometry) {
      console.warn('ClippingGeometry not available - cannot generate section lines');
      return;
    }
    
    // Collect all meshes from scene
    const meshes: THREE.Mesh[] = [];
    this.scene.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) {
        meshes.push(object as THREE.Mesh);
      }
    });
    
    if (meshes.length === 0) {
      console.warn('No meshes found in scene - cannot generate section lines');
      return;
    }
    
    console.log(`Generating section lines for ${meshes.length} meshes...`);
    
    // Generate section lines for all active planes
    const activePlanes = this.clippingGeometry.getPlanes().filter(p => p.enabled);
    activePlanes.forEach((plane, index) => {
      const lines = this.clippingGeometry.generateRealSectionLines(meshes, plane);
      if (lines) {
        console.log(`Section lines generated for plane ${index + 1}/${activePlanes.length}`);
      }
    });
  }

  /**
   * Cleanup
   */
  public dispose(): void {
    this.clearSections();
    console.log('SectionManager disposed');
  }
}
