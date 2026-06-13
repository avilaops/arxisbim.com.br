import { describe, it, expect } from 'vitest';
import { ElementIndex } from './ElementIndex';
import type { GeometryManifest, MeshReference, IdentifiableObject } from './MeshReference';

function ref(expressID: number, type: string, globalId = `G${expressID}`, instanceKey = `k${type}`): MeshReference {
  return {
    expressID, globalId, meshId: `${expressID}`, type,
    bounds: { min: [0, 0, 0], max: [1, 1, 1] },
    boundingSphere: { center: [0.5, 0.5, 0.5], radius: 0.87 },
    instanceKey, hasGeometry: true,
  };
}

function manifest(elements: MeshReference[]): GeometryManifest {
  return {
    version: 1, modelVersionId: 'mv', glbKey: 'k.glb', meshCount: elements.length,
    instancedGroups: [], modelBounds: { min: [0, 0, 0], max: [10, 10, 10] },
    modelSphere: { center: [5, 5, 5], radius: 8.6 }, elements,
  };
}

describe('ElementIndex', () => {
  const idx = new ElementIndex(manifest([ref(1, 'IfcWall'), ref(2, 'IfcWall'), ref(3, 'IfcBeam')]));

  it('indexa por expressID e globalId', () => {
    expect(idx.size).toBe(3);
    expect(idx.get(1)?.type).toBe('IfcWall');
    expect(idx.getByGlobalId('G3')?.expressID).toBe(3);
    expect(idx.has(99)).toBe(false);
  });

  it('resolve clique→expressID subindo a hierarquia', () => {
    // hit num filho sem userData → sobe até o node com expressID.
    const node: IdentifiableObject = { userData: { expressID: 2 }, parent: null };
    const child: IdentifiableObject = { userData: {}, parent: node };
    const grandchild: IdentifiableObject = { parent: child };
    expect(idx.resolveExpressID(grandchild)).toBe(2);
    expect(idx.resolve(grandchild)?.type).toBe('IfcWall');
  });

  it('objeto fora do modelo → null (não acha expressID)', () => {
    const grid: IdentifiableObject = { userData: { kind: 'grid' }, parent: null };
    expect(idx.resolveExpressID(grid)).toBeNull();
    expect(idx.resolve(grid)).toBeNull();
    expect(idx.resolveExpressID(null)).toBeNull();
  });

  it('byType lista expressIDs do tipo (base de filtros S10)', () => {
    expect(idx.byType('IfcWall').sort()).toEqual([1, 2]);
    expect(idx.byType('ifcbeam')).toEqual([3]); // case-insensitive
    expect(idx.byType('IfcDoor')).toEqual([]);
  });

  it('rejeita manifest de versão incompatível', () => {
    const bad = { ...manifest([]), version: 2 as unknown as 1 };
    expect(() => new ElementIndex(bad)).toThrow(/incompat/);
  });
});
