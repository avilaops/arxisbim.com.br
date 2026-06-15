import { Scene, Color3, StandardMaterial } from '@babylonjs/core';

export class FilterShaderMaterial {
  private scene: Scene;
  private colorMaterials: Map<string, StandardMaterial> = new Map();

  constructor(scene: Scene) {
    this.scene = scene;
  }

  public hideElements(expressIds: number[]): void {
    const idSet = new Set(expressIds);
    this.scene.meshes.forEach((mesh) => {
      if (mesh.metadata && idSet.has(mesh.metadata.expressId)) {
        mesh.isVisible = false;
      }
    });
  }

  public showAllElements(): void {
    this.scene.meshes.forEach((mesh) => {
      mesh.isVisible = true;
    });
  }

  public isolateElements(expressIds: number[]): void {
    const idSet = new Set(expressIds);
    this.scene.meshes.forEach((mesh) => {
      if (mesh.metadata && mesh.metadata.expressId !== undefined) {
        mesh.isVisible = idSet.has(mesh.metadata.expressId);
      }
    });
  }

  public setColorOverride(expressIds: number[], hexColor: string): void {
    const idSet = new Set(expressIds);
    const color = Color3.FromHexString(hexColor);

    this.scene.meshes.forEach((mesh) => {
      if (mesh.metadata && idSet.has(mesh.metadata.expressId)) {
        // Usa o overlay nativo do Babylon para colorir de forma ultra performática
        mesh.overlayColor = color;
        mesh.renderOverlay = true;
        mesh.overlayAlpha = 0.6;
      }
    });
  }

  public clearColorOverrides(expressIds?: number[]): void {
    if (expressIds) {
      const idSet = new Set(expressIds);
      this.scene.meshes.forEach((mesh) => {
        if (mesh.metadata && idSet.has(mesh.metadata.expressId)) {
          mesh.renderOverlay = false;
        }
      });
    } else {
      this.scene.meshes.forEach((mesh) => {
        mesh.renderOverlay = false;
      });
    }
  }

  public dispose(): void {
    this.colorMaterials.forEach((material) => material.dispose());
    this.colorMaterials.clear();
  }
}
