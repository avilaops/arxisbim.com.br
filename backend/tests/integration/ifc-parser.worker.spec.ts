import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from '../../src/modules/ifc/ifc-parser.worker.js';
import { IFC_STRUCTURE_VERSION } from '../../src/modules/ifc/ifc-structure.dto.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = join(here, '..', 'fixtures', 'ifc', 'sample.ifc');

// Parse real de web-ifc (WASM): mais lento que um unit test puro.
describe('ifc-parser.worker · parse() em modelo real (IFC2X3)', () => {
  let buf: Buffer;
  beforeAll(() => { buf = readFileSync(fixture); });

  it('produz IFCStructure v1 com schema, elementos e bounding box', async () => {
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const res = await parse({ buffer: ab, modelVersionId: 'mv-test', reqId: 'req-test' });

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const s = res.structure;

    // DTO versionado + schema detectado.
    expect(s.version).toBe(IFC_STRUCTURE_VERSION);
    expect(['IFC2X3', 'IFC4', 'IFC4X3']).toContain(s.schema);

    // Elementos extraídos com identificadores.
    expect(s.stats.totalElements).toBeGreaterThan(0);
    expect(s.elements.length).toBe(s.stats.totalElements);
    const first = s.elements[0];
    expect(typeof first.expressID).toBe('number');
    expect(typeof first.type).toBe('string');
    expect('parentExpressID' in first).toBe(true);

    // byType somado bate com o total.
    const sumByType = Object.values(s.stats.byType).reduce((a, b) => a + b, 0);
    expect(sumByType).toBe(s.stats.totalElements);

    // byDiscipline tem as 4 chaves.
    expect(Object.keys(s.stats.byDiscipline).sort()).toEqual(['architecture', 'mep', 'other', 'structure']);

    // boundingBox OBRIGATÓRIO presente e bem-formado.
    expect(s.stats.boundingBox.min).toHaveLength(3);
    expect(s.stats.boundingBox.max).toHaveLength(3);

    // Hierarquia espacial (Project no topo).
    expect(s.spatialTree.length).toBeGreaterThan(0);
    expect(s.spatialTree[0].type.toUpperCase()).toContain('IFCPROJECT');
  }, 60_000);

  it('arquivo inválido → ok:false com errorType (não lança)', async () => {
    const garbage = new TextEncoder().encode('isto não é um IFC').buffer;
    const res = await parse({ buffer: garbage, modelVersionId: 'mv-x', reqId: 'req-x' });
    // web-ifc pode abrir vazio ou falhar; em ambos o contrato não pode lançar.
    if (!res.ok) {
      expect(res.errorType).toBeTruthy();
    } else {
      expect(res.structure.stats.totalElements).toBe(0);
    }
  }, 30_000);
});
