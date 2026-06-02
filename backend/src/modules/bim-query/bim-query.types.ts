// =====================================
// BIM Query Types
// =====================================

export type ComparisonOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'NOT IN' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH';
export type LogicalOperator = 'AND' | 'OR' | 'NOT';
export type AggregationOperator = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'GROUP_CONCAT';
export type SpatialOperator = 'WITHIN_BOX' | 'WITHIN_SPHERE' | 'NEAR_POINT' | 'INTERSECTS' | 'ON_LEVEL';
export type RelationalOperator = 'CONNECTED_TO' | 'CONTAINED_IN' | 'CONTAINS' | 'PARENT_OF' | 'CHILD_OF';

/**
 * Filtro de propriedade
 */
export interface PropertyFilter {
  property: string;
  operator: ComparisonOperator;
  value: any;
}

/**
 * Filtro espacial (queries por localização)
 */
export interface SpatialFilter {
  operator: SpatialOperator;
  params: {
    min?: [number, number, number]; // Para WITHIN_BOX
    max?: [number, number, number]; // Para WITHIN_BOX
    center?: [number, number, number]; // Para WITHIN_SPHERE, NEAR_POINT
    radius?: number; // Para WITHIN_SPHERE, NEAR_POINT
    level?: string; // Para ON_LEVEL
    geometry?: any; // Para INTERSECTS
  };
}

/**
 * Filtro relacional (queries por relacionamento)
 */
export interface RelationalFilter {
  operator: RelationalOperator;
  targetExpressId?: number;
  targetType?: string;
  recursive?: boolean; // Para queries transitive
}

/**
 * Filtro lógico composto
 */
export interface LogicalFilter {
  operator: LogicalOperator;
  filters: BIMFilter[];
}

/**
 * União de todos os tipos de filtro
 */
export type BIMFilter = PropertyFilter | SpatialFilter | RelationalFilter | LogicalFilter;

/**
 * Agregação de resultados
 */
export interface Aggregation {
  operation: AggregationOperator;
  field?: string; // Campo para agregação (SUM, AVG, etc)
  groupBy?: string[]; // Campos para agrupamento
  having?: PropertyFilter; // Filtro pós-agrupamento
}

/**
 * Ordenação de resultados
 */
export interface SortOrder {
  field: string;
  direction: 'ASC' | 'DESC';
}

/**
 * Query BIM completa
 */
export interface BIMQuery {
  // Filtros básicos
  type?: string; // Tipo IFC (IFCWALL, IFCBEAM, etc)
  filters?: BIMFilter[];

  // Projeção (campos a retornar)
  select?: string[]; // ['expressId', 'type', 'properties.Name']

  // Agregação e agrupamento
  aggregation?: Aggregation;

  // Ordenação
  orderBy?: SortOrder[];

  // Paginação
  limit?: number;
  offset?: number;

  // Cache
  useCache?: boolean;
  cacheTTL?: number; // TTL em segundos
}

/**
 * Elemento BIM retornado
 */
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

/**
 * Resultado de agregação
 */
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

/**
 * Resultado de query BIM
 */
export interface BIMQueryResult {
  elements?: BIMElement[];
  aggregation?: AggregationResult;
  totalCount: number;
  executionTime: number; // ms
  cached: boolean;
  query: BIMQuery;
}

/**
 * Query salva
 */
export interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  query: BIMQuery;
  createdBy: string;
  createdAt: Date;
  tags?: string[];
  projectId?: string;
  tenantId: string;
}

/**
 * Operador customizado (para extensão)
 */
export interface CustomOperator {
  name: string;
  handler: (element: BIMElement, params: any) => boolean;
}

/**
 * Contexto de execução da query
 */
export interface QueryContext {
  modelId: string;
  projectId: string;
  tenantId: string;
  userId: string;
  cache?: Map<string, BIMQueryResult>;
}
