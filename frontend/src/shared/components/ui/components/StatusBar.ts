/**
 * StatusBar - Barra de status inferior (tipo VS Code)
 * Mostra: arquivo atual, triangles, memória, FPS, erros
 */

import { uiStore } from '../../../../app/state/uiStore';
import type { StatusBarState } from '../../../../app/state/uiStore';

/**
 * StatusBar component
 */
export class StatusBar {
  private container: HTMLElement;
  private unsubscribe?: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.subscribeToState();
  }

  private render(): void {
    this.container.innerHTML = '';
    this.container.className = 'statusbar';

    // Left section
    const left = document.createElement('div');
    left.className = 'statusbar__left';

    const fileName = document.createElement('span');
    fileName.className = 'statusbar__item statusbar__filename';
    fileName.id = 'statusbar-filename';
    fileName.textContent = 'Nenhum modelo';

    const elements = document.createElement('span');
    elements.className = 'statusbar__item statusbar__elements';
    elements.id = 'statusbar-elements';

    const selectedCount = document.createElement('span');
    selectedCount.className = 'statusbar__item statusbar__selected';
    selectedCount.id = 'statusbar-selected';

    const activeTool = document.createElement('span');
    activeTool.className = 'statusbar__item statusbar__tool';
    activeTool.id = 'statusbar-tool';

    const cameraMode = document.createElement('span');
    cameraMode.className = 'statusbar__item statusbar__camera';
    cameraMode.id = 'statusbar-camera';

    left.appendChild(fileName);
    left.appendChild(elements);
    left.appendChild(selectedCount);
    left.appendChild(activeTool);
    left.appendChild(cameraMode);

    // Right section
    const right = document.createElement('div');
    right.className = 'statusbar__right';

    const visibleLayers = document.createElement('span');
    visibleLayers.className = 'statusbar__item statusbar__layers';
    visibleLayers.id = 'statusbar-layers';

    const networkStatus = document.createElement('span');
    networkStatus.className = 'statusbar__item statusbar__network';
    networkStatus.id = 'statusbar-network';

    const triangles = document.createElement('span');
    triangles.className = 'statusbar__item statusbar__triangles';
    triangles.id = 'statusbar-triangles';

    const memory = document.createElement('span');
    memory.className = 'statusbar__item statusbar__memory';
    memory.id = 'statusbar-memory';

    const fps = document.createElement('span');
    fps.className = 'statusbar__item statusbar__fps';
    fps.id = 'statusbar-fps';

    const errors = document.createElement('span');
    errors.className = 'statusbar__item statusbar__errors';
    errors.id = 'statusbar-errors';

    right.appendChild(visibleLayers);
    right.appendChild(networkStatus);
    right.appendChild(triangles);
    right.appendChild(memory);
    right.appendChild(fps);
    right.appendChild(errors);

    this.container.appendChild(left);
    this.container.appendChild(right);

    // Update initial state
    this.updateStatusBar(uiStore.getState().statusBar);
  }

  private subscribeToState(): void {
    this.unsubscribe = uiStore.subscribe((state) => {
      this.updateStatusBar(state.statusBar);
    });
  }

  private updateStatusBar(status: StatusBarState): void {
    const fileName = this.container.querySelector('#statusbar-filename') as HTMLElement;
    if (fileName) {
      fileName.textContent = status.fileName ? `Modelo ${status.fileName}` : 'Nenhum modelo';
      fileName.title = status.fileName || 'Nenhum modelo';
    }

    const elements = this.container.querySelector('#statusbar-elements') as HTMLElement;
    if (elements) {
      elements.textContent = status.elements ? `Elementos ${this.formatNumber(status.elements)}` : '';
    }

    const selectedCount = this.container.querySelector('#statusbar-selected') as HTMLElement;
    if (selectedCount) {
      selectedCount.textContent = status.selectedCount ? `${status.selectedCount} selecionado${status.selectedCount === 1 ? '' : 's'}` : '';
      selectedCount.style.display = status.selectedCount ? 'block' : 'none';
    }

    const activeTool = this.container.querySelector('#statusbar-tool') as HTMLElement;
    if (activeTool) {
      if (status.activeTool && status.activeTool !== 'NONE') {
        activeTool.textContent = `Ferramenta ${this.formatLabel(status.activeTool)}`;
        activeTool.style.display = 'block';
      } else {
        activeTool.style.display = 'none';
      }
    }

    const cameraMode = this.container.querySelector('#statusbar-camera') as HTMLElement;
    if (cameraMode) {
      if (status.cameraMode) {
        cameraMode.textContent = `Câmera ${this.formatLabel(status.cameraMode)}`;
        cameraMode.style.display = 'block';
      } else {
        cameraMode.style.display = 'none';
      }
    }

    const visibleLayers = this.container.querySelector('#statusbar-layers') as HTMLElement;
    if (visibleLayers) {
      visibleLayers.textContent = status.visibleLayers ? `Camadas ${status.visibleLayers}` : '';
      visibleLayers.style.display = status.visibleLayers ? 'block' : 'none';
    }

    const networkStatus = this.container.querySelector('#statusbar-network') as HTMLElement;
    if (networkStatus) {
      networkStatus.textContent = status.networkStatus || '';
      networkStatus.style.display = status.networkStatus ? 'block' : 'none';
    }

    const triangles = this.container.querySelector('#statusbar-triangles') as HTMLElement;
    if (triangles) {
      triangles.textContent = status.triangles 
        ? `△ ${this.formatNumber(status.triangles)}`
        : '';
    }

    const memory = this.container.querySelector('#statusbar-memory') as HTMLElement;
    if (memory) {
      memory.textContent = status.memory 
        ? `${status.memory.toFixed(1)} MB`
        : '';
    }

    const fps = this.container.querySelector('#statusbar-fps') as HTMLElement;
    if (fps) {
      fps.classList.remove('statusbar__fps--good', 'statusbar__fps--warn', 'statusbar__fps--bad');
      if (status.fps) {
        fps.textContent = `${status.fps} FPS`;
        if (status.fps >= 50) {
          fps.classList.add('statusbar__fps--good');
        } else if (status.fps >= 30) {
          fps.classList.add('statusbar__fps--warn');
        } else {
          fps.classList.add('statusbar__fps--bad');
        }
      } else {
        fps.textContent = '';
      }
    }

    const errors = this.container.querySelector('#statusbar-errors') as HTMLElement;
    if (errors) {
      errors.textContent = status.errors 
        ? `${status.errors} erros`
        : '';
      errors.style.display = status.errors ? 'block' : 'none';
    }
  }

  private formatNumber(num: number): string {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toString();
  }

  private formatLabel(value: string): string {
    return value.toLowerCase().replace(/_/g, ' ');
  }

  public destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
