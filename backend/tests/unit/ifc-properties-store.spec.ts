import { describe, it, expect } from 'vitest';
import { chunk, PROPERTIES_BATCH_SIZE } from '../../src/modules/ifc/ifc-properties-store.service.js';

describe('ifc-properties-store · batching', () => {
  it('batch size é 1000 (spec S13)', () => {
    expect(PROPERTIES_BATCH_SIZE).toBe(1000);
  });

  it('chunk divide em lotes do tamanho certo, último parcial', () => {
    const arr = Array.from({ length: 2500 }, (_, i) => i);
    const batches = chunk(arr, 1000);
    expect(batches.length).toBe(3);
    expect(batches[0].length).toBe(1000);
    expect(batches[2].length).toBe(500);
    expect(batches.flat()).toEqual(arr); // sem perda
  });

  it('chunk: array vazio → nenhum lote', () => {
    expect(chunk([], 1000)).toEqual([]);
  });
});
