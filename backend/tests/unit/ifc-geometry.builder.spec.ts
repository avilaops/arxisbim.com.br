import { describe, it, expect } from 'vitest';
import {
  boundingSphereFromPoints, sphereFromBounds, instanceKey, writeGlb,
} from '../../src/modules/ifc/ifc-geometry.builder.js';
import { GEOMETRY_MANIFEST_VERSION } from '../../src/modules/ifc/ifc-geometry.dto.js';

describe('ifc-geometry.builder', () => {
  it('boundingSphereFromPoints centra no bbox, raio = maior distância real', () => {
    const s = boundingSphereFromPoints([[0, 0, 0], [2, 0, 0], [0, 2, 0]]);
    expect(s.center).toEqual([1, 1, 0]);
    // vértice mais distante do centro [1,1,0]: dist sqrt(2) p/ todos os 3
    expect(s.radius).toBeCloseTo(Math.SQRT2, 6);
    expect(boundingSphereFromPoints([])).toEqual({ center: [0, 0, 0], radius: 0 });
  });

  it('sphereFromBounds usa meia-diagonal', () => {
    const s = sphereFromBounds({ min: [0, 0, 0], max: [2, 2, 2] });
    expect(s.center).toEqual([1, 1, 1]);
    expect(s.radius).toBeCloseTo(Math.sqrt(3), 6);
  });

  it('instanceKey: mesma geom+cor → mesma chave; cor diferente → chave diferente', () => {
    const red = { x: 1, y: 0, z: 0, w: 1 };
    const blue = { x: 0, y: 0, z: 1, w: 1 };
    expect(instanceKey(42, red)).toBe(instanceKey(42, red));
    expect(instanceKey(42, red)).not.toBe(instanceKey(42, blue)); // material difere
    expect(instanceKey(42, red)).not.toBe(instanceKey(99, red));  // geometria difere
  });

  it('writeGlb produz GLB binário válido com identidade BIM nos extras', () => {
    const glb = writeGlb([{
      expressID: 123, globalId: 'GID', type: 'IfcWall',
      positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      indices: new Uint32Array([0, 1, 2]),
      color: { x: 0.5, y: 0.5, z: 0.5, w: 1 },
    }]);

    // Header GLB.
    expect(glb.readUInt32LE(0)).toBe(0x46546c67); // 'glTF'
    expect(glb.readUInt32LE(4)).toBe(2);          // version
    expect(glb.readUInt32LE(8)).toBe(glb.length); // total length bate

    // Chunk JSON.
    const jsonLen = glb.readUInt32LE(12);
    expect(glb.readUInt32LE(16)).toBe(0x4e4f534a); // 'JSON'
    const json = JSON.parse(glb.slice(20, 20 + jsonLen).toString('utf8'));
    expect(json.asset.version).toBe('2.0');
    expect(json.nodes).toHaveLength(1);
    // Identidade preservada: clique→expressID depende disto.
    expect(json.nodes[0].extras).toEqual({ expressID: 123, globalId: 'GID', ifcType: 'IfcWall' });
    expect(json.accessors[0].type).toBe('VEC3');
    expect(json.accessors[0].count).toBe(3);
    expect(json.accessors[0].min).toEqual([0, 0, 0]);
    expect(json.accessors[0].max).toEqual([1, 1, 0]);
  });

  it('writeGlb pula meshes sem geometria e mantém comprimento múltiplo de 4', () => {
    const glb = writeGlb([
      { expressID: 1, globalId: '', type: 'IfcSpace', positions: new Float32Array([]), indices: new Uint32Array([]), color: { x: 1, y: 1, z: 1, w: 1 } },
      { expressID: 2, globalId: 'G2', type: 'IfcBeam', positions: new Float32Array([0, 0, 0, 1, 1, 1, 2, 0, 0]), indices: new Uint32Array([0, 1, 2]), color: { x: 0, y: 0, z: 0, w: 1 } },
    ]);
    const jsonLen = glb.readUInt32LE(12);
    const json = JSON.parse(glb.slice(20, 20 + jsonLen).toString('utf8'));
    expect(json.nodes).toHaveLength(1);          // o vazio foi pulado
    expect(json.nodes[0].extras.expressID).toBe(2);
    expect(glb.length % 4).toBe(0);
  });

  it('manifest version pinned to 1', () => {
    expect(GEOMETRY_MANIFEST_VERSION).toBe(1);
  });
});
