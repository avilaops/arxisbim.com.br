/**
 * BIM Query Engine — type definitions.
 *
 * The query engine runs over a flat array of `QueryableElement`s, which is
 * intentionally the same shape used by `IfcElementSource` in the 5D module
 * (so adapters built for takeoff are reusable here).
 */

/** Element shape consumed by the engine. */
export interface QueryableElement {
  expressID: string | number;
  ifcType: string;
  /** Property sets keyed by name. Values are primitives or `{ value, unit?, type? }`. */
  propertySets?: Record<string, Record<string, PropertyValue>>;
  /** Optional axis-aligned bounding box in meters. */
  geometry?: { bboxMin: [number, number, number]; bboxMax: [number, number, number] };
}

export type PropertyValue =
  | number
  | string
  | boolean
  | null
  | { value: number | string | boolean; unit?: string; type?: string };

/** Comparison operators allowed in `PropertyFilter`. */
export type ComparisonOp = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'LIKE' | 'IN' | 'IS NULL' | 'IS NOT NULL';

/**
 * Property reference. Can be qualified (`Pset_WallCommon.FireRating`) or
 * unqualified (`FireRating`, scanning all property sets in order).
 */
export interface PropertyRef {
  pset?: string;
  name: string;
}

export interface PropertyFilter {
  kind: 'property';
  property: PropertyRef;
  op: ComparisonOp;
  /** `=`, `!=`, comparisons: primitive. `IN`: array. `LIKE`: string with `%` wildcard. `IS [NOT] NULL`: undefined. */
  value?: number | string | boolean | Array<number | string | boolean>;
}

export interface TypeFilter {
  kind: 'type';
  ifcType: string;
}

export interface BboxFilter {
  kind: 'bbox';
  /** AABB the element bbox must intersect. */
  min: [number, number, number];
  max: [number, number, number];
}

export interface NotFilter {
  kind: 'not';
  filter: QueryFilter;
}

export interface AndFilter {
  kind: 'and';
  filters: QueryFilter[];
}

export interface OrFilter {
  kind: 'or';
  filters: QueryFilter[];
}

export type QueryFilter = TypeFilter | PropertyFilter | BboxFilter | NotFilter | AndFilter | OrFilter;

export interface Query {
  /** Optional shortcut for `kind:'type'`. When set, AND-ed with `where`. */
  from?: string;
  where?: QueryFilter;
  limit?: number;
}

export interface QueryResult {
  elements: QueryableElement[];
  /** Total matched, before `limit` was applied. */
  matched: number;
  durationMs: number;
}
