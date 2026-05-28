import { IFCLoader } from '../loaders/IFCLoader';
import { IFCElement, IFCProperty } from '../core/types';

/**
 * Propriedades detalhadas do IFC
 */
export interface DetailedIFCProperties {
  basic: {
    expressID: number;
    type: string;
    globalId: string;
    name: string;
    description?: string;
  };
  geometry?: {
    volume?: number;
    area?: number;
    length?: number;
    width?: number;
    height?: number;
  };
  material?: {
    name?: string;
    layerThickness?: number;
  };
  location?: {
    building?: string;
    storey?: string;
    space?: string;
  };
  properties: IFCProperty[];
  propertySets: any[];
  typeProperties?: any;
}

/**
 * IFCPropertyService - Serviço para obter propriedades IFC reais
 * Implementa SUB-EPIC 1.7 - IFC Inspector com dados reais
 */
export class IFCPropertyService {
  private ifcLoader: IFCLoader | null = null;
  private cache: Map<string, DetailedIFCProperties> = new Map();

  constructor(ifcLoader?: IFCLoader) {
    this.ifcLoader = ifcLoader || null;
  }

  /**
   * Define o IFCLoader
   */
  public setIFCLoader(ifcLoader: IFCLoader): void {
    this.ifcLoader = ifcLoader;
    this.cache.clear(); // Limpa cache ao trocar loader
  }

  /**
   * Obtém propriedades detalhadas de um elemento IFC
   */
  public async getElementProperties(modelID: number, expressID: number): Promise<DetailedIFCProperties | null> {
    if (!this.ifcLoader) {
      console.warn('IFCLoader não configurado');
      return null;
    }

    // Verifica cache
    const cacheKey = `${modelID}-${expressID}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Obtém propriedades básicas
      const basicProps = await this.ifcLoader.getProperties(modelID, expressID);
      if (!basicProps) return null;

      // Obtém property sets
      const allProps = await this.ifcLoader.getAllProperties(modelID, expressID);
      const psets = allProps?.psets || [];

      // Obtém tipo
      const typeProps = await this.ifcLoader.getType(modelID, expressID);

      // Monta estrutura detalhada
      const detailed: DetailedIFCProperties = {
        basic: {
          expressID,
          type: basicProps.type || 'UNKNOWN',
          globalId: basicProps.GlobalId?.value || 'N/A',
          name: basicProps.Name?.value || basicProps.LongName?.value || 'Unnamed',
          description: basicProps.Description?.value
        },
        geometry: this.extractGeometryProperties(basicProps, psets),
        material: this.extractMaterialProperties(psets),
        location: await this.extractLocationProperties(modelID, expressID),
        properties: this.extractProperties(basicProps),
        propertySets: psets,
        typeProperties: typeProps
      };

      // Adiciona ao cache
      this.cache.set(cacheKey, detailed);

      return detailed;
    } catch (error) {
      console.error(`Erro ao obter propriedades do elemento ${expressID}:`, error);
      return null;
    }
  }

  /**
   * Extrai propriedades de geometria
   */
  private extractGeometryProperties(props: any, psets: any[]): DetailedIFCProperties['geometry'] {
    const geometry: any = {};

    // Busca em property sets comuns
    psets.forEach(pset => {
      if (pset.HasProperties) {
        pset.HasProperties.forEach((prop: any) => {
          const name = prop.Name?.value?.toLowerCase() || '';
          const value = prop.NominalValue?.value;

          if (name.includes('volume') && value) {
            geometry.volume = parseFloat(value);
          } else if (name.includes('area') && value) {
            geometry.area = parseFloat(value);
          } else if (name.includes('length') && value) {
            geometry.length = parseFloat(value);
          } else if (name.includes('width') && value) {
            geometry.width = parseFloat(value);
          } else if (name.includes('height') && value) {
            geometry.height = parseFloat(value);
          }
        });
      }
    });

    // Tenta extrair dimensões diretas
    if (props.OverallWidth?.value) geometry.width = props.OverallWidth.value;
    if (props.OverallHeight?.value) geometry.height = props.OverallHeight.value;
    if (props.Length?.value) geometry.length = props.Length.value;

    return Object.keys(geometry).length > 0 ? geometry : undefined;
  }

  /**
   * Extrai propriedades de material
   */
  private extractMaterialProperties(psets: any[]): DetailedIFCProperties['material'] {
    const material: any = {};

    psets.forEach(pset => {
      if (pset.Name?.value?.includes('Material') || pset.Name?.value?.includes('Pset_MaterialCommon')) {
        if (pset.HasProperties) {
          pset.HasProperties.forEach((prop: any) => {
            const name = prop.Name?.value?.toLowerCase() || '';
            const value = prop.NominalValue?.value;

            if (name.includes('name') && value) {
              material.name = value;
            } else if (name.includes('thickness') && value) {
              material.layerThickness = parseFloat(value);
            }
          });
        }
      }
    });

    return Object.keys(material).length > 0 ? material : undefined;
  }

  /**
   * Extrai informações de localização espacial
   */
  private async extractLocationProperties(modelID: number, expressID: number): Promise<DetailedIFCProperties['location']> {
    if (!this.ifcLoader) return undefined;

    try {
      const spatialStructure = await this.ifcLoader.getSpatialStructure(modelID, expressID);
      // A estrutura espacial é complexa, pode precisar de parsing específico
      return undefined; // TODO: Implementar parsing da estrutura espacial
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Extrai propriedades genéricas
   */
  private extractProperties(props: any): IFCProperty[] {
    const properties: IFCProperty[] = [];

    // Itera sobre todas as propriedades do objeto
    Object.keys(props).forEach(key => {
      if (key === 'expressID' || key === 'type') return; // Skip básicos

      const value = props[key];
      
      if (value !== null && value !== undefined) {
        // Se tem estrutura de valor do IFC
        if (typeof value === 'object' && value.value !== undefined) {
          properties.push({
            name: key,
            value: value.value
          });
        } else if (typeof value !== 'object') {
          // Valor simples
          properties.push({
            name: key,
            value
          });
        }
      }
    });

    return properties;
  }

  /**
   * Converte propriedades detalhadas para IFCElement (compatibilidade)
   */
  public toIFCElement(detailed: DetailedIFCProperties): IFCElement {
    return {
      expressID: detailed.basic.expressID,
      type: detailed.basic.type,
      globalId: detailed.basic.globalId,
      name: detailed.basic.name,
      properties: detailed.properties,
      bimProperties: {
        dimensions: detailed.geometry,
        material: detailed.material?.name,
        customProperties: {}
      }
    };
  }

  /**
   * Limpa o cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Obtém estatísticas do cache
   */
  public getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Singleton instance
export const ifcPropertyService = new IFCPropertyService();
