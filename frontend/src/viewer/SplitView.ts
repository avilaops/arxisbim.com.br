import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { ViewerHost } from './ViewerHost';
import { CameraSync } from './CameraSync';
import { DiffHighlighter } from './DiffHighlighter';
import { analytics } from '../core/analytics/Analytics';

export class SplitView {
  private container: HTMLElement;
  private viewerHost: ViewerHost;
  private dividerEl: HTMLDivElement | null = null;
  
  // Scenarios
  private scenarioA: any;
  private scenarioB: any;
  private projectId: string = '';
  private tenantId: string = '';
  
  // Rendering State
  private splitRatio: number = 0.5;
  private active: boolean = false;
  
  // Cameras & Controls
  private cameraA: THREE.PerspectiveCamera;
  private cameraB: THREE.PerspectiveCamera;
  private controlsA: OrbitControls;
  private controlsB: OrbitControls;
  private cameraSync: CameraSync;
  private diffHighlighter = new DiffHighlighter();
  
  // Visibility States
  private hiddenA = new Set<string>();
  private hiddenB = new Set<string>();
  private onlyInA: string[] = [];
  private onlyInB: string[] = [];
  private originalVisibilities = new Map<THREE.Object3D, boolean>();

  // Drag interaction handlers
  private dragHandler: ((e: MouseEvent | TouchEvent) => void) | null = null;
  private stopDragHandler: (() => void) | null = null;

  constructor(container: HTMLElement, viewerHost: ViewerHost, scenarioA: any, scenarioB: any) {
    this.container = container;
    this.viewerHost = viewerHost;
    this.scenarioA = scenarioA;
    this.scenarioB = scenarioB;
    this.projectId = localStorage.getItem('arxisvr_project_id') || '';
    this.tenantId = localStorage.getItem('arxisvr_tenant_id') || '';

    // Setup cameras and controls
    this.cameraA = this.viewerHost.camera;
    this.controlsA = this.viewerHost.controls;
    
    // Enable controls A
    this.controlsA.enabled = true;
    
    this.cameraB = this.cameraA.clone();
    this.controlsB = new OrbitControls(this.cameraB, this.viewerHost.renderer.domElement);
    this.controlsB.enableDamping = true;
    this.controlsB.dampingFactor = 0.05;
    
    this.cameraSync = new CameraSync(this.controlsA, this.controlsB);
    
    this.computeDiff();
    this.initUI();
    this.activate();
  }

  private initUI(): void {
    // Inject divider
    this.dividerEl = document.createElement('div');
    this.dividerEl.className = 'split-view-divider';
    this.dividerEl.style.cssText = `
      position: absolute;
      top: 0;
      bottom: 0;
      width: 6px;
      left: calc(${this.splitRatio * 100}% - 3px);
      background: rgba(124, 58, 237, 0.85);
      cursor: col-resize;
      z-index: 100;
      box-shadow: 0 0 10px rgba(124, 58, 237, 0.5);
      transition: background 0.2s;
    `;
    this.container.appendChild(this.dividerEl);

    // Drag interactions
    const startDrag = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      document.addEventListener('mousemove', onDrag);
      document.addEventListener('mouseup', stopDrag);
      document.addEventListener('touchmove', onDrag);
      document.addEventListener('touchend', stopDrag);
    };

    const onDrag = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const rect = this.container.getBoundingClientRect();
      const x = clientX - rect.left;
      this.splitRatio = Math.max(0.1, Math.min(0.9, x / rect.width));
      this.resize();
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', stopDrag);
      document.removeEventListener('touchmove', onDrag);
      document.removeEventListener('touchend', stopDrag);
    };

    this.dividerEl.addEventListener('mousedown', startDrag);
    this.dividerEl.addEventListener('touchstart', startDrag);
  }

  private computeDiff(): void {
    this.hiddenA = new Set(this.scenarioA?.scenarioState?.visibility?.hiddenElements || []);
    this.hiddenB = new Set(this.scenarioB?.scenarioState?.visibility?.hiddenElements || []);

    // Diff calculation
    // onlyInA = visible in A but hidden in B (meaning B lacks it/removed)
    // onlyInB = visible in B but hidden in A (meaning B added it/new)
    this.onlyInA = Array.from(this.hiddenB).filter(id => !this.hiddenA.has(id));
    this.onlyInB = Array.from(this.hiddenA).filter(id => !this.hiddenB.has(id));
  }

  public activate(): void {
    this.active = true;
    this.viewerHost.customRender = this.render.bind(this);
    
    // Telemetry event comparison_opened
    analytics.track('comparison_opened', {
      tenantId: this.tenantId,
      projectId: this.projectId,
      scenarioA: this.scenarioA?.id,
      scenarioB: this.scenarioB?.id
    });
  }

  public deactivate(): void {
    this.active = false;
    this.viewerHost.customRender = undefined;
    this.controlsB.dispose();
    this.cameraSync.disable();
    this.diffHighlighter.restore();
    this.restoreVisibility();

    if (this.dividerEl) {
      this.dividerEl.remove();
      this.dividerEl = null;
    }

    // Reset default renderer viewport
    const renderer = this.viewerHost.renderer;
    const { width, height } = this.container.getBoundingClientRect();
    renderer.setViewport(0, 0, width, height);
    renderer.setScissor(0, 0, width, height);
    renderer.setScissorTest(false);

    // Reset camera aspect
    this.cameraA.aspect = width / height;
    this.cameraA.updateProjectionMatrix();
  }

  public setCameraLock(locked: boolean): void {
    this.cameraSync.setLocked(locked);
    if (!locked) {
      analytics.track('comparison_camera_unlocked', {
        tenantId: this.tenantId,
        projectId: this.projectId,
        scenarioA: this.scenarioA?.id,
        scenarioB: this.scenarioB?.id
      });
    }
  }

  public resize(): void {
    if (!this.dividerEl) return;
    this.dividerEl.style.left = `calc(${this.splitRatio * 100}% - 3px)`;
  }

  private applyVisibility(hiddenElements: Set<string>): void {
    this.originalVisibilities.clear();
    this.viewerHost.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        this.originalVisibilities.set(child, child.visible);
        const expressId = String((child.userData as any)?.expressID ?? child.name);
        const globalId = String((child.userData as any)?.globalId || (child.userData as any)?.ifcGuid || '');
        const shouldHide = hiddenElements.has(expressId) || (globalId && hiddenElements.has(globalId));
        child.visible = !shouldHide;
      }
    });
  }

  private restoreVisibility(): void {
    for (const [mesh, visible] of this.originalVisibilities.entries()) {
      mesh.visible = visible;
    }
    this.originalVisibilities.clear();
  }

  public render(): void {
    if (!this.active) return;

    const renderer = this.viewerHost.renderer;
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const leftWidth = Math.floor(width * this.splitRatio);
    const rightWidth = width - leftWidth;

    // Clear background once
    renderer.clear();

    // ── LEFT VIEWPORT (Scenario A) ──
    renderer.setViewport(0, 0, leftWidth, height);
    renderer.setScissor(0, 0, leftWidth, height);
    renderer.setScissorTest(true);

    this.cameraA.aspect = leftWidth / height;
    this.cameraA.updateProjectionMatrix();

    // Highlight onlyInA in red (elements visible in A but removed in B)
    this.diffHighlighter.highlightDiff(this.viewerHost.scene, this.onlyInA, []);
    this.applyVisibility(this.hiddenA);

    renderer.render(this.viewerHost.scene, this.cameraA);

    // Restore Scene
    this.diffHighlighter.restore();
    this.restoreVisibility();

    // ── RIGHT VIEWPORT (Scenario B) ──
    renderer.setViewport(leftWidth, 0, rightWidth, height);
    renderer.setScissor(leftWidth, 0, rightWidth, height);
    renderer.setScissorTest(true);

    this.cameraB.aspect = rightWidth / height;
    this.cameraB.updateProjectionMatrix();

    // Highlight onlyInB in green (elements visible in B but missing in A)
    this.diffHighlighter.highlightDiff(this.viewerHost.scene, [], this.onlyInB);
    this.applyVisibility(this.hiddenB);

    // Update B controls damping
    this.controlsB.update();

    renderer.render(this.viewerHost.scene, this.cameraB);

    // Restore Scene
    this.diffHighlighter.restore();
    this.restoreVisibility();
  }
}
