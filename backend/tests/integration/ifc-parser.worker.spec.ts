import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from '../../src/modules/ifc/ifc-parser.worker.js';
import { IFC_STRUCTURE_VERSION } from '../../src/modules/ifc/ifc-structure.dto.js';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (name: string) => join(here, '..', 'fixtures', 'ifc', name);

function toAB(p: string): ArrayBuffer {
  const b = readFileSync(p);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

// Modelos de referência reais (buildingSMART / ThatOpen) — um por schema.
const MODELS = [
  { file: 'sample.ifc', schema: 'IFC2X3' },
  { file: 'ac20-fzk-haus_ifc4.ifc', schema: 'IFC4' },
  { file: 'building-arch_ifc4x3.ifc', schema: 'IFC4X3' },
];

describe('ifc-parser.worker · parse() em modelos reais (multi-schema)', () => {
  for (const m of MODELS) {
    it(`${m.file} → IFCStructure válido (${m.schema}), sem crash`, async () => {
      const res = await parse({ buffer: toAB(fx(m.file)), modelVersionId: `mv-${m.file}`, reqId: 'req' });
      expect(res.ok).toBe(true);
      if (!res.ok) return;
      const s = res.structure;

      expect(s.version).toBe(IFC_STRUCTURE_VERSION);
      expect(s.schema).toBe(m.schema);

      // Elementos com identificadores; byType soma = total.
      expect(s.stats.totalElements).toBeGreaterThan(0);
      expect(s.elements.length).toBe(s.stats.totalElements);
      expect(Object.values(s.stats.byType).reduce((a, b) => a + b, 0)).toBe(s.stats.totalElements);
      expect(s.elements.every((e) => /^Ifc/.test(e.type))).toBe(true);

      // expressID único; parentExpressID presente.
      const ids = s.elements.map((e) => e.expressID);
      expect(new Set(ids).size).toBe(ids.length);
      expect('parentExpressID' in s.elements[0]).toBe(true);

      // byDiscipline com 4 chaves.
      expect(Object.keys(s.stats.byDiscipline).sort()).toEqual(['architecture', 'mep', 'other', 'structure']);

      // boundingBox OBRIGATÓRIO, em metros (web-ifc normaliza).
      expect(s.stats.boundingBox.min).toHaveLength(3);
      expect(s.stats.boundingBox.max).toHaveLength(3);

      // units de autoria lidas do IfcUnitAssignment.
      expect(['mm', 'cm', 'm', 'km']).toContain(s.units.length);

      // Hierarquia espacial: Project no topo.
      expect(s.spatialTree.length).toBeGreaterThan(0);
      expect(s.spatialTree[0].type.toUpperCase()).toContain('IFCPROJECT');
    }, 60_000);
  }

  it('IFC2X2 → ok:false com UNSUPPORTED_IFC_SCHEMA antes do OpenModel', async () => {
    const ifc2x2 = [
      'ISO-10303-21;',
      'HEADER;',
      "FILE_DESCRIPTION((''),'2;1');",
      "FILE_NAME('m.ifc','2026-01-01T00:00:00',(''),(''),'','','');",
      "FILE_SCHEMA(('IFC2X2_FINAL'));",
      'ENDSEC;',
      'DATA;',
      'ENDSEC;',
      'END-ISO-10303-21;',
    ].join('\n');
    const res = await parse({
      buffer: new TextEncoder().encode(ifc2x2).buffer,
      modelVersionId: 'mv-2x2',
      reqId: 'req-2x2',
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.errorType).toBe('UNSUPPORTED_IFC_SCHEMA');
    expect(res.message).toMatch(/IFC2X2_FINAL/);
  }, 60_000);

  it('arquivo inválido → não lança (ok:false com errorType, ou estrutura vazia)', async () => {
    const garbage = new TextEncoder().encode('isto não é um IFC').buffer;
    const res = await parse({ buffer: garbage, modelVersionId: 'mv-x', reqId: 'req-x' });
    if (!res.ok) {
      expect(res.errorType).toBeTruthy();
    } else {
      expect(res.structure.stats.totalElements).toBe(0);
    }
  }, 60_000);
});
