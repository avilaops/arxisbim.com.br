import { describe, it, expect } from 'vitest';
import {
  normalizeValue, lengthScale, extractQuantities, normalizePropertySets,
} from '../../src/modules/ifc/ifc-properties.builder.js';

describe('ifc-properties.builder', () => {
  it('normalizeValue: { value } → primitivo, null-safe, objeto → string', () => {
    expect(normalizeValue({ value: 42 })).toBe(42);
    expect(normalizeValue({ value: 'x' })).toBe('x');
    expect(normalizeValue(true)).toBe(true);
    expect(normalizeValue(null)).toBeNull();
    expect(normalizeValue(undefined)).toBeNull();
    expect(normalizeValue({ a: 1 })).toBe('{"a":1}'); // tipo inesperado → string, nunca throw
    expect(normalizeValue({ value: null })).toBeNull();
  });

  it('lengthScale: mm/cm/in/ft → metros', () => {
    expect(lengthScale('mm')).toBe(0.001);
    expect(lengthScale('m')).toBe(1);
    expect(lengthScale('in')).toBeCloseTo(0.0254, 6);
    expect(lengthScale('desconhecida')).toBe(1); // fallback sem conversão
  });

  it('extractQuantities: converte area(²)/volume(³)/length de mm → SI', () => {
    const props = {
      Qto_WallBaseQuantities: { NetSideArea: 1_000_000, GrossVolume: 1_000_000_000, Length: 5000 },
      Pset_WallCommon: { IsExternal: true }, // ignorado (não é Qto)
    };
    const q = extractQuantities(props, 'mm');
    expect(q.areaM2).toBe(1);      // 1e6 mm² → 1 m²
    expect(q.volumeM3).toBe(1);    // 1e9 mm³ → 1 m³
    expect(q.lengthM).toBe(5);     // 5000 mm → 5 m
  });

  it('extractQuantities: ausência → null; já em metros não converte', () => {
    expect(extractQuantities({ Pset_X: { Foo: 1 } }, 'm')).toEqual({ areaM2: null, volumeM3: null, lengthM: null });
    const q = extractQuantities({ Qto_X: { Area: 2.5 } }, 'm');
    expect(q.areaM2).toBe(2.5);
  });

  it('normalizePropertySets: monta {pset:{prop:value}} tolerante a lixo', () => {
    const raw = [
      { name: 'Pset_WallCommon', props: [{ name: 'IsExternal', value: { value: true } }, { name: 'FireRating', value: null }] },
      { name: '', props: [] }, // pset sem nome → ignorado
      { name: 'Pset_X', props: [{ name: '', value: 1 }] }, // prop sem nome → ignorada
    ];
    const out = normalizePropertySets(raw as any);
    expect(out.Pset_WallCommon).toEqual({ IsExternal: true, FireRating: null });
    expect(out['']).toBeUndefined();
    expect(out.Pset_X).toEqual({});
  });
});
