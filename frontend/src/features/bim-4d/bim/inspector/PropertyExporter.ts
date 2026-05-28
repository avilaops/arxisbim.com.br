/**
 * PropertyExporter - Exporta propriedades para CSV, JSON, XML
 */

import { InspectionData, ExportOptions, PropertyCategory } from './PropertyTypes';
import { propertyFormatter } from './PropertyFormatter';

export class PropertyExporter {
  /**
   * Exporta para formato especificado
   */
  public export(data: InspectionData, options: ExportOptions): void {
    const { format, filename } = options;
    
    let content: string;
    let mimeType: string;
    let extension: string;
    
    switch (format) {
      case 'json':
        content = this.exportToJSON(data, options);
        mimeType = 'application/json';
        extension = 'json';
        break;
      
      case 'csv':
        content = this.exportToCSV(data, options);
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      
      case 'xml':
        content = this.exportToXML(data, options);
        mimeType = 'application/xml';
        extension = 'xml';
        break;
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
    
    // Download
    const finalFilename = filename || `ifc-properties_${data.element.expressID}.${extension}`;
    this.downloadFile(content, finalFilename, mimeType);
  }
  
  /**
   * Exporta para JSON
   */
  private exportToJSON(data: InspectionData, options: ExportOptions): string {
    const filteredSections = this.filterSections(data.sections, options);
    
    const output = {
      element: {
        expressID: data.element.expressID,
        globalID: data.element.globalID,
        type: data.element.type,
        name: data.element.name
      },
      properties: options.flattenHierarchy
        ? this.flattenSections(filteredSections)
        : filteredSections,
      timestamp: data.timestamp,
      modelID: data.modelID
    };
    
    return options.prettyPrint
      ? JSON.stringify(output, null, 2)
      : JSON.stringify(output);
  }
  
  /**
   * Exporta para CSV
   */
  private exportToCSV(data: InspectionData, options: ExportOptions): string {
    const filteredSections = this.filterSections(data.sections, options);
    
    // Header
    let csv = 'Category,Property,Value,Type,Unit\n';
    
    // Rows
    for (const section of filteredSections) {
      for (const prop of section.properties) {
        const value = propertyFormatter.formatValue(prop);
        csv += `${this.escapeCSV(section.title)},${this.escapeCSV(prop.name)},${this.escapeCSV(value)},${prop.type},${prop.unit || ''}\n`;
      }
    }
    
    return csv;
  }
  
  /**
   * Exporta para XML
   */
  private exportToXML(data: InspectionData, options: ExportOptions): string {
    const filteredSections = this.filterSections(data.sections, options);
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<IfcElement expressID="${data.element.expressID}" globalID="${data.element.globalID}" type="${data.element.type}">\n`;
    
    for (const section of filteredSections) {
      xml += `  <Section title="${this.escapeXML(section.title)}" category="${section.category}">\n`;
      
      for (const prop of section.properties) {
        const value = propertyFormatter.formatValue(prop);
        xml += `    <Property name="${this.escapeXML(prop.name)}" type="${prop.type}"${prop.unit ? ` unit="${prop.unit}"` : ''}>${this.escapeXML(value)}</Property>\n`;
      }
      
      xml += '  </Section>\n';
    }
    
    xml += '</IfcElement>';
    
    return xml;
  }
  
  /**
   * Filtra seções baseado nas opções
   */
  private filterSections(sections: any[], options: ExportOptions): any[] {
    if (!options.includeCategories || options.includeCategories.length === 0) {
      return sections;
    }
    
    return sections.filter(section => 
      options.includeCategories!.includes(section.category)
    );
  }
  
  /**
   * Achata hierarquia de seções
   */
  private flattenSections(sections: any[]): any[] {
    const flattened: any[] = [];
    
    for (const section of sections) {
      for (const prop of section.properties) {
        flattened.push({
          category: section.title,
          ...prop
        });
      }
    }
    
    return flattened;
  }
  
  /**
   * Escape CSV
   */
  private escapeCSV(str: string): string {
    if (!str) return '';
    const strValue = String(str);
    if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
      return `"${strValue.replace(/"/g, '""')}"`;
    }
    return strValue;
  }
  
  /**
   * Escape XML
   */
  private escapeXML(str: string): string {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  
  /**
   * Download arquivo
   */
  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}

// Export singleton
export const propertyExporter = new PropertyExporter();
