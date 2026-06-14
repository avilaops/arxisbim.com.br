import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parse } from '../../src/modules/ifc/ifc-parser.worker.js';
import { extractProperties, type ElementMeta } from '../../src/modules/ifc/ifc-properties.extractor.js';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (n: string) => join(here, '..', 'fixtures', 'ifc', n);
const toAB = (p: string) => { const b = readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };

describe('ifc-properties.extractor · psets reais (IFC4)', () => {
  let elements: ElementMeta[];
  let buffer: ArrayBuffer;
  let lengthUnit: string;

  beforeAll(async () => {
    buffer = toAB(fx('ac20-fzk-haus_ifc4.ifc'));
    const res = await parse({ buffer: toAB(fx('ac20-fzk-haus_ifc4.ifc')), modelVersionId: 'mv', reqId: 'r' });
    if (!res.ok) throw new Error('parse falhou');
    lengthUnit = res.structure.units.length;
    elements = res.structure.elements.map((e) => ({ expressID: e.expressID, globalId: e.globalId, type: e.type, storeyId: e.storeyId }));
  }, 60_000);

  it('extrai PropertySets por elemento, nunca lança', async () => {
    const props = await extractProperties(buffer, elements.slice(0, 40), lengthUnit);
    expect(props.length).toBe(40);

    // Ao menos um elemento tem psets reais (Pset_*Common ou Qto_*).
    const withPsets = props.filter((p) => Object.keys(p.properties).length > 0);
    expect(withPsets.length).toBeGreaterThan(0);

    const sample = withPsets[0];
    expect(typeof sample.expressID).toBe('number');
    expect(sample.ifcType).toMatch(/^Ifc/);
    // properties é { psetName: { prop: value } } serializável.
    expect(JSON.parse(JSON.stringify(sample.properties))).toEqual(sample.properties);
  }, 60_000);

  it('quantidades (area/volume/length) extraídas quando há Qto_*', async () => {
    const props = await extractProperties(buffer, elements, lengthUnit);
    // Algum elemento do modelo deve ter quantidade numérica.
    const withQty = props.filter((p) => p.areaM2 != null || p.volumeM3 != null || p.lengthM != null);
    expect(withQty.length).toBeGreaterThan(0);
    // Valores em SI plausíveis (não negativos, finitos).
    for (const p of withQty) {
      for (const v of [p.areaM2, p.volumeM3, p.lengthM]) {
        if (v != null) { expect(Number.isFinite(v)).toBe(true); expect(v).toBeGreaterThanOrEqual(0); }
      }
    }
  }, 120_000);
});
