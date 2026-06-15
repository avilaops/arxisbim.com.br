import { Scene, SceneLoader, AbstractMesh } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

export class MeshLoader {
  private loadedMeshes: Map<string, AbstractMesh[]> = new Map();

  public async loadGLTF(
    scene: Scene,
    url: string,
    onProgress?: (progress: number) => void
  ): Promise<AbstractMesh[]> {
    if (this.loadedMeshes.has(url)) {
      return this.loadedMeshes.get(url)!;
    }

    return new Promise((resolve, reject) => {
      SceneLoader.ImportMesh(
        null,
        '',
        url,
        scene,
        (meshes) => {
          // Processamento e mapeamento dos metadados
          meshes.forEach((mesh) => {
            // Extrai o ExpressID do nome (ex: "IfcWall_12345" -> 12345) ou metadados
            const idMatch = mesh.name.match(/_(\d+)$/);
            if (idMatch && idMatch[1]) {
              mesh.metadata = mesh.metadata || {};
              mesh.metadata.expressId = parseInt(idMatch[1], 10);
            }
          });

          this.loadedMeshes.set(url, meshes);
          resolve(meshes);
        },
        (event) => {
          if (onProgress && event.lengthComputable) {
            onProgress(event.loaded / event.total);
          }
        },
        (_scene, message, exception) => {
          reject(new Error(`Failed to load GLTF model: ${message}. ${exception}`));
        }
      );
    });
  }

  public unloadModel(url: string): void {
    const meshes = this.loadedMeshes.get(url);
    if (meshes) {
      meshes.forEach((mesh) => mesh.dispose());
      this.loadedMeshes.delete(url);
    }
  }

  public clear(): void {
    this.loadedMeshes.forEach((meshes) => {
      meshes.forEach((mesh) => mesh.dispose());
    });
    this.loadedMeshes.clear();
  }
}
