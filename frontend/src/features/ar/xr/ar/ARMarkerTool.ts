/**
 * ARMarkerTool - Ferramenta de registro de markers AR no BIM
 * 
 * Permite administradores:
 * - Clicar em pontos/faces do modelo BIM
 * - Registrar posição e orientação do marker
 * - Configurar propriedades do marker
 * - Pré-visualizar markers no modelo
 * 
 * Uso:
 * ```ts
 * const markerTool = new ARMarkerTool(scene, camera, registry);
 * markerTool.activate();
 * 
 * markerTool.on('markerPlaced', (marker) => {
 *   console.log('Marker registrado:', marker);
 * });
 * ```
 */

import * as THREE from 'three';
import {
  ARMarker,
  MarkerType,
  ArucoDictionary,
  FloorLevel,
  MarkerVisualizationConfig
} from './ARMarkerTypes';
import { MarkerRegistry } from './MarkerRegistry';

export interface MarkerToolConfig {
  defaultMarkerSize?: number;
  defaultMarkerType?: MarkerType;
  defaultDictionary?: ArucoDictionary;
  snapToSurface?: boolean;
  showPreview?: boolean;
  visualizationConfig?: Partial<MarkerVisualizationConfig>;
}

export interface MarkerPlacementData {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  rotation: THREE.Euler;
  quaternion: THREE.Quaternion;
  matrix: THREE.Matrix4;
  intersectedObject?: THREE.Object3D;
}

export class ARMarkerTool extends EventTarget {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private registry: MarkerRegistry;
  private config: Required<MarkerToolConfig>;
  
  // Tool state
  private isActive: boolean = false;
  private isPlacing: boolean = false;
  
  // Raycasting
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  
  // Preview
  private previewMarker?: THREE.Group;
  private previewHelper?: THREE.AxesHelper;
  
  // Visualization
  private visualizationConfig: MarkerVisualizationConfig;
  private markerVisualizations: Map<string, THREE.Group>;
  
  // Pending marker data
  private pendingPlacement?: MarkerPlacementData;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    registry: MarkerRegistry,
    config?: MarkerToolConfig
  ) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.registry = registry;
    
    this.config = {
      defaultMarkerSize: 0.21,  // A4 portrait width (21cm)
      defaultMarkerType: MarkerType.ARUCO,
      defaultDictionary: ArucoDictionary.DICT_6X6_250,
      snapToSurface: true,
      showPreview: true,
      visualizationConfig: {},
      ...config
    };

    this.visualizationConfig = {
      showMarkers: true,
      showAxes: true,
      showLabels: true,
      showBoundingBoxes: false,
      markerScale: 1.0,
      axisLength: 0.15,
      labelFontSize: 12,
      opacity: 0.7,
      ...this.config.visualizationConfig
    };

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.markerVisualizations = new Map();

    // Bind event handlers
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);

    // Escuta mudanças no registry
    this.registry.addEventListener('markerRegistered', (e: Event) => {
      const marker = (e as CustomEvent).detail;
      this.addMarkerVisualization(marker);
    });

    this.registry.addEventListener('markerDeleted', (e: Event) => {
      const { id } = (e as CustomEvent).detail;
      this.removeMarkerVisualization(id);
    });
  }

  // ============================================
  // ACTIVATION
  // ============================================

  /**
   * Ativa ferramenta
   */
  activate(): void {
    if (this.isActive) return;

    this.isActive = true;
    
    // Adiciona event listeners
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('keydown', this.onKeyDown);

    // Cria preview marker
    if (this.config.showPreview) {
      this.createPreviewMarker();
    }

    // Visualiza markers existentes
    this.visualizeAllMarkers();

    this.dispatchEvent(new Event('activated'));
    console.log('ARMarkerTool activated');
  }

  /**
   * Desativa ferramenta
   */
  deactivate(): void {
    if (!this.isActive) return;

    this.isActive = false;

    // Remove event listeners
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('keydown', this.onKeyDown);

    // Remove preview
    if (this.previewMarker) {
      this.scene.remove(this.previewMarker);
      this.previewMarker = undefined;
    }

    // Limpa visualizações
    this.clearAllVisualizations();

    this.dispatchEvent(new Event('deactivated'));
    console.log('ARMarkerTool deactivated');
  }

  /**
   * Verifica se está ativa
   */
  isToolActive(): boolean {
    return this.isActive;
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  /**
   * Handler de movimento do mouse
   */
  private onPointerMove(event: PointerEvent): void {
    if (!this.isActive) return;

    // Atualiza posição do pointer
    this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Atualiza preview
    if (this.config.showPreview && !this.isPlacing) {
      this.updatePreview();
    }
  }

  /**
   * Handler de clique
   */
  private onPointerDown(event: PointerEvent): void {
    if (!this.isActive || this.isPlacing) return;
    if (event.button !== 0) return;  // Apenas botão esquerdo

    // Raycast
    const placement = this.raycastScene();
    if (!placement) return;

    // Guarda dados do placement
    this.pendingPlacement = placement;

    // Dispara evento para UI mostrar modal de configuração
    this.dispatchEvent(new CustomEvent('markerPlacementReady', {
      detail: placement
    }));
  }

  /**
   * Handler de teclado
   */
  private onKeyDown(event: KeyboardEvent): void {
    if (!this.isActive) return;

    if (event.key === 'Escape') {
      this.cancelPlacement();
    }
  }

  // ============================================
  // MARKER PLACEMENT
  // ============================================

  /**
   * Faz raycast na cena
   */
  private raycastScene(): MarkerPlacementData | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);

    // Raycast em todos objetos (exceto visualizações de markers)
    const objects = this.scene.children.filter(obj => 
      !obj.name.startsWith('AR_MARKER_') &&
      obj.name !== 'AR_PREVIEW' &&
      obj.visible
    );

    const intersects = this.raycaster.intersectObjects(objects, true);

    if (intersects.length === 0) return null;

    const intersect = intersects[0];
    const position = intersect.point.clone();
    const normal = intersect.face?.normal.clone() || new THREE.Vector3(0, 1, 0);

    // Transforma normal para coordenadas do mundo
    if (intersect.object) {
      normal.transformDirection(intersect.object.matrixWorld);
    }

    // Calcula rotação a partir da normal
    const rotation = this.calculateRotationFromNormal(normal);
    const quaternion = new THREE.Quaternion().setFromEuler(rotation);
    
    const matrix = new THREE.Matrix4();
    matrix.compose(position, quaternion, new THREE.Vector3(1, 1, 1));

    return {
      position,
      normal,
      rotation,
      quaternion,
      matrix,
      intersectedObject: intersect.object
    };
  }

  /**
   * Calcula rotação a partir da normal da superfície
   */
  private calculateRotationFromNormal(normal: THREE.Vector3): THREE.Euler {
    // Marker aponta para fora da superfície (Z+ na direção da normal)
    const up = new THREE.Vector3(0, 1, 0);
    
    // Se normal está muito alinhada com up, usa forward como referência
    if (Math.abs(normal.dot(up)) > 0.99) {
      up.set(0, 0, 1);
    }

    const right = new THREE.Vector3().crossVectors(up, normal).normalize();
    const adjustedUp = new THREE.Vector3().crossVectors(normal, right).normalize();

    // Monta matriz de rotação
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.makeBasis(right, adjustedUp, normal);

    const rotation = new THREE.Euler();
    rotation.setFromRotationMatrix(rotationMatrix);

    return rotation;
  }

  /**
   * Atualiza preview do marker
   */
  private updatePreview(): void {
    if (!this.previewMarker) return;

    const placement = this.raycastScene();
    
    if (placement) {
      this.previewMarker.visible = true;
      this.previewMarker.position.copy(placement.position);
      this.previewMarker.quaternion.copy(placement.quaternion);
    } else {
      this.previewMarker.visible = false;
    }
  }

  /**
   * Confirma placement e registra marker
   */
  async confirmPlacement(markerData: {
    name: string;
    type: MarkerType;
    markerId?: number;
    dictionary?: ArucoDictionary;
    physicalSize: number;
    floorLevel: FloorLevel;
    role: 'master' | 'auxiliary' | 'temporary';
    description?: string;
  }): Promise<ARMarker> {
    if (!this.pendingPlacement) {
      throw new Error('No pending placement');
    }

    this.isPlacing = true;

    try {
      // Cria marker
      const marker = await this.registry.registerMarker({
        name: markerData.name,
        type: markerData.type,
        markerId: markerData.markerId,
        dictionary: markerData.dictionary,
        physicalSize: markerData.physicalSize,
        positionInBIM: this.pendingPlacement.position,
        rotationInBIM: this.pendingPlacement.rotation,
        quaternionInBIM: this.pendingPlacement.quaternion,
        matrixInBIM: this.pendingPlacement.matrix,
        floorLevel: markerData.floorLevel,
        role: markerData.role,
        description: markerData.description,
        active: true
      });

      // Adiciona visualização
      this.addMarkerVisualization(marker);

      // Limpa pending
      this.pendingPlacement = undefined;

      this.dispatchEvent(new CustomEvent('markerPlaced', { detail: marker }));
      
      return marker;
    } finally {
      this.isPlacing = false;
    }
  }

  /**
   * Cancela placement
   */
  cancelPlacement(): void {
    this.pendingPlacement = undefined;
    this.isPlacing = false;
    this.dispatchEvent(new Event('placementCancelled'));
  }

  // ============================================
  // PREVIEW MARKER
  // ============================================

  /**
   * Cria marker de preview
   */
  private createPreviewMarker(): void {
    if (this.previewMarker) {
      this.scene.remove(this.previewMarker);
    }

    this.previewMarker = new THREE.Group();
    this.previewMarker.name = 'AR_PREVIEW';

    // Plano do marker
    const size = this.config.defaultMarkerSize;
    const planeGeom = new THREE.PlaneGeometry(size, size);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(planeGeom, planeMat);
    this.previewMarker.add(plane);

    // Borda
    const edgesGeom = new THREE.EdgesGeometry(planeGeom);
    const edgesMat = new THREE.LineBasicMaterial({ 
      color: 0xffff00,
      linewidth: 2
    });
    const edges = new THREE.LineSegments(edgesGeom, edgesMat);
    this.previewMarker.add(edges);

    // Eixos
    this.previewHelper = new THREE.AxesHelper(size * 0.5);
    this.previewMarker.add(this.previewHelper);

    // Inicialmente invisível
    this.previewMarker.visible = false;

    this.scene.add(this.previewMarker);
  }

  // ============================================
  // MARKER VISUALIZATION
  // ============================================

  /**
   * Visualiza todos os markers do registry
   */
  private visualizeAllMarkers(): void {
    const markers = this.registry.getAllMarkers();
    markers.forEach(marker => {
      this.addMarkerVisualization(marker);
    });
  }

  /**
   * Adiciona visualização de um marker
   */
  private addMarkerVisualization(marker: ARMarker): void {
    if (this.markerVisualizations.has(marker.id)) return;

    const group = new THREE.Group();
    group.name = `AR_MARKER_${marker.id}`;
    group.position.copy(marker.positionInBIM);
    group.quaternion.copy(marker.quaternionInBIM);

    // Plano do marker
    if (this.visualizationConfig.showMarkers) {
      const size = marker.physicalSize * this.visualizationConfig.markerScale;
      const planeGeom = new THREE.PlaneGeometry(size, size);
      
      // Cor baseada no role
      let color = 0x00ff00;  // Verde para markers normais
      if (marker.role === 'master') color = 0xff0000;  // Vermelho para master
      if (marker.role === 'temporary') color = 0xffa500;  // Laranja para temporário
      
      const planeMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: this.visualizationConfig.opacity,
        side: THREE.DoubleSide
      });
      const plane = new THREE.Mesh(planeGeom, planeMat);
      group.add(plane);

      // Borda
      if (this.visualizationConfig.showBoundingBoxes) {
        const edgesGeom = new THREE.EdgesGeometry(planeGeom);
        const edgesMat = new THREE.LineBasicMaterial({ color });
        const edges = new THREE.LineSegments(edgesGeom, edgesMat);
        group.add(edges);
      }
    }

    // Eixos
    if (this.visualizationConfig.showAxes) {
      const axisLength = this.visualizationConfig.axisLength;
      const axes = new THREE.AxesHelper(axisLength);
      group.add(axes);
    }

    // Label
    if (this.visualizationConfig.showLabels) {
      const label = this.createMarkerLabel(marker);
      if (label) group.add(label);
    }

    this.markerVisualizations.set(marker.id, group);
    this.scene.add(group);
  }

  /**
   * Remove visualização de um marker
   */
  private removeMarkerVisualization(markerId: string): void {
    const viz = this.markerVisualizations.get(markerId);
    if (viz) {
      this.scene.remove(viz);
      this.markerVisualizations.delete(markerId);
    }
  }

  /**
   * Limpa todas as visualizações
   */
  private clearAllVisualizations(): void {
    this.markerVisualizations.forEach((viz) => {
      this.scene.remove(viz);
    });
    this.markerVisualizations.clear();
  }

  /**
   * Cria label de texto para marker
   */
  private createMarkerLabel(marker: ARMarker): THREE.Object3D | null {
    // TODO: Implementar usando Troika Text ou CSS2DRenderer
    // Por ora retorna null
    return null;
  }

  /**
   * Atualiza configuração de visualização
   */
  updateVisualizationConfig(config: Partial<MarkerVisualizationConfig>): void {
    this.visualizationConfig = {
      ...this.visualizationConfig,
      ...config
    };

    // Re-renderiza visualizações
    this.clearAllVisualizations();
    this.visualizeAllMarkers();
  }

  /**
   * Mostra/esconde visualizações
   */
  setVisualizationsVisible(visible: boolean): void {
    this.markerVisualizations.forEach(viz => {
      viz.visible = visible;
    });
  }

  // ============================================
  // MARKER MANAGEMENT
  // ============================================

  /**
   * Seleciona marker por ID
   */
  selectMarker(markerId: string): void {
    const viz = this.markerVisualizations.get(markerId);
    if (!viz) return;

    // Destaca marker
    viz.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments) {
        const mat = obj.material as THREE.Material;
        mat.opacity = 1.0;
      }
    });

    this.dispatchEvent(new CustomEvent('markerSelected', { 
      detail: { markerId } 
    }));
  }

  /**
   * Remove marker
   */
  async deleteMarker(markerId: string): Promise<void> {
    await this.registry.deleteMarker(markerId);
    this.removeMarkerVisualization(markerId);
  }

  /**
   * Retorna marker sob o cursor
   */
  getMarkerUnderCursor(): ARMarker | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const markerObjects = Array.from(this.markerVisualizations.values());
    const intersects = this.raycaster.intersectObjects(markerObjects, true);

    if (intersects.length === 0) return null;

    // Busca marker correspondente
    const intersectedGroup = intersects[0].object.parent;
    if (!intersectedGroup) return null;

    const markerId = intersectedGroup.name.replace('AR_MARKER_', '');
    return this.registry.getMarker(markerId) || null;
  }

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Exporta markers para impressão
   */
  exportMarkersForPrint(markerIds?: string[]): void {
    const markers = markerIds
      ? markerIds.map(id => this.registry.getMarker(id)).filter(Boolean) as ARMarker[]
      : this.registry.getAllMarkers();

    // TODO: Gerar PDFs com markers ArUco/AprilTag para impressão
    console.log('Export markers:', markers);
    
    this.dispatchEvent(new CustomEvent('markersExported', {
      detail: { markers }
    }));
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.deactivate();
    this.clearAllVisualizations();
    
    if (this.previewMarker) {
      this.scene.remove(this.previewMarker);
      this.previewMarker = undefined;
    }

    this.dispatchEvent(new Event('disposed'));
  }
}
