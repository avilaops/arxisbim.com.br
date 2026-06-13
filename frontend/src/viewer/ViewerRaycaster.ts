/**
 * ViewerRaycaster (S09) — raycasting acelerado por BVH (three-mesh-bvh).
 *
 * Spec S09: BVH construído UMA vez no load, nunca por seleção. Raycaster +
 * geometria são matemática pura (sem WebGL) → testável headless. Devolve o objeto
 * atingido (opaco); quem resolve p/ expressID é o ElementIndex/ViewerFacade.
 */
import * as THREE from 'three';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

// Patch global idempotente: instala BVH no protótipo de geometria/mesh.
let patched = false;
function ensurePatched(): void {
  if (patched) return;
  (THREE.BufferGeometry.prototype as any).computeBoundsTree = computeBoundsTree;
  (THREE.BufferGeometry.prototype as any).disposeBoundsTree = disposeBoundsTree;
  (THREE.Mesh.prototype as any).raycast = acceleratedRaycast;
  patched = true;
}

export class ViewerRaycaster {
  private raycaster = new THREE.Raycaster();
  private built = false;
  private builtMeshCount = 0;

  constructor() { ensurePatched(); }

  /** Constrói o BVH em cada mesh do modelo. Idempotente: roda só 1× por modelo. */
  buildBVH(root: THREE.Object3D): void {
    if (this.built) return;
    let n = 0;
    root.traverse((o: any) => {
      if (o.isMesh && o.geometry && !o.geometry.boundsTree) {
        o.geometry.computeBoundsTree();
        n++;
      }
    });
    this.built = true;
    this.builtMeshCount = n;
  }

  get bvhBuilt(): boolean { return this.built; }
  get meshesWithBVH(): number { return this.builtMeshCount; }

  /** Libera o índice (e permite reconstruir p/ outro modelo). */
  reset(root?: THREE.Object3D): void {
    if (root) root.traverse((o: any) => { if (o.isMesh && o.geometry?.boundsTree) o.geometry.disposeBoundsTree(); });
    this.built = false;
    this.builtMeshCount = 0;
  }

  /** Raycast por raio explícito (origem+direção). Retorna o 1º objeto atingido. */
  raycast(origin: THREE.Vector3, direction: THREE.Vector3, root: THREE.Object3D): THREE.Object3D | null {
    this.raycaster.set(origin, direction.clone().normalize());
    const hits = this.raycaster.intersectObject(root, true);
    return hits.length ? hits[0].object : null;
  }

  /** Raycast a partir de coords NDC do mouse (-1..1) + câmera. */
  raycastNDC(ndcX: number, ndcY: number, camera: THREE.Camera, root: THREE.Object3D): THREE.Object3D | null {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const hits = this.raycaster.intersectObject(root, true);
    return hits.length ? hits[0].object : null;
  }
}
