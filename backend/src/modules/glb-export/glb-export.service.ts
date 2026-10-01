/**
 * GLB Export Service
 * 
 * Serviço de exportação de modelos IFC para GLB/glTF
 */

import { Document, WebIO, Material, Primitive } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { draco, dedup, flatten, prune, textureCompress, weld } from '@gltf-transform/functions';
import type {
  GLBExportOptions,
  GLBExportResult,
  GLBExportStats,
  GLBExportRequest,
  GLBExportJob,
  GLBExportProgress,
} from './glb-export.types.js';
import { db } from '../../shared/database/db.js';
import { modelElements, ifcModels } from '../../shared/database/schema/index.js';
import { eq, and, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export class GLBExportService {
  private static jobs = new Map<string, GLBExportJob>();
  private static io = new WebIO().registerExtensions(ALL_EXTENSIONS);

  /**
   * Exporta modelo completo para GLB
   */
  static async exportModel(request: GLBExportRequest): Promise<GLBExportResult> {
    const startTime = Date.now();
    const options = this.getDefaultOptions(request.options);

    // 1. Buscar elementos do modelo
    const elements = await this.fetchElements(request);

    // 2. Criar documento glTF
    const document = new Document();
    const buffer = document.createBuffer();
    const scene = document.createScene();

    // 3. Converter elementos IFC para meshes glTF
    const meshStats = await this.convertElements(document, buffer, scene, elements, options);

    // 4. Aplicar otimizações
    if (options.useInstancing || options.mergeGeometry || options.simplify) {
      await this.optimizeDocument(document, options);
    }

    // 5. Aplicar compressão Draco (Desativado temporariamente devido à falta de draco3d.encoder no servidor)
    /*
    if (options.dracoCompression) {
      await document.transform(
        draco({
          quantizePosition: 14,
          quantizeNormal: 10,
          quantizeTexcoord: 12,
          quantizeColor: 8,
          quantizeGeneric: 12,
        })
      );
    }
    */

    // 6. Deduplicate e prune
    await document.transform(dedup(), prune());

    // 7. Exportar para GLB buffer
    const glb = await this.io.writeBinary(document);

    const processingTime = Date.now() - startTime;

    return {
      buffer: Buffer.from(glb),
      size: glb.byteLength,
      mimeType: options.binary ? 'model/gltf-binary' : 'model/gltf+json',
      stats: {
        ...meshStats,
        originalSize: 0,
        compressedSize: glb.byteLength,
        compressionRatio: 1,
        processingTime,
      },
      options,
      timestamp: new Date(),
    };
  }

  /**
   * Exporta seleção de elementos
   */
  static async exportSelection(
    projectId: string,
    modelId: string,
    expressIds: number[],
    options?: GLBExportOptions
  ): Promise<GLBExportResult> {
    return this.exportModel({
      projectId,
      modelId,
      options,
      filter: { expressIds },
    });
  }

  /**
   * Exporta elementos por filtro (BIM Query)
   */
  static async exportByFilter(
    projectId: string,
    modelId: string,
    filter: { types?: string[]; query?: string },
    options?: GLBExportOptions
  ): Promise<GLBExportResult> {
    return this.exportModel({
      projectId,
      modelId,
      options,
      filter,
    });
  }

  /**
   * Cria job de exportação assíncrono
   */
  static async createExportJob(request: GLBExportRequest): Promise<GLBExportJob> {
    const jobId = uuidv4();
    const job: GLBExportJob = {
      jobId,
      status: 'pending',
      progress: {
        progress: 0,
        stage: 'preparing',
        message: 'Preparando exportação...',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.jobs.set(jobId, job);

    // Start processing in background
    this.processJob(jobId, request).catch((error) => {
      job.status = 'failed';
      job.error = error.message;
      job.updatedAt = new Date();
    });

    return job;
  }

  /**
   * Obtém status do job
   */
  static getJobStatus(jobId: string): GLBExportJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Cancela job
   */
  static cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'processing') {
      job.status = 'cancelled';
      job.updatedAt = new Date();
      return true;
    }
    return false;
  }

  // ==================== PRIVATE METHODS ====================

  private static async processJob(jobId: string, request: GLBExportRequest): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'processing';
    job.updatedAt = new Date();

    try {
      const result = await this.exportModel(request);
      job.status = 'completed';
      job.result = result;
      job.progress.progress = 100;
      job.progress.stage = 'finalizing';
      job.progress.message = 'Exportação concluída';
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
    }

    job.updatedAt = new Date();
  }

  private static async fetchElements(request: GLBExportRequest) {
    const { modelId, filter } = request;

    const conditions = [eq(modelElements.ifcModelId, modelId)];

    if (filter?.expressIds && filter.expressIds.length > 0) {
      conditions.push(inArray(modelElements.expressId, filter.expressIds));
    }

    if (filter?.types && filter.types.length > 0) {
      conditions.push(inArray(modelElements.type, filter.types));
    }

    return await db.select().from(modelElements).where(and(...conditions));
  }

  private static async convertElements(
    document: Document,
    buffer: any,
    scene: any,
    elements: any[],
    options: GLBExportOptions
  ): Promise<Omit<GLBExportStats, 'originalSize' | 'compressedSize' | 'compressionRatio' | 'processingTime'>> {
    let totalVertices = 0;
    let totalTriangles = 0;
    let meshCount = 0;
    const materials = new Map<string, Material>();

    for (const element of elements) {
      if (!element.geometry) continue;

      // Parse geometry (simplified - in production would use proper IFC geometry extraction)
      const geometry = typeof element.geometry === 'string' 
        ? JSON.parse(element.geometry) 
        : element.geometry;

      if (!geometry.vertices || !geometry.indices) continue;

      // Create mesh
      const primitive = document.createPrimitive();
      
      // Create accessor for positions
      const positions = document.createAccessor()
        .setArray(new Float32Array(geometry.vertices))
        .setType('VEC3')
        .setBuffer(buffer);
      primitive.setAttribute('POSITION', positions);

      // Create accessor for indices
      const indices = document.createAccessor()
        .setArray(new Uint32Array(geometry.indices))
        .setType('SCALAR')
        .setBuffer(buffer);
      primitive.setIndices(indices);

      // Add normals if available
      if (geometry.normals) {
        const normals = document.createAccessor()
          .setArray(new Float32Array(geometry.normals))
          .setType('VEC3')
          .setBuffer(buffer);
        primitive.setAttribute('NORMAL', normals);
      }

      // Create or reuse material
      if (!options.geometryOnly) {
        const materialKey = element.properties?.Material || 'default';
        let material = materials.get(materialKey);
        
        if (!material) {
          material = document.createMaterial(materialKey);
          material.setBaseColorFactor([0.8, 0.8, 0.8, 1.0]);
          material.setMetallicFactor(0.0);
          material.setRoughnessFactor(0.5);
          materials.set(materialKey, material);
        }
        
        primitive.setMaterial(material);
      }

      // Create mesh and node
      const mesh = document.createMesh(`${element.type}_${element.expressId}`);
      mesh.addPrimitive(primitive);

      const node = document.createNode(`node_${element.expressId}`);
      node.setMesh(mesh);
      scene.addChild(node);

      // Add metadata
      if (options.includeMetadata && element.properties) {
        node.setExtras({
          expressId: element.expressId,
          ifcType: element.type,
          globalId: element.globalId,
          properties: element.properties,
        });
      }

      totalVertices += geometry.vertices.length / 3;
      totalTriangles += geometry.indices.length / 3;
      meshCount++;
    }

    return {
      vertices: totalVertices,
      triangles: totalTriangles,
      meshes: meshCount,
      materials: materials.size,
      textures: 0,
    };
  }

  private static async optimizeDocument(document: Document, options: GLBExportOptions): Promise<void> {
    const transforms = [];

    if (options.mergeGeometry) {
      transforms.push(flatten());
    }

    if (options.simplify && options.simplifyRatio) {
      // Note: simplification requires additional library like meshoptimizer
      // Simplified implementation here
      transforms.push(weld());
    }

    if (transforms.length > 0) {
      await document.transform(...transforms);
    }
  }

  private static getDefaultOptions(options?: GLBExportOptions): GLBExportOptions {
    return {
      dracoCompression: options?.dracoCompression ?? true,
      simplify: options?.simplify ?? false,
      simplifyRatio: options?.simplifyRatio ?? 0.5,
      embedTextures: options?.embedTextures ?? true,
      binary: options?.binary ?? true,
      useInstancing: options?.useInstancing ?? true,
      mergeGeometry: options?.mergeGeometry ?? false,
      geometryOnly: options?.geometryOnly ?? false,
      includeMetadata: options?.includeMetadata ?? true,
      centerAtOrigin: options?.centerAtOrigin ?? false,
      scale: options?.scale ?? 1.0,
      coordinateSystem: options?.coordinateSystem ?? 'right-handed',
      lod: options?.lod ?? 'high',
      maxTextureSize: options?.maxTextureSize ?? 2048,
    };
  }
}
