// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ModelLoader } from './ModelLoader';
import { ViewerRaycaster } from './ViewerRaycaster';
import { ViewerFacade } from './ViewerFacade';
import type { GeometryManifest } from './MeshReference';

const here = dirname(fileURLToPath(import.meta.url));
const glbAB = () => { const b = readFileSync(join(here, '__fixtures__', 'sample.glb')); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };

// Fixture: expressID 1001 (IfcWall, triângulo no plano XY z=0: (0,0,0)(2,0,0)(0,3,0)),
// 2002 (IfcBeam, triângulo (0,0,0)(1,0,0)(0,0,1)).
const manifest: GeometryManifest = {
  version: 1, modelVersionId: 'mv', glbKey: 'k.glb', meshCount: 2, instancedGroups: [],
  modelBounds: { min: [0, 0, 0], max: [2, 3, 1] }, modelSphere: { center: [1, 1.5, 0.5], radius: 1.9 },
  elements: [
    { expressID: 1001, globalId: 'WALL-GID', meshId: '1001', type: 'IfcWall', bounds: { min: [0, 0, 0], max: [2, 3, 0] }, boundingSphere: { center: [1, 1.5, 0], radius: 1.8 }, instanceKey: 'a', hasGeometry: true },
    { expressID: 2002, globalId: 'BEAM-GID', meshId: '2002', type: 'IfcBeam', bounds: { min: [0, 0, 0], max: [1, 0, 1] }, boundingSphere: { center: [0.5, 0, 0.5], radius: 0.7 }, instanceKey: 'b', hasGeometry: true },
  ],
};

describe('ViewerRaycaster · clique→expressID com BVH (headless, sem WebGL)', () => {
  it('constrói BVH 1× e o raio que acerta a parede resolve expressID 1001', async () => {
    const { scene } = await new ModelLoader().load(glbAB(), manifest);
    const rc = new ViewerRaycaster();

    rc.buildBVH(scene);
    expect(rc.bvhBuilt).toBe(true);
    expect(rc.meshesWithBVH).toBeGreaterThan(0);
    // "construído 1× no load, não por seleção": rebuild é no-op.
    const before = rc.meshesWithBVH;
    rc.buildBVH(scene);
    expect(rc.meshesWithBVH).toBe(before);

    // Raio de cima (z=+5) p/ baixo (-z) atingindo o interior do triângulo da parede.
    const hit = rc.raycast(new THREE.Vector3(0.3, 0.3, 5), new THREE.Vector3(0, 0, -1), scene);
    expect(hit).not.toBeNull();

    // Cadeia completa clique→expressID via a fachada.
    const facade = new ViewerFacade();
    facade.loadModel(manifest);
    expect(facade.pickObject(hit as any)).toBe(1001);
    expect(facade.selectionApi.get()).toBe(1001);
  });

  it('raio que não acerta nada → null → fachada deseleciona', async () => {
    const { scene } = await new ModelLoader().load(glbAB(), manifest);
    const rc = new ViewerRaycaster();
    rc.buildBVH(scene);
    const facade = new ViewerFacade();
    facade.loadModel(manifest);
    facade.selectionApi.select(1001);

    // Raio apontando p/ longe do modelo.
    const miss = rc.raycast(new THREE.Vector3(100, 100, 100), new THREE.Vector3(1, 0, 0), scene);
    expect(miss).toBeNull();
    expect(facade.pickObject(miss as any)).toBeNull(); // clique no vazio → clear
    expect(facade.selectionApi.get()).toBeNull();
  });
});
