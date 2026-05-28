/**
 * IFCInspector - Classe principal do módulo de inspeção IFC
 * 
 * Orquestra PropertyExtractor, PropertyFormatter e PropertyExporter
 */

import { 
  InspectionData,
  PropertyFilter,
  PropertySearchResult,
  PropertyStatistics,
  ExportOptions
} from './PropertyTypes';
import { propertyExtractor } from './PropertyExtractor';
import { propertyFormatter } from './PropertyFormatter';
import { propertyExporter } from './PropertyExporter';
import * as THREE from 'three';

export class IFCInspector {
  private currentInspection: InspectionData | null = null;
  
  /**
   * Injeta referência ao IFC Loader
   */
  public setIfcLoader(loader: any): void {
    propertyExtractor.setIfcLoader(loader);
    console.log('🔧 IFC Loader configured in IFCInspector');
  }
  
  /**
   * Injeta referência à scene Three.js
   */
  public setScene(scene: THREE.Scene): void {
    propertyExtractor.setScene(scene);
    console.log('🔧 Scene configured in IFCInspector');
  }
  
  /**
   * Inspeciona elemento IFC
   */
  public async inspect(expressID: number, modelID: number = 0): Promise<InspectionData> {
    console.log(`🔍 Inspecting IFC element: ExpressID ${expressID}`);
    
    const data = await propertyExtractor.extractProperties(expressID, modelID);
    this.currentInspection = data;
    
    console.log(`✅ Inspection complete: ${data.sections.length} sections, ${this.countProperties(data)} properties`);
    
    return data;
  }
  
  /**
   * Obtém inspeção atual
   */
  public getCurrentInspection(): InspectionData | null {
    return this.currentInspection;
  }
  
  /**
   * Busca propriedades
   */
  public searchProperties(searchText: string, data?: InspectionData): PropertySearchResult[] {
    const inspectionData = data || this.currentInspection;
    if (!inspectionData) return [];
    
    const results: PropertySearchResult[] = [];
    const lowerSearch = searchText.toLowerCase();
    
    for (const section of inspectionData.sections) {
      for (const prop of section.properties) {
        let matchScore = 0;
        let matchedField: 'name' | 'value' | 'description' = 'name';
        
        // Match no nome
        if (prop.name.toLowerCase().includes(lowerSearch)) {
          matchScore = 10;
          matchedField = 'name';
        }
        
        // Match no valor
        const valueStr = propertyFormatter.formatValue(prop).toLowerCase();
        if (valueStr.includes(lowerSearch)) {
          matchScore = Math.max(matchScore, 5);
          if (matchScore === 5) matchedField = 'value';
        }
        
        // Match na descrição
        if (prop.description && prop.description.toLowerCase().includes(lowerSearch)) {
          matchScore = Math.max(matchScore, 7);
          if (matchScore === 7) matchedField = 'description';
        }
        
        if (matchScore > 0) {
          results.push({
            property: prop,
            section: section.category,
            matchScore,
            matchedField
          });
        }
      }
    }
    
    // Ordenar por score
    results.sort((a, b) => b.matchScore - a.matchScore);
    
    return results;
  }
  
  /**
   * Filtra propriedades
   */
  public filterProperties(filter: PropertyFilter, data?: InspectionData): InspectionData | null {
    const inspectionData = data || this.currentInspection;
    if (!inspectionData) return null;
    
    const filteredSections = inspectionData.sections
      .map(section => {
        // Filtrar por categoria
        if (filter.categories && !filter.categories.includes(section.category)) {
          return null;
        }
        
        // Filtrar propriedades
        const filteredProps = section.properties.filter(prop => {
          // Filtrar por tipo
          if (filter.types && !filter.types.includes(prop.type)) {
            return false;
          }
          
          // Filtrar por texto
          if (filter.searchText) {
            const lowerSearch = filter.searchText.toLowerCase();
            const matchName = prop.name.toLowerCase().includes(lowerSearch);
            const matchValue = propertyFormatter.formatValue(prop).toLowerCase().includes(lowerSearch);
            if (!matchName && !matchValue) {
              return false;
            }
          }
          
          // Filtrar vazios
          if (!filter.includeEmpty && (prop.value === null || prop.value === undefined || prop.value === '')) {
            return false;
          }
          
          return true;
        });
        
        return filteredProps.length > 0 ? { ...section, properties: filteredProps } : null;
      })
      .filter(section => section !== null) as any[];
    
    return {
      ...inspectionData,
      sections: filteredSections
    };
  }
  
  /**
   * Obtém estatísticas de propriedades
   */
  public getStatistics(data?: InspectionData): PropertyStatistics {
    const inspectionData = data || this.currentInspection;
    if (!inspectionData) {
      return {
        totalProperties: 0,
        categoryCounts: {} as any,
        typeCounts: {} as any,
        emptyCount: 0,
        nullCount: 0
      };
    }
    
    const stats: PropertyStatistics = {
      totalProperties: 0,
      categoryCounts: {} as any,
      typeCounts: {} as any,
      emptyCount: 0,
      nullCount: 0
    };
    
    for (const section of inspectionData.sections) {
      // Contar por categoria
      if (!stats.categoryCounts[section.category]) {
        stats.categoryCounts[section.category] = 0;
      }
      stats.categoryCounts[section.category] += section.properties.length;
      
      for (const prop of section.properties) {
        stats.totalProperties++;
        
        // Contar por tipo
        if (!stats.typeCounts[prop.type]) {
          stats.typeCounts[prop.type] = 0;
        }
        stats.typeCounts[prop.type]++;
        
        // Contar vazios/null
        if (prop.value === null || prop.value === undefined) {
          stats.nullCount++;
        } else if (prop.value === '') {
          stats.emptyCount++;
        }
      }
    }
    
    return stats;
  }
  
  /**
   * Exporta propriedades
   */
  public exportProperties(options: ExportOptions, data?: InspectionData): void {
    const inspectionData = data || this.currentInspection;
    if (!inspectionData) {
      console.warn('⚠️ No inspection data to export');
      return;
    }
    
    propertyExporter.export(inspectionData, options);
    console.log(`✅ Properties exported as ${options.format.toUpperCase()}`);
  }
  
  /**
   * Formata seção para HTML
   */
  public formatSectionHTML(sectionIndex: number, data?: InspectionData): string {
    const inspectionData = data || this.currentInspection;
    if (!inspectionData || sectionIndex >= inspectionData.sections.length) {
      return '';
    }
    
    return propertyFormatter.formatSectionToHTML(inspectionData.sections[sectionIndex]);
  }
  
  /**
   * Formata todas as seções para HTML
   */
  public formatAllSectionsHTML(data?: InspectionData): string {
    const inspectionData = data || this.currentInspection;
    if (!inspectionData) return '';
    
    return inspectionData.sections
      .map(section => propertyFormatter.formatSectionToHTML(section))
      .join('\\n');
  }
  
  /**
   * Limpa cache
   */
  public clearCache(): void {
    propertyExtractor.clearCache();
    this.currentInspection = null;
  }
  
  /**
   * Obtém estatísticas do cache
   */
  public getCacheStats() {
    return propertyExtractor.getCacheStats();
  }
  
  /**
   * Conta total de propriedades
   */
  private countProperties(data: InspectionData): number {
    return data.sections.reduce((total, section) => total + section.properties.length, 0);
  }
}

// Export singleton
export const ifcInspector = new IFCInspector();

