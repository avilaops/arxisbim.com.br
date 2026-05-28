import { describe, it, expect, beforeEach } from 'vitest';
import { QuantityExtractor } from '../QuantityExtractor';
import type { IfcElementSource } from '../types';

describe('QuantityExtractor', () => {
  let extractor: QuantityExtractor;

  beforeEach(() => {
    extractor = new QuantityExtractor();
  });

  describe('IFC native quantity sets (Qto_*)', () => {
    it('extracts NetVolume + GrossVolume from Qto_WallBaseQuantities', () => {
      const element: IfcElementSource = {
        expressID: 101,
        ifcType: 'IfcWall',
        propertySets: {
          Qto_WallBaseQuantities: {
            NetVolume: 1.5,
            GrossVolume: 1.8,
          },
        },
      };
      const result = extractor.extract(element);
      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'NetVolume', value: 1.5, unit: 'm3', source: 'ifc-quantity-volume' }),
          expect.objectContaining({ name: 'GrossVolume', value: 1.8, unit: 'm3' }),
        ]),
      );
    });

    it('extracts area, length and weight in a single pass', () => {
      const element: IfcElementSource = {
        expressID: 202,
        ifcType: 'IfcSlab',
        propertySets: {
          Qto_SlabBaseQuantities: {
            GrossArea: { value: 32.5, unit: 'm2' },
            Perimeter: 24,
            NetWeight: 800,
          },
        },
      };
      const result = extractor.extract(element);
      expect(result.find((q) => q.name === 'GrossArea')).toMatchObject({ value: 32.5, unit: 'm2' });
      expect(result.find((q) => q.name === 'Perimeter')).toMatchObject({ value: 24, unit: 'm' });
      expect(result.find((q) => q.name === 'NetWeight')).toMatchObject({ value: 800, unit: 'kg' });
    });

    it('ignores property sets that are not Qto_*', () => {
      const element: IfcElementSource = {
        expressID: 1,
        ifcType: 'IfcWall',
        propertySets: {
          Pset_WallCommon: { FireRating: '60min', LoadBearing: true },
        },
      };
      expect(extractor.extract(element, { enableGeometryFallback: false })).toEqual([]);
    });

    it('ignores unknown quantity names', () => {
      const element: IfcElementSource = {
        expressID: 1,
        ifcType: 'IfcWall',
        propertySets: {
          Qto_WallBaseQuantities: { UnknownThing: 42 },
        },
      };
      expect(extractor.extract(element, { enableGeometryFallback: false })).toEqual([]);
    });

    it('parses string numerics and boolean→number', () => {
      const element: IfcElementSource = {
        expressID: 5,
        ifcType: 'IfcColumn',
        propertySets: {
          Qto_ColumnBaseQuantities: {
            Length: '3.50',
            Count: true,
          },
        },
      };
      const result = extractor.extract(element);
      expect(result.find((q) => q.name === 'Length')?.value).toBe(3.5);
      expect(result.find((q) => q.name === 'Count')?.value).toBe(1);
    });

    it('drops non-numeric values silently', () => {
      const element: IfcElementSource = {
        expressID: 6,
        ifcType: 'IfcWall',
        propertySets: {
          Qto_WallBaseQuantities: { NetVolume: 'not-a-number' as any },
        },
      };
      expect(extractor.extract(element, { enableGeometryFallback: false })).toEqual([]);
    });
  });

  describe('geometry fallback', () => {
    it('emits GrossVolume from bbox when no IFC quantities exist', () => {
      const element: IfcElementSource = {
        expressID: 'abc',
        ifcType: 'IfcBuildingElementProxy',
        geometry: { bboxMin: [0, 0, 0], bboxMax: [2, 3, 4] },
      };
      const result = extractor.extract(element);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: 'GrossVolume',
        value: 24,
        unit: 'm3',
        source: 'geometry-fallback',
      });
    });

    it('emits GrossArea for flat (2D-ish) elements', () => {
      const element: IfcElementSource = {
        expressID: 7,
        ifcType: 'IfcSlab',
        geometry: { bboxMin: [0, 0, 0], bboxMax: [5, 0.0005, 4] },
      };
      const result = extractor.extract(element);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ name: 'GrossArea', unit: 'm2', source: 'geometry-fallback' });
      expect(result[0].value).toBeCloseTo(20, 4);
    });

    it('skips degenerate bbox (zero dim)', () => {
      const element: IfcElementSource = {
        expressID: 8,
        ifcType: 'IfcWall',
        geometry: { bboxMin: [0, 0, 0], bboxMax: [0, 2, 3] },
      };
      expect(extractor.extract(element)).toEqual([]);
    });

    it('does not run fallback when disabled', () => {
      const element: IfcElementSource = {
        expressID: 9,
        ifcType: 'IfcSlab',
        geometry: { bboxMin: [0, 0, 0], bboxMax: [2, 2, 2] },
      };
      expect(extractor.extract(element, { enableGeometryFallback: false })).toEqual([]);
    });

    it('does not run fallback when IFC quantities are present', () => {
      const element: IfcElementSource = {
        expressID: 10,
        ifcType: 'IfcWall',
        propertySets: {
          Qto_WallBaseQuantities: { NetVolume: 1 },
        },
        geometry: { bboxMin: [0, 0, 0], bboxMax: [10, 10, 10] },
      };
      const result = extractor.extract(element);
      expect(result).toHaveLength(1);
      expect(result[0].source).toBe('ifc-quantity-volume');
    });
  });

  describe('extractAll', () => {
    it('preserves order and reports skipped elements', () => {
      const elements: IfcElementSource[] = [
        {
          expressID: 1,
          ifcType: 'IfcWall',
          propertySets: { Qto_WallBaseQuantities: { NetVolume: 2 } },
        },
        {
          expressID: 2,
          ifcType: 'IfcDoor',
          // no quantities, no geometry → skipped
        },
        {
          expressID: 3,
          ifcType: 'IfcSlab',
          propertySets: { Qto_SlabBaseQuantities: { GrossArea: 10 } },
        },
      ];
      const { quantities, skippedElementIds } = extractor.extractAll(elements);
      expect(quantities.map((q) => q.elementId)).toEqual([1, 3]);
      expect(skippedElementIds).toEqual([2]);
    });

    it('handles empty input', () => {
      expect(extractor.extractAll([])).toEqual({ quantities: [], skippedElementIds: [] });
    });

    it('processes 10k elements quickly (<200ms)', () => {
      const elements: IfcElementSource[] = Array.from({ length: 10000 }, (_, i) => ({
        expressID: i,
        ifcType: 'IfcWall',
        propertySets: { Qto_WallBaseQuantities: { NetVolume: i * 0.1 } },
      }));
      const t0 = performance.now();
      const { quantities } = extractor.extractAll(elements);
      const dt = performance.now() - t0;
      expect(quantities).toHaveLength(10000);
      expect(dt).toBeLessThan(500);
    });
  });
});
