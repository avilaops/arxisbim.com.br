/**
 * BIM Query Types (Frontend)
 * 
 * Mantém sync com backend types
 */

export type ComparisonOperator =
  | '='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'LIKE'
  | 'IN'
  | 'NOT IN'
  | 'CONTAINS'
  | 'STARTS_WITH'
  | 'ENDS_WITH';

export type LogicalOperator = 'AND' | 'OR' | 'NOT';
export type AggregationOperator = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'GROUP_CONCAT';
export type SpatialOperator =
  | 'WITHIN_BOX'
  | 'WITHIN_SPHERE'
  | 'NEAR_POINT'
  | 'INTERSECTS'
  | 'ON_LEVEL';
export type RelationalOperator =
  | 'CONNECTED_TO'
  | 'CONTAINED_IN'
  | 'CONTAINS'
  | 'PARENT_OF'
  | 'CHILD_OF';

export interface PropertyFilter {
  property: string;
  operator: ComparisonOperator;
  value: any;
}

export interface SpatialFilter {
  operator: SpatialOperator;
  params: {
    min?: [number, number, number];
    max?: [number, number, number];
    center?: [number, number, number];
    radius?: number;
    level?: string;
    geometry?: any;
  };
}

export interface RelationalFilter {
  operator: RelationalOperator;
  targetExpressId?: number;
  targetType?: string;
  recursive?: boolean;
}

export interface LogicalFilter {
  operator: LogicalOperator;
  filters: BIMFilter[];
}

export type BIMFilter = PropertyFilter | SpatialFilter | RelationalFilter | LogicalFilter;

export interface Aggregation {
  operation: AggregationOperator;
  field?: string;
  groupBy?: string[];
  having?: PropertyFilter;
}

export interface SortOrder {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface BIMQuery {
  type?: string;
  filters?: BIMFilter[];
  select?: string[];
  aggregation?: Aggregation;
  orderBy?: SortOrder[];
  limit?: number;
  offset?: number;
  useCache?: boolean;
  cacheTTL?: number;
}

export interface BIMElement {
  expressId: number;
  type: string;
  globalId?: string;
  properties: Record<string, any>;
  geometry?: {
    boundingBox?: {
      min: [number, number, number];
      max: [number, number, number];
    };
    position?: [number, number, number];
  };
  relationships?: {
    parent?: number;
    children?: number[];
    connected?: number[];
    contained?: number[];
  };
}

export interface AggregationResult {
  groups?: Array<{
    key: Record<string, any>;
    value: number;
    count: number;
  }>;
  total?: number;
  count?: number;
  sum?: number;
  avg?: number;
  min?: number;
  max?: number;
}

export interface BIMQueryResult {
  elements?: BIMElement[];
  aggregation?: AggregationResult;
  totalCount: number;
  executionTime: number;
  cached: boolean;
  query: BIMQuery;
}
