import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QuantityRulesEngine } from '../QuantityRulesEngine';
import { TakeoffManager, type TakeoffEvent } from '../TakeoffManager';
import { QuantityExtractor } from '../QuantityExtractor';
import type { IfcElementSource, Quantity, QuantityRule } from '../types';

const wallRule: QuantityRule = {
  ifcType: 'IfcWall',
  name: 'NetArea',
  unit: 'm2',
  compute: (el) => {
    const g = el.geometry;
    if (!g) return null;
    const [x1, y1, z1] = g.bboxMin;
    const [x2, y2, z2] = g.bboxMax;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    // wall area = height × longest horizontal side
    const horiz = Math.max(dx, dz);
    return horiz * dy;
  },
};

describe('QuantityRulesEngine', () => {
  let engine: QuantityRulesEngine;

  beforeEach(() => {
    engine = new QuantityRulesEngine();
  });

  it('registers and exposes rules by IFC type', () => {
    engine.register(wallRule);
    expect(engine.getRules('IfcWall')).toHaveLength(1);
    expect(engine.getRules('IfcSlab')).toHaveLength(0);
  });

  it('fills missing quantities without overriding existing ones', () => {
    engine.register(wallRule);
    const el: IfcElementSource = {
      expressID: 1,
      ifcType: 'IfcWall',
      geometry: { bboxMin: [0, 0, 0], bboxMax: [4, 3, 0.2] },
    };
    const existing: Quantity[] = [
      { elementId: 1, ifcType: 'IfcWall', name: 'NetArea', value: 99, unit: 'm2', source: 'ifc-quantity-area' },
    ];
    const { quantities, matchedElementCount } = engine.apply([el], {
      existingQuantities: existing,
    });
    expect(quantities).toEqual([]);
    expect(matchedElementCount).toBe(0);
  });

  it('overrides existing quantities when overrideExisting=true', () => {
    engine.register(wallRule);
    const el: IfcElementSource = {
      expressID: 1,
      ifcType: 'IfcWall',
      geometry: { bboxMin: [0, 0, 0], bboxMax: [4, 3, 0.2] },
    };
    const existing: Quantity[] = [
      { elementId: 1, ifcType: 'IfcWall', name: 'NetArea', value: 99, unit: 'm2', source: 'ifc-quantity-area' },
    ];
    const { quantities, matchedElementCount } = engine.apply([el], {
      overrideExisting: true,
      existingQuantities: existing,
    });
    expect(quantities).toHaveLength(1);
    expect(quantities[0]).toMatchObject({ name: 'NetArea', value: 12, unit: 'm2', source: 'rule-engine' });
    expect(matchedElementCount).toBe(1);
  });

  it('skips elements without a matching rule', () => {
    engine.register(wallRule);
    const el: IfcElementSource = {
      expressID: 2,
      ifcType: 'IfcDoor',
      geometry: { bboxMin: [0, 0, 0], bboxMax: [1, 2, 0.05] },
    };
    expect(engine.apply([el]).quantities).toEqual([]);
  });

  it('drops rule output when compute returns null or non-finite', () => {
    engine.register({
      ifcType: 'IfcWall',
      name: 'NetArea',
      unit: 'm2',
      compute: () => null,
    });
    engine.register({
      ifcType: 'IfcWall',
      name: 'GrossArea',
      unit: 'm2',
      compute: () => Number.POSITIVE_INFINITY,
    });
    const el: IfcElementSource = { expressID: 1, ifcType: 'IfcWall' };
    expect(engine.apply([el]).quantities).toEqual([]);
  });
});

describe('TakeoffManager', () => {
  let manager: TakeoffManager;

  beforeEach(() => {
    manager = new TakeoffManager(new QuantityExtractor(), new QuantityRulesEngine());
  });

  it('aggregates IFC quantities by type and name', async () => {
    const elements: IfcElementSource[] = [
      {
        expressID: 1,
        ifcType: 'IfcWall',
        propertySets: { Qto_WallBaseQuantities: { NetVolume: 2 } },
      },
      {
        expressID: 2,
        ifcType: 'IfcWall',
        propertySets: { Qto_WallBaseQuantities: { NetVolume: 3 } },
      },
      {
        expressID: 3,
        ifcType: 'IfcSlab',
        propertySets: { Qto_SlabBaseQuantities: { GrossArea: 10 } },
      },
    ];
    const result = await manager.run(elements, { enableGeometryFallback: false });
    expect(result.quantities).toHaveLength(3);
    expect(result.byType.IfcWall.NetVolume).toEqual({ sum: 5, unit: 'm3', count: 2 });
    expect(result.byType.IfcSlab.GrossArea).toEqual({ sum: 10, unit: 'm2', count: 1 });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('fills gaps via rules engine (not skipped after rule fires)', async () => {
    manager.registerRule(wallRule);
    const elements: IfcElementSource[] = [
      {
        expressID: 1,
        ifcType: 'IfcWall',
        geometry: { bboxMin: [0, 0, 0], bboxMax: [4, 3, 0.2] },
      },
    ];
    const result = await manager.run(elements, { enableGeometryFallback: false });
    // QuantityExtractor produced nothing → rule fired
    expect(result.quantities).toHaveLength(1);
    expect(result.quantities[0]).toMatchObject({ source: 'rule-engine', value: 12 });
    expect(result.skippedElementIds).toEqual([]);
  });

  it('rules can override IFC values when rulesOverride=true', async () => {
    manager.registerRule(wallRule);
    const elements: IfcElementSource[] = [
      {
        expressID: 1,
        ifcType: 'IfcWall',
        propertySets: { Qto_WallBaseQuantities: { NetArea: 99 } },
        geometry: { bboxMin: [0, 0, 0], bboxMax: [4, 3, 0.2] },
      },
    ];
    const result = await manager.run(elements, {
      enableGeometryFallback: false,
      rulesOverride: true,
    });
    const netArea = result.quantities.filter((q) => q.name === 'NetArea');
    expect(netArea).toHaveLength(1);
    expect(netArea[0]).toMatchObject({ source: 'rule-engine', value: 12 });
  });

  it('emits lifecycle events (start/progress/done)', async () => {
    const events: TakeoffEvent[] = [];
    manager.on((e) => events.push(e));
    const elements: IfcElementSource[] = Array.from({ length: 5 }, (_, i) => ({
      expressID: i,
      ifcType: 'IfcWall',
      propertySets: { Qto_WallBaseQuantities: { NetVolume: 1 } },
    }));
    await manager.run(elements, { yieldEvery: 2 });
    expect(events[0]).toEqual({ type: 'start', total: 5 });
    const progress = events.filter((e) => e.type === 'progress');
    expect(progress.length).toBeGreaterThanOrEqual(2);
    expect(events[events.length - 1].type).toBe('done');
  });

  it('reports skipped elements that produced no quantity at all', async () => {
    const elements: IfcElementSource[] = [
      { expressID: 'a', ifcType: 'IfcWall', propertySets: { Qto_WallBaseQuantities: { NetVolume: 1 } } },
      { expressID: 'b', ifcType: 'IfcDoor' }, // no quantities, no geometry, no rule
    ];
    const result = await manager.run(elements, { enableGeometryFallback: false });
    expect(result.skippedElementIds).toEqual(['b']);
  });

  it('listener errors do not break the pipeline', async () => {
    manager.on(() => {
      throw new Error('listener boom');
    });
    const elements: IfcElementSource[] = [
      { expressID: 1, ifcType: 'IfcWall', propertySets: { Qto_WallBaseQuantities: { NetVolume: 2 } } },
    ];
    const result = await manager.run(elements);
    expect(result.quantities).toHaveLength(1);
  });

  it('unsubscribe via returned disposer', async () => {
    const fn = vi.fn();
    const off = manager.on(fn);
    off();
    await manager.run([], { enableGeometryFallback: false });
    expect(fn).not.toHaveBeenCalled();
  });
});
