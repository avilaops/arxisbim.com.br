/**
 * AR Markers System - Example Usage
 * 
 * Demonstra como integrar o sistema de AR Markers no ArxisVR
 */

import * as THREE from 'three';
import {
  MarkerRegistry,
  MarkerType,
  ArucoDictionary,
  ARMarkerTool,
  MarkerCalibration,
  ARAlignmentManager
} from '@/xr/ar';

// ============================================
// 1. SETUP INICIAL (TODOS OS CLIENTES)
// ============================================

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const registry = new MarkerRegistry({
  serverUrl: 'https://api.arxis.cloud',
  projectId: 'obra-residencial-2024',
  autoSync: true,
  syncInterval: 5000
});

// Registra andares
registry.registerFloor({
  id: 'floor-ground',
  name: 'Térreo',
  elevation: 0.0
});

registry.registerFloor({
  id: 'floor-1',
  name: '1º Andar',
  elevation: 3.5
});

// ============================================
// 2. MODO ADMIN - REGISTRO DE MARKERS
// ============================================

function setupAdminMode() {
  const markerTool = new ARMarkerTool(scene, camera, registry, {
    defaultMarkerSize: 0.21,  // A4
    defaultMarkerType: MarkerType.ARUCO,
    defaultDictionary: ArucoDictionary.DICT_6X6_250,
    showPreview: true,
    visualizationConfig: {
      showMarkers: true,
      showAxes: true,
      showLabels: true
    }
  });

  // Ativa ferramenta
  markerTool.activate();

  // Escuta placement
  markerTool.addEventListener('markerPlacementReady', async (event: Event) => {
    const customEvent = event as CustomEvent;
    const placement = customEvent.detail;

    console.log('Marker ready to place at:', placement.position);

    // Mostra modal para usuário configurar
    const markerConfig = await showMarkerConfigurationModal();

    if (markerConfig) {
      try {
        const marker = await markerTool.confirmPlacement({
          name: markerConfig.name,
          type: MarkerType.ARUCO,
          markerId: markerConfig.id,
          dictionary: ArucoDictionary.DICT_6X6_250,
          physicalSize: 0.21,
          floorLevel: markerConfig.floor,
          role: markerConfig.role,
          description: markerConfig.description
        });

        console.log('✅ Marker registered:', marker.id);
        showNotification('Marker registrado com sucesso!');
      } catch (error) {
        console.error('❌ Failed to register marker:', error);
        showNotification('Erro ao registrar marker', 'error');
      }
    }
  });

  // Tecla Esc para desativar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      markerTool.deactivate();
      console.log('ARMarkerTool deactivated');
    }
  });

  return markerTool;
}

// ============================================
// 3. MODO MOBILE - CALIBRAÇÃO
// ============================================

async function setupMobileCalibration(markerId: string) {
  const calibrator = new MarkerCalibration(camera, registry, {
    minConfidence: 0.7,
    minTrackingTime: 1500,
    stabilizationFrames: 30,
    maxFPS: 30,
    downscaleFactor: 0.75
  });

  // Inicializa AR backend
  await calibrator.initialize('arjs');

  // UI elements
  const progressBar = document.getElementById('progress-bar')!;
  const statusText = document.getElementById('status-text')!;
  const confidenceText = document.getElementById('confidence')!;
  const framesText = document.getElementById('frames')!;
  const stabilityText = document.getElementById('stability')!;

  try {
    const anchor = await calibrator.calibrate({
      markerId,
      requireStability: true,
      timeout: 30000,

      onProgress: (progress) => {
        // Atualiza UI
        progressBar.style.width = `${progress.progress * 100}%`;
        statusText.textContent = progress.message;

        if (progress.detectionResult) {
          const { confidence } = progress.detectionResult;
          confidenceText.textContent = `${(confidence * 100).toFixed(0)}%`;
        }

        // Estatísticas
        const stats = calibrator.getStatistics();
        if (stats) {
          framesText.textContent = `${stats.framesWithDetection}`;
          stabilityText.textContent = `${(stats.stabilityScore * 100).toFixed(0)}%`;
        }
      }
    });

    console.log('✅ Calibration completed!', anchor);
    showSuccessScreen(anchor);

    // Anchor já foi salvo automaticamente no servidor
    return anchor;
  } catch (error) {
    console.error('❌ Calibration failed:', error);
    showErrorScreen(error);
    throw error;
  } finally {
    calibrator.dispose();
  }
}

// ============================================
// 4. MODO DESKTOP - ALINHAMENTO
// ============================================

async function setupDesktopAlignment() {
  const alignmentManager = new ARAlignmentManager(scene, registry, {
    autoUpdate: true,
    updateInterval: 5000,
    applyToScene: true,
    visualize: true
  });

  try {
    // Sincroniza registry primeiro
    await registry.sync();

    // Aplica âncora ativa do projeto
    await alignmentManager.applyActiveAnchor('obra-residencial-2024');

    console.log('✅ BIM aligned to physical world!');
    showNotification('Modelo alinhado ao mundo real');

    // Mostra estado
    const state = alignmentManager.getState();
    console.log('Alignment state:', state);

    // Escuta eventos
    alignmentManager.addEventListener('aligned', (event: Event) => {
      const customEvent = event as CustomEvent;
      const anchor = customEvent.detail;
      console.log('Alignment applied:', anchor.id);
    });

    // Controles de ajuste manual (opcional)
    setupManualAdjustmentControls(alignmentManager);

    return alignmentManager;
  } catch (error) {
    console.error('❌ Failed to apply alignment:', error);
    showNotification('Erro ao aplicar alinhamento', 'error');
    throw error;
  }
}

// ============================================
// 5. CONTROLES DE AJUSTE MANUAL
// ============================================

function setupManualAdjustmentControls(alignmentManager: ARAlignmentManager) {
  // Offset de posição
  document.getElementById('offset-x-plus')?.addEventListener('click', () => {
    alignmentManager.addOffset({ x: 0.05 });
    console.log('Offset +5cm em X');
  });

  document.getElementById('offset-x-minus')?.addEventListener('click', () => {
    alignmentManager.addOffset({ x: -0.05 });
    console.log('Offset -5cm em X');
  });

  // Offset de rotação
  document.getElementById('rotate-y-plus')?.addEventListener('click', () => {
    alignmentManager.addRotationOffset({ y: 1 });
    console.log('Rotação +1° em Y');
  });

  document.getElementById('rotate-y-minus')?.addEventListener('click', () => {
    alignmentManager.addRotationOffset({ y: -1 });
    console.log('Rotação -1° em Y');
  });

  // Salvar ajustes
  document.getElementById('save-offset')?.addEventListener('click', async () => {
    try {
      await alignmentManager.saveUserOffset();
      console.log('✅ User offset saved');
      showNotification('Ajustes salvos com sucesso');
    } catch (error) {
      console.error('❌ Failed to save offset:', error);
      showNotification('Erro ao salvar ajustes', 'error');
    }
  });

  // Resetar ajustes
  document.getElementById('reset-offset')?.addEventListener('click', () => {
    alignmentManager.clearOffset();
    console.log('Offset reset');
    showNotification('Ajustes resetados');
  });

  // Remover alinhamento
  document.getElementById('remove-alignment')?.addEventListener('click', async () => {
    try {
      await alignmentManager.removeAlignment();
      console.log('Alignment removed');
      showNotification('Alinhamento removido');
    } catch (error) {
      console.error('Failed to remove alignment:', error);
    }
  });
}

// ============================================
// 6. CONVERSÃO DE COORDENADAS
// ============================================

function demonstrateCoordinateConversion(alignmentManager: ARAlignmentManager) {
  if (!alignmentManager.isAligned()) {
    console.warn('Not aligned, coordinate conversion unavailable');
    return;
  }

  // Ponto no BIM (ex: pilar)
  const pillarInBIM = new THREE.Vector3(5, 0, 10);

  // Converte para mundo real
  const pillarInWorld = alignmentManager.bimToWorld(pillarInBIM);

  console.log('Pilar no BIM:', pillarInBIM);
  console.log('Pilar no mundo:', pillarInWorld);

  // Converte de volta
  const pillarBackToBIM = alignmentManager.worldToBim(pillarInWorld);
  console.log('Validação (deve ser igual):', pillarBackToBIM);
}

// ============================================
// 7. EXPORT DE MARKERS PARA IMPRESSÃO
// ============================================

function exportMarkersForPrinting(markerTool: ARMarkerTool) {
  // Exporta todos os markers
  markerTool.addEventListener('markersExported', (event: Event) => {
    const customEvent = event as CustomEvent;
    const { markers } = customEvent.detail;

    console.log(`Exporting ${markers.length} markers for printing`);

    // Aqui você geraria PDFs com os markers ArUco
    // Usando bibliotecas como jsPDF + opencv-aruco
    markers.forEach((marker: any) => {
      console.log(`- Marker ${marker.name} (ID: ${marker.markerId})`);
      console.log(`  Size: ${marker.physicalSize * 100}cm`);
      console.log(`  Type: ${marker.type}`);
      console.log(`  Floor: ${marker.floorLevel.name}`);
    });
  });

  // Exporta apenas markers de um andar
  const floorMarkers = registry.getMarkersByFloor('floor-ground');
  markerTool.exportMarkersForPrint(floorMarkers.map(m => m.id));
}

// ============================================
// 8. UTILITÁRIOS UI (PLACEHOLDER)
// ============================================

async function showMarkerConfigurationModal(): Promise<any> {
  // Implementar modal real com form
  return {
    name: 'Térreo - Pilar P1',
    id: 42,
    floor: {
      id: 'floor-ground',
      name: 'Térreo',
      elevation: 0
    },
    role: 'master',
    description: 'Marker principal do térreo'
  };
}

function showNotification(message: string, type: 'success' | 'error' = 'success') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  // Implementar toast real
}

function showSuccessScreen(anchor: any) {
  console.log('✅ SUCCESS! Anchor:', anchor);
  // Implementar tela de sucesso real
}

function showErrorScreen(error: any) {
  console.error('❌ ERROR:', error);
  // Implementar tela de erro real
}

// ============================================
// 9. EXEMPLO DE INTEGRAÇÃO COMPLETA
// ============================================

export async function initializeARSystem(mode: 'admin' | 'mobile' | 'desktop') {
  console.log(`Initializing AR system in ${mode} mode`);

  if (mode === 'admin') {
    return setupAdminMode();
  } else if (mode === 'mobile') {
    const markerId = new URLSearchParams(window.location.search).get('marker') || 'marker-1';
    return setupMobileCalibration(markerId);
  } else if (mode === 'desktop') {
    return setupDesktopAlignment();
  }
}

// Usage examples:
// initializeARSystem('admin');     // Admin web app
// initializeARSystem('mobile');    // Mobile calibration page
// initializeARSystem('desktop');   // Desktop viewer
