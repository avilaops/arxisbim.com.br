import * as THREE from 'three';
import { SectionPlane } from './SectionPlane';

/**
 * ClippingGeometry - Gerencia planos de clipping para seções e cortes 3D
 *
 * Suporte a múltiplos planos de clipping simultâneos:
 * - Section planes (X, Y, Z) para visualização de seções
 * - Clipping planes para ocultar partes do modelo
 * - Visual feedback com linhas de seção
 * - GPU-accelerated clipping via THREE.WebGLRenderer
 * - Visual plane helpers
 * - Real section line generation from mesh intersections
 */
export class ClippingGeometry {
  private planes: SectionPlane[] = [];
  private sectionLines: THREE.Group = new THREE.Group();
  private clippingEnabled: boolean = true;
  private renderer: THREE.WebGLRenderer | null = null;
  private planeHelpers: Map<string, THREE.PlaneHelper> = new Map();
  private showHelpers: boolean = true;

  // Configurações visuais
  private sectionLineMaterial = new THREE.LineBasicMaterial({
    color: 0xff0000,
    linewidth: 2,
    transparent: true,
    opacity: 0.8
  });

  private sectionFillMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide
  });

  constructor(private scene: THREE.Scene, renderer?: THREE.WebGLRenderer) {
    this.sectionLines.name = 'ClippingSectionLines';
    this.scene.add(this.sectionLines);
    
    if (renderer) {
      this.setRenderer(renderer);
    }
  }
  
  /**
   * Set renderer for GPU clipping
   */
  setRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
    this.renderer.localClippingEnabled = true;
    console.log('✅ GPU clipping enabled on renderer');
  }

  /**
   * Adiciona um plano de seção
   */
  addSectionPlane(axis: 'x' | 'y' | 'z', position: number, showLines: boolean = true): SectionPlane {
    // Remove plano existente no mesmo eixo
    this.removeSectionPlane(axis);

    const plane = new SectionPlane(axis, position);
    this.planes.push(plane);

    if (showLines) {
      this.createSectionLines(plane);
    }
    
    // Add visual plane helper
    if (this.showHelpers) {
      this.createPlaneHelper(plane);
    }

    this.updateSceneClipping();
    console.log(`🎯 Added section plane: ${axis.toUpperCase()} = ${position}`);

    return plane;
  }

  /**
   * Remove um plano de seção
   */
  removeSectionPlane(axis: 'x' | 'y' | 'z'): boolean {
    const index = this.planes.findIndex(p => p.axis === axis);
    if (index === -1) return false;

    const plane = this.planes[index];
    this.planes.splice(index, 1);

    // Remove linhas visuais
    this.removeSectionLines(plane);
    
    // Remove helper
    this.removePlaneHelper(axis);

    this.updateSceneClipping();
    console.log(`🗑️ Removed section plane: ${axis.toUpperCase()}`);

    return true;
  }

  /**
   * Atualiza posição de um plano existente
   */
  updateSectionPlane(axis: 'x' | 'y' | 'z', position: number): boolean {
    const plane = this.planes.find(p => p.axis === axis);
    if (!plane) return false;

    plane.position = position;
    this.updateSectionLines(plane);
    this.updateSceneClipping();

    return true;
  }

  /**
   * Toggle clipping on/off
   */
  setClippingEnabled(enabled: boolean): void {
    this.clippingEnabled = enabled;
    this.updateSceneClipping();
    console.log(`✂️ Clipping ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Limpa todos os planos
   */
  clearAll(): void {
    this.planes.forEach(plane => this.removeSectionLines(plane));
    this.planes = [];
    this.updateSceneClipping();
    console.log('🧹 Cleared all clipping planes');
  }

  /**
   * Retorna todos os planos ativos
   */
  getPlanes(): SectionPlane[] {
    return [...this.planes];
  }

  /**
   * Verifica se um plano existe
   */
  hasPlane(axis: 'x' | 'y' | 'z'): boolean {
    return this.planes.some(p => p.axis === axis);
  }

  /**
   * Obtém posição de um plano
   */
  getPlanePosition(axis: 'x' | 'y' | 'z'): number | null {
    const plane = this.planes.find(p => p.axis === axis);
    return plane ? plane.position : null;
  }

  // ========== PRIVATE METHODS ==========

  private createSectionLines(plane: SectionPlane): void {
    // Cria geometria de linha infinita no plano
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];

    // Define pontos da linha baseado no eixo
    const size = 1000; // Tamanho arbitrário grande
    switch (plane.axis) {
      case 'x':
        positions.push(
          plane.position, -size, -size,
          plane.position, -size, size,
          plane.position, size, size,
          plane.position, size, -size
        );
        break;
      case 'y':
        positions.push(
          -size, plane.position, -size,
          -size, plane.position, size,
          size, plane.position, size,
          size, plane.position, -size
        );
        break;
      case 'z':
        positions.push(
          -size, -size, plane.position,
          -size, size, plane.position,
          size, size, plane.position,
          size, -size, plane.position
        );
        break;
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const line = new THREE.Line(geometry, this.sectionLineMaterial);
    line.name = `SectionLine_${plane.axis}`;
    line.userData = { plane };

    this.sectionLines.add(line);
  }

  private updateSectionLines(plane: SectionPlane): void {
    const line = this.sectionLines.children.find(
      child => child.name === `SectionLine_${plane.axis}`
    ) as THREE.Line;

    if (line) {
      this.removeSectionLines(plane);
      this.createSectionLines(plane);
    }
  }

  private removeSectionLines(plane: SectionPlane): void {
    const line = this.sectionLines.children.find(
      child => child.name === `SectionLine_${plane.axis}`
    );

    if (line) {
      this.sectionLines.remove(line);
      line.geometry.dispose();
    }
  }

  private updateSceneClipping(): void {
    // Converte SectionPlanes para THREE.Planes
    const threePlanes = this.clippingEnabled
      ? this.planes.map(p => p.toThreePlane())
      : [];

    // Aplica clipping a todos os materiais da cena
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];

        materials.forEach(material => {
          if (material instanceof THREE.Material) {
            material.clippingPlanes = threePlanes;
            material.clipShadows = true; // Enable shadow clipping
          }
        });
      }
    });

    // Update renderer clipping planes (GPU-accelerated)
    if (this.renderer) {
      this.renderer.clippingPlanes = threePlanes;
    }
  }
  
  /**
   * Create visual helper for section plane
   */
  private createPlaneHelper(plane: SectionPlane): void {
    const threePlane = plane.toThreePlane();
    const helper = new THREE.PlaneHelper(threePlane, 500, 0x00ff88);
    helper.name = `PlaneHelper_${plane.axis}`;
    
    const material = helper.material as THREE.MeshBasicMaterial;
    material.opacity = 0.3;
    material.transparent = true;
    material.side = THREE.DoubleSide;
    
    this.planeHelpers.set(plane.axis, helper);
    this.scene.add(helper);
  }
  
  /**
   * Remove plane helper
   */
  private removePlaneHelper(axis: string): void {
    const helper = this.planeHelpers.get(axis);
    if (helper) {
      this.scene.remove(helper);
      helper.geometry.dispose();
      (helper.material as THREE.Material).dispose();
      this.planeHelpers.delete(axis);
    }
  }
  
  /**
   * Toggle plane helpers visibility
   */
  setHelpersVisibility(visible: boolean): void {
    this.showHelpers = visible;
    this.planeHelpers.forEach(helper => {
      helper.visible = visible;
    });
    console.log(`${visible ? '👁️' : '🚫'} Plane helpers ${visible ? 'visible' : 'hidden'}`);
  }
  
  /**
   * Generate real section lines from mesh intersections
   * This creates accurate section lines based on actual geometry
   */
  generateRealSectionLines(
    meshes: THREE.Mesh[],
    plane: SectionPlane,
    color: number = 0xff0000,
    lineWidth: number = 2
  ): THREE.LineSegments {
    const points: THREE.Vector3[] = [];
    const threePlane = plane.toThreePlane();
    
    meshes.forEach(mesh => {
      if (!mesh.geometry) return;
      
      const geometry = mesh.geometry;
      const positions = geometry.attributes.position;
      if (!positions) return;
      
      const worldMatrix = mesh.matrixWorld;
      const indices = geometry.index;
      const hasIndex = indices !== null;
      const count = hasIndex ? indices.count : positions.count;
      
      // Process each triangle
      for (let i = 0; i < count; i += 3) {
        const i0 = hasIndex ? indices.getX(i) : i;
        const i1 = hasIndex ? indices.getX(i + 1) : i + 1;
        const i2 = hasIndex ? indices.getX(i + 2) : i + 2;
        
        const v0 = new THREE.Vector3().fromBufferAttribute(positions, i0).applyMatrix4(worldMatrix);
        const v1 = new THREE.Vector3().fromBufferAttribute(positions, i1).applyMatrix4(worldMatrix);
        const v2 = new THREE.Vector3().fromBufferAttribute(positions, i2).applyMatrix4(worldMatrix);
        
        // Find intersections
        const intersections = this.getTrianglePlaneIntersections(v0, v1, v2, threePlane);
        
        if (intersections.length === 2) {
          points.push(intersections[0], intersections[1]);
        }
      }
    });
    
    // Create line segments
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lineMaterial = new THREE.LineBasicMaterial({
      color,
      linewidth: lineWidth,
      transparent: true,
      opacity: 0.9
    });
    
    const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
    lineSegments.name = `RealSectionLines_${plane.axis}`;
    this.scene.add(lineSegments);
    
    console.log(`📏 Generated ${points.length / 2} real section line segments`);
    
    return lineSegments;
  }
  
  /**
   * Find intersections between triangle and plane
   */
  private getTrianglePlaneIntersections(
    v0: THREE.Vector3,
    v1: THREE.Vector3,
    v2: THREE.Vector3,
    plane: THREE.Plane
  ): THREE.Vector3[] {
    const intersections: THREE.Vector3[] = [];
    
    const d0 = plane.distanceToPoint(v0);
    const d1 = plane.distanceToPoint(v1);
    const d2 = plane.distanceToPoint(v2);
    
    const epsilon = 0.0001;
    
    // Check edge v0-v1
    if (Math.abs(d0 * d1) > epsilon && d0 * d1 < 0) {
      const t = d0 / (d0 - d1);
      intersections.push(new THREE.Vector3().lerpVectors(v0, v1, t));
    }
    
    // Check edge v1-v2
    if (Math.abs(d1 * d2) > epsilon && d1 * d2 < 0) {
      const t = d1 / (d1 - d2);
      intersections.push(new THREE.Vector3().lerpVectors(v1, v2, t));
    }
    
    // Check edge v2-v0
    if (Math.abs(d2 * d0) > epsilon && d2 * d0 < 0) {
      const t = d2 / (d2 - d0);
      intersections.push(new THREE.Vector3().lerpVectors(v2, v0, t));
    }
    
    return intersections;
  }
  
  /**
   * Add box clipping (6 planes at once for cuboid volume)
   */
  addBoxClipping(
    minX: number, maxX: number,
    minY: number, maxY: number,
    minZ: number, maxZ: number
  ): void {
    // Clear existing planes
    this.clearAll();
    
    // Add 6 planes for box
    const boxPlanes = [
      new SectionPlane('x', minX),  // Left
      new SectionPlane('x', maxX),  // Right (inverted normal)
      new SectionPlane('y', minY),  // Bottom
      new SectionPlane('y', maxY),  // Top (inverted normal)
      new SectionPlane('z', minZ),  // Back
      new SectionPlane('z', maxZ),  // Front (inverted normal)
    ];
    
    // Invert normals for max planes
    boxPlanes[1].invertNormal();
    boxPlanes[3].invertNormal();
    boxPlanes[5].invertNormal();
    
    this.planes = boxPlanes;
    
    // Add helpers if enabled
    if (this.showHelpers) {
      boxPlanes.forEach(plane => this.createPlaneHelper(plane));
    }
    
    this.updateSceneClipping();
    console.log('📦 Added box clipping');
  }
  
  /**
   * Remove box clipping
   */
  removeBoxClipping(): void {
    this.clearAll();
  }
  
  /**
   * Get clipping statistics
   */
  getStats(): {
    planesCount: number;
    enabled: boolean;
    helpersVisible: boolean;
  } {
    return {
      planesCount: this.planes.length,
      enabled: this.clippingEnabled,
      helpersVisible: this.showHelpers
    };
  }

  /**
   * Cleanup - deve ser chamado antes de destruir
   */
  dispose(): void {
    this.clearAll();
    this.sectionLines.children.forEach(child => {
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        if (child.material) {
          (child.material as THREE.Material).dispose();
        }
      }
    });
    this.scene.remove(this.sectionLines);
    
    // Remove all plane helpers
    this.planeHelpers.forEach(helper => {
      this.scene.remove(helper);
      helper.geometry.dispose();
      (helper.material as THREE.Material).dispose();
    });
    this.planeHelpers.clear();
    
    // Disable renderer clipping
    if (this.renderer) {
      this.renderer.localClippingEnabled = false;
      this.renderer.clippingPlanes = [];
    }
    
    console.log('🧹 ClippingGeometry disposed');
  }
}