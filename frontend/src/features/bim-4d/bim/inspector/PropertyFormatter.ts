/**
 * PropertyFormatter - Formata propriedades para exibição
 * 
 * Formata valores, unidades, números, datas, etc.
 */

import { IFCProperty, IFCPropertyType, PropertySection } from './PropertyTypes';

export class PropertyFormatter {
  /**
   * Formata valor de propriedade para string
   */
  public formatValue(property: IFCProperty): string {
    const { value, type, unit } = property;
    
    if (value === null || value === undefined) {
      return 'N/A';
    }
    
    switch (type) {
      case IFCPropertyType.REAL:
        return this.formatReal(value, unit);
      
      case IFCPropertyType.INTEGER:
        return this.formatInteger(value, unit);
      
      case IFCPropertyType.BOOLEAN:
        return value ? 'Yes' : 'No';
      
      case IFCPropertyType.LIST:
        return Array.isArray(value) ? value.join(', ') : String(value);
      
      case IFCPropertyType.REFERENCE:
        return `#${value}`;
      
      case IFCPropertyType.STRING:
      default:
        return String(value);
    }
  }
  
  /**
   * Formata número real
   */
  private formatReal(value: any, unit?: string): string {
    const num = Number(value);
    if (isNaN(num)) return String(value);
    
    const formatted = num.toFixed(3);
    return unit ? `${formatted} ${unit}` : formatted;
  }
  
  /**
   * Formata número inteiro
   */
  private formatInteger(value: any, unit?: string): string {
    const num = Number(value);
    if (isNaN(num)) return String(value);
    
    return unit ? `${num} ${unit}` : String(num);
  }
  
  /**
   * Formata nome de propriedade (camelCase → Title Case)
   */
  public formatPropertyName(name: string): string {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
  
  /**
   * Formata seção completa para HTML
   */
  public formatSectionToHTML(section: PropertySection): string {
    const properties = section.properties
      .map(prop => `
        <tr>
          <td class="property-key">${this.escapeHTML(prop.name)}</td>
          <td class="property-value">${this.escapeHTML(this.formatValue(prop))}</td>
        </tr>
      `)
      .join('');
    
    return `
      <div class="property-section" data-category="${section.category}">
        <div class="section-header">
          <span class="section-icon">${section.icon || ''}</span>
          <span class="section-title">${section.title}</span>
          <span class="section-count">(${section.properties.length})</span>
        </div>
        <table class="property-table">
          <tbody>${properties}</tbody>
        </table>
      </div>
    `;
  }
  
  /**
   * Escape HTML para segurança
   */
  private escapeHTML(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  
  /**
   * Formata para JSON pretty-print
   */
  public formatToJSON(sections: PropertySection[], prettyPrint: boolean = true): string {
    const data = sections.map(section => ({
      category: section.category,
      title: section.title,
      properties: section.properties.map(prop => ({
        name: prop.name,
        value: prop.value,
        type: prop.type,
        unit: prop.unit
      }))
    }));
    
    return prettyPrint 
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);
  }
}

// Export singleton
export const propertyFormatter = new PropertyFormatter();
