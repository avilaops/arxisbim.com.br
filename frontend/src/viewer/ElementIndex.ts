/**
 * ElementIndex (S08) — Map<expressID, MeshReference>: a ponte de identidade.
 *
 * Resolve clique→expressID (sobe a hierarquia até achar `userData.expressID`,
 * porque o objeto raycastado pode ser um filho do node identificado) e dá acesso
 * a bounds/sphere por elemento. SEM Three.js, SEM lógica BIM — só identidade +
 * geometria. Testável headless.
 */
import type {
  MeshReference, GeometryManifest, IdentifiableObject, InstancedGroup,
} from './MeshReference';

export class ElementIndex {
  private byExpressID = new Map<number, MeshReference>();
  private byGlobalId = new Map<string, MeshReference>();
  readonly instancedGroups: InstancedGroup[];
  readonly modelVersionId: string;

  constructor(manifest: GeometryManifest) {
    if (manifest.version !== 1) {
      throw new Error(`GeometryManifest versão ${manifest.version} incompatível (esperado 1)`);
    }
    this.modelVersionId = manifest.modelVersionId;
    this.instancedGroups = manifest.instancedGroups;
    for (const ref of manifest.elements) {
      this.byExpressID.set(ref.expressID, ref);
      if (ref.globalId) this.byGlobalId.set(ref.globalId, ref);
    }
  }

  get size(): number { return this.byExpressID.size; }

  get(expressID: number): MeshReference | undefined { return this.byExpressID.get(expressID); }
  getByGlobalId(globalId: string): MeshReference | undefined { return this.byGlobalId.get(globalId); }
  has(expressID: number): boolean { return this.byExpressID.has(expressID); }
  all(): MeshReference[] { return [...this.byExpressID.values()]; }

  /**
   * Resolve o expressID de um objeto raycastado. Sobe a árvore (`parent`) até
   * achar `userData.expressID` — o hit pode cair num mesh filho do node nomeado.
   * Retorna null se o objeto não pertence ao modelo (ex.: grid, gizmo).
   */
  resolveExpressID(object: IdentifiableObject | null | undefined): number | null {
    let cur = object ?? null;
    let guard = 0;
    while (cur && guard++ < 256) {
      const id = cur.userData?.expressID;
      if (typeof id === 'number') return id;
      cur = cur.parent ?? null;
    }
    return null;
  }

  /** Atalho clique→MeshReference. */
  resolve(object: IdentifiableObject | null | undefined): MeshReference | null {
    const id = this.resolveExpressID(object);
    return id == null ? null : (this.get(id) ?? null);
  }

  /** expressIDs de um tipo IFC (ex.: todas IfcWall) — base de filtros (S10). */
  byType(type: string): number[] {
    const t = type.toLowerCase();
    const out: number[] = [];
    for (const ref of this.byExpressID.values()) {
      if (ref.type.toLowerCase() === t) out.push(ref.expressID);
    }
    return out;
  }
}
