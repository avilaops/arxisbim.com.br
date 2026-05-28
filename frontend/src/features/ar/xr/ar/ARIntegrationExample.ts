/**
 * AR Zero Marker System - Exemplo Completo de Integração
 * 
 * Este arquivo demonstra como integrar o sistema completo de AR
 * com QR Code marcos zeros no ArxisVR.
 */

import * as THREE from 'three';
import {
  ARZeroMarkerSystem,
  ARViewController,
  DeepLinkHandler,
  QRCodeScanner,
  MarkerRegistry,
  ARAlignmentManager
} from '../xr/ar';
import { ARMarkerPanel } from '../ui/panels-v2/ARMarkerPanel';
import { NativeBridge } from '../mobile/NativeBridge';

/**
 * Classe principal de integração AR
 */
export class ARIntegrationExample {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;
  
  private projectId: string = 'proj-123';
  private projectName: string = 'Edifício XYZ';
  
  // AR Systems
  private markerRegistry?: MarkerRegistry;
  private alignmentManager?: ARAlignmentManager;
  private zeroMarkerSystem?: ARZeroMarkerSystem;
  private arViewController?: ARViewController;
  private deepLinkHandler?: DeepLinkHandler;
  
  // UI
  private arPanel?: ARMarkerPanel;

  constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  /**
   * Inicializa sistema AR completo
   */
  async initialize(): Promise<void> {
    console.log('[AR Integration] Initializing...');

    // 1. Cria Marker Registry
    this.markerRegistry = new MarkerRegistry({
      serverUrl: 'https://arxis-api.avila.inc',
      projectId: this.projectId,
      autoSync: true,
      cacheEnabled: true
    });

    // 2. Cria Alignment Manager
    this.alignmentManager = new ARAlignmentManager(
      this.scene,
      this.markerRegistry,
      {
        autoUpdate: false,
        applyToScene: true,
        visualize: false  // Ativa para debug
      }
    );

    // 3. Cria Zero Marker System
    this.zeroMarkerSystem = new ARZeroMarkerSystem(
      this.scene,
      this.markerRegistry,
      this.alignmentManager,
      this.projectId
    );

    // 4. Cria AR View Controller (para mobile)
    this.arViewController = new ARViewController(
      this.scene,
      this.camera,
      this.renderer,
      {
        serverUrl: 'https://arxis-api.avila.inc',
        enableTracking: true,
        enablePlaneDetection: false,
        enableLightEstimation: true,
        debugVisualization: false
      }
    );

    await this.arViewController.initialize(this.projectId);

    // 5. Configura Deep Link Handler
    this.deepLinkHandler = new DeepLinkHandler();
    
    this.deepLinkHandler.on('ar-marker', async (event) => {
      console.log('[AR Integration] AR marker deep link received:', event);
      
      if (this.arViewController) {
        await this.arViewController.initializeFromDeepLink(event);
      }
    });

    await this.deepLinkHandler.start();

    // 6. Cria UI Panel
    this.arPanel = new ARMarkerPanel(
      this.zeroMarkerSystem,
      this.arViewController,
      this.projectId,
      this.projectName
    );

    document.body.appendChild(this.arPanel.getElement());

    console.log('[AR Integration] Initialized successfully');
  }

  // ============================================
  // DESKTOP WORKFLOW - Criar e Gerenciar Marcos
  // ============================================

  /**
   * Exemplo: Criar marco zero na entrada do edifício
   */
  async createEntranceMarker(): Promise<void> {
    if (!this.zeroMarkerSystem) {
      throw new Error('Zero marker system not initialized');
    }

    const marker = await this.zeroMarkerSystem.createZeroMarker({
      name: 'Entrada Principal',
      positionInBIM: { x: 0, y: 0, z: 0 },
      rotationInBIM: { x: 0, y: 0, z: 0 },
      floorLevel: 'TÉRREO',
      elevation: 0,
      physicalSize: 0.2,  // 20cm
      description: 'QR fixado na parede ao lado da porta de entrada'
    });

    console.log('[AR Integration] Marker created:', marker);

    // Gera QR Code
    const qrCode = await this.zeroMarkerSystem.generateQRCode(marker.id);
    
    // Download automático
    qrCode.download('entrada-principal.png');
    
    // Ou imprime
    // qrCode.print();

    return marker;
  }

  /**
   * Exemplo: Criar múltiplos marcos em pontos estratégicos
   */
  async createMultipleMarkers(): Promise<void> {
    if (!this.zeroMarkerSystem) return;

    const markers = [
      {
        name: 'Entrada Principal',
        position: { x: 0, y: 0, z: 0 },
        floor: 'TÉRREO',
        description: 'Porta de entrada frontal'
      },
      {
        name: 'Pilar P1 - Canto NE',
        position: { x: 10, y: 0, z: 10 },
        floor: 'TÉRREO',
        description: 'Pilar nordeste do edifício'
      },
      {
        name: 'Escada Principal',
        position: { x: -5, y: 0, z: 5 },
        floor: 'TÉRREO',
        description: 'Escada de acesso ao 1º andar'
      },
      {
        name: 'Elevador Social',
        position: { x: 3, y: 0, z: -8 },
        floor: 'TÉRREO',
        description: 'Hall dos elevadores'
      }
    ];

    for (const config of markers) {
      await this.zeroMarkerSystem.createZeroMarker({
        name: config.name,
        positionInBIM: config.position,
        floorLevel: config.floor,
        physicalSize: 0.2,
        description: config.description
      });

      console.log(`✓ Marco criado: ${config.name}`);
    }

    // Exporta PDF com todos os marcos
    await this.zeroMarkerSystem.generatePrintablePDF(this.projectName);
  }

  /**
   * Exemplo: Ativar marco específico (alinha modelo)
   */
  async activateMarkerByName(markerName: string): Promise<void> {
    if (!this.zeroMarkerSystem) return;

    const markers = this.zeroMarkerSystem.getAllZeroMarkers();
    const marker = markers.find(m => m.name === markerName);

    if (!marker) {
      console.error(`Marco "${markerName}" não encontrado`);
      return;
    }

    await this.zeroMarkerSystem.activateZeroMarker(marker.id);
    
    console.log(`✓ Marco "${markerName}" ativado. Modelo alinhado.`);
  }

  // ============================================
  // MOBILE WORKFLOW - Escanear e Visualizar AR
  // ============================================

  /**
   * Exemplo: Iniciar modo AR (mobile)
   */
  async startARMode(): Promise<void> {
    if (!NativeBridge.isNative()) {
      console.warn('[AR Integration] AR mode only available on mobile');
      return;
    }

    if (!this.arViewController) {
      throw new Error('AR view controller not initialized');
    }

    // Inicia sessão AR (solicita scan de QR)
    await this.arViewController.startARSession({
      projectId: this.projectId,
      projectName: this.projectName,
      autoAlign: true,
      showUI: true
    });

    console.log('[AR Integration] AR mode started');
  }

  /**
   * Exemplo: Escanear QR manualmente
   */
  async scanQRCode(): Promise<void> {
    const scanner = new QRCodeScanner();

    const result = await scanner.scanQRCode({
      promptMessage: 'Posicione o QR Code do Marco Zero na câmera',
      timeout: 60000  // 60 segundos
    });

    if (result.success && result.data) {
      console.log('[AR Integration] QR scanned:', result.data);

      // Processa dados do QR
      if (result.data.type === 'zero-marker' && result.data.zeroMarker) {
        console.log('Marco Zero detectado:', result.data.zeroMarker.name);
        console.log('Posição no BIM:', result.data.zeroMarker.position);
        
        // Inicia AR automaticamente
        if (this.arViewController) {
          await this.arViewController.startARSession({
            projectId: result.data.projectId,
            markerData: result.data,
            autoAlign: true,
            showUI: true
          });
        }
      }
    } else {
      console.error('[AR Integration] QR scan failed:', result.error);
    }
  }

  // ============================================
  // UI CONTROLS
  // ============================================

  /**
   * Exibe painel de gerenciamento de marcos
   */
  showARPanel(): void {
    if (this.arPanel) {
      this.arPanel.show();
    }
  }

  /**
   * Esconde painel
   */
  hideARPanel(): void {
    if (this.arPanel) {
      this.arPanel.hide();
    }
  }

  /**
   * Toggle painel
   */
  toggleARPanel(): void {
    if (this.arPanel) {
      this.arPanel.toggle();
    }
  }

  // ============================================
  // UPDATE LOOP
  // ============================================

  /**
   * Atualiza AR no loop de render (se sessão ativa)
   */
  update(): void {
    if (this.arViewController?.isSessionActive()) {
      // Atualiza pose do device (tracking)
      this.arViewController.updateDevicePose();
      
      // Atualiza UI
      this.arViewController.updateUI();
    }
  }

  // ============================================
  // HELPERS & UTILITIES
  // ============================================

  /**
   * Retorna estado do sistema AR
   */
  getStatus(): any {
    return {
      initialized: !!this.zeroMarkerSystem,
      totalMarkers: this.zeroMarkerSystem?.getAllZeroMarkers().length || 0,
      activeMarker: this.zeroMarkerSystem?.getActiveMarker()?.name || 'Nenhum',
      isNativeMobile: NativeBridge.isNative(),
      arSessionActive: this.arViewController?.isSessionActive() || false
    };
  }

  /**
   * Lista todos os marcos cadastrados
   */
  listMarkers(): void {
    if (!this.zeroMarkerSystem) return;

    const markers = this.zeroMarkerSystem.getAllZeroMarkers();
    
    console.log(`\n=== Marcos AR (${markers.length}) ===`);
    
    markers.forEach((marker, i) => {
      console.log(`\n${i + 1}. ${marker.name}`);
      console.log(`   Pavimento: ${marker.floorLevel.name}`);
      console.log(`   Posição: X: ${marker.positionInBIM.x.toFixed(2)}m, Y: ${marker.positionInBIM.y.toFixed(2)}m, Z: ${marker.positionInBIM.z.toFixed(2)}m`);
      console.log(`   Tamanho QR: ${(marker.physicalSize * 100).toFixed(0)}cm`);
      console.log(`   QR Gerado: ${marker.qrCodeGenerated ? 'Sim' : 'Não'}`);
      
      if (marker.description) {
        console.log(`   Descrição: ${marker.description}`);
      }
    });
    
    console.log('\n');
  }

  /**
   * Exporta configuração de marcos para JSON
   */
  exportMarkersConfig(): string {
    if (!this.zeroMarkerSystem) return '[]';

    const markers = this.zeroMarkerSystem.getAllZeroMarkers();
    
    const config = markers.map(m => ({
      name: m.name,
      position: {
        x: m.positionInBIM.x,
        y: m.positionInBIM.y,
        z: m.positionInBIM.z
      },
      rotation: {
        x: THREE.MathUtils.radToDeg(m.rotationInBIM.x),
        y: THREE.MathUtils.radToDeg(m.rotationInBIM.y),
        z: THREE.MathUtils.radToDeg(m.rotationInBIM.z)
      },
      floor: m.floorLevel.name,
      elevation: m.floorLevel.elevation,
      size: m.physicalSize,
      description: m.description
    }));

    return JSON.stringify(config, null, 2);
  }

  // ============================================
  // CLEANUP
  // ============================================

  /**
   * Cleanup completo
   */
  dispose(): void {
    console.log('[AR Integration] Disposing...');

    if (this.arViewController) {
      this.arViewController.dispose();
    }

    if (this.deepLinkHandler) {
      this.deepLinkHandler.stop();
    }

    if (this.zeroMarkerSystem) {
      this.zeroMarkerSystem.dispose();
    }

    if (this.arPanel) {
      this.arPanel.dispose();
    }

    console.log('[AR Integration] Disposed');
  }
}

// ============================================
// EXEMPLO DE USO
// ============================================

/**
 * Exemplo de integração completa no ArxisVR
 */
export async function integrateARSystem(
  scene: THREE.Scene,
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer
): Promise<ARIntegrationExample> {
  
  console.log('=== Integrando Sistema AR no ArxisVR ===');

  // 1. Cria instância
  const arSystem = new ARIntegrationExample(scene, camera, renderer);

  // 2. Inicializa
  await arSystem.initialize();

  // 3. Desktop: Cria marcos (se não existir nenhum)
  const status = arSystem.getStatus();
  
  if (status.totalMarkers === 0 && !NativeBridge.isNative()) {
    console.log('Criando marcos de exemplo...');
    await arSystem.createMultipleMarkers();
  }

  // 4. Exibe painel de controle
  arSystem.showARPanel();

  // 5. Mobile: Inicia AR mode automaticamente (se deep link)
  if (NativeBridge.isNative()) {
    // Deep link handler já está configurado e vai iniciar automaticamente
    console.log('Deep link handler ativo. Aguardando scan de QR...');
  }

  console.log('✓ Sistema AR integrado com sucesso!');
  console.log('Status:', arSystem.getStatus());

  return arSystem;
}

// ============================================
// COMANDOS DE DEBUG (Console)
// ============================================

// Disponibiliza globalmente para debug
if (typeof window !== 'undefined') {
  (window as any).ARDebug = {
    
    // Criar marco de teste
    createTestMarker: async (arSystem: ARIntegrationExample) => {
      await arSystem.createEntranceMarker();
    },
    
    // Listar marcos
    listMarkers: (arSystem: ARIntegrationExample) => {
      arSystem.listMarkers();
    },
    
    // Status do sistema
    status: (arSystem: ARIntegrationExample) => {
      console.log(arSystem.getStatus());
    },
    
    // Exportar config
    export: (arSystem: ARIntegrationExample) => {
      console.log(arSystem.exportMarkersConfig());
    },
    
    // Ativar marco
    activate: async (arSystem: ARIntegrationExample, markerName: string) => {
      await arSystem.activateMarkerByName(markerName);
    },
    
    // Iniciar AR (mobile)
    startAR: async (arSystem: ARIntegrationExample) => {
      await arSystem.startARMode();
    },
    
    // Scan QR
    scan: async (arSystem: ARIntegrationExample) => {
      await arSystem.scanQRCode();
    }
  };

  console.log('AR Debug commands available:');
  console.log('  window.ARDebug.createTestMarker(arSystem)');
  console.log('  window.ARDebug.listMarkers(arSystem)');
  console.log('  window.ARDebug.status(arSystem)');
  console.log('  window.ARDebug.export(arSystem)');
  console.log('  window.ARDebug.activate(arSystem, "Marco Nome")');
  console.log('  window.ARDebug.startAR(arSystem)');
  console.log('  window.ARDebug.scan(arSystem)');
}
