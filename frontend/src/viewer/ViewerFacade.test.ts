// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { ViewerFacade } from './ViewerFacade';
import { isCameraState } from './CameraState';
import type { GeometryManifest, IdentifiableObject } from './MeshReference';

const manifest: GeometryManifest = {
  version: 1, modelVersionId: 'mv', glbKey: 'k.glb', meshCount: 2, instancedGroups: [],
  modelBounds: { min: [0, 0, 0], max: [10, 4, 8] }, modelSphere: { center: [5, 2, 4], radius: 6.7 },
  elements: [
    { expressID: 1, globalId: 'G1', meshId: '1', type: 'IfcWall', bounds: { min: [0, 0, 0], max: [1, 1, 1] }, boundingSphere: { center: [0.5, 0.5, 0.5], radius: 0.87 }, instanceKey: 'a', hasGeometry: true },
    { expressID: 2, globalId: 'G2', meshId: '2', type: 'IfcBeam', bounds: { min: [0, 0, 0], max: [1, 1, 1] }, boundingSphere: { center: [0.5, 0.5, 0.5], radius: 0.87 }, instanceKey: 'b', hasGeometry: true },
  ],
};

describe('ViewerFacade · API só com expressID + CameraState', () => {
  it('pickObject resolve objeto→expressID e seleciona; vazio→clear', () => {
    const highlightSelected = vi.fn();
    const v = new ViewerFacade({ highlightSelected });
    v.loadModel(manifest);

    const meshObj: IdentifiableObject = { userData: { expressID: 2 }, parent: null };
    expect(v.pickObject(meshObj)).toBe(2);
    expect(v.selectionApi.get()).toBe(2);
    expect(highlightSelected).toHaveBeenLastCalledWith(2);

    // Clique no vazio (objeto sem expressID) → deseleciona.
    const grid: IdentifiableObject = { userData: { kind: 'grid' }, parent: null };
    expect(v.pickObject(grid)).toBeNull();
    expect(v.selectionApi.get()).toBeNull();
    expect(highlightSelected).toHaveBeenLastCalledWith(null);
  });

  it('hover não persiste seleção', () => {
    const v = new ViewerFacade();
    v.loadModel(manifest);
    v.selectionApi.select(1);
    v.hoverObject({ userData: { expressID: 2 } });
    expect(v.selectionApi.get()).toBe(1); // seleção intacta
  });

  it('camera: preset deriva do bbox, getState serializável, applyState chamado', () => {
    const applyState = vi.fn();
    const v = new ViewerFacade({ applyState });
    v.loadModel(manifest);

    v.cameraApi.setPreset('top');
    const s = v.cameraApi.getState();
    expect(isCameraState(s)).toBe(true);
    expect(s.target).toEqual([5, 2, 4]); // centro do bbox do modelo
    expect(applyState).toHaveBeenCalled();

    // setState animado roteia pela bridge.animateCamera.
    const animateCamera = vi.fn();
    const v2 = new ViewerFacade({ animateCamera });
    v2.loadModel(manifest);
    v2.cameraApi.setState(s, true);
    expect(animateCamera).toHaveBeenCalledWith(s, 300);
  });

  it('setState animado usa animator interno; tick chega exato ao alvo', () => {
    let t = 0;
    const v = new ViewerFacade({}, () => t);
    v.loadModel(manifest);
    v.cameraApi.setPreset('iso');
    const target = v.cameraApi.getState();
    v.cameraApi.setPreset('front'); // muda a câmera p/ ter de onde animar

    t = 1000;
    v.cameraApi.setState(target, true); // anima a partir de t=1000
    expect(v.isAnimating).toBe(true);
    t = 1300; v.tick(t);                // +300ms = fim
    expect(v.isAnimating).toBe(false);
    expect(v.cameraApi.getState()).toEqual(target);
  });

  it('setState→getState roundtrip exato pela fachada', () => {
    const v = new ViewerFacade();
    v.loadModel(manifest);
    v.cameraApi.setPreset('iso');
    const a = v.cameraApi.getState();
    v.cameraApi.setPreset('front');
    v.cameraApi.setState(a);
    expect(v.cameraApi.getState()).toEqual(a);
  });
});
