/**
 * Snapshots PNG Types
 * 
 * Types para captura, gerenciamento e exportação de snapshots do viewer 3D
 */

export type SnapshotFormat = 'png' | 'jpeg' | 'webp';
export type SnapshotResolution = 'screen' | 'hd' | 'full-hd' | '4k' | '8k' | 'custom';

export interface SnapshotOptions {
  /** Image format */
  format?: SnapshotFormat;
  
  /** Resolution preset or custom dimensions */
  resolution?: SnapshotResolution;
  
  /** Custom width (for resolution='custom') */
  width?: number;
  
  /** Custom height (for resolution='custom') */
  height?: number;
  
  /** Image quality (0.0 - 1.0, default 0.92 for JPEG/WebP) */
  quality?: number;
  
  /** Include metadata in filename */
  includeMetadata?: boolean;
  
  /** Transparent background (PNG only) */
  transparent?: boolean;
  
  /** Pixel density multiplier (for retina displays) */
  pixelRatio?: number;
  
  /** Anti-aliasing samples (1, 2, 4, 8) */
  antialiasing?: number;
}

export interface CameraView {
  /** Camera position [x, y, z] */
  position: [number, number, number];
  
  /** Camera target/lookAt [x, y, z] */
  target: [number, number, number];
  
  /** Camera up vector (optional) */
  up?: [number, number, number];
  
  /** Field of view (degrees, optional) */
  fov?: number;
  
  /** View name (for metadata) */
  name?: string;
}

export interface SnapshotMetadata {
  /** Snapshot ID */
  id?: string;
  
  /** Timestamp */
  timestamp: Date;
  
  /** Project ID */
  projectId?: string;
  
  /** Model ID */
  modelId?: string;
  
  /** View name */
  viewName?: string;
  
  /** Camera state */
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    fov: number;
  };
  
  /** Selected elements */
  selection?: number[];
  
  /** Tags */
  tags?: string[];
  
  /** User */
  userId?: string;
  
  /** Image dimensions */
  dimensions: {
    width: number;
    height: number;
  };
  
  /** File size (bytes) */
  fileSize?: number;
}

export interface SnapshotInfo {
  /** Snapshot ID */
  id: string;
  
  /** Blob URL (local preview) */
  url: string;
  
  /** Metadata */
  metadata: SnapshotMetadata;
  
  /** Blob reference */
  blob: Blob;
}

export interface OverlayConfig {
  /** Overlay type */
  type: 'watermark' | 'annotation' | 'legend' | 'custom';
  
  /** Watermark text (for type='watermark') */
  text?: string;
  
  /** Position */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  
  /** Font size (px) */
  fontSize?: number;
  
  /** Font color */
  color?: string;
  
  /** Opacity (0.0 - 1.0) */
  opacity?: number;
  
  /** Custom overlay renderer */
  renderer?: (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => void;
}

export interface SnapshotFilter {
  /** Filter by project */
  projectId?: string;
  
  /** Filter by model */
  modelId?: string;
  
  /** Filter by date range */
  dateFrom?: Date;
  dateTo?: Date;
  
  /** Filter by tags */
  tags?: string[];
  
  /** Filter by user */
  userId?: string;
}

export interface SnapshotResult {
  /** Blob */
  blob: Blob;
  
  /** Blob URL (for preview) */
  url: string;
  
  /** Metadata */
  metadata: SnapshotMetadata;
  
  /** File size (bytes) */
  fileSize: number;
}

export type OverlayHandler = (canvas: HTMLCanvasElement, config: OverlayConfig) => void;
export type UnsubscribeFn = () => void;

export const SNAPSHOT_PRESETS: Record<SnapshotResolution, { width: number; height: number }> = {
  screen: { width: 0, height: 0 }, // Current screen size
  hd: { width: 1280, height: 720 },
  'full-hd': { width: 1920, height: 1080 },
  '4k': { width: 3840, height: 2160 },
  '8k': { width: 7680, height: 4320 },
  custom: { width: 0, height: 0 }, // User-specified
};
