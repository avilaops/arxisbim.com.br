/**
 * QuantityExtractor — pulls quantities from IfcElementSource objects.
 *
 * Strategy:
 *   1. Look for IFC standard quantity sets (`Qto_*`).
 *   2. For each recognized quantity (Volume/Area/Length/Count/Weight),
 *      emit a normalized `Quantity` record.
 *   3. If no native quantity is found, optionally fall back to a bbox-based
 *      geometric estimate (volume/area) so old IFCs still produce takeoff.
 */

import type {
  IfcElementSource,
  IfcPropertyValue,
  MeasurementUnit,
  Quantity,
  QuantitySource,
} from './types';

interface ExtractOptions {
  /** Enable bbox fallback for elements without IFC quantities. Default: true. */
  enableGeometryFallback?: boolean;
}

const QTO_PREFIX = 'Qto_';

/**
 * Names that map directly to a unit + source tag.
 * Order matters when the same set carries multiple values: we keep all of them.
 */
const QUANTITY_NAME_MAP: Record<string, { unit: MeasurementUnit; source: QuantitySource }> = {
  // Volume
  NetVolume: { unit: 'm3', source: 'ifc-quantity-volume' },
  GrossVolume: { unit: 'm3', source: 'ifc-quantity-volume' },
  Volume: { unit: 'm3', source: 'ifc-quantity-volume' },
  // Area
  NetArea: { unit: 'm2', source: 'ifc-quantity-area' },
  GrossArea: { unit: 'm2', source: 'ifc-quantity-area' },
  NetSideArea: { unit: 'm2', source: 'ifc-quantity-area' },
  GrossSideArea: { unit: 'm2', source: 'ifc-quantity-area' },
  Area: { unit: 'm2', source: 'ifc-quantity-area' },
  // Length
  Length: { unit: 'm', source: 'ifc-quantity-length' },
  Height: { unit: 'm', source: 'ifc-quantity-length' },
  Width: { unit: 'm', source: 'ifc-quantity-length' },
  Perimeter: { unit: 'm', source: 'ifc-quantity-length' },
  // Count
  Count: { unit: 'un', source: 'ifc-quantity-count' },
  // Weight
  NetWeight: { unit: 'kg', source: 'ifc-quantity-weight' },
  GrossWeight: { unit: 'kg', source: 'ifc-quantity-weight' },
  Weight: { unit: 'kg', source: 'ifc-quantity-weight' },
};

export class QuantityExtractor {
  /**
   * Extract quantities from a single element.
   * Returns an empty array when no quantities are found and fallback is disabled.
   */
  public extract(element: IfcElementSource, options: ExtractOptions = {}): Quantity[] {
    const { enableGeometryFallback = true } = options;
    const out: Quantity[] = [];

    const sets = element.propertySets ?? {};
    for (const [setName, props] of Object.entries(sets)) {
      if (!setName.startsWith(QTO_PREFIX)) continue;
      for (const [propName, raw] of Object.entries(props)) {
        const mapping = QUANTITY_NAME_MAP[propName];
        if (!mapping) continue;
        const numeric = toNumber(raw);
        if (numeric === null || !Number.isFinite(numeric)) continue;
        out.push({
          elementId: element.expressID,
          ifcType: element.ifcType,
          name: propName,
          value: numeric,
          unit: mapping.unit,
          source: mapping.source,
        });
      }
    }

    if (out.length === 0 && enableGeometryFallback && element.geometry) {
      const fallback = this.fallbackFromGeometry(element);
      if (fallback) out.push(fallback);
    }

    return out;
  }

  /**
   * Bulk extract; preserves element order.
   */
  public extractAll(
    elements: Iterable<IfcElementSource>,
    options: ExtractOptions = {},
  ): { quantities: Quantity[]; skippedElementIds: Array<string | number> } {
    const quantities: Quantity[] = [];
    const skipped: Array<string | number> = [];
    for (const el of elements) {
      const got = this.extract(el, options);
      if (got.length === 0) {
        skipped.push(el.expressID);
      } else {
        quantities.push(...got);
      }
    }
    return { quantities, skippedElementIds: skipped };
  }

  /**
   * Produce a single bbox-derived volume quantity (m³). For 2D-ish elements
   * (one dimension < 1mm), emits area (m²) instead so slabs/walls without
   * native Qto still produce something usable.
   */
  private fallbackFromGeometry(element: IfcElementSource): Quantity | null {
    const g = element.geometry;
    if (!g) return null;
    const [minX, minY, minZ] = g.bboxMin;
    const [maxX, maxY, maxZ] = g.bboxMax;
    const dx = maxX - minX;
    const dy = maxY - minY;
    const dz = maxZ - minZ;
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(dz)) return null;
    if (dx <= 0 || dy <= 0 || dz <= 0) return null;

    const dims = [dx, dy, dz];
    const flat = dims.filter((d) => d < 0.001);
    if (flat.length === 1) {
      // 2D-ish: area = product of the two non-flat dims
      const nonFlat = dims.filter((d) => d >= 0.001);
      const area = nonFlat[0] * nonFlat[1];
      return {
        elementId: element.expressID,
        ifcType: element.ifcType,
        name: 'GrossArea',
        value: round(area, 4),
        unit: 'm2',
        source: 'geometry-fallback',
      };
    }

    return {
      elementId: element.expressID,
      ifcType: element.ifcType,
      name: 'GrossVolume',
      value: round(dx * dy * dz, 6),
      unit: 'm3',
      source: 'geometry-fallback',
    };
  }
}

function toNumber(raw: IfcPropertyValue): number | null {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
  }
  if (typeof raw === 'boolean') return raw ? 1 : 0;
  if (raw && typeof raw === 'object' && 'value' in raw) {
    return toNumber(raw.value as IfcPropertyValue);
  }
  return null;
}

function round(n: number, digits: number): number {
  const k = 10 ** digits;
  return Math.round(n * k) / k;
}
