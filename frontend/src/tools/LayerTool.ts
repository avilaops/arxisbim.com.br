import * as THREE from 'three';
import { BaseTool } from './Tool';
import { ToolType } from '../core';
import { appController } from '../app';

/**
 * LayerTool - Ferramenta de gerenciamento de layers
 * Permite criar, editar e controlar layers
 */
export class LayerTool extends BaseTool {
  public readonly name = 'Layer Tool';
  public readonly type = ToolType.LAYER;

  constructor() {
    super();
  }

  public activate(): void {
    super.activate();
    console.log('📑 Layer Tool activated - Use UI panel to manage layers');
  }

  public deactivate(): void {
    super.deactivate();
  }

  public onPointerDown(_event: PointerEvent, _raycaster: THREE.Raycaster): void {
    // Layer tool is primarily UI-driven
  }

  public onKeyDown(event: KeyboardEvent): void {
    if (!this.isActive) return;

    // L para toggle do painel de layers (pode ser implementado na UI)
    if (event.code === 'KeyL') {
      console.log('📑 Toggle layer panel (implement in UI)');
    }
  }

  /**
   * Cria um novo layer
   */
  public createLayer(name: string, color?: string): string {
    return appController.createLayer(name, color);
  }

  /**
   * Alterna visibilidade de um layer
   */
  public toggleLayerVisibility(layerId: string): void {
    appController.toggleLayerVisibility(layerId);
  }

  /**
   * Retorna todos os layers
   */
  public getLayers() {
    return appController.getLayers();
  }

  public dispose(): void {
    super.dispose();
  }
}
