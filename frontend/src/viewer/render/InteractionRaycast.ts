import { Scene, PointerEventTypes, AbstractMesh, HighlightLayer, Color3, Mesh } from '@babylonjs/core';

export class InteractionRaycast {
  private scene: Scene;
  private highlightLayer: HighlightLayer;
  private onElementSelected?: (expressId: number | null, mesh: AbstractMesh | null) => void;
  private currentSelection: AbstractMesh | null = null;

  constructor(scene: Scene) {
    this.scene = scene;
    this.highlightLayer = new HighlightLayer('selectionHighlight', this.scene);
    this.registerPointerEvents();
  }

  public setSelectionCallback(
    callback: (expressId: number | null, mesh: AbstractMesh | null) => void
  ): void {
    this.onElementSelected = callback;
  }

  private registerPointerEvents(): void {
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === PointerEventTypes.POINTERDOWN) {
        const pickResult = pointerInfo.pickInfo;
        if (pickResult && pickResult.hit && pickResult.pickedMesh) {
          const pickedMesh = pickResult.pickedMesh;
          const expressId = pickedMesh.metadata?.expressId;

          if (expressId !== undefined) {
            this.selectMesh(pickedMesh, expressId);
          } else {
            this.clearSelection();
          }
        } else {
          this.clearSelection();
        }
      }
    });
  }

  public selectMesh(mesh: AbstractMesh, expressId: number): void {
    this.clearSelection();
    
    this.currentSelection = mesh;
    this.highlightLayer.addMesh(mesh as Mesh, Color3.Yellow());
    
    if (this.onElementSelected) {
      this.onElementSelected(expressId, mesh);
    }
  }

  public clearSelection(): void {
    if (this.currentSelection) {
      this.highlightLayer.removeMesh(this.currentSelection as Mesh);
      this.currentSelection = null;
    }
    
    if (this.onElementSelected) {
      this.onElementSelected(null, null);
    }
  }

  public dispose(): void {
    this.clearSelection();
    this.highlightLayer.dispose();
  }
}
