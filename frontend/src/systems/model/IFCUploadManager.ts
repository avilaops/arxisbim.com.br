/**
 * IFCUploadManager - Gerenciador de upload de modelos IFC para backend
 * Integra com FileService e FederatedLoader
 */

import { getIfcService, IfcModel, IfcDiscipline, IfcPhase } from '../../api/v1/services';
import { tenantService } from '../../api/v1/services/tenant.service';
import { eventBus } from '../../core';
import type { IFCSimpleLoader } from '../../loaders/IFCSimpleLoader';
import type { Scene } from 'three';

export interface IFCUploadOptions {
  file: File;
  projectId: string;
  discipline: IfcDiscipline;
  phase?: IfcPhase;
  description?: string;
  autoLoad?: boolean; // Auto-load after upload
  captureThumbnail?: boolean; // Generate thumbnail from scene
}

export interface IFCUploadProgress {
  stage: 'validating' | 'uploading' | 'processing' | 'loading' | 'complete';
  progress: number; // 0-100
  message?: string;
}

/**
 * IFC Upload Manager
 * Handles upload workflow and integration with viewer
 */
export class IFCUploadManager {
  private static instance: IFCUploadManager;
  
  private ifcService = getIfcService();
  private ifcLoader: IFCSimpleLoader | null = null;
  private scene: Scene | null = null;
  private currentUploads = new Map<string, IFCUploadProgress>();

  private constructor() {}

  public static getInstance(): IFCUploadManager {
    if (!IFCUploadManager.instance) {
      IFCUploadManager.instance = new IFCUploadManager();
    }
    return IFCUploadManager.instance;
  }

  /**
   * Initialize with IFC loader and scene
   */
  public initialize(ifcLoader: IFCSimpleLoader, scene: Scene): void {
    this.ifcLoader = ifcLoader;
    this.scene = scene;
    console.log('✅ IFCUploadManager initialized');
  }

  /**
   * Upload IFC file to backend
   */
  public async upload(options: IFCUploadOptions): Promise<IfcModel> {
    const uploadId = `upload-${Date.now()}`;
    
    try {
      // Stage 1: Validate file
      this.updateProgress(uploadId, {
        stage: 'validating',
        progress: 0,
        message: 'Validando arquivo IFC...'
      });

      this.validateFile(options.file);

      // Stage 2: Upload to backend
      this.updateProgress(uploadId, {
        stage: 'uploading',
        progress: 10,
        message: 'Enviando para servidor...'
      });

      const model = await this.ifcService.upload({
        file: options.file,
        projectId: options.projectId,
        discipline: options.discipline,
        phase: options.phase,
        description: options.description,
        onProgress: (progress) => {
          this.updateProgress(uploadId, {
            stage: 'uploading',
            progress: 10 + (progress * 0.6), // 10-70%
            message: `Enviando... ${progress.toFixed(0)}%`
          });
        }
      });

      console.log('✅ IFC uploaded:', model.id);

      // Stage 3: Capture thumbnail if requested
      if (options.captureThumbnail && this.scene) {
        this.updateProgress(uploadId, {
          stage: 'processing',
          progress: 75,
          message: 'Gerando thumbnail...'
        });

        await this.captureThumbnail(model.id);
      }

      // Stage 4: Auto-load if requested
      if (options.autoLoad && this.ifcLoader) {
        this.updateProgress(uploadId, {
          stage: 'loading',
          progress: 80,
          message: 'Carregando modelo...'
        });

        await this.loadModelIntoScene(model);
      }

      // Complete
      this.updateProgress(uploadId, {
        stage: 'complete',
        progress: 100,
        message: 'Upload concluído!'
      });

      this.currentUploads.delete(uploadId);

      // Emit event
      eventBus.emit('ifc:uploaded', { model });

      return model;

    } catch (error) {
      console.error('❌ Upload failed:', error);
      this.currentUploads.delete(uploadId);
      throw error;
    }
  }

  /**
   * Load model into scene from backend
   */
  public async loadModelIntoScene(model: IfcModel): Promise<void> {
    if (!this.ifcLoader) {
      throw new Error('IFC Loader not initialized');
    }

    try {
      // Download model from backend
      const blob = await this.downloadModel(model.id);
      const file = new File([blob], model.originalName, { type: 'application/ifc' });

      // Load with IFCSimpleLoader
      await this.ifcLoader.load(file);

      console.log(`✅ Model loaded into scene: ${model.originalName}`);

      // Emit event
      eventBus.emit('ifc:loaded', { model });

    } catch (error) {
      console.error('❌ Failed to load model:', error);
      throw error;
    }
  }

  /**
   * List models for project
   */
  public async listProjectModels(projectId: string): Promise<IfcModel[]> {
    return this.ifcService.listByProject(projectId);
  }

  /**
   * Delete model
   */
  public async deleteModel(modelId: string): Promise<void> {
    await this.ifcService.delete(modelId);
    eventBus.emit('ifc:deleted', { modelId });
  }

  /**
   * Update model metadata
   */
  public async updateModel(
    modelId: string,
    updates: {
      discipline?: IfcDiscipline;
      phase?: IfcPhase;
      description?: string;
    }
  ): Promise<IfcModel> {
    const model = await this.ifcService.updateMetadata(modelId, updates);
    eventBus.emit('ifc:updated', { model });
    return model;
  }

  /**
   * Capture thumbnail from current scene
   */
  private async captureThumbnail(modelId: string): Promise<void> {
    if (!this.scene) return;

    try {
      // Get canvas from renderer
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        console.warn('Canvas not found for thumbnail capture');
        return;
      }

      // Capture thumbnail
      await this.ifcService.captureThumbnail(modelId, canvas, 400, 300);
      console.log(`✅ Thumbnail captured for model: ${modelId}`);

    } catch (error) {
      console.error('❌ Failed to capture thumbnail:', error);
      // Don't throw - thumbnail is optional
    }
  }

  /**
   * Download model blob from backend
   */
  private async downloadModel(modelId: string): Promise<Blob> {
    // Use tenantService for download (simpler, uses correct endpoint)
    return tenantService.downloadIFCModel(modelId);
  }

  /**
   * Validate IFC file
   */
  private validateFile(file: File): void {
    // Check extension
    if (!file.name.toLowerCase().endsWith('.ifc')) {
      throw new Error('Arquivo deve ter extensão .ifc');
    }

    // Check size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`Arquivo muito grande. Máximo: ${maxSize / 1024 / 1024}MB`);
    }

    // Check if empty
    if (file.size === 0) {
      throw new Error('Arquivo vazio');
    }
  }

  /**
   * Update progress for upload
   */
  private updateProgress(uploadId: string, progress: IFCUploadProgress): void {
    this.currentUploads.set(uploadId, progress);
    eventBus.emit('ifc:upload-progress', { uploadId, progress });
  }

  /**
   * Get current uploads
   */
  public getActiveUploads(): Map<string, IFCUploadProgress> {
    return new Map(this.currentUploads);
  }

  /**
   * Get discipline label
   */
  public getDisciplineLabel(discipline: IfcDiscipline): string {
    return this.ifcService.getDisciplineLabel(discipline);
  }

  /**
   * Get discipline color
   */
  public getDisciplineColor(discipline: IfcDiscipline): string {
    return this.ifcService.getDisciplineColor(discipline);
  }

  /**
   * Get phase label
   */
  public getPhaseLabel(phase: IfcPhase | null): string {
    return this.ifcService.getPhaseLabel(phase);
  }

  /**
   * Format file size
   */
  public formatFileSize(bytes: number): string {
    return this.ifcService.formatFileSize(bytes);
  }
}

/**
 * Get IFC Upload Manager singleton
 */
export function getIFCUploadManager(): IFCUploadManager {
  return IFCUploadManager.getInstance();
}
