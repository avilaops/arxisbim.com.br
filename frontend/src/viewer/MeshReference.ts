/**
 * Tipos da ponte BIM ↔ render (S08), espelho do contrato do backend
 * (`ifc-geometry.dto.ts`). Frontend não importa do backend → tipos duplicados,
 * mas com a mesma forma. Versão do manifest fixada p/ detectar incompatibilidade.
 */
export const GEOMETRY_MANIFEST_VERSION = 1 as const;

export interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
}

export interface BoundingSphere {
  center: [number, number, number];
  radius: number;
}

export interface MeshReference {
  expressID: number;
  globalId: string;
  meshId: string;
  type: string;
  bounds: BoundingBox;
  boundingSphere: BoundingSphere;
  instanceKey: string;
  hasGeometry: boolean;
}

export interface InstancedGroup {
  instanceKey: string;
  type: string;
  count: number;
  expressIDs: number[];
}

export interface GeometryManifest {
  version: typeof GEOMETRY_MANIFEST_VERSION;
  modelVersionId: string;
  glbKey: string | null;
  meshCount: number;
  instancedGroups: InstancedGroup[];
  modelBounds: BoundingBox;
  modelSphere: BoundingSphere;
  elements: MeshReference[];
}

/** Forma mínima de um objeto de cena (Three.Object3D) — sem depender do Three. */
export interface IdentifiableObject {
  userData?: { expressID?: number;[k: string]: unknown };
  parent?: IdentifiableObject | null;
}
