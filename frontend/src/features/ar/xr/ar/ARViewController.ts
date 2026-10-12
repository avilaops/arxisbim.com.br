/**
 * ARViewController - Controlador principal do AR Viewer
 * 
 * Orquestra todo o fluxo de visualização AR:
 * 1. Usuário escaneia QR code (marco zero)
 * 2. App abre via deep link
 * 3. Carrega projeto IFC
 * 4. Alinha modelo ao marco zero
 * 5. Exibe modelo em AR sobreposto ao mundo real
 * 
 * Uso:
 * ```ts
 * const arController = new ARViewController(scene, camera, renderer);
 * 
 * // Inicia modo AR via deep link
 * await arController.initializeFromDeepLink(deepLinkEvent);
 * 
 * // Ou inicia manualmente
 * await arController.startARSession({
 *   projectId: 'proj-123',
 *   markerId: 'marker-456'
 * });
 * ```
 */

import * as THREE from 'three';
import { QRCodeScanner, ArxisQRData } from './QRCodeScanner';
import { QRCodeGenerator } from './QRCodeGenerator';
import { DeepLinkHandler, DeepLinkEvent } from './DeepLinkHandler';
import { ARZeroMarkerSystem, ZeroMarker } from './ARZeroMarkerSystem';
import { MarkerRegistry } from './MarkerRegistry';
import { ARAlignmentManager } from './ARAlignmentManager';

/**
 * Configuração da sessão AR
 */
export interface ARSessionConfig {
  projectId: string;
  projectName?: string;
  markerId?: string;         // ID do marco zero (se conhecido)
  markerData?: ArxisQRData;  // Dados do QR escaneado
  autoAlign?: boolean;       // Alinha automaticamente ao marco
  showUI?: boolean;          // Exibe UI de controle AR
}

/**
 * Estado da sessão AR
 */
export interface ARSessionState {
  active: boolean;
  projectLoaded: boolean;
  markerDetected: boolean;
  aligned: boolean;
  
  projectId?: string;
  markerId?: string;
  markerName?: string;
  
  startedAt?: number;
  alignedAt?: number;
  
  devicePose?: {
    position: THREE.Vector3;
    rotation: THREE.Quaternion;
  };
}

/**
 * Opções do AR Viewer
 */
export interface ARViewerOptions {
  serverUrl?: string;
  enableTracking?: boolean;   // Tracking da câmera
  enablePlaneDetection?: boolean;  // Detecção de planos (ARCore/ARKit)
  enableLightEstimation?: boolean;  // Estimativa de luz
  debugVisualization?: boolean;
}

export class ARViewController extends EventTarget {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  
  // AR Systems
  private scanner: QRCodeScanner;
  private deepLinkHandler: DeepLinkHandler;
  private zeroMarkerSystem?: ARZeroMarkerSystem;
  private markerRegistry?: MarkerRegistry;
  private alignmentManager?: ARAlignmentManager;
  
  // Session
  private sessionState: ARSessionState;
  private options: Required<ARViewerOptions>;
  
  // UI
  private arUI?: HTMLElement;

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    options?: ARViewerOptions
  ) {
    super();
    
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    
    this.options = {
      serverUrl: 'https://api.arxisbim.com.br',
      enableTracking: true,
      enablePlaneDetection: false,
      enableLightEstimation: true,
      debugVisualization: false,
      ...options
    };
    
    this.scanner = new QRCodeScanner();
    this.deepLinkHandler = new DeepLinkHandler();
    
    this.sessionState = {
      active: false,
      projectLoaded: false,
      markerDetected: false,
      aligned: false
    };
    
    this.setupDeepLinkHandlers();
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Inicializa sistema AR
   */
  async initialize(projectId: string): Promise<void> {
    console.log('[ARViewController] Initializing for project:', projectId);

    // Cria registry
    this.markerRegistry = new MarkerRegistry({
      serverUrl: this.options.serverUrl,
      projectId,
      autoSync: true,
      cacheEnabled: true
    });

    // Cria alignment manager
    this.alignmentManager = new ARAlignmentManager(
      this.scene,
      this.markerRegistry,
      {
        autoUpdate: false,
        applyToScene: true,
        visualize: this.options.debugVisualization
      }
    );

    // Cria zero marker system
    this.zeroMarkerSystem = new ARZeroMarkerSystem(
      this.scene,
      this.markerRegistry,
      this.alignmentManager,
      projectId
    );

    // Inicia deep link handler
    await this.deepLinkHandler.start();

    this.dispatchEvent(new CustomEvent('initialized', { detail: { projectId } }));
  }

  /**
   * Configura handlers de deep link
   */
  private setupDeepLinkHandlers(): void {
    // Deep link de marco zero AR
    this.deepLinkHandler.on('ar-marker', (event) => {
      console.log('[ARViewController] AR marker deep link:', event);
      this.initializeFromDeepLink(event);
    });

    // Deep link de projeto (pode iniciar AR também)
    this.deepLinkHandler.on('project', (event) => {
      console.log('[ARViewController] Project deep link:', event);
      if (event.params.has('ar')) {
        this.initializeFromDeepLink(event);
      }
    });
  }

  // ============================================
  // AR SESSION MANAGEMENT
  // ============================================

  /**
   * Inicia sessão AR a partir de deep link
   */
  async initializeFromDeepLink(event: DeepLinkEvent): Promise<void> {
    if (!event.data) {
      console.error('[ARViewController] Deep link sem dados');
      return;
    }

    const config: ARSessionConfig = {
      projectId: event.data.projectId,
      projectName: event.data.projectName,
      markerData: event.data,
      autoAlign: true,
      showUI: true
    };

    if (event.data.zeroMarker) {
      config.markerId = event.data.zeroMarker.id;
    }

    await this.startARSession(config);
  }

  /**
   * Inicia sessão AR
   */
  async startARSession(config: ARSessionConfig): Promise<void> {
    console.log('[ARViewController] Starting AR session:', config);

    try {
      // 1. Inicializa sistema (se não foi ainda)
      if (!this.zeroMarkerSystem) {
        await this.initialize(config.projectId);
      }

      // 2. Atualiza estado
      this.sessionState = {
        active: true,
        projectLoaded: false,
        markerDetected: false,
        aligned: false,
        projectId: config.projectId,
        startedAt: Date.now()
      };

      // 3. Carrega projeto IFC (se necessário)
      if (!this.sessionState.projectLoaded) {
        await this.loadProject(config.projectId);
      }

      // 4. Se tem dados de marker escaneado, processa
      if (config.markerData?.zeroMarker) {
        await this.processScannedMarker(config.markerData);
      }
      // 5. Se tem ID de marker conhecido, ativa
      else if (config.markerId) {
        await this.activateMarker(config.markerId);
      }
      // 6. Senão, solicita scan de QR
      else {
        await this.requestQRScan();
      }

      // 7. Exibe UI (se configurado)
      if (config.showUI) {
        this.showARUI();
      }

      this.dispatchEvent(new CustomEvent('sessionStarted', { detail: config }));

    } catch (error) {
      console.error('[ARViewController] Failed to start AR session:', error);
      this.sessionState.active = false;
      
      this.dispatchEvent(new CustomEvent('sessionError', { 
        detail: { error: String(error) } 
      }));
      
      throw error;
    }
  }

  /**
   * Para sessão AR
   */
  async stopARSession(): Promise<void> {
    console.log('[ARViewController] Stopping AR session');

    // Desativa alinhamento
    if (this.zeroMarkerSystem) {
      await this.zeroMarkerSystem.deactivateZeroMarker();
    }

    // Remove UI
    this.hideARUI();

    // Atualiza estado
    this.sessionState = {
      active: false,
      projectLoaded: this.sessionState.projectLoaded,
      markerDetected: false,
      aligned: false
    };

    this.dispatchEvent(new CustomEvent('sessionStopped'));
  }

  // ============================================
  // QR CODE SCANNING
  // ============================================

  /**
   * Solicita scan de QR code
   */
  async requestQRScan(): Promise<void> {
    console.log('[ARViewController] Requesting QR scan');

    try {
      const result = await this.scanner.scanQRCode({
        promptMessage: 'Escaneie o QR Code do Marco Zero',
        timeout: 60000  // 60s
      });

      if (result.success && result.data) {
        await this.processScannedMarker(result.data);
      } else {
        throw new Error(result.error || 'Scan falhou');
      }

    } catch (error) {
      console.error('[ARViewController] QR scan failed:', error);
      
      this.dispatchEvent(new CustomEvent('scanError', { 
        detail: { error: String(error) } 
      }));
    }
  }

  /**
   * Processa marker escaneado
   */
  private async processScannedMarker(data: ArxisQRData): Promise<void> {
    if (!data.zeroMarker || !this.zeroMarkerSystem) {
      console.error('[ARViewController] Dados de marker inválidos');
      return;
    }

    console.log('[ARViewController] Processing scanned marker:', data.zeroMarker);

    this.sessionState.markerDetected = true;
    this.sessionState.markerId = data.zeroMarker.id;
    this.sessionState.markerName = data.zeroMarker.name;

    // Pega pose do device (câmera)
    const devicePose = this.getCurrentDevicePose();

    // Alinha modelo ao marco escaneado
    await this.zeroMarkerSystem.alignToScannedMarker(
      data.zeroMarker.id,
      devicePose
    );

    this.sessionState.aligned = true;
    this.sessionState.alignedAt = Date.now();
    this.sessionState.devicePose = devicePose;

    this.dispatchEvent(new CustomEvent('markerScanned', { 
      detail: { marker: data.zeroMarker, devicePose } 
    }));

    console.log('[ARViewController] Model aligned to zero marker');
  }

  /**
   * Ativa marker conhecido (sem scan)
   */
  private async activateMarker(markerId: string): Promise<void> {
    if (!this.zeroMarkerSystem) return;

    const marker = this.zeroMarkerSystem.getZeroMarker(markerId);
    
    if (!marker) {
      console.error('[ARViewController] Marker não encontrado:', markerId);
      return;
    }

    await this.zeroMarkerSystem.activateZeroMarker(markerId);

    this.sessionState.markerId = markerId;
    this.sessionState.markerName = marker.name;
    this.sessionState.aligned = true;
    this.sessionState.alignedAt = Date.now();

    this.dispatchEvent(new CustomEvent('markerActivated', { detail: { markerId } }));
  }

  // ============================================
  // PROJECT LOADING
  // ============================================

  /**
   * Carrega projeto IFC
   */
  private async loadProject(projectId: string): Promise<void> {
    console.log('[ARViewController] Loading project:', projectId);

    // TODO: Integrar com sistema de loading do ArxisVR
    // Por enquanto, assume que o projeto já está carregado
    
    this.sessionState.projectLoaded = true;
    this.sessionState.projectId = projectId;

    this.dispatchEvent(new CustomEvent('projectLoaded', { detail: { projectId } }));
  }

  // ============================================
  // DEVICE POSE
  // ============================================

  /**
   * Obtém pose atual do device (câmera)
   */
  private getCurrentDevicePose(): { position: THREE.Vector3; rotation: THREE.Quaternion } {
    // Em AR nativo, isso viria do ARCore/ARKit
    // Por enquanto, usa pose da câmera atual
    
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    
    this.camera.getWorldPosition(position);
    this.camera.getWorldQuaternion(rotation);

    return { position, rotation };
  }

  /**
   * Atualiza pose do device (chamado no loop de render)
   */
  updateDevicePose(): void {
    if (!this.sessionState.active || !this.sessionState.aligned) {
      return;
    }

    // TODO: Integrar com ARCore/ARKit para tracking real
    // Por enquanto, apenas atualiza baseado na câmera
    
    this.sessionState.devicePose = this.getCurrentDevicePose();
  }

  // ============================================
  // UI
  // ============================================

  /**
   * Exibe UI de controle AR
   */
  private showARUI(): void {
    if (this.arUI) {
      this.arUI.style.display = 'flex';
      return;
    }

    this.arUI = this.createARUI();
    document.body.appendChild(this.arUI);
  }

  /**
   * Esconde UI
   */
  private hideARUI(): void {
    if (this.arUI) {
      this.arUI.style.display = 'none';
    }
  }

  /**
   * Cria UI de controle AR
   */
  private createARUI(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'ar-viewer-ui';
    container.innerHTML = `
      <div class="ar-ui-overlay">
        <!-- Header -->
        <div class="ar-ui-header">
          <div class="ar-status">
            <span class="ar-status-icon">📍</span>
            <span class="ar-status-text">Modo AR Ativo</span>
          </div>
          <button class="ar-exit-btn" id="arExitBtn">
            <span>✕</span>
          </button>
        </div>

        <!-- Info Panel -->
        <div class="ar-info-panel" id="arInfoPanel">
          <div class="ar-info-item">
            <span class="label">Projeto:</span>
            <span class="value" id="arProjectName">Carregando...</span>
          </div>
          <div class="ar-info-item">
            <span class="label">Marco Zero:</span>
            <span class="value" id="arMarkerName">Nenhum</span>
          </div>
          <div class="ar-info-item">
            <span class="label">Status:</span>
            <span class="value ar-status-value" id="arStatus">Inicializando</span>
          </div>
        </div>

        <!-- Controls -->
        <div class="ar-controls">
          <button class="ar-btn" id="arRescanBtn" title="Escanear Novo QR">
            <span>📷</span>
            <span>Scan QR</span>
          </button>
          
          <button class="ar-btn" id="arRecenterBtn" title="Recentralizar">
            <span>🎯</span>
            <span>Recentralizar</span>
          </button>
          
          <button class="ar-btn" id="arToggleDebugBtn" title="Debug">
            <span>🔧</span>
            <span>Debug</span>
          </button>
        </div>

        <!-- Alignment Indicator -->
        <div class="ar-alignment-indicator" id="arAlignmentIndicator">
          <div class="crosshair"></div>
        </div>
      </div>
    `;

    // Styles
    const style = document.createElement('style');
    style.textContent = `
      .ar-viewer-ui {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 9999;
        pointer-events: none;
      }

      .ar-ui-overlay {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .ar-ui-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        background: linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%);
        pointer-events: auto;
      }

      .ar-status {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #fff;
        font-size: 16px;
        font-weight: 600;
      }

      .ar-status-icon {
        font-size: 20px;
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .ar-exit-btn {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 2px solid #fff;
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        font-size: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .ar-exit-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.1);
      }

      .ar-info-panel {
        margin: 16px;
        padding: 16px;
        background: rgba(0, 0, 0, 0.8);
        border-radius: 12px;
        backdrop-filter: blur(10px);
        pointer-events: auto;
      }

      .ar-info-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        color: #fff;
        font-size: 14px;
      }

      .ar-info-item:last-child {
        margin-bottom: 0;
      }

      .ar-info-item .label {
        opacity: 0.7;
      }

      .ar-info-item .value {
        font-weight: 600;
      }

      .ar-status-value {
        color: #00ff00;
      }

      .ar-controls {
        position: absolute;
        bottom: 32px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 16px;
        pointer-events: auto;
      }

      .ar-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 12px 20px;
        background: rgba(0, 0, 0, 0.8);
        border: 2px solid #fff;
        border-radius: 12px;
        color: #fff;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        backdrop-filter: blur(10px);
      }

      .ar-btn span:first-child {
        font-size: 24px;
      }

      .ar-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-2px);
      }

      .ar-btn:active {
        transform: translateY(0);
      }

      .ar-alignment-indicator {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100px;
        height: 100px;
        pointer-events: none;
      }

      .crosshair {
        width: 100%;
        height: 100%;
        position: relative;
      }

      .crosshair::before,
      .crosshair::after {
        content: '';
        position: absolute;
        background: rgba(0, 255, 0, 0.8);
      }

      .crosshair::before {
        top: 50%;
        left: 0;
        width: 100%;
        height: 2px;
        transform: translateY(-50%);
      }

      .crosshair::after {
        top: 0;
        left: 50%;
        width: 2px;
        height: 100%;
        transform: translateX(-50%);
      }

      /* Mobile adjustments */
      @media (max-width: 768px) {
        .ar-controls {
          bottom: 16px;
          gap: 8px;
        }

        .ar-btn {
          padding: 10px 16px;
        }
      }
    `;
    
    container.appendChild(style);

    // Event listeners
    container.querySelector('#arExitBtn')?.addEventListener('click', () => {
      this.stopARSession();
    });

    container.querySelector('#arRescanBtn')?.addEventListener('click', () => {
      this.requestQRScan();
    });

    container.querySelector('#arRecenterBtn')?.addEventListener('click', () => {
      this.recenterView();
    });

    container.querySelector('#arToggleDebugBtn')?.addEventListener('click', () => {
      this.toggleDebugVisualization();
    });

    return container;
  }

  /**
   * Atualiza UI com estado atual
   */
  updateUI(): void {
    if (!this.arUI) return;

    const projectName = this.arUI.querySelector('#arProjectName');
    const markerName = this.arUI.querySelector('#arMarkerName');
    const status = this.arUI.querySelector('#arStatus');

    if (projectName) {
      projectName.textContent = this.sessionState.projectId || 'Carregando...';
    }

    if (markerName) {
      markerName.textContent = this.sessionState.markerName || 'Nenhum';
    }

    if (status) {
      if (this.sessionState.aligned) {
        status.textContent = 'Alinhado ✓';
        status.style.color = '#00ff00';
      } else if (this.sessionState.markerDetected) {
        status.textContent = 'Marco Detectado';
        status.style.color = '#ffaa00';
      } else {
        status.textContent = 'Aguardando Scan';
        status.style.color = '#ff0000';
      }
    }
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Recentraliza visualização
   */
  private recenterView(): void {
    // TODO: Implementar lógica de recentralização
    console.log('[ARViewController] Recentering view');
  }

  /**
   * Toggle visualização de debug
   */
  private toggleDebugVisualization(): void {
    this.options.debugVisualization = !this.options.debugVisualization;
    
    if (this.zeroMarkerSystem) {
      this.zeroMarkerSystem.toggleVisualization(this.options.debugVisualization);
    }
  }

  /**
   * Retorna estado da sessão
   */
  getSessionState(): ARSessionState {
    return { ...this.sessionState };
  }

  /**
   * Verifica se sessão está ativa
   */
  isSessionActive(): boolean {
    return this.sessionState.active;
  }

  // ============================================
  // CLEANUP
  // ============================================

  /**
   * Cleanup completo
   */
  dispose(): void {
    this.stopARSession();
    this.deepLinkHandler.stop();
    
    if (this.zeroMarkerSystem) {
      this.zeroMarkerSystem.dispose();
    }

    if (this.arUI) {
      this.arUI.remove();
    }
  }
}
