/**
 * MeasurementsPanel - Ferramenta de medição (ponto-a-ponto) sobre o viewer 3D.
 *
 * Wrapper UI que ativa a MeasurementTool existente e roteia eventos do canvas
 * (pointerdown/keydown) para a ferramenta enquanto estiver ativa.
 */

import * as THREE from 'three';
import { getNotificationSystem } from '../NotificationSystem';
import { MeasurementTool } from '../../../../tools/MeasurementTool';

export class MeasurementsPanel {
  private container: HTMLElement;
  private tool: MeasurementTool | null = null;
  private raycaster = new (THREE.Raycaster as any)();
  private active = false;
  private boundPointerDown = (e: PointerEvent) => this.handlePointerDown(e);
  private boundKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  public destroy(): void {
    this.deactivate();
    this.container.innerHTML = '';
  }

  private getViewer(): any | null {
    return (window as any).__viewerHost ?? null;
  }

  private ensureTool(): MeasurementTool | null {
    if (this.tool) return this.tool;
    const viewer = this.getViewer();
    if (!viewer?.scene || !viewer?.camera) return null;
    this.tool = new MeasurementTool(viewer.scene, viewer.camera);
    return this.tool;
  }

  private activate(): void {
    if (this.active) return;
    const tool = this.ensureTool();
    if (!tool) {
      getNotificationSystem().show('Viewer indisponível.', 'error');
      return;
    }
    this.active = true;
    tool.activate();
    const canvas = this.getViewer()?.renderer?.domElement ?? document.querySelector('canvas');
    canvas?.addEventListener('pointerdown', this.boundPointerDown);
    window.addEventListener('keydown', this.boundKeyDown);
    this.render();
    getNotificationSystem().show('Modo medição ativo. Clique 2 pontos.', 'success');
  }

  private deactivate(): void {
    if (!this.active) return;
    this.active = false;
    this.tool?.deactivate();
    const canvas = this.getViewer()?.renderer?.domElement ?? document.querySelector('canvas');
    canvas?.removeEventListener('pointerdown', this.boundPointerDown);
    window.removeEventListener('keydown', this.boundKeyDown);
    this.render();
  }

  private handlePointerDown(event: PointerEvent): void {
    if (!this.tool) return;
    this.tool.onPointerDown(event, this.raycaster);
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.tool) return;
    this.tool.onKeyDown(event);
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="panel measurements-panel">
        <div class="panel__section">
          <button
            type="button"
            id="measurements-toggle"
            class="btn btn--block ${this.active ? 'btn--primary' : ''}"
          >
            ${this.active ? 'Encerrar medição' : 'Ativar medição'}
          </button>
          <p class="measurements-panel__hint">
            ${this.active
              ? 'Clique em dois pontos do modelo. ESC limpa, Enter finaliza.'
              : 'Ative para medir distâncias ponto-a-ponto.'}
          </p>
        </div>
      </div>
    `;
    this.container
      .querySelector<HTMLButtonElement>('#measurements-toggle')
      ?.addEventListener('click', () => (this.active ? this.deactivate() : this.activate()));
  }
}
