/**
 * Property extractor (S13) — lê PropertySets de cada elemento via web-ifc.
 *
 * Em produção roda como etapa `extract_properties` do pipeline S11 (reusa o
 * modelo já aberto — sem re-parse). Aqui o `extractProperties` abre o buffer e
 * itera os elementos do IFCStructure (S07). Nunca lança por valor inesperado:
 * normaliza (ver builder).
 */
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { normalizePropertySets, extractQuantities } from './ifc-properties.builder.js';
import type { ElementProperties, PropertySet } from './ifc-properties.dto.js';

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WebIFC = require('web-ifc');
const WASM_DIR = join(dirname(require.resolve('web-ifc')), '/');

/** Metadados do elemento (vêm do IFCStructure do S07). */
export interface ElementMeta {
  expressID: number;
  globalId: string;
  type: string;
  storeyId: number | null;
}

/** Converte um IfcPropertySet/IfcElementQuantity do web-ifc → {name, props[]}. */
function psetToRaw(pset: any): { name: string; props: Array<{ name: string; value: unknown }> } {
  const name = pset?.Name?.value ?? pset?.Name ?? '';
  const props: Array<{ name: string; value: unknown }> = [];

  // IfcPropertySet → HasProperties (IfcPropertySingleValue).
  for (const p of pset?.HasProperties ?? []) {
    const pname = p?.Name?.value;
    if (pname) props.push({ name: pname, value: p?.NominalValue ?? null });
  }
  // IfcElementQuantity → Quantities (IfcQuantityArea/Volume/Length/Count...).
  for (const q of pset?.Quantities ?? []) {
    const qname = q?.Name?.value;
    if (!qname) continue;
    const v = q?.AreaValue ?? q?.VolumeValue ?? q?.LengthValue ?? q?.CountValue ?? q?.WeightValue ?? q?.NominalValue ?? null;
    props.push({ name: qname, value: v });
  }
  return { name: String(name), props };
}

/**
 * Extrai propriedades de todos os elementos. `lengthUnit` vem do IFCStructure
 * (autoria) p/ converter quantidades → SI.
 */
export async function extractProperties(
  buffer: ArrayBuffer,
  elements: ReadonlyArray<ElementMeta>,
  lengthUnit: string,
): Promise<ElementProperties[]> {
  const api = new WebIFC.IfcAPI();
  api.SetWasmPath(WASM_DIR, true);
  await api.Init();

  let modelID = -1;
  try {
    modelID = api.OpenModel(new Uint8Array(buffer));
    const props = new WebIFC.Properties(api);
    const out: ElementProperties[] = [];

    for (const el of elements) {
      let properties: Record<string, PropertySet> = {};
      try {
        const psets = await props.getPropertySets(modelID, el.expressID, true);
        properties = normalizePropertySets((psets ?? []).map(psetToRaw));
      } catch {
        properties = {}; // elemento sem psets ou erro → vazio, nunca quebra o batch
      }
      const q = extractQuantities(properties, lengthUnit);
      const line = (() => { try { return api.GetLine(modelID, el.expressID); } catch { return null; } })();

      out.push({
        expressID: el.expressID,
        globalId: el.globalId,
        ifcType: el.type ?? null,
        name: line?.Name?.value ?? null,
        storeyId: el.storeyId,
        areaM2: q.areaM2,
        volumeM3: q.volumeM3,
        lengthM: q.lengthM,
        properties,
      });
    }
    return out;
  } finally {
    if (modelID >= 0) { try { api.CloseModel(modelID); } catch { /* noop */ } }
  }
}
