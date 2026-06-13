import { describe, it, expect } from 'vitest';
import {
  classifyDiscipline, emptyBoundingBox, mergeBoundingBox, boundingBoxFromPoints, buildStats,
} from '../../src/modules/ifc/ifc-structure.builder.js';
import { IFC_STRUCTURE_VERSION } from '../../src/modules/ifc/ifc-structure.dto.js';
import type { IFCElement } from '../../src/modules/ifc/ifc-structure.dto.js';

function el(type: string, expressID = 1): IFCElement {
  return { expressID, globalId: `g${expressID}`, type, name: null, storeyId: null, parentExpressID: null, hasGeometry: false };
}

describe('ifc-structure.builder', () => {
  it('classifies disciplines case-insensitively', () => {
    expect(classifyDiscipline('IfcWall')).toBe('architecture');
    expect(classifyDiscipline('IFCBEAM')).toBe('structure');
    expect(classifyDiscipline('IfcPipeSegment')).toBe('mep');
    expect(classifyDiscipline('IfcFurnishingElement')).toBe('other');
  });

  it('boundingBoxFromPoints envelops the cloud, throws when empty', () => {
    const bb = boundingBoxFromPoints([[1, 2, 3], [-1, 5, 0], [4, 0, 9]]);
    expect(bb.min).toEqual([-1, 0, 0]);
    expect(bb.max).toEqual([4, 5, 9]);
    expect(() => boundingBoxFromPoints([])).toThrow();
  });

  it('mergeBoundingBox takes component-wise min/max', () => {
    const m = mergeBoundingBox({ min: [0, 0, 0], max: [2, 2, 2] }, { min: [-1, 1, 0], max: [1, 3, 5] });
    expect(m).toEqual({ min: [-1, 0, 0], max: [2, 3, 5] });
    expect(emptyBoundingBox()).toEqual({ min: [0, 0, 0], max: [0, 0, 0] });
  });

  it('buildStats aggregates byType + byDiscipline + total', () => {
    const elements = [el('IfcWall', 1), el('IfcWall', 2), el('IfcBeam', 3), el('IfcDoor', 4)];
    const stats = buildStats(elements, { min: [0, 0, 0], max: [1, 1, 1] });
    expect(stats.totalElements).toBe(4);
    expect(stats.byType).toEqual({ IfcWall: 2, IfcBeam: 1, IfcDoor: 1 });
    expect(stats.byDiscipline).toEqual({ architecture: 3, structure: 1, mep: 0, other: 0 });
    expect(stats.boundingBox.max).toEqual([1, 1, 1]);
  });

  it('DTO version pinned to 1', () => {
    expect(IFC_STRUCTURE_VERSION).toBe(1);
  });
});
