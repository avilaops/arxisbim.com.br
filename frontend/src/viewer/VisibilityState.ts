/**
 * VisibilityState (S10) — configuração visual SERIALIZÁVEL e versionada.
 *
 * Razão de existir: cenários (S12) salvam "o que está visível", não só "de onde
 * se olha". `version` protege adição de campos (S24 heatmap, S26 4D) sem migração.
 * NUNCA referencia Mesh/Object3D — só expressID/groupKey atravessam fronteiras.
 */
export const VISIBILITY_STATE_VERSION = 1 as const;

/** Disciplinas com toggle. Tipos não mapeados caem em 'other' (sempre visível). */
export type DisciplineGroup = 'structural' | 'architectural' | 'mep' | 'site' | 'furniture' | 'other';

/** Grupos com switch na UI (other não tem toggle — é o "resto"). */
export type ToggleableGroup = Exclude<DisciplineGroup, 'other'>;

export interface VisibilityState {
  version: typeof VISIBILITY_STATE_VERSION;
  groups: Record<ToggleableGroup, boolean>;
  /** storeyIds visíveis; vazio = todos. */
  floors: number[];
  /** expressIDs ocultos individualmente. */
  hiddenElements: number[];
  clippingPlane: { normal: [number, number, number]; constant: number } | null;
}

export const TOGGLEABLE_GROUPS: ToggleableGroup[] = ['structural', 'architectural', 'mep', 'site', 'furniture'];

/** Estado default: tudo visível, sem corte. */
export function defaultVisibilityState(): VisibilityState {
  return {
    version: VISIBILITY_STATE_VERSION,
    groups: { structural: true, architectural: true, mep: true, site: true, furniture: true },
    floors: [],
    hiddenElements: [],
    clippingPlane: null,
  };
}

export function isVisibilityState(v: unknown): v is VisibilityState {
  if (!v || typeof v !== 'object') return false;
  const s = v as Record<string, unknown>;
  if (s.version !== VISIBILITY_STATE_VERSION) return false;
  if (!s.groups || typeof s.groups !== 'object') return false;
  const g = s.groups as Record<string, unknown>;
  if (!TOGGLEABLE_GROUPS.every((k) => typeof g[k] === 'boolean')) return false;
  return Array.isArray(s.floors) && Array.isArray(s.hiddenElements);
}
