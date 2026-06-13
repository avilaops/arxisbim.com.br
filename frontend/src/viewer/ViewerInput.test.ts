import { describe, it, expect } from 'vitest';
import { ViewerInput, toNDC, clickThreshold } from './ViewerInput';

describe('ViewerInput · clique vs arrasto + NDC', () => {
  it('toNDC: centro→(0,0), cantos corretos (y invertido)', () => {
    const c = toNDC(50, 50, 100, 100);
    expect(c.ndcX + 0).toBe(0); expect(c.ndcY + 0).toBe(0); // normaliza -0
    expect(toNDC(0, 0, 100, 100)).toEqual({ ndcX: -1, ndcY: 1 });     // topo-esq
    expect(toNDC(100, 100, 100, 100)).toEqual({ ndcX: 1, ndcY: -1 }); // baixo-dir
  });

  it('threshold: touch maior que mouse', () => {
    expect(clickThreshold('touch')).toBeGreaterThan(clickThreshold('mouse'));
  });

  it('down+up no mesmo ponto → clique com NDC', () => {
    const input = new ViewerInput();
    input.pointerDown({ x: 50, y: 50, kind: 'mouse' });
    const r = input.pointerUp({ x: 51, y: 49, kind: 'mouse' }, 100, 100);
    expect(r).not.toBeNull();
    expect(r!.ndcX).toBeCloseTo(0.02, 6);
  });

  it('arrasto além do threshold → null (orbit/pan, não seleciona)', () => {
    const input = new ViewerInput();
    input.pointerDown({ x: 50, y: 50, kind: 'mouse' });
    expect(input.pointerUp({ x: 90, y: 50, kind: 'mouse' }, 100, 100)).toBeNull();
  });

  it('touch tolera mais movimento que mouse (mesma distância)', () => {
    const dist = 9; // > mouse(4), < touch(12)
    const mouse = new ViewerInput();
    mouse.pointerDown({ x: 50, y: 50, kind: 'mouse' });
    expect(mouse.pointerUp({ x: 50 + dist, y: 50, kind: 'mouse' }, 100, 100)).toBeNull(); // arrasto

    const touch = new ViewerInput();
    touch.pointerDown({ x: 50, y: 50, kind: 'touch' });
    expect(touch.pointerUp({ x: 50 + dist, y: 50, kind: 'touch' }, 100, 100)).not.toBeNull(); // clique
  });

  it('pointerup sem down prévio → null (não vira clique fantasma)', () => {
    const input = new ViewerInput();
    expect(input.pointerUp({ x: 10, y: 10, kind: 'mouse' }, 100, 100)).toBeNull();
  });
});
