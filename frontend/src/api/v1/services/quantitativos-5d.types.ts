/**
 * Quantitativos 5D Types (Frontend)
 * 
 * Sync com backend types
 */

export type QuantityType = 'volume' | 'area' | 'length' | 'count' | 'weight';
export type TakeoffFormat = 'excel' | 'pdf' | 'csv' | 'json';
export type UnitType = 'm3' | 'm2' | 'm' | 'un' | 'kg' | 'ft3' | 'ft2' | 'ft' | 'lb';

export interface TakeoffParams {
  types?: string[];
  propertyFilters?: PropertyFilter[];
  query?: string;
  quantities?: QuantityType[];
  groupBy?: string[];
  rules?: TakeoffRule[];
  includeCost?: boolean;
  useCache?: boolean;
}

export interface PropertyFilter {
  property: string;
  operator: '=' | '!=' | '>' | '<' | 'LIKE' | 'IN';
  value: any;
}

export interface TakeoffRule {
  type: 'waste_factor' | 'unit_conversion' | 'custom_formula' | 'productivity_factor';
  name?: string;
  applyToTypes?: string[];
  value: number;
  formula?: string;
}

export interface TakeoffItem {
  expressId: number;
  type: string;
  globalId?: string;
  name?: string;
  quantities: {
    volume?: number;
    area?: number;
    length?: number;
    count?: number;
    weight?: number;
  };
  units: {
    volume?: UnitType;
    area?: UnitType;
    length?: UnitType;
    weight?: UnitType;
  };
  properties: Record<string, any>;
  cost?: {
    unitCost?: number;
    totalCost?: number;
    currency?: string;
  };
  appliedRules?: string[];
}

export interface GroupedTakeoffItem {
  groupKey: Record<string, any>;
  items: TakeoffItem[];
  totals: {
    volume?: number;
    area?: number;
    length?: number;
    count?: number;
    weight?: number;
  };
  totalCost?: number;
}

export interface TakeoffResult {
  modelId: string;
  projectId: string;
  items: TakeoffItem[];
  grouped?: GroupedTakeoffItem[];
  totals: {
    volume?: number;
    area?: number;
    length?: number;
    count?: number;
    weight?: number;
  };
  totalCost?: number;
  currency?: string;
  stats: {
    elementCount: number;
    typeBreakdown: Record<string, number>;
    processingTime: number;
    cached: boolean;
  };
  params: TakeoffParams;
  timestamp: Date;
}
