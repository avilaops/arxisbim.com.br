/**
 * Element properties DTO (S13) — PropertySets de um elemento IFC.
 *
 * Fonte de verdade dos quantitativos (S20) e custos (S22). area/volume/length
 * ficam como campos INDEXADOS separados (queries de quantitativo rápidas); o
 * resto vai num JSONB consultável (GIN). Precisão da extração > UI do painel.
 */

export const ELEMENT_PROPERTIES_VERSION = 1 as const;

export type PropertyValue = string | number | boolean | null;
export type PropertySet = Record<string, PropertyValue>;

export interface ElementProperties {
  expressID: number;
  globalId: string;
  ifcType: string | null;
  name: string | null;
  storeyId: number | null;
  /** Quantidades indexadas (de Qto_*), já normalizadas p/ SI (m, m², m³). */
  areaM2: number | null;
  volumeM3: number | null;
  lengthM: number | null;
  /** Todos os psets: { "Pset_WallCommon": { IsExternal: true, ... }, ... }. */
  properties: Record<string, PropertySet>;
}
