/**
 * PropertyResolver - Extrai propriedades de objetos IFC/Three.js
 */

import * as THREE from 'three';
import { SelectionPayload } from './SelectionService';
import { propertyExtractor } from '../features/bim-4d/bim/inspector/PropertyExtractor';
import type { InspectionData } from '../features/bim-4d/bim/inspector/PropertyTypes';

export interface PropertySection {
  section: string;
  properties: PropertyItem[];
}

export interface PropertyItem {
  key: string;
  value: string;
}

export class PropertyResolver {
  private propertiesCache: Map<string | number, PropertySection[]> = new Map();
  private ifcLoader: any = null; // Referência ao IFC loader (será injetada)
  private scene: THREE.Scene | null = null; // Referência à scene (será injetada)

  /**
   * Injeta referência ao IFC loader
   */
  public setIfcLoader(loader: any): void {
    this.ifcLoader = loader;
    propertyExtractor.setIfcLoader(loader);
    console.log('🔧 IFC Loader injetado no PropertyResolver e PropertyExtractor');
  }

  /**
   * Injeta referência à scene
   */
  public setScene(scene: THREE.Scene): void {
    this.scene = scene;
    propertyExtractor.setScene(scene);
    console.log('🔧 Scene injetada no PropertyResolver e PropertyExtractor');
  }

  /**
   * Resolve propriedades de um objeto selecionado
   */
  public async resolveProperties(payload: SelectionPayload): Promise<PropertySection[]> {
    const cacheKey = payload.id;

    // Verificar cache
    if (this.propertiesCache.has(cacheKey)) {
      return this.propertiesCache.get(cacheKey)!;
    }

    let sections: PropertySection[] = [];

    if (payload.type === 'ifc' && this.ifcLoader) {
      sections = await this.resolveIfcProperties(payload);
    } else {
      sections = this.resolveMeshProperties(payload);
    }

    // Cachear resultado
    this.propertiesCache.set(cacheKey, sections);

    return sections;
  }

  /**
   * Resolve propriedades de objeto IFC
   */
  private async resolveIfcProperties(payload: SelectionPayload): Promise<PropertySection[]> {
    const sections: PropertySection[] = [];

    try {
      // Usar PropertyExtractor se disponível (dados reais do IFC)
      if (payload.expressID !== undefined && payload.modelID !== undefined && this.ifcLoader) {
        console.log(`🔍 Extraindo propriedades IFC reais para expressID ${payload.expressID}...`);
        
        const inspectionData: InspectionData = await propertyExtractor.extractProperties(
          payload.expressID,
          payload.modelID
        );
        
        // Converter InspectionData para PropertySection[]
        for (const section of inspectionData.sections) {
          const properties: PropertyItem[] = section.properties.map(prop => ({
            key: prop.name,
            value: this.formatPropertyValue(prop.value)
          }));
          
          if (properties.length > 0) {
            sections.push({
              section: section.category,
              properties
            });
          }
        }
        
        console.log(`✅ ${sections.length} seções de propriedades extraídas`);
      }
      
      // Fallback: propriedades básicas se não conseguir extrair
      if (sections.length === 0) {
        console.log('⚠️ Usando propriedades básicas (fallback)');
        
        sections.push({
          section: 'Identity',
          properties: [
            { key: 'ExpressID', value: String(payload.expressID ?? 'N/A') },
            { key: 'ModelID', value: String(payload.modelID ?? 'N/A') },
            { key: 'Type', value: payload.type },
            { key: 'UUID', value: String(payload.id) }
          ]
        });

        // Propriedades do userData
        const userData = payload.object3D.userData;
        if (userData && Object.keys(userData).length > 0) {
          const userDataProps: PropertyItem[] = [];
          for (const [key, value] of Object.entries(userData)) {
            if (key !== 'expressID' && key !== 'modelID') {
              userDataProps.push({
                key: this.formatKey(key),
                value: String(value)
              });
            }
          }
          
          if (userDataProps.length > 0) {
            sections.push({
              section: 'IFC Data',
              properties: userDataProps
            });
          }
        }

        // Transform
        sections.push(this.getTransformSection(payload.object3D));
      }

    } catch (error) {
      console.error('Erro ao resolver propriedades IFC:', error);
      sections.push({
        section: 'Error',
        properties: [
          { key: 'Message', value: 'Failed to load IFC properties' }
        ]
      });
    }

    return sections;
  }

  /**
   * Formata valor de propriedade para string
   */
  private formatPropertyValue(value: any): string {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  /**
   * Resolve propriedades genéricas de mesh Three.js
   */
  private resolveMeshProperties(payload: SelectionPayload): PropertySection[] {
    const sections: PropertySection[] = [];
    const obj = payload.object3D;

    // Identity
    sections.push({
      section: 'Identity',
      properties: [
        { key: 'UUID', value: obj.uuid },
        { key: 'Name', value: obj.name || '(unnamed)' },
        { key: 'Type', value: obj.type },
        { key: 'ID', value: String(payload.id) }
      ]
    });

    // Material (se for mesh)
    if (obj instanceof THREE.Mesh && obj.material) {
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      const materialProps: PropertyItem[] = materials.map((mat, idx) => ({
        key: `Material ${idx}`,
        value: mat.name || mat.type
      }));

      sections.push({
        section: 'Material',
        properties: materialProps
      });
    }

    // Transform
    sections.push(this.getTransformSection(obj));

    // Geometry (se for mesh)
    if (obj instanceof THREE.Mesh && obj.geometry) {
      const geom = obj.geometry;
      sections.push({
        section: 'Geometry',
        properties: [
          { key: 'Type', value: geom.type },
          { key: 'Vertices', value: String(geom.attributes.position?.count ?? 0) },
          { key: 'Faces', value: String(geom.index ? geom.index.count / 3 : 0) }
        ]
      });
    }

    return sections;
  }

  /**
   * Seção de transform
   */
  private getTransformSection(obj: THREE.Object3D): PropertySection {
    const pos = obj.position;
    const rot = obj.rotation;
    const scale = obj.scale;

    return {
      section: 'Transform',
      properties: [
        { key: 'Position X', value: pos.x.toFixed(3) },
        { key: 'Position Y', value: pos.y.toFixed(3) },
        { key: 'Position Z', value: pos.z.toFixed(3) },
        { key: 'Rotation X', value: (rot.x * 180 / Math.PI).toFixed(2) + '°' },
        { key: 'Rotation Y', value: (rot.y * 180 / Math.PI).toFixed(2) + '°' },
        { key: 'Rotation Z', value: (rot.z * 180 / Math.PI).toFixed(2) + '°' },
        { key: 'Scale X', value: scale.x.toFixed(3) },
        { key: 'Scale Y', value: scale.y.toFixed(3) },
        { key: 'Scale Z', value: scale.z.toFixed(3) }
      ]
    };
  }

  /**
   * Formata chave para exibição
   */
  private formatKey(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Limpa cache
   */
  public clearCache(): void {
    this.propertiesCache.clear();
  }
}

// Export singleton
export const propertyResolver = new PropertyResolver();
