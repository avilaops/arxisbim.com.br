import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { ViewerHost } from './ViewerHost';

// Em jsdom não há WebGL → o ViewerHost sobe em modo headless (scene+camera OK,
// sem renderer). Em produção (WebGL real) isHeadless é sempre false.
describe('ViewerHost', () => {
  it('inicializa corretamente (headless sem WebGL: scene+camera existem)', () => {
    const container = document.createElement('div');
    const viewer = new ViewerHost(container);
    expect(viewer.scene).toBeDefined();
    expect(viewer.camera).toBeDefined();
    // renderer só existe com WebGL; headless é o esperado no jsdom.
    expect(viewer.isHeadless ? viewer.renderer === undefined : viewer.renderer !== undefined).toBe(true);
    viewer.destroy();
  });

  it('dispara onError ao tentar carregar tipo inválido', async () => {
    const container = document.createElement('div');
    const viewer = new ViewerHost(container);
    const onError = vi.fn();
    viewer.onError = onError;
    // @ts-expect-error tipo inválido proposital
    await viewer.loadModel('mock', 'invalid');
    expect(onError).toHaveBeenCalled();
    viewer.destroy();
  });

  it('seleciona e destaca objeto por ID', () => {
    const container = document.createElement('div');
    const viewer = new ViewerHost(container);
    // Object3D real (getObjectByName recursa nos filhos → mock plano quebraria).
    const mesh = new THREE.Object3D();
    mesh.name = 'obj1';
    (mesh as any).material = { color: { set: vi.fn() } };
    viewer.scene.add(mesh);
    const onSelectionChanged = vi.fn();
    viewer.onSelectionChanged = onSelectionChanged;
    viewer.selectObject('obj1');
    expect(onSelectionChanged).toHaveBeenCalledWith(mesh);
    viewer.destroy();
  });

  it('deseleciona (onSelectionChanged null) para ID inexistente', () => {
    const container = document.createElement('div');
    const viewer = new ViewerHost(container);
    const onSelectionChanged = vi.fn();
    viewer.onSelectionChanged = onSelectionChanged;
    viewer.selectObject('nao-existe');
    expect(onSelectionChanged).toHaveBeenCalledWith(null);
    viewer.destroy();
  });

  it('API S09: getCameraState serializável + setCameraState roundtrip', () => {
    const viewer = new ViewerHost(document.createElement('div'));
    const s = { version: 1 as const, position: [3, 4, 5] as [number, number, number], target: [1, 0, 1] as [number, number, number], fov: 60, near: 0.5, far: 200 };
    viewer.setCameraState(s);
    const out = viewer.getCameraState();
    expect(JSON.parse(JSON.stringify(out)).version).toBe(1);
    expect(out.position).toEqual([3, 4, 5]);
    expect(out.fov).toBe(60);
    viewer.destroy();
  });

  it('API S09: selectByExpressId + onSelect emitem expressID (não Object3D)', () => {
    const viewer = new ViewerHost(document.createElement('div'));
    const mesh = new THREE.Object3D();
    mesh.name = '4242'; (mesh as any).material = { color: { set: vi.fn() } };
    mesh.userData = { expressID: 4242 };
    viewer.scene.add(mesh);
    const onSelect = vi.fn();
    viewer.onSelect(onSelect);
    viewer.selectByExpressId(4242);
    expect(onSelect).toHaveBeenCalledWith(4242); // número, não Object3D
    viewer.selectObject('inexistente');
    expect(onSelect).toHaveBeenLastCalledWith(null);
    viewer.destroy();
  });
});
