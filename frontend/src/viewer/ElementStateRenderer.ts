import * as THREE from 'three';

export type SimulationElementState = 'not_started' | 'active' | 'complete' | 'removed' | 'hidden' | 'delayed';

export class ElementStateRenderer {
  private originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private originalVisibilities = new Map<THREE.Mesh, boolean>();
  public cachedMeshes: Array<{
    mesh: THREE.Mesh;
    expressId: string;
    globalId: string;
  }> = [];

  // Material Palette (Navisworks compatible)
  private notStartedMaterial = new THREE.MeshStandardMaterial({
    color: 0x64748b, // Gray/Slate
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide
  });

  private activeMaterial = new THREE.MeshStandardMaterial({
    color: 0xeab308, // Yellow
    roughness: 0.4,
    metalness: 0.2,
    emissive: 0xeab308,
    emissiveIntensity: 0.15,
    side: THREE.DoubleSide
  });

  private removedMaterial = new THREE.MeshStandardMaterial({
    color: 0xef4444, // Red
    roughness: 0.4,
    metalness: 0.1,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide
  });

  // Delayed: physical execution behind schedule (planned vs actual). Solid red.
  private delayedMaterial = new THREE.MeshStandardMaterial({
    color: 0xdc2626, // Red-600
    roughness: 0.5,
    metalness: 0.1,
    emissive: 0xdc2626,
    emissiveIntensity: 0.2,
    side: THREE.DoubleSide
  });

  /**
   * Caches all meshes in the scene for fast updates
   */
  public cacheSceneMeshes(scene: THREE.Scene): void {
    this.cachedMeshes = [];
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const expressId = String((child.userData as any)?.expressID ?? child.name);
        const globalId = String((child.userData as any)?.globalId || (child.userData as any)?.ifcGuid || '').trim();
        
        this.cachedMeshes.push({
          mesh: child,
          expressId,
          globalId
        });

        // Store baseline state if not already stored
        if (!this.originalMaterials.has(child)) {
          this.originalMaterials.set(child, child.material);
        }
        if (!this.originalVisibilities.has(child)) {
          this.originalVisibilities.set(child, child.visible);
        }
      }
    });
  }

  /**
   * Applies states to the cached meshes
   */
  public applyStates(elementStates: Record<string, SimulationElementState>, hiddenElements: Set<string>): void {
    // If cache is empty, we don't have meshes to apply to yet
    if (this.cachedMeshes.length === 0) return;

    for (const item of this.cachedMeshes) {
      const { mesh, expressId, globalId } = item;

      // 1. Check if scenario visibility dictates hiding
      const isHiddenInScenario = hiddenElements.has(expressId) || (globalId && hiddenElements.has(globalId));
      if (isHiddenInScenario) {
        mesh.visible = false;
        continue;
      }

      // 2. Resolve temporal visual state
      // Look up by globalId first, fallback to expressId
      let state: SimulationElementState = 'complete'; // Default to complete for unmapped elements
      if (globalId && elementStates[globalId]) {
        state = elementStates[globalId];
      } else if (expressId && elementStates[expressId]) {
        state = elementStates[expressId];
      }

      // Restore original visibility state as default first
      mesh.visible = this.originalVisibilities.get(mesh) ?? true;

      // Apply style based on state
      switch (state) {
        case 'not_started':
          mesh.material = this.notStartedMaterial;
          break;
        case 'active':
          mesh.material = this.activeMaterial;
          break;
        case 'removed':
          mesh.material = this.removedMaterial;
          break;
        case 'delayed':
          mesh.material = this.delayedMaterial;
          break;
        case 'hidden':
          mesh.visible = false;
          break;
        case 'complete':
        default:
          mesh.material = this.originalMaterials.get(mesh) ?? mesh.material;
          break;
      }
    }
  }

  /**
   * Restores all elements to their original materials and visibilities
   */
  public restore(hiddenElements: Set<string>): void {
    for (const item of this.cachedMeshes) {
      const { mesh, expressId, globalId } = item;
      const originalMat = this.originalMaterials.get(mesh);
      if (originalMat) {
        mesh.material = originalMat;
      }

      const isHiddenInScenario = hiddenElements.has(expressId) || (globalId && hiddenElements.has(globalId));
      if (isHiddenInScenario) {
        mesh.visible = false;
      } else {
        mesh.visible = this.originalVisibilities.get(mesh) ?? true;
      }
    }
  }

  public clearCache(): void {
    this.cachedMeshes = [];
    this.originalMaterials.clear();
    this.originalVisibilities.clear();
  }
}
