/**
 * AlignmentTypes - Tipos e interfaces compartilhados do sistema de alinhamento
 */

import { Vector3, Matrix4, Quaternion } from 'three';

/**
 * Ponto de alinhamento exportado por ReferenceTracker
 */
export interface AlignmentPoint {
  id: string;
  label: string;
  digitalPosition: Vector3;
  realWorldPosition?: Vector3;
  timestamp: Date;
}

/**
 * Resultado de alinhamento exportado por ReferenceTracker
 */
export interface AlignmentResult {
  success: boolean;
  transform: Matrix4;
  translation: Vector3;
  rotation: Quaternion;
  scale: Vector3;
  error: number;
  rmse: number;
  alignmentMethod: 'manual' | 'gps' | 'markers';
  timestamp: Date;
}

/**
 * Coordenadas GPS exportado por GPSAlignment
 */
export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy: number;
  heading?: number;
  timestamp: Date;
}

/**
 * Origem do projeto exportado por GPSAlignment
 */
export interface ProjectOrigin {
  gps: GPSCoordinates;
  northDegrees: number;
}

/**
 * Status de alinhamento exportado por ReferenceTracker
 */
export enum AlignmentStatus {
  NOT_ALIGNED = 'not_aligned',
  ALIGNING = 'aligning',
  ALIGNED = 'aligned',
  ERROR = 'error'
}

/**
 * Dados salvos de alinhamento exportado por ReferenceTracker
 */
export interface SavedAlignment {
  projectId: string;
  transform: number[];
  alignmentPoints: AlignmentPoint[];
  result: AlignmentResult;
  createdAt: Date;
  expiresAt?: Date;
}
