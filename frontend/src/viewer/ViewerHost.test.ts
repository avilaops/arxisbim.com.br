import { describe, it, expect, vi } from 'vitest';
import { ViewerHost } from './ViewerHost';

describe('ViewerHost', () => {
  it('inicializa corretamente', () => {
    const container = document.createElement('div');
    const viewer = new ViewerHost(container);
    expect(viewer.scene).toBeDefined();
    expect(viewer.camera).toBeDefined();
    expect(viewer.renderer).toBeDefined();
    viewer.destroy();
  });

  it('dispara onModelLoaded ao carregar modelo (mock)', async () => {
    const container = document.createElement('div');
    const viewer = new ViewerHost(container);
    const onModelLoaded = vi.fn();
    viewer.onModelLoaded = onModelLoaded;
    await viewer.loadModel('mock', 'ifc');
    expect(onModelLoaded).toHaveBeenCalled();
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
    const mesh = { name: 'obj1', material: { color: { set: vi.fn() } } } as any;
    viewer.scene.add(mesh);
    const onSelectionChanged = vi.fn();
    viewer.onSelectionChanged = onSelectionChanged;
    viewer.selectObject('obj1');
    expect(onSelectionChanged).toHaveBeenCalledWith(mesh);
    viewer.destroy();
  });
});
