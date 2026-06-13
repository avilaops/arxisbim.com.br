/**
 * Helpers puros p/ montar o IFCStructure DTO (S07).
 *
 * Sem I/O, sem web-ifc: lógica testável de classificação de disciplina, contagem
 * por tipo e merge de bounding box. O worker web-ifc (S07/S08) alimenta estes
 * helpers com elementos + coordenadas; aqui fica a matemática/heurística estável.
 */
import type {
  BoundingBox, Discipline, IFCElement, IFCStats,
} from './ifc-structure.dto.js';

// Buckets espelham ifc-elements.service (categorize) p/ consistência no produto.
// Comparação é case-insensitive ('IfcWall' === 'IFCWALL').
const STRUCTURE = new Set(['IFCBEAM', 'IFCCOLUMN', 'IFCMEMBER', 'IFCPLATE', 'IFCSLAB', 'IFCFOOTING', 'IFCPILE']);
const ARCHITECTURE = new Set(['IFCWALL', 'IFCWALLSTANDARDCASE', 'IFCDOOR', 'IFCWINDOW', 'IFCROOF', 'IFCSTAIR', 'IFCRAILING', 'IFCCOVERING', 'IFCCURTAINWALL']);
const MEP = new Set(['IFCDUCTSEGMENT', 'IFCDUCT', 'IFCPIPESEGMENT', 'IFCCABLECARRIERSEGMENT', 'IFCCABLESEGMENT', 'IFCFLOWSEGMENT', 'IFCFLOWFITTING', 'IFCFLOWTERMINAL', 'IFCFLOWCONTROLLER']);

/** Classifica um tipo IFC em disciplina (heurística inicial S07). */
export function classifyDiscipline(type: string): Discipline {
  const t = type.toUpperCase();
  if (STRUCTURE.has(t)) return 'structure';
  if (ARCHITECTURE.has(t)) return 'architecture';
  if (MEP.has(t)) return 'mep';
  return 'other';
}

/** Bounding box "vazio" (degenerado) — antes de ver qualquer ponto. */
export function emptyBoundingBox(): BoundingBox {
  return { min: [0, 0, 0], max: [0, 0, 0] };
}

/** Une dois bounding boxes (componente a componente). */
export function mergeBoundingBox(a: BoundingBox, b: BoundingBox): BoundingBox {
  return {
    min: [Math.min(a.min[0], b.min[0]), Math.min(a.min[1], b.min[1]), Math.min(a.min[2], b.min[2])],
    max: [Math.max(a.max[0], b.max[0]), Math.max(a.max[1], b.max[1]), Math.max(a.max[2], b.max[2])],
  };
}

/**
 * Bounding box que envolve uma nuvem de pontos. Lança se vazia — bbox é
 * OBRIGATÓRIO no DTO, então "sem pontos" é erro do chamador, não [0,0,0] silencioso.
 */
export function boundingBoxFromPoints(points: ReadonlyArray<[number, number, number]>): BoundingBox {
  if (points.length === 0) throw new Error('boundingBoxFromPoints: nenhum ponto');
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const p of points) {
    for (let i = 0; i < 3; i++) {
      if (p[i] < min[i]) min[i] = p[i];
      if (p[i] > max[i]) max[i] = p[i];
    }
  }
  return { min, max };
}

/** Agrega stats (byType, byDiscipline, total) a partir dos elementos + bbox dado. */
export function buildStats(elements: ReadonlyArray<IFCElement>, boundingBox: BoundingBox): IFCStats {
  const byType: Record<string, number> = {};
  const byDiscipline: Record<Discipline, number> = { architecture: 0, structure: 0, mep: 0, other: 0 };

  for (const el of elements) {
    byType[el.type] = (byType[el.type] ?? 0) + 1;
    byDiscipline[classifyDiscipline(el.type)] += 1;
  }

  return {
    totalElements: elements.length,
    byType,
    byDiscipline,
    boundingBox,
  };
}
