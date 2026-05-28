import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { meshesToQueryableElements } from '../IfcQueryAdapter';
import { QueryEngine } from '../QueryEngine';
import { QueryBuilder } from '../QueryBuilder';

function mkMesh(
  userData: Record<string, unknown> = {},
  size = 1,
  position = [0, 0, 0] as [number, number, number],
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshBasicMaterial(),
  );
  mesh.userData = userData;
  mesh.position.set(...position);
  mesh.updateMatrixWorld(true);
  return mesh;
}

describe('IfcQueryAdapter — meshesToQueryableElements', () => {
  it('returns empty result for empty input', () => {
    const r = meshesToQueryableElements([]);
    expect(r.elements).toEqual([]);
    expect(r.elementToObject.size).toBe(0);
  });

  it('skips objects without ifcType when requireType=true (default)', () => {
    const a = mkMesh({ expressID: 1, ifcType: 'IfcWall' });
    const b = mkMesh({ expressID: 2 }); // no type
    const r = meshesToQueryableElements([a, b]);
    expect(r.elements).toHaveLength(1);
    expect(r.elements[0]?.ifcType).toBe('IfcWall');
  });

  it('keeps untyped objects when requireType=false (Unknown)', () => {
    const a = mkMesh({ expressID: 1 });
    const r = meshesToQueryableElements([a], { requireType: false });
    expect(r.elements).toHaveLength(1);
    expect(r.elements[0]?.ifcType).toBe('Unknown');
  });

  it('uses expressID when present, falls back to uuid otherwise', () => {
    const a = mkMesh({ expressID: 42, ifcType: 'IfcWall' });
    const b = mkMesh({ ifcId: 'ifc-7', ifcType: 'IfcSlab' });
    const c = mkMesh({ ifcType: 'IfcWindow' });
    const r = meshesToQueryableElements([a, b, c]);
    expect(r.elements[0]?.expressID).toBe(42);
    expect(r.elements[1]?.expressID).toBe('ifc-7');
    expect(r.elements[2]?.expressID).toBe(c.uuid);
  });

  it('parses array-of-pset userData.psets shape (web-ifc style)', () => {
    const mesh = mkMesh({
      expressID: 1,
      ifcType: 'IfcWall',
      psets: [
        {
          Name: 'Pset_WallCommon',
          HasProperties: { FireRating: '60min', LoadBearing: true },
        },
      ],
    });
    const r = meshesToQueryableElements([mesh]);
    expect(r.elements[0]?.propertySets?.Pset_WallCommon).toEqual({
      FireRating: '60min',
      LoadBearing: true,
    });
  });

  it('parses array-of-pset with lowercase properties key', () => {
    const mesh = mkMesh({
      expressID: 1,
      ifcType: 'IfcWall',
      psets: [{ name: 'Pset_X', properties: { A: 1, B: 'two' } }],
    });
    const r = meshesToQueryableElements([mesh]);
    expect(r.elements[0]?.propertySets?.Pset_X).toEqual({ A: 1, B: 'two' });
  });

  it('parses keyed-object userData.psets shape', () => {
    const mesh = mkMesh({
      expressID: 1,
      ifcType: 'IfcWall',
      psets: {
        Pset_WallCommon: { FireRating: '90min' },
      },
    });
    const r = meshesToQueryableElements([mesh]);
    expect(r.elements[0]?.propertySets?.Pset_WallCommon?.FireRating).toBe('90min');
  });

  it('puts flat userData.properties under Pset_Common by default', () => {
    const mesh = mkMesh({
      expressID: 1,
      ifcType: 'IfcWall',
      properties: { Name: 'W1', Height: 3.2 },
    });
    const r = meshesToQueryableElements([mesh]);
    expect(r.elements[0]?.propertySets?.Pset_Common).toEqual({ Name: 'W1', Height: 3.2 });
  });

  it('merges flat properties into custom flatPsetName', () => {
    const mesh = mkMesh({
      expressID: 1,
      ifcType: 'IfcWall',
      properties: { A: 1 },
    });
    const r = meshesToQueryableElements([mesh], { flatPsetName: 'Custom' });
    expect(r.elements[0]?.propertySets?.Custom).toEqual({ A: 1 });
  });

  it('unwraps web-ifc { value, unit } shape', () => {
    const mesh = mkMesh({
      expressID: 1,
      ifcType: 'IfcWall',
      psets: [
        {
          Name: 'Pset_X',
          HasProperties: {
            Length: { value: 3.5, unit: 'm', type: 'IfcLengthMeasure' },
            Label: { value: 'demo' },
          },
        },
      ],
    });
    const r = meshesToQueryableElements([mesh]);
    const props = r.elements[0]?.propertySets?.Pset_X;
    expect(props?.Length).toEqual({ value: 3.5, unit: 'm', type: 'IfcLengthMeasure' });
    expect(props?.Label).toEqual({ value: 'demo' });
  });

  it('attaches bbox by default', () => {
    const mesh = mkMesh({ expressID: 1, ifcType: 'IfcWall' }, 2);
    const r = meshesToQueryableElements([mesh]);
    expect(r.elements[0]?.geometry).toBeDefined();
    expect(r.elements[0]?.geometry?.bboxMin).toEqual([-1, -1, -1]);
    expect(r.elements[0]?.geometry?.bboxMax).toEqual([1, 1, 1]);
  });

  it('omits bbox when includeBbox=false', () => {
    const mesh = mkMesh({ expressID: 1, ifcType: 'IfcWall' });
    const r = meshesToQueryableElements([mesh], { includeBbox: false });
    expect(r.elements[0]?.geometry).toBeUndefined();
  });

  it('elementToObject maps expressID strings back to source meshes', () => {
    const a = mkMesh({ expressID: 1, ifcType: 'IfcWall' });
    const b = mkMesh({ expressID: 2, ifcType: 'IfcSlab' });
    const r = meshesToQueryableElements([a, b]);
    expect(r.elementToObject.get('1')).toBe(a);
    expect(r.elementToObject.get('2')).toBe(b);
  });

  it('integration: adapter output is queryable by the engine', () => {
    const wall = mkMesh({
      expressID: 10,
      ifcType: 'IfcWall',
      psets: [{ Name: 'Pset_WallCommon', HasProperties: { LoadBearing: true } }],
    });
    const slab = mkMesh({
      expressID: 11,
      ifcType: 'IfcSlab',
      psets: [{ Name: 'Pset_SlabCommon', HasProperties: { LoadBearing: false } }],
    });
    const { elements } = meshesToQueryableElements([wall, slab]);
    const engine = new QueryEngine();
    const q = new QueryBuilder().from('IfcWall').where('LoadBearing', '=', true).build();
    const res = engine.execute(elements, q);
    expect(res.matched).toBe(1);
    expect(res.elements[0]?.expressID).toBe(10);
  });
});
