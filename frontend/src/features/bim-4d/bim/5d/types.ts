/**
 * BIM 5D - Core type definitions.
 *
 * Shared across QuantityExtractor, QuantityRulesEngine, TakeoffManager,
 * BudgetManager, BudgetCalculator, BudgetExporter.
 */

/** Supported measurement units for cost takeoff. */
export type MeasurementUnit = 'm' | 'm2' | 'm3' | 'kg' | 'un';

/** Source of a quantity value (audit trail). */
export type QuantitySource =
  | 'ifc-quantity-volume'
  | 'ifc-quantity-area'
  | 'ifc-quantity-length'
  | 'ifc-quantity-count'
  | 'ifc-quantity-weight'
  | 'rule-engine'
  | 'geometry-fallback';

/** Single quantity record attached to an element. */
export interface Quantity {
  /** Element express ID or GUID (depending on adapter). */
  elementId: string | number;
  /** IFC entity type (e.g., 'IfcWall', 'IfcSlab'). */
  ifcType: string;
  /** Quantity name (e.g., 'NetVolume', 'GrossArea'). */
  name: string;
  /** Numeric value already converted to `unit`. */
  value: number;
  /** Normalized unit. */
  unit: MeasurementUnit;
  /** Where the value came from (for traceability). */
  source: QuantitySource;
}

/** Result of a takeoff run over a set of elements. */
export interface TakeoffResult {
  /** All extracted quantities, flat. */
  quantities: Quantity[];
  /** Quantities grouped by IFC type → name → sum. */
  byType: Record<string, Record<string, { sum: number; unit: MeasurementUnit; count: number }>>;
  /** Elements that produced no quantity at all (candidates for fallback). */
  skippedElementIds: Array<string | number>;
  /** Run duration in ms. */
  durationMs: number;
}

/**
 * Minimal shape an IFC element must expose to be quantifiable.
 * Adapters convert web-ifc / IFC.js output into this shape.
 */
export interface IfcElementSource {
  expressID: string | number;
  ifcType: string;
  /**
   * Property sets keyed by name. Quantity sets typically use
   * `Qto_*` (e.g., 'Qto_WallBaseQuantities'). Values inside each set
   * are either primitives or `{ value, unit?, type? }` shapes.
   */
  propertySets?: Record<string, Record<string, IfcPropertyValue>>;
  /**
   * Optional geometry summary used by the fallback path
   * (bounding box dimensions in meters).
   */
  geometry?: {
    bboxMin: [number, number, number];
    bboxMax: [number, number, number];
  };
}

export type IfcPropertyValue =
  | number
  | string
  | boolean
  | { value: number | string | boolean; unit?: string; type?: string };

/**
 * Quantity rule applied per IFC type when no native IFC quantity is present
 * or when an override is desired.
 */
export interface QuantityRule {
  ifcType: string;
  /** Output unit produced by this rule. */
  unit: MeasurementUnit;
  /** Output name written into the resulting Quantity. */
  name: string;
  /** Computes the value from the source element; return null to skip. */
  compute: (element: IfcElementSource) => number | null;
}
