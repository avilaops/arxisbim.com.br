/**
 * Properties Panel Types
 * 
 * Types para exibição e edição de propriedades IFC
 */

export type PropertyType = 'string' | 'number' | 'boolean' | 'enum' | 'measure' | 'date' | 'reference';

export interface Property {
  /** Property name */
  name: string;
  
  /** Property value */
  value: any;
  
  /** Property type */
  type: PropertyType;
  
  /** Property group/category */
  group?: string;
  
  /** Is editable */
  editable?: boolean;
  
  /** Unit (for measures) */
  unit?: string;
  
  /** Enum options (for type='enum') */
  options?: string[];
  
  /** Validation rules */
  validation?: PropertyValidation;
}

export interface PropertySet {
  /** Property set name */
  name: string;
  
  /** Properties in this set */
  properties: Property[];
  
  /** Display order */
  order?: number;
}

export interface PropertyUpdate {
  /** Property name */
  name: string;
  
  /** New value */
  value: any;
  
  /** Property type */
  type: PropertyType;
  
  /** Property set name (optional) */
  psetName?: string;
}

export interface PropertyValidation {
  /** Required property */
  required?: boolean;
  
  /** Min value (for numbers) */
  min?: number;
  
  /** Max value (for numbers) */
  max?: number;
  
  /** Min length (for strings) */
  minLength?: number;
  
  /** Max length (for strings) */
  maxLength?: number;
  
  /** Regex pattern (for strings) */
  pattern?: string;
  
  /** Custom validation function */
  custom?: (value: any) => boolean | string;
}

export interface ValidationResult {
  /** Is valid */
  valid: boolean;
  
  /** Error messages */
  errors?: string[];
}

export interface PropertyLayout {
  /** Layout type */
  type?: 'grouped' | 'tabs' | 'flat';
  
  /** Groups configuration */
  groups?: PropertyGroup[];
  
  /** Tabs configuration */
  tabs?: PropertyTab[];
  
  /** Sort order */
  sortBy?: 'name' | 'group' | 'custom';
}

export interface PropertyGroup {
  /** Group name */
  name: string;
  
  /** Group label (display name) */
  label?: string;
  
  /** Properties in this group */
  properties: string[];
  
  /** Display order */
  order?: number;
  
  /** Is collapsed */
  collapsed?: boolean;
}

export interface PropertyTab {
  /** Tab name */
  name: string;
  
  /** Tab label (display name) */
  label?: string;
  
  /** Groups in this tab */
  groups: PropertyGroup[];
  
  /** Display order */
  order?: number;
}

export interface PropertyHistory {
  /** Timestamp */
  timestamp: Date;
  
  /** User ID */
  userId?: string;
  
  /** Property name */
  propertyName: string;
  
  /** Old value */
  oldValue: any;
  
  /** New value */
  newValue: any;
}

export interface ElementProperties {
  /** Element Express ID */
  expressId: number;
  
  /** Element IFC type */
  type: string;
  
  /** Element GlobalId */
  globalId?: string;
  
  /** Element name */
  name?: string;
  
  /** Property sets */
  propertySets: PropertySet[];
  
  /** Last updated */
  lastUpdated?: Date;
}

export type PropertyTypeHandler = (property: Property) => HTMLElement;
export type PropertyChangeCallback = (expressId: number, properties: PropertySet[]) => void;
export type SelectionChangeCallback = (expressIds: number[]) => void;
export type UnsubscribeFn = () => void;

export const COMMON_PROPERTY_GROUPS: PropertyGroup[] = [
  {
    name: 'general',
    label: 'General',
    properties: ['Name', 'Description', 'Tag', 'ObjectType'],
    order: 1,
  },
  {
    name: 'geometry',
    label: 'Geometry',
    properties: ['Volume', 'Area', 'Length', 'Width', 'Height', 'Depth'],
    order: 2,
  },
  {
    name: 'material',
    label: 'Material',
    properties: ['Material', 'Finish', 'Color'],
    order: 3,
  },
  {
    name: 'structural',
    label: 'Structural',
    properties: ['LoadBearing', 'FireRating', 'ThermalTransmittance'],
    order: 4,
  },
  {
    name: 'cost',
    label: 'Cost',
    properties: ['UnitCost', 'TotalCost', 'Currency'],
    order: 5,
  },
];
