import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TYPE_MAP, UNMAPPED, resolveTypeInfo, effectiveTypeMap, toCategoryResolver, TYPE_MAP_VERSION,
  type ProjectTypeMap,
} from '../../src/modules/ifc/ifc-type-map.js';

describe('ifc-type-map (S14)', () => {
  it('resolve tipo conhecido (case-insensitive)', () => {
    expect(resolveTypeInfo('IfcWall').category).toBe('architectural');
    expect(resolveTypeInfo('IFCWALL').label).toBe('Parede');
    expect(resolveTypeInfo('ifcbeam').category).toBe('structural');
  });

  it('tipo não mapeado → other cinza, NUNCA null', () => {
    const r = resolveTypeInfo('IfcUnknownThing');
    expect(r).toEqual(UNMAPPED);
    expect(r.category).toBe('other');
    expect(r.color).toBe('#9CA3AF');
  });

  it('override por projeto: admin reclassifica IfcWall como structural', () => {
    const override: ProjectTypeMap = { typeMapVersion: 1, map: { IfcWall: { category: 'structural' } } };
    const r = resolveTypeInfo('IfcWall', override);
    expect(r.category).toBe('structural');
    expect(r.label).toBe('Parede'); // label do default preservado (merge parcial)
  });

  it('override aceita casing diferente da chave', () => {
    const override: ProjectTypeMap = { typeMapVersion: 1, map: { IFCWALL: { color: '#000000' } } };
    expect(resolveTypeInfo('IfcWall', override).color).toBe('#000000');
  });

  it('effectiveTypeMap mescla default + override', () => {
    const m = effectiveTypeMap({ typeMapVersion: 1, map: { IfcBeam: { color: '#111111' } } });
    expect(m.IfcBeam.color).toBe('#111111');
    expect(m.IfcBeam.category).toBe('structural'); // resto do default
    expect(m.IfcWall.category).toBe('architectural');
  });

  it('toCategoryResolver = DisciplineResolver do S10', () => {
    const resolver = toCategoryResolver();
    expect(resolver('IfcWall')).toBe('architectural');
    expect(resolver('IfcPipeSegment')).toBe('mep');
    expect(resolver('IfcDesconhecido')).toBe('other');
    // com override
    const r2 = toCategoryResolver({ typeMapVersion: 1, map: { IfcWall: { category: 'structural' } } });
    expect(r2('IfcWall')).toBe('structural');
  });

  it('default map cobre as 4 disciplinas + version fixa', () => {
    const cats = new Set(Object.values(DEFAULT_TYPE_MAP).map((t) => t.category));
    expect(cats.has('structural') && cats.has('architectural') && cats.has('mep')).toBe(true);
    expect(TYPE_MAP_VERSION).toBe(1);
  });
});
