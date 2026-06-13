/**
 * Geometry DTO (S08) — contrato estável da ponte BIM ↔ renderização.
 *
 * `MeshReference` é a ponte entre uma entidade IFC (expressID/globalId) e o objeto
 * renderizado (meshId no GLB). Reusada em S10 (filtros), S13 (propriedades),
 * S15 (busca), S18 (comparação), S22 (custos), S24/S26 (timeline). Manter estável.
 *
 * O GLB é CACHE de renderização: fonte de verdade = IFC original + IFCStructure (S07).
 * Regenerável a qualquer momento a partir do arquivo no storage.
 */
import type { BoundingBox } from './ifc-structure.dto.js';

export const GEOMETRY_MANIFEST_VERSION = 1 as const;

/** Three.js usa sphere em frustum culling, framing e raycasting. Em METROS. */
export interface BoundingSphere {
  center: [number, number, number];
  radius: number;
}

export interface MeshReference {
  expressID: number;
  globalId: string;
  /** id estável do mesh dentro do GLB (= node name). */
  meshId: string;
  type: string;
  bounds: BoundingBox;          // metros (web-ifc normaliza)
  boundingSphere: BoundingSphere;
  /** Chave de instancing: mesma chave = geometria + material idênticos. */
  instanceKey: string;
  hasGeometry: boolean;
}

/** Grupo de instancing: elementos com geometria + material idênticos. */
export interface InstancedGroup {
  instanceKey: string;
  type: string;
  count: number;
  expressIDs: number[];
}

export interface GeometryManifest {
  version: typeof GEOMETRY_MANIFEST_VERSION;
  modelVersionId: string;
  /** Storage key do .glb cacheado (null se ainda não persistido). */
  glbKey: string | null;
  meshCount: number;
  /** Elementos cuja geometria justifica InstancedMesh (count > 1). */
  instancedGroups: InstancedGroup[];
  modelBounds: BoundingBox;
  modelSphere: BoundingSphere;
  elements: MeshReference[];
}
