/**
 * ARMarkerTypes - Tipos TypeScript para sistema de markers AR
 * 
 * Baseado em:
 * - ArUco markers (OpenCV)
 * - AprilTag (MIT)
 * - MindAR (web AR)
 */

import * as THREE from 'three';

/**
 * Tipos de markers suportados
 */
export enum MarkerType {
  ARUCO = 'aruco',         // ArUco marker (OpenCV)
  APRILTAG = 'apriltag',   // AprilTags (MIT)
  QR = 'qr',               // QR Code com pose
  IMAGE = 'image',         // Natural image tracking (MindAR)
  CUSTOM = 'custom'        // Custom marker
}

/**
 * Dicionário de markers ArUco
 */
export enum ArucoDictionary {
  DICT_4X4_50 = '4x4_50',
  DICT_4X4_100 = '4x4_100',
  DICT_4X4_250 = '4x4_250',
  DICT_5X5_50 = '5x5_50',
  DICT_5X5_100 = '5x5_100',
  DICT_5X5_250 = '5x5_250',
  DICT_6X6_50 = '6x6_50',
  DICT_6X6_100 = '6x6_100',
  DICT_6X6_250 = '6x6_250',
  DICT_7X7_50 = '7x7_50',
  DICT_7X7_100 = '7x7_100',
  DICT_7X7_250 = '7x7_250'
}

/**
 * Nível de pavimento/localização
 */
export interface FloorLevel {
  id: string;
  name: string;
  elevation: number;  // Altura em metros
  buildingId?: string;
}

/**
 * Marker físico registrado no BIM
 */
export interface ARMarker {
  // Identity
  id: string;
  name: string;
  type: MarkerType;
  
  // Marker specifics
  markerId?: number;              // ID numérico (ArUco/AprilTag)
  dictionary?: ArucoDictionary;   // Dicionário ArUco
  imageTarget?: string;           // URL da imagem (MindAR)
  
  // Physical properties
  physicalSize: number;  // Tamanho físico em metros (lado do quadrado)
  
  // BIM position (onde está no modelo)
  positionInBIM: THREE.Vector3;
  rotationInBIM: THREE.Euler;
  quaternionInBIM: THREE.Quaternion;
  matrixInBIM: THREE.Matrix4;
  
  // Location metadata
  floorLevel: FloorLevel;
  buildingSection?: string;
  description?: string;
  
  // Marker role
  role: 'master' | 'auxiliary' | 'temporary';
  
  // Status
  active: boolean;
  lastCalibrated?: number;  // timestamp
  calibrationConfidence?: number;  // 0-1
  
  // Validation
  expirationDate?: number;  // timestamp
  validationHistory?: ValidationRecord[];
}

/**
 * Registro de validação de marker
 */
export interface ValidationRecord {
  timestamp: number;
  userId: string;
  deviceInfo: string;
  confidence: number;
  notes?: string;
}

/**
 * Âncora AR (alinhamento mundo-BIM)
 */
export interface ARAnchor {
  // Identity
  id: string;
  projectId: string;
  sessionId?: string;
  
  // Source marker
  markerId: string;
  markerType: MarkerType;
  
  // Transformations
  T_world_marker: THREE.Matrix4;    // Pose do marker no mundo real
  T_bim_marker: THREE.Matrix4;      // Pose do marker no BIM
  T_world_bim: THREE.Matrix4;       // Alinhamento final (T_world_marker × inv(T_bim_marker))
  
  // Quality metrics
  trackingQuality: number;  // 0-1
  distanceToMarker: number; // em metros
  trackingTime: number;     // ms desde início do tracking
  
  // Device info
  deviceId: string;
  deviceType: 'mobile' | 'tablet' | 'hololens' | 'magic-leap' | 'unknown';
  browserInfo: string;
  
  // Timestamps
  createdAt: number;
  lastUpdatedAt: number;
  expiresAt?: number;
  
  // Optional refinement
  userOffset?: {
    position: THREE.Vector3;
    rotation: THREE.Euler;
  };
}

/**
 * Sessão de calibração AR
 */
export interface CalibrationSession {
  id: string;
  projectId: string;
  markerId: string;
  
  // Status
  status: 'initializing' | 'tracking' | 'calibrated' | 'failed';
  
  // Tracking data
  framesTracked: number;
  averageConfidence: number;
  stabilityScore: number;  // 0-1 (menor variação = mais estável)
  
  // Results
  anchor?: ARAnchor;
  error?: string;
  
  // Timestamps
  startedAt: number;
  completedAt?: number;
  duration?: number;
}

/**
 * Configuração de tracking AR
 */
export interface ARTrackingConfig {
  // Marker detection
  minMarkerSize: number;        // pixels
  maxMarkerSize: number;        // pixels
  searchRadius: number;         // pixels
  
  // Quality thresholds
  minConfidence: number;        // 0-1
  minTrackingTime: number;      // ms
  maxReprojectionError: number; // pixels
  
  // Stabilization
  stabilizationFrames: number;  // frames para média
  positionSmoothing: number;    // 0-1
  rotationSmoothing: number;    // 0-1
  
  // Camera
  cameraFOV: number;            // degrees
  cameraNear: number;           // meters
  cameraFar: number;            // meters
  
  // Performance
  maxFPS: number;
  downscaleFactor: number;      // 1.0 = full res, 0.5 = half res
}

/**
 * Resultado de detecção de marker
 */
export interface MarkerDetectionResult {
  markerId: number | string;
  confidence: number;
  
  // Corners (2D image coordinates)
  corners: Array<{ x: number; y: number }>;
  
  // Center (2D)
  center: { x: number; y: number };
  
  // Pose (3D)
  position: THREE.Vector3;
  rotation: THREE.Euler;
  quaternion: THREE.Quaternion;
  matrix: THREE.Matrix4;
  
  // Quality
  reprojectionError: number;
  poseStability: number;
}

/**
 * Opções de calibração
 */
export interface CalibrationOptions {
  markerId: string;
  autoStart?: boolean;
  requireStability?: boolean;
  stabilityThreshold?: number;
  timeout?: number;  // ms
  onProgress?: (progress: CalibrationProgress) => void;
  onComplete?: (anchor: ARAnchor) => void;
  onError?: (error: Error) => void;
}

/**
 * Progress de calibração
 */
export interface CalibrationProgress {
  phase: 'searching' | 'detecting' | 'tracking' | 'stabilizing' | 'completed';
  progress: number;  // 0-1
  message: string;
  detectionResult?: MarkerDetectionResult;
}

/**
 * Estatísticas de tracking
 */
export interface TrackingStatistics {
  // Session
  sessionId: string;
  duration: number;  // ms
  
  // Detection
  totalFrames: number;
  framesWithDetection: number;
  detectionRate: number;  // %
  
  // Quality
  averageConfidence: number;
  minConfidence: number;
  maxConfidence: number;
  
  // Stability
  positionVariance: THREE.Vector3;
  rotationVariance: THREE.Euler;
  stabilityScore: number;  // 0-1
  
  // Performance
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
}

/**
 * Configuração de exibição de markers (debug/preview)
 */
export interface MarkerVisualizationConfig {
  showMarkers: boolean;
  showAxes: boolean;
  showLabels: boolean;
  showBoundingBoxes: boolean;
  markerScale: number;
  axisLength: number;
  labelFontSize: number;
  opacity: number;
}

/**
 * Preset de markers para obra
 */
export interface MarkerPreset {
  name: string;
  description: string;
  markerType: MarkerType;
  dictionary?: ArucoDictionary;
  physicalSize: number;
  printTemplate: string;  // URL para template de impressão
  recommendedPlacement: string[];
}

/**
 * Log de operação AR
 */
export interface AROperationLog {
  timestamp: number;
  operation: string;
  userId?: string;
  markerId?: string;
  anchorId?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

