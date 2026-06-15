import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildSceneSphereLookup, makeCameraFocus } from './viewer4dBridge';

function meshWithGlobalId(globalId: string, x: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial());
  mesh.position.set(x, 0, 0);
  mesh.userData.globalId = globalId;
  mesh.updateMatrixWorld(true);
  return mesh;
}

describe('buildSceneSphereLookup', () => {
  it('agrupa malhas por globalId e devolve esferas', () => {
    const scene = new THREE.Scene();
    scene.add(meshWithGlobalId('g1', 0));
    scene.add(meshWithGlobalId('g2', 10));
    scene.updateMatrixWorld(true);

    const lookup = buildSceneSphereLookup(scene);
    const g1 = lookup.getByGlobalId('g1');
    expect(g1).toBeDefined();
    expect(g1!.boundingSphere.radius).toBeGreaterThan(0);
    expect(lookup.getByGlobalId('inexistente')).toBeUndefined();
  });

  it('une bounding boxes de malhas com o mesmo globalId', () => {
    const scene = new THREE.Scene();
    scene.add(meshWithGlobalId('shared', 0));
    scene.add(meshWithGlobalId('shared', 20));
    scene.updateMatrixWorld(true);

    const lookup = buildSceneSphereLookup(scene);
    const sphere = lookup.getByGlobalId('shared')!.boundingSphere;
    // Centro entre as duas malhas; raio cobrindo ambas.
    expect(sphere.center[0]).toBeCloseTo(10, 0);
    expect(sphere.radius).toBeGreaterThan(10);
  });

  it('ignora malhas sem globalId', () => {
    const scene = new THREE.Scene();
    const anon = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    scene.add(anon);
    scene.updateMatrixWorld(true);
    const lookup = buildSceneSphereLookup(scene);
    expect(lookup.getByGlobalId('')).toBeUndefined();
  });
});

describe('makeCameraFocus', () => {
  it('reposiciona a câmera e aponta para o centro da esfera', () => {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(0, 0, 100);
    const target = new THREE.Vector3(0, 0, 0);
    const focus = makeCameraFocus({ camera, controls: { target, update: () => {} } });

    focus({ center: [5, 0, 0], radius: 2 });

    expect(target.x).toBeCloseTo(5, 5);
    // Câmera afastou-se do centro o suficiente para enquadrar o raio.
    expect(camera.position.distanceTo(new THREE.Vector3(5, 0, 0))).toBeGreaterThan(2);
  });
});
