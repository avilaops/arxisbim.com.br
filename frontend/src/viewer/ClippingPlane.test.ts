// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { ClippingPlane } from './ClippingPlane';

describe('ClippingPlane', () => {
  it('normaliza a normal e serializa normal+constant', () => {
    const cp = new ClippingPlane([0, -2, 0], 5);
    const s = cp.getState();
    expect(s.normal[1]).toBeCloseTo(-1, 6); // normalizado
    expect(s.constant).toBe(5);
  });

  it('slider move constant; setState/fromState roundtrip', () => {
    const cp = new ClippingPlane([0, -1, 0], 0);
    cp.setConstant(7.5);
    expect(cp.getState().constant).toBe(7.5);

    const restored = ClippingPlane.fromState({ normal: [1, 0, 0], constant: 2 });
    expect(restored.getState().normal[0]).toBeCloseTo(1, 6);
    expect(restored.getState().constant).toBe(2);
  });
});
