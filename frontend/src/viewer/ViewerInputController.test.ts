// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { ViewerInputController } from './ViewerInputController';
import { ViewerFacade } from './ViewerFacade';
import type { GeometryManifest, IdentifiableObject } from './MeshReference';

const manifest: GeometryManifest = {
  version: 1, modelVersionId: 'mv', glbKey: 'k.glb', meshCount: 1, instancedGroups: [],
  modelBounds: { min: [0, 0, 0], max: [1, 1, 1] }, modelSphere: { center: [0.5, 0.5, 0.5], radius: 0.87 },
  elements: [{ expressID: 7, globalId: 'G7', meshId: '7', type: 'IfcWall', bounds: { min: [0, 0, 0], max: [1, 1, 1] }, boundingSphere: { center: [0.5, 0.5, 0.5], radius: 0.87 }, instanceKey: 'a', hasGeometry: true }],
};

function setup(rayPick: (x: number, y: number) => IdentifiableObject | null) {
  const facade = new ViewerFacade();
  facade.loadModel(manifest);
  const ctrl = new ViewerInputController(facade, rayPick, () => ({ width: 100, height: 100 }));
  return { facade, ctrl };
}

const wallObj: IdentifiableObject = { userData: { expressID: 7 } };

describe('ViewerInputController · pointer → seleção', () => {
  it('clique (down+up no mesmo ponto) sobre o mesh → seleciona expressID 7', () => {
    const rayPick = vi.fn(() => wallObj);
    const { facade, ctrl } = setup(rayPick);
    ctrl.pointerDown({ x: 50, y: 50, kind: 'mouse' });
    const id = ctrl.pointerUp({ x: 50, y: 50, kind: 'mouse' });
    expect(id).toBe(7);
    expect(facade.selectionApi.get()).toBe(7);
    const [nx, ny] = rayPick.mock.calls[0];
    expect(nx + 0).toBe(0); expect(ny + 0).toBe(0); // NDC centro (normaliza -0)
  });

  it('arrasto NÃO seleciona nem chama raycast (orbit/pan)', () => {
    const rayPick = vi.fn(() => wallObj);
    const { facade, ctrl } = setup(rayPick);
    facade.selectionApi.select(7);
    ctrl.pointerDown({ x: 10, y: 10, kind: 'mouse' });
    ctrl.pointerUp({ x: 80, y: 80, kind: 'mouse' });
    expect(rayPick).not.toHaveBeenCalled();
    expect(facade.selectionApi.get()).toBe(7); // seleção preservada após orbit
  });

  it('clique no vazio (raycast null) → deseleciona', () => {
    const { facade, ctrl } = setup(() => null);
    facade.selectionApi.select(7);
    ctrl.pointerDown({ x: 50, y: 50, kind: 'mouse' });
    expect(ctrl.pointerUp({ x: 50, y: 50, kind: 'mouse' })).toBeNull();
    expect(facade.selectionApi.get()).toBeNull();
  });

  it('pointerMove → hover sem mexer na seleção', () => {
    const { facade, ctrl } = setup(() => wallObj);
    facade.selectionApi.select(7);
    const onHover = vi.fn(); facade.selectionApi.onHover(onHover);
    ctrl.pointerMove({ x: 25, y: 75, kind: 'mouse' });
    expect(onHover).toHaveBeenCalledWith(7);
    expect(facade.selectionApi.get()).toBe(7); // seleção intacta
  });
});
