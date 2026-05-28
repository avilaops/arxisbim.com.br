/**
 * ARAlignmentManager - Gerencia alinhamento mundo-BIM
 * 
 * Responsável por:
 * - Consumir âncoras do servidor
 * - Aplicar T_world_bim na cena Three.js
 * - Sincronizar entre múltiplos clientes
 * - Compensações manuais
 * 
 * Uso típico (em cliente desktop/web):
 * ```ts
 * const alignmentManager = new ARAlignmentManager(scene, registry);
 * 
 * // Busca e aplica âncora ativa
 * await alignmentManager.applyActiveAnchor(projectId);
 * 
 * // Ou aplica âncora específica
 * await alignmentManager.applyAnchor(anchorId);
 * 
 * // Ajuste manual
 * alignmentManager.addOffset({ x: 0.1, y: 0, z: 0 });
 * ```
 */

import * as THREE from 'three';
import { ARAnchor } from './ARMarkerTypes';
import { MarkerRegistry } from './MarkerRegistry';

export interface AlignmentState {
  isAligned: boolean;
  anchorId?: string;
  appliedAt?: number;
  transformApplied: THREE.Matrix4;
  hasUserOffset: boolean;
  userOffset?: {
    position: THREE.Vector3;
    rotation: THREE.Euler;
  };
}

export interface AlignmentOptions {
  autoUpdate?: boolean;
  updateInterval?: number;  // ms
  applyToScene?: boolean;
  visualize?: boolean;
}

export class ARAlignmentManager extends EventTarget {
  private scene: THREE.Scene;
  private registry: MarkerRegistry;
  private options: Required<AlignmentOptions>;
  
  // State
  private currentState: AlignmentState;
  private updateTimer?: number;
  
  // Visualization
  private visualizationGroup?: THREE.Group;
  private axesHelper?: THREE.AxesHelper;
  private markerMeshes: Map<string, THREE.Mesh>;

  constructor(
    scene: THREE.Scene,
    registry: MarkerRegistry,
    options?: AlignmentOptions
  ) {
    super();
    this.scene = scene;
    this.registry = registry;
    this.options = {
      autoUpdate: true,
      updateInterval: 5000,  // 5s
      applyToScene: true,
      visualize: false,
      ...options
    };

    this.currentState = {
      isAligned: false,
      transformApplied: new THREE.Matrix4(),
      hasUserOffset: false
    };

    this.markerMeshes = new Map();

    if (this.options.autoUpdate) {
      this.startAutoUpdate();
    }
  }

  // ============================================
  // ALIGNMENT APPLICATION
  // ============================================

  /**
   * Aplica âncora ativa do projeto
   */
  async applyActiveAnchor(projectId?: string, sessionId?: string): Promise<void> {
    const anchor = this.registry.getActiveAnchor(projectId, sessionId);
    
    if (!anchor) {
      throw new Error('No active anchor found');
    }

    await this.applyAnchor(anchor.id);
  }

  /**
   * Aplica âncora específica
   */
  async applyAnchor(anchorId: string): Promise<void> {
    // Busca âncora no registry via método público
    const anchorsByMarker = Array.from(this.registry.getAllMarkers()).flatMap(m => 
      this.registry.getAnchorsByMarker(m.id)
    );
    
    const anchor = anchorsByMarker.find(a => a.id === anchorId);

    if (!anchor) {
      throw new Error(`Anchor ${anchorId} not found`);
    }

    // Aplica transformação
    this.applyTransformation(anchor);

    // Atualiza estado
    this.currentState = {
      isAligned: true,
      anchorId: anchor.id,
      appliedAt: Date.now(),
      transformApplied: anchor.T_world_bim.clone(),
      hasUserOffset: false
    };

    // Visualiza markers se configurado
    if (this.options.visualize) {
      this.visualizeAlignment(anchor);
    }

    this.dispatchEvent(new CustomEvent('aligned', { detail: anchor }));
    console.log('Alignment applied:', anchorId);
  }

  /**
   * Aplica transformação T_world_bim na cena
   */
  private applyTransformation(anchor: ARAnchor): void {
    if (!this.options.applyToScene) {
      console.log('Scene transformation disabled, only updating state');
      return;
    }

    // T_world_bim transforma BIM para mundo
    // Aplicamos na cena para que coordenadas BIM sejam exibidas em posições do mundo
    const transform = anchor.T_world_bim.clone();

    // Se há offset de usuário, aplica também
    if (anchor.userOffset) {
      const offsetMatrix = new THREE.Matrix4();
      offsetMatrix.makeRotationFromEuler(anchor.userOffset.rotation);
      offsetMatrix.setPosition(anchor.userOffset.position);
      
      transform.premultiply(offsetMatrix);
    }

    // Aplica na raiz da cena BIM
    // Assumindo que modelos BIM estão em um grupo específico
    const bimRoot = this.scene.getObjectByName('BIM_ROOT') || this.scene;
    bimRoot.applyMatrix4(transform);
    bimRoot.updateMatrixWorld(true);

    console.log('Transformation applied to scene');
  }

  /**
   * Remove alinhamento (volta para coordenadas BIM originais)
   */
  async removeAlignment(): Promise<void> {
    if (!this.currentState.isAligned) {
      console.log('No alignment to remove');
      return;
    }

    // Aplica transformação inversa
    const inverseTransform = this.currentState.transformApplied.clone().invert();
    
    const bimRoot = this.scene.getObjectByName('BIM_ROOT') || this.scene;
    bimRoot.applyMatrix4(inverseTransform);
    bimRoot.updateMatrixWorld(true);

    // Limpa visualização
    if (this.visualizationGroup) {
      this.scene.remove(this.visualizationGroup);
      this.visualizationGroup = undefined;
    }

    // Reseta estado
    this.currentState = {
      isAligned: false,
      transformApplied: new THREE.Matrix4(),
      hasUserOffset: false
    };

    this.dispatchEvent(new Event('alignmentRemoved'));
    console.log('Alignment removed');
  }

  // ============================================
  // MANUAL ADJUSTMENTS
  // ============================================

  /**
   * Adiciona offset manual de posição
   */
  addOffset(offset: { x?: number; y?: number; z?: number }): void {
    if (!this.currentState.isAligned) {
      console.warn('No alignment active, cannot add offset');
      return;
    }

    const offsetVector = new THREE.Vector3(
      offset.x || 0,
      offset.y || 0,
      offset.z || 0
    );

    // Aplica offset na cena
    const bimRoot = this.scene.getObjectByName('BIM_ROOT') || this.scene;
    bimRoot.position.add(offsetVector);
    bimRoot.updateMatrixWorld(true);

    // Atualiza estado
    if (!this.currentState.userOffset) {
      this.currentState.userOffset = {
        position: new THREE.Vector3(),
        rotation: new THREE.Euler()
      };
    }
    this.currentState.userOffset.position.add(offsetVector);
    this.currentState.hasUserOffset = true;

    this.dispatchEvent(new CustomEvent('offsetChanged', { 
      detail: this.currentState.userOffset 
    }));

    console.log('Offset applied:', offsetVector);
  }

  /**
   * Adiciona offset manual de rotação
   */
  addRotationOffset(rotation: { x?: number; y?: number; z?: number }): void {
    if (!this.currentState.isAligned) {
      console.warn('No alignment active, cannot add rotation offset');
      return;
    }

    const rotationEuler = new THREE.Euler(
      THREE.MathUtils.degToRad(rotation.x || 0),
      THREE.MathUtils.degToRad(rotation.y || 0),
      THREE.MathUtils.degToRad(rotation.z || 0),
      'XYZ'
    );

    // Aplica rotação na cena
    const bimRoot = this.scene.getObjectByName('BIM_ROOT') || this.scene;
    bimRoot.rotation.x += rotationEuler.x;
    bimRoot.rotation.y += rotationEuler.y;
    bimRoot.rotation.z += rotationEuler.z;
    bimRoot.updateMatrixWorld(true);

    // Atualiza estado
    if (!this.currentState.userOffset) {
      this.currentState.userOffset = {
        position: new THREE.Vector3(),
        rotation: new THREE.Euler()
      };
    }
    this.currentState.userOffset.rotation.x += rotationEuler.x;
    this.currentState.userOffset.rotation.y += rotationEuler.y;
    this.currentState.userOffset.rotation.z += rotationEuler.z;
    this.currentState.hasUserOffset = true;

    this.dispatchEvent(new CustomEvent('offsetChanged', { 
      detail: this.currentState.userOffset 
    }));

    console.log('Rotation offset applied:', rotationEuler);
  }

  /**
   * Define offset absoluto
   */
  setOffset(offset: { 
    position?: { x: number; y: number; z: number },
    rotation?: { x: number; y: number; z: number }
  }): void {
    if (!this.currentState.isAligned) {
      console.warn('No alignment active, cannot set offset');
      return;
    }

    // Remove offset anterior
    if (this.currentState.userOffset) {
      const bimRoot = this.scene.getObjectByName('BIM_ROOT') || this.scene;
      
      // Reverte offset anterior
      bimRoot.position.sub(this.currentState.userOffset.position);
      bimRoot.rotation.x -= this.currentState.userOffset.rotation.x;
      bimRoot.rotation.y -= this.currentState.userOffset.rotation.y;
      bimRoot.rotation.z -= this.currentState.userOffset.rotation.z;
    }

    // Aplica novo offset
    if (offset.position) {
      this.addOffset(offset.position);
    }
    if (offset.rotation) {
      this.addRotationOffset(offset.rotation);
    }
  }

  /**
   * Remove offset do usuário
   */
  clearOffset(): void {
    if (!this.currentState.hasUserOffset || !this.currentState.userOffset) {
      console.log('No user offset to clear');
      return;
    }

    const bimRoot = this.scene.getObjectByName('BIM_ROOT') || this.scene;

    // Reverte offset
    bimRoot.position.sub(this.currentState.userOffset.position);
    bimRoot.rotation.x -= this.currentState.userOffset.rotation.x;
    bimRoot.rotation.y -= this.currentState.userOffset.rotation.y;
    bimRoot.rotation.z -= this.currentState.userOffset.rotation.z;
    bimRoot.updateMatrixWorld(true);

    this.currentState.userOffset = undefined;
    this.currentState.hasUserOffset = false;

    this.dispatchEvent(new Event('offsetCleared'));
    console.log('User offset cleared');
  }

  // ============================================
  // VISUALIZATION
  // ============================================

  /**
   * Visualiza alinhamento com helpers visuais
   */
  private visualizeAlignment(anchor: ARAnchor): void {
    // Remove visualização anterior
    if (this.visualizationGroup) {
      this.scene.remove(this.visualizationGroup);
    }

    this.visualizationGroup = new THREE.Group();
    this.visualizationGroup.name = 'AR_VISUALIZATION';

    // Adiciona eixos na origem do mundo BIM
    this.axesHelper = new THREE.AxesHelper(2);
    this.visualizationGroup.add(this.axesHelper);

    // Busca marker usado
    const marker = this.registry.getMarker(anchor.markerId);
    if (marker) {
      const markerViz = this.createMarkerVisualization(marker);
      this.visualizationGroup.add(markerViz);
    }

    // Texto com info
    const infoText = this.createInfoLabel(anchor);
    if (infoText) {
      this.visualizationGroup.add(infoText);
    }

    this.scene.add(this.visualizationGroup);
  }

  /**
   * Cria visualização de marker
   */
  private createMarkerVisualization(marker: any): THREE.Object3D {
    const group = new THREE.Group();
    group.position.copy(marker.positionInBIM);
    group.rotation.copy(marker.rotationInBIM);

    // Plano do marker
    const planeGeom = new THREE.PlaneGeometry(
      marker.physicalSize,
      marker.physicalSize
    );
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(planeGeom, planeMat);
    group.add(plane);

    // Borda
    const edgesGeom = new THREE.EdgesGeometry(planeGeom);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const edges = new THREE.LineSegments(edgesGeom, edgesMat);
    group.add(edges);

    // Eixos locais
    const axes = new THREE.AxesHelper(marker.physicalSize * 0.5);
    group.add(axes);

    this.markerMeshes.set(marker.id, plane);

    return group;
  }

  /**
   * Cria label com informação
   */
  private createInfoLabel(anchor: ARAnchor): THREE.Object3D | null {
    // TODO: Implementar usando Troika Text ou CSS2DRenderer
    // Por ora retorna null
    return null;
  }

  /**
   * Mostra/esconde visualização
   */
  setVisualizationVisible(visible: boolean): void {
    if (this.visualizationGroup) {
      this.visualizationGroup.visible = visible;
    }
  }

  /**
   * Atualiza visualização de markers
   */
  private updateMarkersVisualization(): void {
    if (!this.options.visualize || !this.visualizationGroup) return;

    // Atualiza markers registrados
    const markers = this.registry.getAllMarkers();
    
    markers.forEach(marker => {
      if (!this.markerMeshes.has(marker.id)) {
        const viz = this.createMarkerVisualization(marker);
        this.visualizationGroup!.add(viz);
      }
    });

    // Remove markers deletados
    this.markerMeshes.forEach((mesh, id) => {
      if (!markers.find(m => m.id === id)) {
        const parent = mesh.parent;
        if (parent) {
          this.visualizationGroup!.remove(parent);
        }
        this.markerMeshes.delete(id);
      }
    });
  }

  // ============================================
  // AUTO UPDATE
  // ============================================

  /**
   * Inicia atualização automática de âncora
   */
  private startAutoUpdate(): void {
    if (this.updateTimer) return;

    this.updateTimer = window.setInterval(async () => {
      if (this.currentState.isAligned && this.currentState.anchorId) {
        try {
          // Sincroniza registry
          await this.registry.sync();
          
          // Reaplica âncora (pode ter sido atualizada)
          await this.applyAnchor(this.currentState.anchorId);
        } catch (error) {
          console.error('Auto-update failed:', error);
        }
      }
    }, this.options.updateInterval);
  }

  /**
   * Para atualização automática
   */
  stopAutoUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }
  }

  // ============================================
  // STATE & INFO
  // ============================================

  /**
   * Retorna estado atual
   */
  getState(): AlignmentState {
    return { ...this.currentState };
  }

  /**
   * Verifica se está alinhado
   */
  isAligned(): boolean {
    return this.currentState.isAligned;
  }

  /**
   * Retorna âncora atual
   */
  getCurrentAnchor(): ARAnchor | undefined {
    if (!this.currentState.anchorId) return undefined;
    
    const anchorsByMarker = Array.from(this.registry.getAllMarkers()).flatMap(m => 
      this.registry.getAnchorsByMarker(m.id)
    );
    
    return anchorsByMarker.find(a => a.id === this.currentState.anchorId);
  }

  /**
   * Retorna transformação aplicada
   */
  getAppliedTransform(): THREE.Matrix4 {
    return this.currentState.transformApplied.clone();
  }

  /**
   * Converte posição BIM para mundo
   */
  bimToWorld(position: THREE.Vector3): THREE.Vector3 {
    if (!this.currentState.isAligned) {
      return position.clone();
    }

    const worldPos = position.clone();
    worldPos.applyMatrix4(this.currentState.transformApplied);

    if (this.currentState.userOffset) {
      worldPos.add(this.currentState.userOffset.position);
    }

    return worldPos;
  }

  /**
   * Converte posição mundo para BIM
   */
  worldToBim(position: THREE.Vector3): THREE.Vector3 {
    if (!this.currentState.isAligned) {
      return position.clone();
    }

    const bimPos = position.clone();

    if (this.currentState.userOffset) {
      bimPos.sub(this.currentState.userOffset.position);
    }

    const inverseTransform = this.currentState.transformApplied.clone().invert();
    bimPos.applyMatrix4(inverseTransform);

    return bimPos;
  }

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Salva offset do usuário persistentemente
   */
  async saveUserOffset(): Promise<void> {
    if (!this.currentState.isAligned || !this.currentState.hasUserOffset) {
      throw new Error('No user offset to save');
    }

    const anchor = this.getCurrentAnchor();
    if (!anchor) {
      throw new Error('Current anchor not found');
    }

    // Atualiza âncora com offset
    const updatedAnchor: ARAnchor = {
      ...anchor,
      userOffset: this.currentState.userOffset,
      lastUpdatedAt: Date.now()
    };

    await this.registry.saveAnchor(updatedAnchor);

    this.dispatchEvent(new Event('offsetSaved'));
    console.log('User offset saved to anchor');
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.stopAutoUpdate();

    if (this.visualizationGroup) {
      this.scene.remove(this.visualizationGroup);
      this.visualizationGroup = undefined;
    }

    this.markerMeshes.clear();
    
    this.dispatchEvent(new Event('disposed'));
  }
}
