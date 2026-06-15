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

/**
 * CSS auto-contido do S35. Injetado em runtime para que a simulação funcione em
 * qualquer entry/HTML, independentemente de `styles/app.css` ser carregado.
 */
const S35_STYLE_ID = 'schedule-4d-styles';
const S35_CSS = `
.schedule-4d-overlay{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);width:min(920px,94vw);display:flex;flex-direction:column;gap:8px;padding:10px;background:rgba(15,23,42,.95);border:1px solid #334155;border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.45);backdrop-filter:blur(6px);z-index:9500;font-family:system-ui,sans-serif}
.schedule-4d-overlay__bar{display:flex;align-items:center;justify-content:space-between}
.schedule-4d-overlay__title{font-weight:600;color:#e2e8f0}
.schedule-4d-overlay__close{background:none;border:none;color:#94a3b8;font-size:20px;line-height:1;cursor:pointer}
.schedule-4d-overlay__close:hover{color:#e2e8f0}
.schedule-4d-overlay__gantt{max-height:220px;overflow-y:auto}
.schedule-4d-split-labels{position:fixed;top:64px;left:0;right:0;display:flex;justify-content:space-around;pointer-events:none;z-index:9400}
.schedule-4d-split-labels__left,.schedule-4d-split-labels__right{padding:4px 12px;border-radius:4px;font-size:13px;font-weight:600;color:#fff;background:rgba(15,23,42,.8)}
.schedule-4d-split-labels__left{border-left:3px solid #94a3b8}
.schedule-4d-split-labels__right{border-left:3px solid #38bdf8}
.gantt-timeline{position:relative;width:100%;background:#1e293b;border:1px solid #334155;border-radius:8px;overflow:hidden;font-size:12px}
.gantt-timeline__rows{display:flex;flex-direction:column}
.gantt-timeline__empty{padding:16px;color:#94a3b8;text-align:center}
.gantt-timeline__row{display:flex;align-items:center;height:26px;border-bottom:1px solid #334155;cursor:pointer}
.gantt-timeline__row:hover{background:rgba(148,163,184,.08)}
.gantt-timeline__row--delayed .gantt-timeline__label{color:#dc2626;font-weight:600}
.gantt-timeline__label{flex:0 0 180px;padding:0 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#e2e8f0}
.gantt-timeline__track{position:relative;flex:1 1 auto;height:100%;border-left:1px solid #334155}
.gantt-timeline__bar{position:absolute;border-radius:3px}
.gantt-timeline__bar--planned{top:4px;height:7px;background:rgba(148,163,184,.35);border:1px solid rgba(148,163,184,.5)}
.gantt-timeline__bar--actual{bottom:4px;height:7px;background:#eab308}
.gantt-timeline__bar--actual.gantt-timeline__bar--not_started{background:rgba(100,116,139,.4)}
.gantt-timeline__bar--actual.gantt-timeline__bar--active{background:#eab308}
.gantt-timeline__bar--actual.gantt-timeline__bar--delayed{background:#dc2626}
.gantt-timeline__bar--actual.gantt-timeline__bar--complete{background:#10b981}
.gantt-timeline__cursor{position:absolute;top:0;bottom:0;width:2px;background:#38bdf8;pointer-events:none;z-index:2}
.sim-controls{display:flex;align-items:center;gap:8px;padding:8px 12px;background:#1e293b;border:1px solid #334155;border-radius:8px}
.sim-controls__btn,.sim-controls__mode{background:#334155;color:#e2e8f0;border:1px solid #475569;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:13px}
.sim-controls__btn:hover,.sim-controls__mode:hover{background:#475569}
.sim-controls__mode[data-mode='planned']{border-color:rgba(148,163,184,.6)}
.sim-controls__mode[data-mode='actual']{border-color:#38bdf8}
.sim-controls__speed{background:#334155;color:#e2e8f0;border:1px solid #475569;border-radius:4px;padding:4px 6px}
.sim-controls__date{margin-left:auto;color:#94a3b8;font-size:13px;font-variant-numeric:tabular-nums}
`;

/** Injeta o CSS do S35 uma única vez. */
export function injectSchedule4DStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(S35_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = S35_STYLE_ID;
  style.textContent = S35_CSS;
  document.head.appendChild(style);
}

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
  injectSchedule4DStyles();
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
  injectSchedule4DStyles();
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
