/**
 * SelectionActionsPanel - Barra flutuante com ações rápidas para o objeto selecionado.
 *
 * Focus: foca a câmera no objeto.
 * Hide: oculta apenas o selecionado.
 * Isolate: oculta tudo exceto o selecionado.
 * Mostrar todos: restaura visibilidade.
 */

import * as THREE from 'three';
import { selectionService, type SelectionPayload } from '../../../../inspector/SelectionService';
import { getNotificationSystem } from '../NotificationSystem';

export class SelectionActionsPanel {
  private container: HTMLElement;
  private current: SelectionPayload | null = null;
  private hiddenStates = new Map<string, boolean>(); // uuid → previous visible

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'selection-actions';
    this.container.style.display = 'none';
    document.body.appendChild(this.container);
    this.render();
    selectionService.onSelectionChanged((payload) => {
      this.current = payload;
      this.updateVisibility();
    });
  }

  private updateVisibility(): void {
    const hasSelection = !!this.current;
    const hasHidden = this.hiddenStates.size > 0;
    this.container.style.display = hasSelection || hasHidden ? 'flex' : 'none';
    this.render();
  }

  private getViewer(): any | null {
    return (window as any).__viewerHost ?? null;
  }

  private focusOnSelection(): void {
    const viewer = this.getViewer();
    if (!viewer || !this.current) return;
    const obj = this.current.object3D;
    const box = new THREE.Box3().setFromObject(obj);
    if (box.isEmpty()) {
      getNotificationSystem().show('Objeto sem geometria.', 'warning');
      return;
    }
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length();
    const dir = new THREE.Vector3(1, 0.8, 1).normalize();
    const distance = Math.max(size * 1.5, 5);
    viewer.camera.position.copy(center).add(dir.multiplyScalar(distance));
    viewer.camera.lookAt(center);
    if (viewer.controls?.target) {
      viewer.controls.target.copy(center);
      viewer.controls.update?.();
    }
    getNotificationSystem().show('Câmera focada no objeto.', 'success');
  }

  private hideSelection(): void {
    if (!this.current) return;
    const obj = this.current.object3D;
    if (!this.hiddenStates.has(obj.uuid)) {
      this.hiddenStates.set(obj.uuid, obj.visible);
    }
    obj.visible = false;
    this.updateVisibility();
    getNotificationSystem().show('Objeto ocultado.', 'success');
  }

  private isolateSelection(): void {
    const viewer = this.getViewer();
    if (!viewer || !this.current) return;
    const keep = this.current.object3D;
    const keepUuids = new Set<string>();
    const collectUuid = (o: any) => keepUuids.add(o.uuid);
    keep.traverse(collectUuid);
    let parent: THREE.Object3D | null = keep.parent;
    while (parent) {
      keepUuids.add(parent.uuid);
      parent = parent.parent;
    }

    viewer.scene.traverse((o: THREE.Object3D) => {
      if (!(o instanceof THREE.Mesh)) return;
      if (keepUuids.has(o.uuid)) return;
      if (!this.hiddenStates.has(o.uuid)) {
        this.hiddenStates.set(o.uuid, o.visible);
      }
      o.visible = false;
    });
    this.updateVisibility();
    getNotificationSystem().show('Objeto isolado.', 'success');
  }

  private showAll(): void {
    const viewer = this.getViewer();
    if (!viewer) return;
    viewer.scene.traverse((o: THREE.Object3D) => {
      if (this.hiddenStates.has(o.uuid)) {
        o.visible = this.hiddenStates.get(o.uuid)!;
      }
    });
    this.hiddenStates.clear();
    this.updateVisibility();
    getNotificationSystem().show('Visibilidade restaurada.', 'success');
  }

  private render(): void {
    const name =
      this.current?.object3D.name ||
      (this.current?.expressID !== undefined ? `IFC #${this.current.expressID}` : 'Objeto');
    const hasSelection = !!this.current;
    const hasHidden = this.hiddenStates.size > 0;

    this.container.innerHTML = `
      ${hasSelection ? `<span class="selection-actions__label">${this.escape(name)}</span>` : ''}
      ${hasSelection ? `<button data-act="focus" title="Centralizar câmera">Centralizar</button>` : ''}
      ${hasSelection ? `<button data-act="hide" title="Ocultar elemento">Ocultar</button>` : ''}
      ${hasSelection ? `<button data-act="isolate" title="Isolar elemento selecionado">Isolar</button>` : ''}
      ${hasHidden ? `<button data-act="show-all" title="Mostrar todos (${this.hiddenStates.size})">Mostrar todos</button>` : ''}
    `;
    this.container.querySelectorAll<HTMLButtonElement>('button[data-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.act;
        if (act === 'focus') this.focusOnSelection();
        else if (act === 'hide') this.hideSelection();
        else if (act === 'isolate') this.isolateSelection();
        else if (act === 'show-all') this.showAll();
      });
    });
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
