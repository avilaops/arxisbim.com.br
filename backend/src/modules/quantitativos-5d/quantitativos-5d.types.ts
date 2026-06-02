/**
 * Quantitativos 5D Types
 * 
 * Types para cálculo de takeoff (quantificação) de modelos BIM
 */

export type QuantityType = 'volume' | 'area' | 'length' | 'count' | 'weight';
export type TakeoffFormat = 'excel' | 'pdf' | 'csv' | 'json';
export type UnitType = 'm3' | 'm2' | 'm' | 'un' | 'kg' | 'ft3' | 'ft2' | 'ft' | 'lb';

export interface TakeoffParams {
  /** Filter by IFC types */
  types?: string[];
  
  /** Filter by property */
  propertyFilters?: PropertyFilter[];
  
  /** BIM Query filter string */
  query?: string;
  
  /** Quantity types to calculate */
  quantities?: QuantityType[];
  
  /** Group results by fields */
  groupBy?: string[];
  
  /** Apply business rules */
  rules?: TakeoffRule[];
  
  /** Include cost calculation */
  includeCost?: boolean;
  
  /** Use cached results if available */
  useCache?: boolean;
}

export interface PropertyFilter {
  property: string;
  operator: '=' | '!=' | '>' | '<' | 'LIKE' | 'IN';
  value: any;
}

export interface TakeoffRule {
  /** Rule type */
  type: 'waste_factor' | 'unit_conversion' | 'custom_formula' | 'productivity_factor';
  
  /** Rule name */
  name?: string;
  
  /** Apply to specific types */
  applyToTypes?: string[];
  
  /** Rule value/factor */
  value: number;
  
  /** Custom formula (for type='custom_formula') */
  formula?: string;
}

export interface TakeoffItem {
  /** Element Express ID */
  expressId: number;
  
  /** IFC Type */
  type: string;
  
  /** Element GlobalId */
  globalId?: string;
  
  /** Element Name */
  name?: string;
  
  /** Calculated quantities */
  quantities: {
    volume?: number;
    area?: number;
    length?: number;
    count?: number;
    weight?: number;
  };
  
  /** Units */
  units: {
    volume?: UnitType;
    area?: UnitType;
    length?: UnitType;
    weight?: UnitType;
  };
  
  /** Element properties */
  properties: Record<string, any>;
  
  /** Calculated cost (if includeCost=true) */
  cost?: {
    unitCost?: number;
    totalCost?: number;
    currency?: string;
  };
  
  /** Applied rules */
  appliedRules?: string[];
}

export interface GroupedTakeoffItem {
  /** Group key */
  groupKey: Record<string, any>;
  
  /** Items in this group */
  items: TakeoffItem[];
  
  /** Aggregated quantities */
  totals: {
    volume?: number;
    area?: number;
    length?: number;
    count?: number;
    weight?: number;
  };
  
  /** Aggregated cost */
  totalCost?: number;
}

export interface TakeoffResult {
  /** Model ID */
  modelId: string;
  
  /** Project ID */
  projectId: string;
  
  /** Individual items */
  items: TakeoffItem[];
  
  /** Grouped items (if groupBy was specified) */
  grouped?: GroupedTakeoffItem[];
  
  /** Total quantities */
  totals: {
    volume?: number;
    area?: number;
    length?: number;
    count?: number;
    weight?: number;
  };
  
  /** Total cost */
  totalCost?: number;
  
  /** Currency */
  currency?: string;
  
  /** Statistics */
  stats: {
    /** Total elements processed */
    elementCount: number;
    
    /** Element types breakdown */
    typeBreakdown: Record<string, number>;
    
    /** Processing time (ms) */
    processingTime: number;
    
    /** Cache hit */
    cached: boolean;
  };
  
  /** Applied parameters */
  params: TakeoffParams;
  
  /** Calculation timestamp */
  timestamp: Date;
}

export interface TakeoffExportOptions {
  /** Export format */
  format: TakeoffFormat;
  
  /** Include detailed breakdown */
  includeDetails?: boolean;
  
  /** Include summary */
  includeSummary?: boolean;
  
  /** Include charts/graphs */
  includeCharts?: boolean;
  
  /** Template ID (for custom templates) */
  templateId?: string;
  
  /** Company branding */
  branding?: {
    logo?: string;
    companyName?: string;
    projectName?: string;
  };
}

export interface TakeoffTemplate {
  /** Template ID */
  id: string;
  
  /** Template name */
  name: string;
  
  /** Template type */
  type: 'standard' | 'custom';
  
  /** Applicable formats */
  formats: TakeoffFormat[];
  
  /** Template configuration */
  config: {
    columns?: string[];
    groupBy?: string[];
    includeCharts?: boolean;
    customRules?: TakeoffRule[];
  };
}

export interface QuantityCalculator {
  /** Quantity type this calculator handles */
  type: QuantityType;
  
  /** Calculate quantity for an element */
  calculate: (element: any, properties: Record<string, any>) => number | null;
  
  /** Default unit */
  defaultUnit: UnitType;
}

export interface TakeoffCache {
  /** Cache key (modelId + params hash) */
  key: string;
  
  /** Cached result */
  result: TakeoffResult;
  
  /** Cache timestamp */
  timestamp: Date;
  
  /** TTL (seconds) */
  ttl: number;
}
