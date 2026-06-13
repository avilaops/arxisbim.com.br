/**
 * IFCStructure DTO (S07) — contrato estável de saída do parser IFC.
 *
 * Desacopla todos os consumers (S08 geometria, S11 pipeline, S13 propriedades,
 * S15 busca, S20 quantitativos) do formato interno do parser (web-ifc). O JSONB
 * persistido em `model_structure` é CACHE do parse; a fonte de verdade é sempre
 * o IFC original no storage — em divergência, re-parse.
 *
 * `version` na raiz protege compatibilidade: S13/S19 adicionam campos sem quebrar.
 */

export const IFC_STRUCTURE_VERSION = 1 as const;

export type IfcSchema = 'IFC2X3' | 'IFC4' | 'IFC4X3';

/** architecture | structure | mep | other — heurística inicial (S07). */
export type Discipline = 'architecture' | 'structure' | 'mep' | 'other';

/**
 * Bounding box em METROS, sempre. web-ifc normaliza a geometria p/ metros
 * independente da unidade de autoria do arquivo. NÃO multiplique pelo `units` —
 * `units` descreve a autoria (p/ quantitativos S13/S20), não as coordenadas.
 */
export interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
}

export interface SpatialNode {
  expressID: number;
  globalId: string;
  type: string;                 // IfcSite | IfcBuilding | IfcBuildingStorey | IfcSpace
  name: string | null;
  children: SpatialNode[];
}

export interface IFCElement {
  expressID: number;
  globalId: string;
  type: string;                 // 'IfcWall', 'IfcBeam', etc.
  name: string | null;
  storeyId: number | null;
  parentExpressID: number | null; // navega Parede → Pavimento → Edifício sem recalcular a árvore
  hasGeometry: boolean;
}

export interface IFCStats {
  totalElements: number;
  byType: Record<string, number>;       // { IfcWall: 423, IfcBeam: 88, ... }
  byDiscipline: Record<Discipline, number>;
  boundingBox: BoundingBox;             // OBRIGATÓRIO
}

export interface IFCStructure {
  version: typeof IFC_STRUCTURE_VERSION;
  schema: IfcSchema;
  projectName: string;
  /**
   * Unidade de AUTORIA do arquivo (IfcUnitAssignment) — ex.: 'mm'. Usada p/
   * interpretar quantitativos (S13/S20). NÃO é a unidade do `boundingBox`, que
   * é sempre metros (web-ifc normaliza). Ver doc em BoundingBox.
   */
  units: { length: string; area: string; volume: string };
  spatialTree: SpatialNode[];           // Site → Building → Storey → Space
  elements: IFCElement[];
  stats: IFCStats;
}
