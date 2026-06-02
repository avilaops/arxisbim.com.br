/**
 * Snapshots PNG Service
 * 
 * Service para captura, gerenciamento e exportação de snapshots do viewer 3D
 */

import type {
  SnapshotOptions,
  SnapshotResult,
  SnapshotMetadata,
  SnapshotInfo,
  SnapshotFilter,
  CameraView,
  OverlayConfig,
  OverlayHandler,
  UnsubscribeFn,
  SnapshotFormat,
  SnapshotResolution,
} from './snapshots-png.types';
import { SNAPSHOT_PRESETS } from './snapshots-png.types';

export class SnapshotsPNGService {
  private static snapshots = new Map<string, SnapshotInfo>();
  private static captureCallbacks: ((blob: Blob) => void)[] = [];
  private static progressCallbacks: ((progress: number) => void)[] = [];
  private static overlayHandlers = new Map<string, OverlayHandler>();
  private static defaultOptions: SnapshotOptions = {
    format: 'png',
    resolution: 'full-hd',
    quality: 0.92,
    transparent: false,
    pixelRatio: 1,
    antialiasing: 4,
  };

  /**
   * Captura snapshot do viewer 3D
   */
  static async captureSnapshot(
    canvas: HTMLCanvasElement,
    options?: SnapshotOptions
  ): Promise<SnapshotResult> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Get dimensions
    const { width, height } = this.getTargetDimensions(canvas, opts);
    
    // Create high-res canvas
    const targetCanvas = document.createElement('canvas');
    targetCanvas.width = width * (opts.pixelRatio || 1);
    targetCanvas.height = height * (opts.pixelRatio || 1);
    
    const ctx = targetCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    
    // Draw source canvas to target canvas (scaled)
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, targetCanvas.width, targetCanvas.height);
    
    // Convert to blob
    const blob = await this.canvasToBlob(targetCanvas, opts.format!, opts.quality!);
    
    // Generate metadata
    const metadata = this.createMetadata(width, height, blob.size);
    
    // Generate URL for preview
    const url = URL.createObjectURL(blob);
    
    // Emit event
    this.emitCaptureEvent(blob);
    
    return {
      blob,
      url,
      metadata,
      fileSize: blob.size,
    };
  }

  /**
   * Captura snapshot com overlay
   */
  static async captureWithOverlay(
    canvas: HTMLCanvasElement,
    overlay: OverlayConfig,
    options?: SnapshotOptions
  ): Promise<SnapshotResult> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Get dimensions
    const { width, height } = this.getTargetDimensions(canvas, opts);
    
    // Create high-res canvas
    const targetCanvas = document.createElement('canvas');
    targetCanvas.width = width * (opts.pixelRatio || 1);
    targetCanvas.height = height * (opts.pixelRatio || 1);
    
    const ctx = targetCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    
    // Draw source canvas
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(canvas, 0, 0, targetCanvas.width, targetCanvas.height);
    
    // Apply overlay
    this.applyOverlay(targetCanvas, overlay);
    
    // Convert to blob
    const blob = await this.canvasToBlob(targetCanvas, opts.format!, opts.quality!);
    
    // Generate metadata
    const metadata = this.createMetadata(width, height, blob.size);
    
    // Generate URL
    const url = URL.createObjectURL(blob);
    
    // Emit event
    this.emitCaptureEvent(blob);
    
    return {
      blob,
      url,
      metadata,
      fileSize: blob.size,
    };
  }

  /**
   * Captura em lote (múltiplas vistas)
   */
  static async captureBatch(
    canvas: HTMLCanvasElement,
    views: CameraView[],
    setCameraView: (view: CameraView) => void,
    renderFrame: () => void,
    options?: SnapshotOptions
  ): Promise<SnapshotResult[]> {
    const results: SnapshotResult[] = [];
    
    for (let i = 0; i < views.length; i++) {
      // Update progress
      this.emitProgressEvent((i + 1) / views.length);
      
      // Set camera view
      setCameraView(views[i]);
      
      // Render frame
      renderFrame();
      
      // Wait for render
      await this.delay(100);
      
      // Capture
      const result = await this.captureSnapshot(canvas, options);
      
      // Update metadata with view name
      if (views[i].name) {
        result.metadata.viewName = views[i].name;
      }
      
      results.push(result);
    }
    
    return results;
  }

  /**
   * Preview snapshot (retorna URL temporária)
   */
  static previewSnapshot(blob: Blob): string {
    return URL.createObjectURL(blob);
  }

  /**
   * Download snapshot
   */
  static downloadSnapshot(blob: Blob, filename?: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || this.generateFilename();
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Upload snapshot (integração com StorageService)
   */
  static async uploadSnapshot(
    blob: Blob,
    metadata: Partial<SnapshotMetadata>,
    uploadFn: (blob: Blob, filename: string) => Promise<string>
  ): Promise<string> {
    const filename = this.generateFilename(metadata);
    const url = await uploadFn(blob, filename);
    
    // Store snapshot info
    const id = this.generateId();
    this.snapshots.set(id, {
      id,
      url,
      metadata: { ...this.createMetadata(0, 0, blob.size), ...metadata },
      blob,
    });
    
    return url;
  }

  /**
   * Lista snapshots
   */
  static listSnapshots(filter?: SnapshotFilter): SnapshotInfo[] {
    let snapshots = Array.from(this.snapshots.values());
    
    if (filter) {
      if (filter.projectId) {
        snapshots = snapshots.filter(s => s.metadata.projectId === filter.projectId);
      }
      if (filter.modelId) {
        snapshots = snapshots.filter(s => s.metadata.modelId === filter.modelId);
      }
      if (filter.dateFrom) {
        snapshots = snapshots.filter(s => s.metadata.timestamp >= filter.dateFrom!);
      }
      if (filter.dateTo) {
        snapshots = snapshots.filter(s => s.metadata.timestamp <= filter.dateTo!);
      }
      if (filter.tags && filter.tags.length > 0) {
        snapshots = snapshots.filter(s =>
          filter.tags!.some(tag => s.metadata.tags?.includes(tag))
        );
      }
      if (filter.userId) {
        snapshots = snapshots.filter(s => s.metadata.userId === filter.userId);
      }
    }
    
    return snapshots;
  }

  /**
   * Deleta snapshot
   */
  static deleteSnapshot(id: string): void {
    const snapshot = this.snapshots.get(id);
    if (snapshot) {
      URL.revokeObjectURL(snapshot.url);
      this.snapshots.delete(id);
    }
  }

  /**
   * Registra callback de captura
   */
  static onSnapshotCaptured(callback: (blob: Blob) => void): UnsubscribeFn {
    this.captureCallbacks.push(callback);
    return () => {
      const index = this.captureCallbacks.indexOf(callback);
      if (index > -1) {
        this.captureCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Registra callback de progresso
   */
  static onCaptureProgress(callback: (progress: number) => void): UnsubscribeFn {
    this.progressCallbacks.push(callback);
    return () => {
      const index = this.progressCallbacks.indexOf(callback);
      if (index > -1) {
        this.progressCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Define opções padrão
   */
  static setSnapshotDefaults(options: SnapshotOptions): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }

  /**
   * Registra handler de overlay customizado
   */
  static registerOverlay(type: string, handler: OverlayHandler): void {
    this.overlayHandlers.set(type, handler);
  }

  /**
   * Captura rápida com configuração padrão
   */
  static async quickCapture(canvas: HTMLCanvasElement): Promise<Blob> {
    const result = await this.captureSnapshot(canvas, {
      format: 'png',
      resolution: 'screen',
      quality: 0.92,
    });
    return result.blob;
  }

  /**
   * Captura em alta resolução (4K)
   */
  static async captureHighRes(canvas: HTMLCanvasElement): Promise<Blob> {
    const result = await this.captureSnapshot(canvas, {
      format: 'png',
      resolution: '4k',
      quality: 1.0,
      pixelRatio: 2,
    });
    return result.blob;
  }

  // ==================== PRIVATE METHODS ====================

  private static getTargetDimensions(
    canvas: HTMLCanvasElement,
    options: SnapshotOptions
  ): { width: number; height: number } {
    const resolution = options.resolution || 'full-hd';
    
    if (resolution === 'screen') {
      return { width: canvas.width, height: canvas.height };
    }
    
    if (resolution === 'custom') {
      return { width: options.width || canvas.width, height: options.height || canvas.height };
    }
    
    return SNAPSHOT_PRESETS[resolution];
  }

  private static async canvasToBlob(
    canvas: HTMLCanvasElement,
    format: SnapshotFormat,
    quality: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const mimeType = `image/${format}`;
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        mimeType,
        quality
      );
    });
  }

  private static applyOverlay(canvas: HTMLCanvasElement, overlay: OverlayConfig): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Custom overlay handler
    if (overlay.type === 'custom' && overlay.renderer) {
      overlay.renderer(canvas, ctx);
      return;
    }
    
    // Registered overlay handler
    const handler = this.overlayHandlers.get(overlay.type);
    if (handler) {
      handler(canvas, overlay);
      return;
    }
    
    // Built-in watermark
    if (overlay.type === 'watermark' && overlay.text) {
      this.applyWatermark(canvas, overlay);
    }
  }

  private static applyWatermark(canvas: HTMLCanvasElement, overlay: OverlayConfig): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const fontSize = overlay.fontSize || 24;
    const color = overlay.color || '#FFFFFF';
    const opacity = overlay.opacity || 0.7;
    const text = overlay.text || '';
    
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = color;
    ctx.globalAlpha = opacity;
    
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize;
    
    let x = 10;
    let y = canvas.height - 10;
    
    // Position
    switch (overlay.position) {
      case 'top-left':
        x = 10;
        y = textHeight + 10;
        break;
      case 'top-right':
        x = canvas.width - textWidth - 10;
        y = textHeight + 10;
        break;
      case 'bottom-left':
        x = 10;
        y = canvas.height - 10;
        break;
      case 'bottom-right':
        x = canvas.width - textWidth - 10;
        y = canvas.height - 10;
        break;
      case 'center':
        x = (canvas.width - textWidth) / 2;
        y = canvas.height / 2;
        break;
    }
    
    ctx.fillText(text, x, y);
    ctx.globalAlpha = 1.0;
  }

  private static createMetadata(
    width: number,
    height: number,
    fileSize: number
  ): SnapshotMetadata {
    return {
      timestamp: new Date(),
      camera: {
        position: [0, 0, 0],
        target: [0, 0, 0],
        fov: 75,
      },
      dimensions: { width, height },
      fileSize,
    };
  }

  private static generateFilename(metadata?: Partial<SnapshotMetadata>): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const project = metadata?.projectId ? `_${metadata.projectId}` : '';
    const view = metadata?.viewName ? `_${metadata.viewName.replace(/\s+/g, '-')}` : '';
    return `snapshot${project}${view}_${timestamp}.png`;
  }

  private static generateId(): string {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static emitCaptureEvent(blob: Blob): void {
    this.captureCallbacks.forEach(cb => cb(blob));
  }

  private static emitProgressEvent(progress: number): void {
    this.progressCallbacks.forEach(cb => cb(progress));
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
