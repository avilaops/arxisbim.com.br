/**
 * viewer4dBridge (S35) — cola entre a UI legada (SchedulingPanel) e a simulação 4D.
 *
 * Lê o ViewerHost global (`window.__viewerHost`), constrói o lookup globalId→esfera
 * a partir da cena, um foco de câmera por esfera envolvente e um overlay (controles
 * + Gantt) sobre o viewport, e dispara `mountSchedule4D`. Expõe `startSchedule4D`
 * em `window.__startSchedule4D` para ser chamado pelo botão "Simular 4D".
 */
import * as THREE from 'three';
import type { BoundingSphere } from '../MeshReference';
import { mountSchedule4D, type Schedule4DHandle } from './mountSchedule4D';
import { mountSchedule4DSplit, type Schedule4DSplitHandle } from './mountSchedule4DSplit';
import type { ElementSphereLookup } from './Schedule4DController';

/** Constrói o lookup globalId→boundingSphere percorrendo as malhas da cena. */
export function buildSceneSphereLookup(scene: THREE.Object3D): ElementSphereLookup {
  const boxes = new Map<string, THREE.Box3>();
  scene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!(mesh as any).isMesh) return;
    const ud = mesh.userData as any;
    const globalId = String(ud?.globalId || ud?.ifcGuid || '').trim();
    if (!globalId) return;
    const box = new THREE.Box3().setFromObject(mesh);
    if (box.isEmpty()) return;
    const existing = boxes.get(globalId);
    if (existing) existing.union(box);
    else boxes.set(globalId, box.clone());
  });

  const spheres = new Map<string, { boundingSphere: BoundingSphere }>();
  const tmp = new THREE.Sphere();
  for (const [globalId, box] of boxes) {
    box.getBoundingSphere(tmp);
    spheres.set(globalId, {
      boundingSphere: {
        center: [tmp.center.x, tmp.center.y, tmp.center.z],
        radius: tmp.radius,
      },
    });
  }

  return { getByGlobalId: (id) => spheres.get(id) };
}

/** Enquadra a câmera numa esfera envolvente (posição + lookAt). */
export function makeCameraFocus(host: {
  camera: THREE.PerspectiveCamera;
  controls?: { target?: THREE.Vector3; update?: () => void };
}): (sphere: BoundingSphere) => void {
  return (sphere) => {
    const center = new THREE.Vector3(sphere.center[0], sphere.center[1], sphere.center[2]);
    const radius = Math.max(sphere.radius, 0.5);
    const fov = (host.camera.fov * Math.PI) / 180;
    const distance = (radius / Math.sin(fov / 2)) * 1.3;

    const dir = new THREE.Vector3()
      .subVectors(host.camera.position, host.controls?.target ?? center)
      .normalize();
    if (dir.lengthSq() === 0) dir.set(1, 1, 1).normalize();

    host.camera.position.copy(center).addScaledVector(dir, distance);
    host.camera.lookAt(center);
    host.camera.updateProjectionMatrix();
    if (host.controls?.target) {
      host.controls.target.copy(center);
      host.controls.update?.();
    }
  };
}

let activeHandle: Schedule4DHandle | Schedule4DSplitHandle | null = null;
let activeOverlay: HTMLElement | null = null;
let activeLabels: HTMLElement | null = null;

function teardown(): void {
  activeHandle?.dispose();
  activeHandle = null;
  activeOverlay?.remove();
  activeOverlay = null;
  activeLabels?.remove();
  activeLabels = null;
}

/** Cria as legendas "Planejado | Realizado" sobre os dois viewports. */
function buildSplitLabels(): HTMLElement {
  const labels = document.createElement('div');
  labels.className = 'schedule-4d-split-labels';
  const left = document.createElement('span');
  left.className = 'schedule-4d-split-labels__left';
  left.textContent = 'Planejado';
  const right = document.createElement('span');
  right.className = 'schedule-4d-split-labels__right';
  right.textContent = 'Realizado';
  labels.append(left, right);
  document.body.appendChild(labels);
  return labels;
}

/** Cria o overlay (controles + Gantt) sobre o viewport e devolve os containers. */
function buildOverlay(): { overlay: HTMLElement; controlsEl: HTMLElement; ganttEl: HTMLElement } {
  const overlay = document.createElement('div');
  overlay.className = 'schedule-4d-overlay';

  const bar = document.createElement('div');
  bar.className = 'schedule-4d-overlay__bar';
  const title = document.createElement('span');
  title.className = 'schedule-4d-overlay__title';
  title.textContent = 'Simulação 4D';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'schedule-4d-overlay__close';
  closeBtn.textContent = '×';
  closeBtn.title = 'Fechar simulação 4D';
  closeBtn.addEventListener('click', () => teardown());
  bar.append(title, closeBtn);

  const controlsEl = document.createElement('div');
  const ganttEl = document.createElement('div');
  ganttEl.className = 'schedule-4d-overlay__gantt';

  overlay.append(bar, controlsEl, ganttEl);
  document.body.appendChild(overlay);
  return { overlay, controlsEl, ganttEl };
}

/**
 * Inicia a simulação 4D para um cronograma. Usa o ViewerHost global e monta o
 * overlay. Encerra qualquer simulação anterior. Retorna o handle ou null.
 */
export async function startSchedule4D(
  scheduleId: string,
  options: { autoMatch?: boolean; projectName?: string } = {}
): Promise<Schedule4DHandle | null> {
  const host = (window as any).__viewerHost as
    | { scene: THREE.Scene; camera: THREE.PerspectiveCamera; controls?: any }
    | undefined;
  if (!host?.scene || !host?.camera) {
    console.warn('[S35] ViewerHost indisponível — abra um modelo IFC antes de simular.');
    return null;
  }

  teardown();
  const { overlay, controlsEl, ganttEl } = buildOverlay();
  activeOverlay = overlay;

  try {
    activeHandle = await mountSchedule4D(scheduleId, {
      scene: host.scene,
      ganttContainer: ganttEl,
      controlsContainer: controlsEl,
      elementIndex: buildSceneSphereLookup(host.scene),
      focusCamera: makeCameraFocus(host),
      projectName: options.projectName,
      autoMatch: options.autoMatch ?? true,
    });
    return activeHandle;
  } catch (err) {
    console.error('[S35] Falha ao iniciar simulação 4D:', err);
    teardown();
    return null;
  }
}

/**
 * Inicia a comparação Planejado×Realizado lado a lado (SplitView). Usa o
 * ViewerHost global, monta legendas e o overlay com Gantt+controles.
 */
export async function startSchedule4DSplit(
  scheduleId: string,
  options: { autoMatch?: boolean; projectName?: string } = {}
): Promise<Schedule4DSplitHandle | null> {
  const host = (window as any).__viewerHost as ViewerHostLike | undefined;
  if (!host?.scene || !host?.camera || !host?.renderer) {
    console.warn('[S35] ViewerHost indisponível — abra um modelo IFC antes de simular.');
    return null;
  }

  teardown();
  const splitContainer = host.renderer.domElement.parentElement ?? document.body;
  const { overlay, controlsEl, ganttEl } = buildOverlay();
  activeOverlay = overlay;
  activeLabels = buildSplitLabels();

  try {
    const handle = await mountSchedule4DSplit(scheduleId, {
      viewerHost: host as any,
      splitContainer,
      ganttContainer: ganttEl,
      controlsContainer: controlsEl,
      elementIndex: buildSceneSphereLookup(host.scene),
      focusCamera: makeCameraFocus(host),
      projectName: options.projectName,
      autoMatch: options.autoMatch ?? true,
    });
    activeHandle = handle;
    return handle;
  } catch (err) {
    console.error('[S35] Falha ao iniciar comparação 4D lado a lado:', err);
    teardown();
    return null;
  }
}

/** Encerra a simulação 4D ativa (se houver). */
export function stopSchedule4D(): void {
  teardown();
}

/** Registra os hooks globais usados pela UI legada. */
export function registerViewer4dBridge(): void {
  (window as any).__startSchedule4D = startSchedule4D;
  (window as any).__startSchedule4DSplit = startSchedule4DSplit;
  (window as any).__stopSchedule4D = stopSchedule4D;
}

interface ViewerHostLike {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls?: any;
}
