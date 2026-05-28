/**
 * ARZeroMarkerSystem - Sistema de Marco Zero para AR
 * 
 * Funcionalidades:
 * - Gerencia múltiplos marcos zeros em um projeto
 * - Alinhamento automático do modelo IFC a partir do marco
 * - Calibração e ajuste fino
 * - Persistência de marcos no servidor
 * - Validação de posicionamento
 * 
 * Conceito:
 * Marco Zero = ponto físico real onde o QR code está posicionado.
 * Ao escanear o QR, o modelo IFC é posicionado de forma que aquele
 * ponto no modelo coincida com o ponto físico (câmera do device).
 * 
 * Uso:
 * ```ts
 * const zeroSystem = new ARZeroMarkerSystem(scene, registry);
 * 
 * // Criar novo marco zero
 * const marker = await zeroSystem.createZeroMarker({
 *   name: 'Entrada Principal',
 *   positionInBIM: { x: 0, y: 0, z: 0 },
 *   floorLevel: 'TÉRREO',
 *   physicalSize: 0.2  // 20cm
 * });
 * 
 * // Ativar marco (alinha modelo ao ponto zero)
 * await zeroSystem.activateZeroMarker(marker.id);
 * 
 * // Gerar QR code para o marco
 * const qrCode = await zeroSystem.generateQRCode(marker.id);
 * qrCode.download('entrada-principal.png');
 * ```
 */

import * as THREE from 'three';
import { ARMarker, ARAnchor, FloorLevel } from './ARMarkerTypes';
import { MarkerRegistry } from './MarkerRegistry';
import { ARAlignmentManager } from './ARAlignmentManager';
import { QRCodeGenerator, ZeroMarkerConfig, GeneratedQRCode } from './QRCodeGenerator';

/**
 * Configuração para criar marco zero
 */
export interface CreateZeroMarkerConfig {
  name: string;
  positionInBIM: { x: number; y: number; z: number };
  rotationInBIM?: { x: number; y: number; z: number };
  floorLevel: string;
  elevation?: number;
  physicalSize?: number;  // Tamanho do QR em metros (default: 0.2m = 20cm)
  description?: string;
  expirationDays?: number;  // 0 = nunca expira
}

/**
 * Marco zero registrado
 */
export interface ZeroMarker extends ARMarker {
  type: 'QR';  // Força tipo QR
  role: 'master';  // Marco zero é sempre master
  
  // Dados adicionais
  qrCodeDataUrl?: string;
  qrCodeGenerated?: boolean;
  qrCodeGeneratedAt?: number;
}

/**
 * Estado do sistema de marcos
 */
export interface ZeroMarkerSystemState {
  activeMarkerId?: string;
  totalMarkers: number;
  alignmentActive: boolean;
  lastAlignment?: number;
  calibrationConfidence?: number;
}

export class ARZeroMarkerSystem extends EventTarget {
  private scene: THREE.Scene;
  private registry: MarkerRegistry;
  private alignmentManager: ARAlignmentManager;
  private qrGenerator: QRCodeGenerator;
  
  private projectId: string;
  private zeroMarkers: Map<string, ZeroMarker> = new Map();
  private activeMarkerId?: string;
  
  // Visualization
  private markerVisualization: Map<string, THREE.Group> = new Map();
  private showVisualization: boolean = true;

  constructor(
    scene: THREE.Scene,
    registry: MarkerRegistry,
    alignmentManager: ARAlignmentManager,
    projectId: string
  ) {
    super();
    
    this.scene = scene;
    this.registry = registry;
    this.alignmentManager = alignmentManager;
    this.projectId = projectId;
    
    this.qrGenerator = new QRCodeGenerator();
    
    // Carrega marcos existentes
    this.loadExistingMarkers();
  }

  // ============================================
  // MARKER CREATION
  // ============================================

  /**
   * Cria novo marco zero
   */
  async createZeroMarker(config: CreateZeroMarkerConfig): Promise<ZeroMarker> {
    console.log('[ZeroMarkerSystem] Creating zero marker:', config.name);

    // Converte posição para Three.js
    const position = new THREE.Vector3(
      config.positionInBIM.x,
      config.positionInBIM.y,
      config.positionInBIM.z
    );

    const rotation = config.rotationInBIM 
      ? new THREE.Euler(
          THREE.MathUtils.degToRad(config.rotationInBIM.x),
          THREE.MathUtils.degToRad(config.rotationInBIM.y),
          THREE.MathUtils.degToRad(config.rotationInBIM.z)
        )
      : new THREE.Euler(0, 0, 0);

    const quaternion = new THREE.Quaternion().setFromEuler(rotation);
    const matrix = new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1, 1, 1));

    // Cria marker no registry
    const marker: Omit<ARMarker, 'id'> = {
      name: config.name,
      type: 'QR',
      physicalSize: config.physicalSize || 0.2,
      
      positionInBIM: position,
      rotationInBIM: rotation,
      quaternionInBIM: quaternion,
      matrixInBIM: matrix,
      
      floorLevel: {
        id: `floor-${config.floorLevel}`,
        name: config.floorLevel,
        elevation: config.elevation || 0
      },
      
      description: config.description,
      role: 'master',
      active: true,
      
      lastCalibrated: Date.now(),
      calibrationConfidence: 1.0,
      
      expirationDate: config.expirationDays 
        ? Date.now() + (config.expirationDays * 24 * 60 * 60 * 1000)
        : undefined
    };

    const registered = await this.registry.registerMarker(marker);
    
    const zeroMarker: ZeroMarker = {
      ...registered,
      type: 'QR',
      role: 'master',
      qrCodeGenerated: false
    };

    this.zeroMarkers.set(zeroMarker.id, zeroMarker);
    
    // Cria visualização
    if (this.showVisualization) {
      this.createMarkerVisualization(zeroMarker);
    }

    this.dispatchEvent(new CustomEvent('markerCreated', { detail: zeroMarker }));

    return zeroMarker;
  }

  /**
   * Remove marco zero
   */
  async removeZeroMarker(markerId: string): Promise<void> {
    const marker = this.zeroMarkers.get(markerId);
    
    if (!marker) {
      throw new Error(`Marco zero ${markerId} não encontrado`);
    }

    // Remove do registry
    await this.registry.deleteMarker(markerId);
    
    // Remove visualização
    this.removeMarkerVisualization(markerId);
    
    // Remove do mapa local
    this.zeroMarkers.delete(markerId);
    
    // Se era o ativo, desativa
    if (this.activeMarkerId === markerId) {
      this.activeMarkerId = undefined;
    }

    this.dispatchEvent(new CustomEvent('markerRemoved', { detail: { markerId } }));
  }

  // ============================================
  // MARKER ACTIVATION (Alignment)
  // ============================================

  /**
   * Ativa marco zero (alinha modelo a partir dele)
   */
  async activateZeroMarker(markerId: string): Promise<void> {
    const marker = this.zeroMarkers.get(markerId);
    
    if (!marker) {
      throw new Error(`Marco zero ${markerId} não encontrado`);
    }

    console.log('[ZeroMarkerSystem] Activating zero marker:', marker.name);

    // Cria âncora AR no registry
    const anchor: Omit<ARAnchor, 'id'> = {
      markerId: marker.id,
      projectId: this.projectId,
      sessionId: undefined,
      
      // Transformação mundo → BIM
      // (No caso de marco zero, é identidade pois o marco DEFINE o zero)
      T_world_bim: new THREE.Matrix4().identity(),
      
      createdAt: Date.now(),
      createdBy: 'zero-marker-system',
      confidence: marker.calibrationConfidence || 1.0,
      
      active: true,
      locked: false,
      
      // Metadata
      notes: `Marco zero: ${marker.name} em ${marker.floorLevel.name}`
    };

    const registeredAnchor = await this.registry.registerAnchor(anchor);

    // Aplica alinhamento
    await this.alignmentManager.applyAnchor(registeredAnchor.id);

    this.activeMarkerId = markerId;

    this.dispatchEvent(new CustomEvent('markerActivated', { 
      detail: { markerId, anchorId: registeredAnchor.id } 
    }));
  }

  /**
   * Desativa marco zero atual
   */
  async deactivateZeroMarker(): Promise<void> {
    if (!this.activeMarkerId) {
      return;
    }

    // Remove alinhamento
    await this.alignmentManager.removeAlignment();

    const previousId = this.activeMarkerId;
    this.activeMarkerId = undefined;

    this.dispatchEvent(new CustomEvent('markerDeactivated', { 
      detail: { markerId: previousId } 
    }));
  }

  /**
   * Alinha modelo ao marco zero escaneado (usado no AR mobile)
   * 
   * @param markerId - ID do marco escaneado
   * @param devicePose - Pose do device quando escaneou (posição da câmera)
   */
  async alignToScannedMarker(
    markerId: string,
    devicePose: { position: THREE.Vector3; rotation: THREE.Quaternion }
  ): Promise<void> {
    const marker = this.zeroMarkers.get(markerId);
    
    if (!marker) {
      throw new Error(`Marco zero ${markerId} não encontrado`);
    }

    console.log('[ZeroMarkerSystem] Aligning to scanned marker:', marker.name);

    // Calcula transformação:
    // O ponto do marker no BIM deve coincidir com a posição do device
    
    // T_world_bim = T_device * inverse(T_marker_bim)
    const T_marker_bim = marker.matrixInBIM.clone();
    const T_device = new THREE.Matrix4().compose(
      devicePose.position,
      devicePose.rotation,
      new THREE.Vector3(1, 1, 1)
    );
    
    const T_world_bim = new THREE.Matrix4()
      .copy(T_device)
      .multiply(T_marker_bim.clone().invert());

    // Cria âncora
    const anchor: Omit<ARAnchor, 'id'> = {
      markerId: marker.id,
      projectId: this.projectId,
      sessionId: undefined,
      
      T_world_bim,
      
      createdAt: Date.now(),
      createdBy: 'ar-scan',
      confidence: 0.8,  // Inicial, será refinado
      
      active: true,
      locked: false,
      
      notes: `AR scan de ${marker.name}`
    };

    const registeredAnchor = await this.registry.registerAnchor(anchor);

    // Aplica alinhamento
    await this.alignmentManager.applyAnchor(registeredAnchor.id);

    this.activeMarkerId = markerId;

    this.dispatchEvent(new CustomEvent('markerScanned', { 
      detail: { markerId, anchorId: registeredAnchor.id } 
    }));
  }

  // ============================================
  // QR CODE GENERATION
  // ============================================

  /**
   * Gera QR code para marco zero
   */
  async generateQRCode(markerId: string): Promise<GeneratedQRCode> {
    const marker = this.zeroMarkers.get(markerId);
    
    if (!marker) {
      throw new Error(`Marco zero ${markerId} não encontrado`);
    }

    const config: ZeroMarkerConfig = {
      projectId: this.projectId,
      projectName: `Projeto ${this.projectId}`,  // TODO: Get real project name
      markerId: marker.id,
      markerName: marker.name,
      position: {
        x: marker.positionInBIM.x,
        y: marker.positionInBIM.y,
        z: marker.positionInBIM.z
      },
      rotation: {
        x: THREE.MathUtils.radToDeg(marker.rotationInBIM.x),
        y: THREE.MathUtils.radToDeg(marker.rotationInBIM.y),
        z: THREE.MathUtils.radToDeg(marker.rotationInBIM.z)
      },
      floorLevel: marker.floorLevel.name,
      elevation: marker.floorLevel.elevation,
      expiresInDays: marker.expirationDate 
        ? Math.floor((marker.expirationDate - Date.now()) / (24 * 60 * 60 * 1000))
        : 0
    };

    const qrCode = await this.qrGenerator.generateZeroMarkerQR(config);

    // Atualiza marker
    marker.qrCodeDataUrl = qrCode.dataUrl;
    marker.qrCodeGenerated = true;
    marker.qrCodeGeneratedAt = Date.now();

    // Atualiza no registry
    await this.registry.updateMarker(marker.id, {
      qrCodeDataUrl: qrCode.dataUrl,
      qrCodeGenerated: true,
      qrCodeGeneratedAt: Date.now()
    } as any);

    this.dispatchEvent(new CustomEvent('qrCodeGenerated', { 
      detail: { markerId, qrCode } 
    }));

    return qrCode;
  }

  /**
   * Gera QR codes para todos os marcos
   */
  async generateAllQRCodes(): Promise<Map<string, GeneratedQRCode>> {
    const qrCodes = new Map<string, GeneratedQRCode>();

    for (const [markerId, marker] of this.zeroMarkers) {
      const qrCode = await this.generateQRCode(markerId);
      qrCodes.set(markerId, qrCode);
    }

    return qrCodes;
  }

  /**
   * Gera PDF com todos os QR codes
   */
  async generatePrintablePDF(projectName: string): Promise<void> {
    const qrCodes = await this.generateAllQRCodes();
    const qrArray = Array.from(qrCodes.values());
    
    await this.qrGenerator.generatePrintablePDF(qrArray, projectName);
  }

  // ============================================
  // VISUALIZATION
  // ============================================

  /**
   * Cria visualização 3D do marco zero
   */
  private createMarkerVisualization(marker: ZeroMarker): void {
    const group = new THREE.Group();
    group.name = `ZeroMarker_${marker.id}`;

    // Plano do QR code
    const size = marker.physicalSize;
    const geometry = new THREE.PlaneGeometry(size, size);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    
    const plane = new THREE.Mesh(geometry, material);
    group.add(plane);

    // Border
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
    const border = new THREE.LineSegments(edges, lineMaterial);
    group.add(border);

    // Eixos de orientação
    const axes = new THREE.AxesHelper(size * 0.5);
    group.add(axes);

    // Label
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(marker.name, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    const labelGeometry = new THREE.PlaneGeometry(size * 2, size * 0.5);
    const labelMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    const label = new THREE.Mesh(labelGeometry, labelMaterial);
    label.position.y = size * 0.75;
    group.add(label);

    // Posiciona no ponto do marker
    group.position.copy(marker.positionInBIM);
    group.quaternion.copy(marker.quaternionInBIM);

    this.scene.add(group);
    this.markerVisualization.set(marker.id, group);
  }

  /**
   * Remove visualização
   */
  private removeMarkerVisualization(markerId: string): void {
    const viz = this.markerVisualization.get(markerId);
    
    if (viz) {
      this.scene.remove(viz);
      viz.traverse(obj => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      
      this.markerVisualization.delete(markerId);
    }
  }

  /**
   * Toggle visualização de todos os marcos
   */
  toggleVisualization(show: boolean): void {
    this.showVisualization = show;

    if (show) {
      // Cria visualização para todos os marcos
      for (const marker of this.zeroMarkers.values()) {
        if (!this.markerVisualization.has(marker.id)) {
          this.createMarkerVisualization(marker);
        }
      }
    } else {
      // Remove todas as visualizações
      for (const markerId of this.markerVisualization.keys()) {
        this.removeMarkerVisualization(markerId);
      }
    }
  }

  // ============================================
  // DATA MANAGEMENT
  // ============================================

  /**
   * Carrega marcos existentes do registry
   */
  private async loadExistingMarkers(): Promise<void> {
    const allMarkers = this.registry.getAllMarkers();
    
    for (const marker of allMarkers) {
      // Filtra apenas marcos QR do tipo master (marcos zeros)
      if (marker.type === 'QR' && marker.role === 'master') {
        this.zeroMarkers.set(marker.id, marker as ZeroMarker);
        
        if (this.showVisualization) {
          this.createMarkerVisualization(marker as ZeroMarker);
        }
      }
    }

    console.log(`[ZeroMarkerSystem] Loaded ${this.zeroMarkers.size} zero markers`);
  }

  /**
   * Lista todos os marcos zeros
   */
  getAllZeroMarkers(): ZeroMarker[] {
    return Array.from(this.zeroMarkers.values());
  }

  /**
   * Busca marco por ID
   */
  getZeroMarker(markerId: string): ZeroMarker | undefined {
    return this.zeroMarkers.get(markerId);
  }

  /**
   * Retorna marco ativo
   */
  getActiveMarker(): ZeroMarker | undefined {
    return this.activeMarkerId 
      ? this.zeroMarkers.get(this.activeMarkerId)
      : undefined;
  }

  /**
   * Retorna estado do sistema
   */
  getState(): ZeroMarkerSystemState {
    const activeMarker = this.getActiveMarker();

    return {
      activeMarkerId: this.activeMarkerId,
      totalMarkers: this.zeroMarkers.size,
      alignmentActive: !!this.activeMarkerId,
      lastAlignment: activeMarker?.lastCalibrated,
      calibrationConfidence: activeMarker?.calibrationConfidence
    };
  }

  // ============================================
  // CLEANUP
  // ============================================

  /**
   * Cleanup completo
   */
  dispose(): void {
    // Remove todas as visualizações
    for (const markerId of this.markerVisualization.keys()) {
      this.removeMarkerVisualization(markerId);
    }

    this.zeroMarkers.clear();
    this.activeMarkerId = undefined;
  }
}
