import * as THREE from 'three';

export class DiffHighlighter {
  private originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  
  private redMaterial = new THREE.MeshStandardMaterial({
    color: 0xef4444, // Red (removed/changed)
    roughness: 0.5,
    metalness: 0.1,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  });

  private greenMaterial = new THREE.MeshStandardMaterial({
    color: 0x10b981, // Green (added)
    roughness: 0.5,
    metalness: 0.1,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  });

  /**
   * Highlights elements in the scene according to diff lists
   */
  public highlightDiff(scene: THREE.Scene, onlyInA: string[], onlyInB: string[]): void {
    // First restore anything currently highlighted
    this.restore();

    const setA = new Set(onlyInA.map(String));
    const setB = new Set(onlyInB.map(String));

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const expressId = String((child.userData as any)?.expressID ?? child.name);
        const globalId = String((child.userData as any)?.globalId || (child.userData as any)?.ifcGuid || '');

        const matchA = setA.has(expressId) || (globalId && setA.has(globalId));
        const matchB = setB.has(expressId) || (globalId && setB.has(globalId));

        if (matchA) {
          this.originalMaterials.set(child, child.material);
          child.material = this.redMaterial;
        } else if (matchB) {
          this.originalMaterials.set(child, child.material);
          child.material = this.greenMaterial;
        }
      }
    });
  }

  /**
   * Restores all modified materials to their original states
   */
  public restore(): void {
    for (const [mesh, mat] of this.originalMaterials.entries()) {
      mesh.material = mat;
    }
    this.originalMaterials.clear();
  }
}
