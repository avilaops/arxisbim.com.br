// @vitest-environment node
// GLTFLoader decodifica o magic 'glTF' via TextDecoder; o jsdom quebra esse
// caminho ("Unsupported asset"). Em env node parseia igual prod/browser real.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ModelLoader } from './ModelLoader';
import type { GeometryManifest } from './MeshReference';

const here = dirname(fileURLToPath(import.meta.url));
// GLB gerado pelo writeGlb do backend (mesma serialização de produção).
const glbPath = join(here, '__fixtures__', 'sample.glb');

function glbArrayBuffer(): ArrayBuffer {
  const b = readFileSync(glbPath);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

const manifest: GeometryManifest = {
  version: 1, modelVersionId: 'mv', glbKey: 'k.glb', meshCount: 2, instancedGroups: [],
  modelBounds: { min: [0, 0, 0], max: [2, 3, 1] }, modelSphere: { center: [1, 1.5, 0.5], radius: 1.9 },
  elements: [
    { expressID: 1001, globalId: 'WALL-GID', meshId: '1001', type: 'IfcWall',
      bounds: { min: [0, 0, 0], max: [2, 3, 0] }, boundingSphere: { center: [1, 1.5, 0], radius: 1.8 },
      instanceKey: 'g1|...', hasGeometry: true },
    { expressID: 2002, globalId: 'BEAM-GID', meshId: '2002', type: 'IfcBeam',
      bounds: { min: [0, 0, 0], max: [1, 0, 1] }, boundingSphere: { center: [0.5, 0, 0.5], radius: 0.7 },
      instanceKey: 'g2|...', hasGeometry: true },
  ],
};

describe('ModelLoader · roundtrip GLB → cena → expressID (clique chain)', () => {
  it('carrega o GLB de produção e preserva expressID em userData', async () => {
    const loader = new ModelLoader();
    const { scene, elementIndex } = await loader.load(glbArrayBuffer(), manifest);

    // Coleta os expressIDs presentes na cena (de userData, vindos dos extras do GLB).
    const ids: number[] = [];
    scene.traverse((o: any) => {
      const id = o.userData?.expressID;
      if (typeof id === 'number') ids.push(id);
    });
    expect(ids.sort()).toEqual([1001, 2002]);

    // Cadeia completa clique→MeshReference: pega um mesh da cena, resolve via index.
    let aMesh: any = null;
    scene.traverse((o: any) => { if (!aMesh && o.userData?.expressID != null) aMesh = o; });
    const ref = elementIndex.resolve(aMesh);
    expect(ref).not.toBeNull();
    expect(ref!.type).toMatch(/^Ifc/);
    expect(elementIndex.size).toBe(2);
  });
});
