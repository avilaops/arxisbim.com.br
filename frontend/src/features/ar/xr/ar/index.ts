/**
 * AR Module - Physical world alignment for ArxisVR
 * 
 * Sistema completo de alinhamento BIM-mundo real com múltiplas estratégias:
 * - **Reference Tracker**: Alinhamento manual (3+ pontos) para precisão máxima
 * - **GPS Alignment**: Alinhamento rápido por GPS + bússola
 * - **Marker System**: Alinhamento automático usando QR/ArUco markers
 * 
 * ## Componentes Principais
 * 
 * ### Reference Tracker & GPS (NOVO)
 * - **ReferenceTracker**: Sistema principal de alinhamento manual e por markers
 * - **GPSAlignment**: Alinhamento por GPS + bússola para campo
 * - **AlignmentTypes**: Tipos compartilhados
 * 
 * ### Marker System (Existente)
 * - **ARMarkerTypes**: Tipos TypeScript para markers, âncoras e sessões
 * - **MarkerRegistry**: Gerenciamento e persistência de markers
 * - **MarkerCalibration**: Calibração e tracking (dispositivo móvel)
 * - **ARAlignmentManager**: Aplicação de alinhamento (desktop/web)
 * 
 * ## Arquitetura
 * 
 * ```
 * [Mobile Device]                    [Server]                [Desktop Clients]
 *      |                                |                            |
 *      | 1. Detect marker OR GPS        |                            |
 *      | 2. Calculate T_world_bim       |                            |
 *      | 3. Save anchor =================>                           |
 *      |                                | 4. Persist anchor          |
 *      |                                |                            |
 *      |                                | 5. Sync anchor =============>
 *      |                                |                            |
 *      |                                |      6. Apply T_world_bim  |
 *      |                                |      7. All clients aligned|
 * ```
 * 
 * ## Workflow Típico
 * 
 * ### 1. Alinhamento Manual (Reference Tracker)
 * ```ts
 * import { referenceTracker } from '@/xr/ar';
 * 
 * // Adiciona 3 pontos de referência
 * tracker.addDigitalPoint(new Vector3(0, 0, 0), 'Pilar A1');
 * tracker.addDigitalPoint(new Vector3(10, 0, 0), 'Pilar B1');
 * tracker.addDigitalPoint(new Vector3(0, 10, 0), 'Pilar C1');
 * 
 * // Em AR, clica nos pontos reais
 * tracker.setRealWorldPosition(point1.id, realPos1);
 * tracker.setRealWorldPosition(point2.id, realPos2);
 * tracker.setRealWorldPosition(point3.id, realPos3);
 * 
 * // Calcula e aplica alinhamento
 * const result = tracker.calculateAlignment('manual');
 * tracker.applyAlignment(scene);
 * 
 * console.log(`Erro: ${result.error.toFixed(2)} cm`);
 * ```
 * 
 * ### 2. Alinhamento por GPS
 * ```ts
 * import { gpsAlignment } from '@/xr/ar';
 * 
 * // Define origem do projeto (ex: da modelo IFC)
 * const origin = gpsAlignment.setProjectOrigin(
 *   -23.550520,  // Latitude
 *   -46.633308,  // Longitude
 *   760,         // Altitude (m)
 *   15           // Norte do projeto = 15° do norte verdadeiro
 * );
 * 
 * // Obtem posição atual e alinha
 * await gpsAlignment.startTracking();
 * const heading = await gpsAlignment.getHeading();
 * const transform = gpsAlignment.alignModelToGPS(origin);
 * 
 * scene.matrixAutoUpdate = false;
 * scene.matrix.copy(transform);
 * ```
 * 
 * ### 3. Registro de Markers (Admin - Sistema Existente)
 * ```ts
 * import { MarkerRegistry, MarkerType, ArucoDictionary } from '@/xr/ar';
 * 
 * const registry = new MarkerRegistry({
 *   serverUrl: 'https://api.arxis.cloud',
 *   projectId: 'project-123'
 * });
 * 
 * // Registra marker no BIM
 * const marker = await registry.registerMarker({
 *   name: 'Pilar P1',
 *   type: MarkerType.ARUCO,
 *   markerId: 42,
 *   dictionary: ArucoDictionary.DICT_6X6_250,
 *   physicalSize: 0.297,  // A4 = 29.7cm
 *   positionInBIM: new THREE.Vector3(5, 0, 10),
 *   rotationInBIM: new THREE.Euler(0, 0, 0),
 *   quaternionInBIM: new THREE.Quaternion(),
 *   matrixInBIM: new THREE.Matrix4(),
 *   floorLevel: {
 *     id: 'floor-1',
 *     name: 'Térreo',
 *     elevation: 0
 *   },
 *   role: 'master'
 * });
 * ```
 * 
 * ### 2. Calibração (Mobile)
 * ```ts
 * import { MarkerCalibration } from '@/xr/ar';
 * 
 * const calibrator = new MarkerCalibration(camera, registry);
 * await calibrator.initialize('arjs');
 * 
 * const anchor = await calibrator.calibrate({
 *   markerId: 'marker-42',
 *   onProgress: (progress) => {
 *     console.log(`${progress.phase}: ${progress.progress * 100}%`);
 *     updateUI(progress.message);
 *   }
 * });
 * 
 * console.log('Calibrated! Anchor ID:', anchor.id);
 * ```
 * 
 * ### 3. Alinhamento (Desktop/Web)
 * ```ts
 * import { ARAlignmentManager } from '@/xr/ar';
 * 
 * const alignmentManager = new ARAlignmentManager(scene, registry, {
 *   autoUpdate: true,
 *   visualize: true
 * });
 * 
 * // Aplica âncora ativa
 * await alignmentManager.applyActiveAnchor('project-123');
 * 
 * // Ajuste manual se necessário
 * alignmentManager.addOffset({ x: 0.05, y: 0, z: 0 });
 * 
 * // Conversão de coordenadas
 * const worldPos = alignmentManager.bimToWorld(new THREE.Vector3(5, 0, 10));
 * ```
 * 
 * ## Coordenadas
 * 
 * - **BIM Coordinates**: Sistema de coordenadas do modelo IFC
 * - **World Coordinates**: Sistema de coordenadas do mundo real
 * - **T_world_bim**: Matriz de transformação que leva BIM → World
 * 
 * Cálculo: `T_world_bim = T_world_marker × inverse(T_bim_marker)`
 * 
 * Onde:
 * - `T_world_marker`: Pose do marker no mundo real (detectada pela câmera)
 * - `T_bim_marker`: Pose do marker no BIM (registrada manualmente)
 * 
 * ## Markers Suportados
 * 
 * - **ArUco**: OpenCV fiducial markers (recomendado)
 * - **AprilTag**: MIT fiducial markers
 * - **QR Code**: QR codes com pose tracking
 * - **Image**: Natural image tracking (MindAR)
 * 
 * ## Boas Práticas
 * 
 * 1. **Tamanho de Markers**:
 *    - Interiores: A4 (21×29.7cm) ou A3 (29.7×42cm)
 *    - Exteriores: Maior (50×50cm ou mais)
 * 
 * 2. **Posicionamento**:
 *    - Fixo (não em portas, janelas móveis)
 *    - Altura dos olhos (~1.5m)
 *    - Sem obstruções
 *    - Boa iluminação
 * 
 * 3. **Redundância**:
 *    - 1 master + 2 auxiliares por andar
 *    - Separar por pavimento
 * 
 * 4. **Impressão**:
 *    - Papel fosco (sem brilho)
 *    - Alta resolução (300+ DPI)
 *    - Proteger com plástico se exposto
 * 
 * @module AR
 */

// Types
export * from './ARMarkerTypes';

// Core classes
export { MarkerRegistry } from './MarkerRegistry';
export { MarkerCalibration } from './MarkerCalibration';
export { ARAlignmentManager } from './ARAlignmentManager';
export { ARMarkerTool } from './ARMarkerTool';

// Re-export types for convenience
export type {
  ARMarker,
  ARAnchor,
  FloorLevel,
  CalibrationSession,
  CalibrationOptions,
  CalibrationProgress,
  MarkerDetectionResult,
  ARTrackingConfig,
  TrackingStatistics,
  ValidationRecord,
  AROperationLog,
  MarkerVisualizationConfig,
  MarkerPreset
} from './ARMarkerTypes';

export type {
  MarkerRegistryConfig
} from './MarkerRegistry';

export type {
  AlignmentState,
  AlignmentOptions
} from './ARAlignmentManager';

// QR Code System (NEW)
export { QRCodeScanner } from './QRCodeScanner';
export type { ArxisQRData, QRScanResult, QRScanOptions } from './QRCodeScanner';

export { QRCodeGenerator } from './QRCodeGenerator';
export type { 
  ZeroMarkerConfig, 
  QRGenerateOptions, 
  GeneratedQRCode 
} from './QRCodeGenerator';

export { DeepLinkHandler } from './DeepLinkHandler';
export type { DeepLinkType, DeepLinkEvent } from './DeepLinkHandler';

export { ARZeroMarkerSystem } from './ARZeroMarkerSystem';
export type { 
  CreateZeroMarkerConfig, 
  ZeroMarker, 
  ZeroMarkerSystemState 
} from './ARZeroMarkerSystem';

export { ARViewController } from './ARViewController';
export type { 
  ARSessionConfig, 
  ARSessionState, 
  ARViewerOptions 
} from './ARViewController';

// ========================================
// Reference Tracker & GPS Alignment (NEW)
// Competitive feature with Augin
// ========================================

export { ReferenceTracker, referenceTracker } from './ReferenceTracker';
export { GPSAlignment, gpsAlignment, dmsToDecimal, decimalToDMS } from './GPSAlignment';

export type {
  AlignmentPoint,
  AlignmentResult,
  AlignmentStatus,
  SavedAlignment,
  GPSCoordinates,
  ProjectOrigin
} from './AlignmentTypes';
