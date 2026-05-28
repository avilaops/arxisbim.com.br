/**
 * IFCService
 * Serviço para parsing e manipulação de arquivos IFC
 * Integra com IFCLoader (web-ifc-three) para parsing real
 */

import * as THREE from 'three';
import { IFCLoader } from '../loaders/IFCLoader';
import { eventBus, EventType } from '../core';

export interface IFCParseResult {
  modelId: number;
  fileName: string;
  elements: number;
  triangles: number;
  bounds: { min: number[]; max: number[] };
  properties?: any;
}

export interface IFCPropertyResult {
  expressID: number;
  type: string;
  name: string;
  globalId: string;
  properties: any;
  psets?: any[];
}

export interface IFCQueryOptions {
  type?: string;
  name?: string;
  globalId?: string;
  properties?: Record<string, any>;
}

export interface IfcService {
  parseIFC(file: File): Promise<IFCParseResult>;
  getProperties(modelId: number, expressId: number): Promise<IFCPropertyResult>;
  getAllProperties(modelId: number, expressId: number): Promise<any>;
  queryElements(modelId: number, options: IFCQueryOptions): Promise<any[]>;
  exportGLB(modelId: number): Promise<Blob>;
  getSpatialStructure(modelId: number): Promise<any>;
  getType(modelId: number, expressId: number): Promise<any>;
}

class IFCServiceImpl implements IfcService {
  private ifcLoader: IFCLoader | null = null;
  private loadedModels: Map<number, THREE.Object3D> = new Map();

  /**
   * Define o IFCLoader (injetado pelo AppController)
   */
  setIFCLoader(loader: IFCLoader): void {
    this.ifcLoader = loader;
    console.log('[IFCService] IFCLoader configured');
  }

  /**
   * Parse arquivo IFC
   */
  async parseIFC(file: File): Promise<IFCParseResult> {
    if (!this.ifcLoader) {
      throw new Error('IFCLoader not configured. Call setIFCLoader first.');
    }

    console.log('[IFCService] Parsing IFC file:', file.name);

    // Carrega o arquivo usando IFCLoader
    await this.ifcLoader.loadIFC(file);

    // Obtém o modelo carregado
    const loadedModels = this.ifcLoader.getLoadedModels();
    if (loadedModels.length === 0) {
      throw new Error('No model loaded');
    }

    const model = loadedModels[loadedModels.length - 1];
    const modelId = (model as any).modelID || 0;

    // Conta elementos e triângulos
    let elements = 0;
    let triangles = 0;

    model.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        elements++;
        if (child.geometry.index) {
          triangles += child.geometry.index.count / 3;
        }
      }
    });

    // Calcula bounds
    const box = new THREE.Box3().setFromObject(model);
    const bounds = {
      min: [box.min.x, box.min.y, box.min.z],
      max: [box.max.x, box.max.y, box.max.z],
    };

    // Armazena modelo
    this.loadedModels.set(modelId, model);

    const result: IFCParseResult = {
      modelId,
      fileName: file.name,
      elements,
      triangles,
      bounds,
    };

    console.log('[IFCService] IFC parsed successfully:', result);

    return result;
  }

  /**
   * Obtém propriedades de um elemento IFC
   */
  async getProperties(modelId: number, expressId: number): Promise<IFCPropertyResult> {
    if (!this.ifcLoader) {
      throw new Error('IFCLoader not configured');
    }

    console.log('[IFCService] Getting properties:', { modelId, expressId });

    const properties = await this.ifcLoader.getProperties(modelId, expressId);

    const result: IFCPropertyResult = {
      expressID: expressId,
      type: properties.type || 'Unknown',
      name: properties.Name?.value || 'Unnamed',
      globalId: properties.GlobalId?.value || '',
      properties,
    };

    return result;
  }

  /**
   * Obtém todas as propriedades (incluindo Psets)
   */
  async getAllProperties(modelId: number, expressId: number): Promise<any> {
    if (!this.ifcLoader) {
      throw new Error('IFCLoader not configured');
    }

    return await this.ifcLoader.getAllProperties(modelId, expressId);
  }

  /**
   * Query elementos por critérios
   */
  async queryElements(modelId: number, options: IFCQueryOptions): Promise<any[]> {
    if (!this.ifcLoader) {
      throw new Error('IFCLoader not configured');
    }

    const model = this.loadedModels.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const results: any[] = [];

    model.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh && child.userData.expressID) {
        const expressID = child.userData.expressID;
        const ifcType = child.userData.ifcType || 'Unknown';

        // Filtra por tipo
        if (options.type && ifcType !== options.type) {
          return;
        }

        // Filtra por nome
        if (options.name && !child.name.includes(options.name)) {
          return;
        }

        // Filtra por globalId
        if (options.globalId && child.userData.ifcGuid !== options.globalId) {
          return;
        }

        results.push({
          expressID,
          type: ifcType,
          name: child.name,
          globalId: child.userData.ifcGuid,
          object: child,
        });
      }
    });

    console.log(`[IFCService] Query returned ${results.length} elements`);

    return results;
  }

  /**
   * Exporta modelo para GLB
   */
  async exportGLB(modelId: number): Promise<Blob> {
    const model = this.loadedModels.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    // Import GLTFExporter dinamicamente para evitar import circular
    const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');

    return new Promise((resolve, reject) => {
      const exporter = new GLTFExporter();

      exporter.parse(
        model,
        (gltf: any) => {
          const blob = new Blob([JSON.stringify(gltf)], { type: 'application/json' });
          resolve(blob);
        },
        (error: any) => {
          reject(error);
        },
        { binary: true }
      );
    });
  }

  /**
   * Obtém estrutura espacial
   */
  async getSpatialStructure(modelId: number): Promise<any> {
    if (!this.ifcLoader) {
      throw new Error('IFCLoader not configured');
    }

    return await this.ifcLoader.getSpatialStructure(modelId);
  }

  /**
   * Obtém tipo de elemento
   */
  async getType(modelId: number, expressId: number): Promise<any> {
    if (!this.ifcLoader) {
      throw new Error('IFCLoader not configured');
    }

    return await this.ifcLoader.getType(modelId, expressId);
  }

  /**
   * Remove modelo da memória
   */
  removeModel(modelId: number): void {
    const model = this.loadedModels.get(modelId);
    if (model && this.ifcLoader) {
      this.ifcLoader.removeModel(model);
      this.loadedModels.delete(modelId);
      console.log(`[IFCService] Model ${modelId} removed`);
    }
  }

  /**
   * Limpa todos os modelos
   */
  clear(): void {
    this.loadedModels.forEach((model, modelId) => {
      if (this.ifcLoader) {
        this.ifcLoader.removeModel(model);
      }
    });
    this.loadedModels.clear();
    console.log('[IFCService] All models cleared');
  }
}

// Singleton instance
export const ifcService: IfcService = new IFCServiceImpl();

export default IFCServiceImpl;
