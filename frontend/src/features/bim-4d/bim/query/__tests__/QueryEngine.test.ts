import { describe, it, expect, beforeEach } from 'vitest';
import { QueryEngine } from '../QueryEngine';
import type { QueryableElement } from '../types';

const ELEMENTS: QueryableElement[] = [
  {
    expressID: 1,
    ifcType: 'IfcWall',
    propertySets: {
      Pset_WallCommon: { FireRating: '60min', LoadBearing: true, Height: 3 },
      Qto_WallBaseQuantities: { NetVolume: 2 },
    },
    geometry: { bboxMin: [0, 0, 0], bboxMax: [4, 3, 0.2] },
  },
  {
    expressID: 2,
    ifcType: 'IfcWall',
    propertySets: {
      Pset_WallCommon: { FireRating: '120min', LoadBearing: false, Height: 4 },
    },
    geometry: { bboxMin: [10, 0, 0], bboxMax: [14, 4, 0.2] },
  },
  {
    expressID: 3,
    ifcType: 'IfcSlab',
    propertySets: {
      Pset_SlabCommon: { LoadBearing: true, Name: 'Laje_T1' },
    },
    geometry: { bboxMin: [0, 0, -0.2], bboxMax: [10, 10, 0] },
  },
  {
    expressID: 4,
    ifcType: 'IfcDoor',
    propertySets: {
      Pset_DoorCommon: { FireRating: null, Width: 0.9 },
    },
  },
];

describe('QueryEngine', () => {
  let engine: QueryEngine;
  beforeEach(() => {
    engine = new QueryEngine();
  });

  it('returns all elements when no filter is set', () => {
    const r = engine.execute(ELEMENTS, {});
    expect(r.matched).toBe(4);
    expect(r.elements).toHaveLength(4);
  });

  it('filters by IFC type via `from`', () => {
    const r = engine.execute(ELEMENTS, { from: 'IfcWall' });
    expect(r.matched).toBe(2);
    expect(r.elements.map((e) => e.expressID)).toEqual([1, 2]);
  });

  it('respects `limit` without losing the matched count', () => {
    const r = engine.execute(ELEMENTS, { from: 'IfcWall', limit: 1 });
    expect(r.matched).toBe(2);
    expect(r.elements).toHaveLength(1);
  });

  it('filters by qualified property (Pset.Name)', () => {
    const r = engine.execute(ELEMENTS, {
      where: {
        kind: 'property',
        property: { pset: 'Pset_WallCommon', name: 'FireRating' },
        op: '=',
        value: '60min',
      },
    });
    expect(r.elements.map((e) => e.expressID)).toEqual([1]);
  });

  it('filters by unqualified property (any Pset)', () => {
    const r = engine.execute(ELEMENTS, {
      where: { kind: 'property', property: { name: 'LoadBearing' }, op: '=', value: true },
    });
    expect(r.elements.map((e) => e.expressID).sort()).toEqual([1, 3]);
  });

  it('supports numeric comparison', () => {
    const r = engine.execute(ELEMENTS, {
      from: 'IfcWall',
      where: { kind: 'property', property: { name: 'Height' }, op: '>=', value: 4 },
    });
    expect(r.elements.map((e) => e.expressID)).toEqual([2]);
  });

  it('supports IN', () => {
    const r = engine.execute(ELEMENTS, {
      where: {
        kind: 'property',
        property: { name: 'FireRating' },
        op: 'IN',
        value: ['60min', '120min'],
      },
    });
    expect(r.elements.map((e) => e.expressID).sort()).toEqual([1, 2]);
  });

  it('supports LIKE with % wildcard', () => {
    const r = engine.execute(ELEMENTS, {
      where: { kind: 'property', property: { name: 'Name' }, op: 'LIKE', value: 'Laje%' },
    });
    expect(r.elements.map((e) => e.expressID)).toEqual([3]);
  });

  it('IS NULL matches explicitly null and missing values', () => {
    const r = engine.execute(ELEMENTS, {
      where: { kind: 'property', property: { name: 'FireRating' }, op: 'IS NULL' },
    });
    // Door has null, Slab is missing the property → both match
    expect(r.elements.map((e) => e.expressID).sort()).toEqual([3, 4]);
  });

  it('IS NOT NULL excludes null and missing', () => {
    const r = engine.execute(ELEMENTS, {
      where: { kind: 'property', property: { name: 'FireRating' }, op: 'IS NOT NULL' },
    });
    expect(r.elements.map((e) => e.expressID).sort()).toEqual([1, 2]);
  });

  it('combines filters with AND / OR / NOT', () => {
    const r = engine.execute(ELEMENTS, {
      where: {
        kind: 'and',
        filters: [
          { kind: 'type', ifcType: 'IfcWall' },
          {
            kind: 'or',
            filters: [
              { kind: 'property', property: { name: 'FireRating' }, op: '=', value: '120min' },
              { kind: 'not', filter: { kind: 'property', property: { name: 'LoadBearing' }, op: '=', value: true } },
            ],
          },
        ],
      },
    });
    expect(r.elements.map((e) => e.expressID)).toEqual([2]);
  });

  it('bbox filter intersects AABBs', () => {
    const r = engine.execute(ELEMENTS, {
      where: { kind: 'bbox', min: [-1, -1, -1], max: [5, 5, 5] },
    });
    // Wall 1 (0..4) and Slab 3 (0..10 within volume) intersect; Wall 2 (10..14) does not.
    expect(r.elements.map((e) => e.expressID).sort()).toEqual([1, 3]);
  });

  it('handles wrapped IFC values ({ value, unit })', () => {
    const els: QueryableElement[] = [
      {
        expressID: 99,
        ifcType: 'IfcWall',
        propertySets: { Pset: { Height: { value: 3, unit: 'm' } } },
      },
    ];
    const r = engine.execute(els, {
      where: { kind: 'property', property: { name: 'Height' }, op: '=', value: 3 },
    });
    expect(r.matched).toBe(1);
  });

  it('processes 1k elements quickly (<50ms)', () => {
    const big: QueryableElement[] = Array.from({ length: 1000 }, (_, i) => ({
      expressID: i,
      ifcType: i % 2 ? 'IfcWall' : 'IfcSlab',
      propertySets: { Pset: { Height: i % 10 } },
    }));
    const t0 = performance.now();
    const r = engine.execute(big, {
      from: 'IfcWall',
      where: { kind: 'property', property: { name: 'Height' }, op: '>=', value: 5 },
    });
    const dt = performance.now() - t0;
    expect(r.matched).toBeGreaterThan(0);
    expect(dt).toBeLessThan(50);
  });
});
