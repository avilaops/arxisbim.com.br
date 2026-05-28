/**
 * IFC Inspector Module
 * 
 * Inspeção profissional de modelos IFC conform ISO 16739 e buildingSMART standards
 * 
 * Features:
 * - Extração completa de propriedades IFC (PropertySets, QuantitySets)
 * - Formatação profissional para display
 * - Export para CSV, JSON, XML
 * - Search e filter avançado
 * - Cache para performance
 * 
 * @example
 * ```typescript
 * import { ifcInspector } from './bim/inspector';
 * 
 * // Configurar IFC Loader
 * ifcInspector.setIfcLoader(myIfcLoader);
 * 
 * // Inspecionar elemento
 * const data = await ifcInspector.inspect(expressID, modelID);
 * 
 * // Buscar propriedades
 * const results = ifcInspector.searchProperties('Wall');
 * 
 * // Exportar para CSV
 * ifcInspector.exportProperties({ format: 'csv', filename: 'properties.csv' });
 * ```
 */

// Main classes
export { IFCInspector, ifcInspector } from './IFCInspector';
export { PropertyExtractor, propertyExtractor } from './PropertyExtractor';
export { PropertyFormatter, propertyFormatter } from './PropertyFormatter';
export { PropertyExporter, propertyExporter } from './PropertyExporter';

// Types
export * from './PropertyTypes';

