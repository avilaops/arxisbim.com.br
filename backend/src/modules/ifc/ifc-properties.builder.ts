/**
 * Helpers puros de propriedades (S13) — normalização null-safe, conversão de
 * unidade e extração de quantidades. Sem web-ifc, sem I/O → testável headless.
 *
 * Regra dura (spec): valor null/tipo inesperado NUNCA lança — normaliza p/ string.
 */
import type { PropertyValue, PropertySet } from './ifc-properties.dto.js';

/** Fatores p/ converter comprimento da unidade de autoria → metros. */
const LENGTH_TO_M: Record<string, number> = { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048 };

/** Normaliza um valor cru (web-ifc dá { value } ou primitivo) → PropertyValue. */
export function normalizeValue(raw: unknown): PropertyValue {
  if (raw == null) return null;
  if (typeof raw === 'object') {
    if ('value' in (raw as any)) return normalizeValue((raw as any).value);
    // tipo inesperado (objeto) → string, nunca throw.
    try { return JSON.stringify(raw); } catch { return String(raw); }
  }
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') return raw;
  return String(raw);
}

/** Escala de comprimento (m/factor). area = scale², volume = scale³. */
export function lengthScale(unit: string): number {
  return LENGTH_TO_M[unit.toLowerCase()] ?? 1;
}

/**
 * Extrai area/volume/length de um conjunto de psets de quantidade (Qto_*),
 * convertendo da unidade de autoria p/ SI. Procura chaves contendo Area/Volume/
 * Length (case-insensitive). Retorna null quando ausente — nunca lança.
 */
export function extractQuantities(
  properties: Record<string, PropertySet>,
  lengthUnit: string,
): { areaM2: number | null; volumeM3: number | null; lengthM: number | null } {
  const s = lengthScale(lengthUnit);
  let areaM2: number | null = null;
  let volumeM3: number | null = null;
  let lengthM: number | null = null;

  for (const [psetName, pset] of Object.entries(properties)) {
    // Só psets de quantidade (Qto_* ou BaseQuantities) contam p/ quantitativo.
    if (!/qto|quantit/i.test(psetName)) continue;
    for (const [key, value] of Object.entries(pset)) {
      const num = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(num)) continue;
      const k = key.toLowerCase();
      if (areaM2 == null && /area/.test(k)) areaM2 = round4(num * s * s);
      else if (volumeM3 == null && /volume/.test(k)) volumeM3 = round4(num * s * s * s);
      else if (lengthM == null && /(length|width|height|perimeter)/.test(k)) lengthM = round4(num * s);
    }
  }
  return { areaM2, volumeM3, lengthM };
}

function round4(n: number): number { return Math.round(n * 1e4) / 1e4; }

/**
 * Converte um conjunto bruto de psets (web-ifc) p/ o formato normalizado,
 * tolerante a null/tipos inesperados.
 */
export function normalizePropertySets(
  raw: Array<{ name: string; props: Array<{ name: string; value: unknown }> }>,
): Record<string, PropertySet> {
  const out: Record<string, PropertySet> = {};
  for (const pset of raw) {
    if (!pset?.name) continue;
    const set: PropertySet = {};
    for (const p of pset.props ?? []) {
      if (!p?.name) continue;
      set[p.name] = normalizeValue(p.value);
    }
    out[pset.name] = set;
  }
  return out;
}
