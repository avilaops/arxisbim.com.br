/**
 * PropertyTypes - Tipos TypeScript para inspeção de propriedades IFC
 * 
 * Baseado em ISO 16739 (IFC Schema) e buildingSMART standards
 */

/**
 * Tipos de propriedades IFC
 */
export enum IFCPropertyType {
  STRING = 'STRING',
  INTEGER = 'INTEGER',
  REAL = 'REAL',
  BOOLEAN = 'BOOLEAN',
  ENUMERATION = 'ENUMERATION',
  REFERENCE = 'REFERENCE',
  LIST = 'LIST',
  NULL = 'NULL'
}

/**
 * Categorias de propriedades
 */
export enum PropertyCategory {
  IDENTITY = 'Identity',
  CLASSIFICATION = 'Classification',
  GEOMETRY = 'Geometry',
  PLACEMENT = 'Placement',
  MATERIAL = 'Material',
  CONSTRUCTION = 'Construction',
  QUANTITIES = 'Quantities',
  RELATIONSHIPS = 'Relationships',
  PROJECT = 'Project Info',
  CUSTOM = 'Custom Properties',
  PSET = 'Property Sets',
  QSET = 'Quantity Sets'
}

/**
 * Item de propriedade individual
 */
export interface IFCProperty {
  name: string;
  value: any;
  type: IFCPropertyType;
  unit?: string;
  description?: string;
  category: PropertyCategory;
}

/**
 * Seção de propriedades agrupadas
 */
export interface PropertySection {
  category: PropertyCategory;
  title: string;
  properties: IFCProperty[];
  expanded?: boolean;
  icon?: string;
}

/**
 * Elemento IFC completo com todas as propriedades
 */
export interface IFCElement {
  // Identity
  expressID: number;
  globalID: string;
  type: string;
  name?: string;
  description?: string;
  objectType?: string;
  tag?: string;
  
  // Classification
  classification?: {
    system: string;
    code: string;
    name: string;
  };
  
  // Geometry
  geometry?: {
    type: string;
    vertices: number;
    faces: number;
    boundingBox?: {
      min: { x: number; y: number; z: number };
      max: { x: number; y: number; z: number };
    };
  };
  
  // Placement
  placement?: {
    location: { x: number; y: number; z: number };
    axis?: { x: number; y: number; z: number };
    refDirection?: { x: number; y: number; z: number };
  };
  
  // Material
  materials?: Array<{
    name: string;
    type: string;
    layerThickness?: number;
  }>;
  
  // Construction
  construction?: {
    loadBearing?: boolean;
    fireRating?: string;
    thermalTransmittance?: number;
  };
  
  // Quantities
  quantities?: {
    length?: number;
    width?: number;
    height?: number;
    area?: number;
    volume?: number;
    weight?: number;
  };
  
  // Relationships
  relationships?: {
    containedIn?: string; // expressID do container
    contains?: number[]; // expressIDs dos elementos contidos
    relatedTo?: number[]; // expressIDs de elementos relacionados
  };
  
  // Property Sets (IfcPropertySet)
  propertySets?: Array<{
    name: string;
    properties: Record<string, any>;
  }>;
  
  // Quantity Sets (IfcElementQuantity)
  quantitySets?: Array<{
    name: string;
    quantities: Record<string, any>;
  }>;
  
  // Custom properties
  customProperties?: Record<string, any>;
}

/**
 * Dados completos de inspeção
 */
export interface InspectionData {
  element: IFCElement;
  sections: PropertySection[];
  modelID?: number;
  timestamp: number;
}

/**
 * Filtro de propriedades
 */
export interface PropertyFilter {
  searchText?: string;
  categories?: PropertyCategory[];
  types?: IFCPropertyType[];
  includeEmpty?: boolean;
}

/**
 * Opções de exportação
 */
export interface ExportOptions {
  format: 'json' | 'csv' | 'xml';
  includeCategories?: PropertyCategory[];
  flattenHierarchy?: boolean;
  prettyPrint?: boolean;
  filename?: string;
}

/**
 * Resultado de busca de propriedades
 */
export interface PropertySearchResult {
  property: IFCProperty;
  section: PropertyCategory;
  matchScore: number;
  matchedField: 'name' | 'value' | 'description';
}

/**
 * Estatísticas de propriedades
 */
export interface PropertyStatistics {
  totalProperties: number;
  categoryCounts: Record<PropertyCategory, number>;
  typeCounts: Record<IFCPropertyType, number>;
  emptyCount: number;
  nullCount: number;
}

/**
 * Comparação de propriedades entre dois elementos
 */
export interface PropertyComparison {
  elementA: IFCElement;
  elementB: IFCElement;
  identical: IFCProperty[];
  different: Array<{
    name: string;
    valueA: any;
    valueB: any;
    category: PropertyCategory;
  }>;
  onlyInA: IFCProperty[];
  onlyInB: IFCProperty[];
}

/**
 * Validação de propriedades
 */
export interface PropertyValidation {
  property: IFCProperty;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Template de propriedades para tipos IFC
 */
export interface PropertyTemplate {
  ifcType: string;
  requiredProperties: string[];
  optionalProperties: string[];
  defaultValues: Record<string, any>;
}

