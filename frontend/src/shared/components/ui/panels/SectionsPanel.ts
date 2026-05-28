/**
 * SectionsPanel - Controle de planos de corte 3D (X/Y/Z).
 *
 * Wrapper UI sobre ViewerHost.clippingGeometry.
 */

import { getNotificationSystem } from '../NotificationSystem';

type Axis = 'x' | 'y' | 'z';

interface AxisState {
  enabled: boolean;
  position: number;
}

const AXES: Axis[] = ['x', 'y', 'z'];

export class SectionsPanel {
  private container: HTMLElement;
  private clippingEnabled = true;
  private axisState: Record<Axis, AxisState> = {
    x: { enabled: false, position: 0 },
    y: { enabled: false, position: 0 },
    z: { enabled: false, position: 0 },
  };
  private range = { min: -50, max: 50, step: 0.1 };

  constructor(container: HTMLElement) {
    this.container = container;
    this.tryAutoRange();
    this.render();
  }

  public destroy(): void {
    this.container.innerHTML = '';
  }

  private getClipping(): any | null {
    const viewer = (window as any).__viewerHost;
    return viewer?.clippingGeometry ?? (window as any).__clippingGeometry ?? null;
  }

  private tryAutoRange(): void {
    const viewer = (window as any).__viewerHost;
    const scene = viewer?.scene;
    if (!scene) return;
    try {
      const THREE = (window as any).THREE;
      if (!THREE?.Box3) return;
      const box = new THREE.Box3().setFromObject(scene);
      if (box.isEmpty?.()) return;
      const size = Math.max(
        Math.abs(box.min.x), Math.abs(box.max.x),
        Math.abs(box.min.y), Math.abs(box.max.y),
        Math.abs(box.min.z), Math.abs(box.max.z),
      );
      if (Number.isFinite(size) && size > 0) {
        const padded = Math.ceil(size * 1.2);
        this.range = { min: -padded, max: padded, step: Math.max(0.05, padded / 1000) };
      }
    } catch {
      // ignore — fall back to default range
    }
  }

  private toggleAxis(axis: Axis, enabled: boolean): void {
    const clip = this.getClipping();
    if (!clip) {
      getNotificationSystem().show('Viewer indisponível.', 'error');
      return;
    }
    this.axisState[axis].enabled = enabled;
    if (enabled) {
      clip.addSectionPlane(axis, this.axisState[axis].position, true);
    } else {
      clip.removeSectionPlane(axis);
    }
  }

  private updateAxisPosition(axis: Axis, position: number): void {
    this.axisState[axis].position = position;
    const valueLabel = this.container.querySelector(`#sections-${axis}-value`);
    if (valueLabel) valueLabel.textContent = position.toFixed(2);
    if (!this.axisState[axis].enabled) return;
    const clip = this.getClipping();
    if (!clip) return;
    clip.updateSectionPlane(axis, position);
  }

  private toggleClippingEnabled(enabled: boolean): void {
    const clip = this.getClipping();
    if (!clip) return;
    this.clippingEnabled = enabled;
    clip.setClippingEnabled?.(enabled);
  }

  private clearAll(): void {
    const clip = this.getClipping();
    if (!clip) return;
    AXES.forEach((axis) => {
      if (this.axisState[axis].enabled) {
        clip.removeSectionPlane(axis);
        this.axisState[axis].enabled = false;
      }
    });
    this.render();
    getNotificationSystem().show('Todos os cortes removidos.', 'success');
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="panel sections-panel">
        <div class="panel__section">
          <label class="sections-panel__master">
            <input type="checkbox" id="sections-enabled" ${this.clippingEnabled ? 'checked' : ''} />
            <span>Corte 3D ativo</span>
          </label>
        </div>

        ${AXES.map((axis) => this.renderAxis(axis)).join('')}

        <div class="panel__section">
          <button type="button" class="btn btn--ghost btn--block" id="sections-clear">
            Remover cortes
          </button>
        </div>
      </div>
    `;
    this.attach();
  }

  private renderAxis(axis: Axis): string {
    const state = this.axisState[axis];
    return `
      <div class="panel__section sections-panel__axis">
        <div class="sections-panel__axis-header">
          <label class="sections-panel__axis-toggle">
            <input type="checkbox" data-axis="${axis}" id="sections-${axis}-toggle" ${state.enabled ? 'checked' : ''} />
            <strong>Eixo ${axis.toUpperCase()}</strong>
          </label>
          <span class="sections-panel__axis-value" id="sections-${axis}-value">${state.position.toFixed(2)}</span>
        </div>
        <input
          type="range"
          data-axis="${axis}"
          id="sections-${axis}-slider"
          min="${this.range.min}"
          max="${this.range.max}"
          step="${this.range.step}"
          value="${state.position}"
          class="sections-panel__slider"
        />
      </div>
    `;
  }

  private attach(): void {
    this.container
      .querySelector<HTMLInputElement>('#sections-enabled')
      ?.addEventListener('change', (e) => {
        this.toggleClippingEnabled((e.target as HTMLInputElement).checked);
      });

    AXES.forEach((axis) => {
      this.container
        .querySelector<HTMLInputElement>(`#sections-${axis}-toggle`)
        ?.addEventListener('change', (e) => {
          this.toggleAxis(axis, (e.target as HTMLInputElement).checked);
        });
      this.container
        .querySelector<HTMLInputElement>(`#sections-${axis}-slider`)
        ?.addEventListener('input', (e) => {
          const value = parseFloat((e.target as HTMLInputElement).value);
          if (Number.isFinite(value)) this.updateAxisPosition(axis, value);
        });
    });

    this.container.querySelector('#sections-clear')?.addEventListener('click', () => this.clearAll());
  }
}
