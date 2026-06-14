import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { SplitView } from './SplitView';
import { CameraSync } from './CameraSync';
import { DiffHighlighter } from './DiffHighlighter';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Mock analytics
vi.mock('../core/analytics/Analytics', () => ({
  analytics: {
    track: vi.fn()
  }
}));

describe('SplitView', () => {
  let container: HTMLElement;
  let canvas: HTMLCanvasElement;
  let renderer: THREE.WebGLRenderer;
  let viewerHost: any;
  let scenarioA: any;
  let scenarioB: any;
  let splitView: SplitView;

  beforeEach(() => {
    // Setup container
    container = document.createElement('div');
    container.style.width = '1000px';
    container.style.height = '600px';
    document.body.appendChild(container);

    // Setup canvas
    canvas = document.createElement('canvas');
    container.appendChild(canvas);

    // Setup renderer
    renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(1000, 600);

    // Mock ViewerHost
    viewerHost = {
      camera: new THREE.PerspectiveCamera(75, 1000 / 600, 0.1, 1000),
      scene: new THREE.Scene(),
      renderer,
      controls: new OrbitControls(viewerHost.camera, canvas),
      customRender: undefined
    };

    // Mock scenarios
    scenarioA = {
      id: 'scenario-a',
      name: 'Scenario A',
      scenarioState: {
        visibility: {
          hiddenElements: ['elem-1', 'elem-2']
        }
      }
    };

    scenarioB = {
      id: 'scenario-b',
      name: 'Scenario B',
      scenarioState: {
        visibility: {
          hiddenElements: ['elem-2', 'elem-3']
        }
      }
    };

    // Mock localStorage
    localStorage.setItem('arxisvr_project_id', 'project-123');
    localStorage.setItem('arxisvr_tenant_id', 'tenant-123');

    splitView = new SplitView(container, viewerHost, scenarioA, scenarioB);
  });

  afterEach(() => {
    document.body.removeChild(container);
    splitView.deactivate();
  });

  describe('Viewport Ratio Adjustments', () => {
    it('should initialize with 50/50 split ratio', () => {
      const divider = container.querySelector('.split-view-divider') as HTMLElement;
      expect(divider).toBeTruthy();
      expect(divider.style.left).toContain('calc(50%');
    });

    it('should adjust split ratio when divider is dragged', () => {
      const divider = container.querySelector('.split-view-divider') as HTMLElement;
      const rect = container.getBoundingClientRect();

      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        clientX: rect.left + 700 // 70% of width
      });
      divider.dispatchEvent(mouseDownEvent);

      const mouseMoveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: rect.left + 700
      });
      document.dispatchEvent(mouseMoveEvent);

      const mouseUpEvent = new MouseEvent('mouseup', {
        bubbles: true
      });
      document.dispatchEvent(mouseUpEvent);

      expect(divider.style.left).toContain('calc(70%');
    });

    it('should clamp split ratio between 0.1 and 0.9', () => {
      const divider = container.querySelector('.split-view-divider') as HTMLElement;
      const rect = container.getBoundingClientRect();

      // Try to drag beyond max
      const mouseDownEvent = new MouseEvent('mousedown', { bubbles: true });
      divider.dispatchEvent(mouseDownEvent);

      const mouseMoveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: rect.left + 950 // 95% - should be clamped to 90%
      });
      document.dispatchEvent(mouseMoveEvent);

      const mouseUpEvent = new MouseEvent('mouseup', { bubbles: true });
      document.dispatchEvent(mouseUpEvent);

      expect(divider.style.left).toContain('calc(90%');
    });
  });

  describe('Camera Synchronization', () => {
    it('should lock cameras by default', () => {
      expect(splitView['cameraSync'].getLocked()).toBe(true);
    });

    it('should unlock cameras when setCameraLock(false) is called', () => {
      splitView.setCameraLock(false);
      expect(splitView['cameraSync'].getLocked()).toBe(false);
    });

    it('should emit telemetry event when camera is unlocked', () => {
      const { analytics } = require('../core/analytics/Analytics');
      splitView.setCameraLock(false);
      expect(analytics.track).toHaveBeenCalledWith(
        'comparison_camera_unlocked',
        expect.objectContaining({
          tenantId: 'tenant-123',
          projectId: 'project-123'
        })
      );
    });

    it('should re-lock cameras when setCameraLock(true) is called', () => {
      splitView.setCameraLock(false);
      splitView.setCameraLock(true);
      expect(splitView['cameraSync'].getLocked()).toBe(true);
    });
  });

  describe('Diff Highlighting', () => {
    it('should compute diff correctly between scenarios', () => {
      // scenarioA hides: elem-1, elem-2
      // scenarioB hides: elem-2, elem-3
      // onlyInA (visible in A, hidden in B): elem-3
      // onlyInB (visible in B, hidden in A): elem-1
      expect(splitView['onlyInA']).toContain('elem-3');
      expect(splitView['onlyInB']).toContain('elem-1');
    });

    it('should restore original visibility when deactivated', () => {
      const mesh = new THREE.Mesh();
      mesh.visible = true;
      viewerHost.scene.add(mesh);

      splitView['applyVisibility'](new Set(['mesh-id']));
      expect(mesh.visible).toBe(false);

      splitView['restoreVisibility']();
      expect(mesh.visible).toBe(true);
    });
  });

  describe('Split View Activation/Deactivation', () => {
    it('should activate split view on construction', () => {
      expect(splitView['active']).toBe(true);
      expect(viewerHost.customRender).toBeDefined();
    });

    it('should deactivate split view properly', () => {
      splitView.deactivate();
      expect(splitView['active']).toBe(false);
      expect(viewerHost.customRender).toBeUndefined();
    });

    it('should emit comparison_opened telemetry event on activation', () => {
      const { analytics } = require('../core/analytics/Analytics');
      expect(analytics.track).toHaveBeenCalledWith(
        'comparison_opened',
        expect.objectContaining({
          tenantId: 'tenant-123',
          projectId: 'project-123',
          scenarioA: 'scenario-a',
          scenarioB: 'scenario-b'
        })
      );
    });

    it('should remove divider element when deactivated', () => {
      let divider = container.querySelector('.split-view-divider');
      expect(divider).toBeTruthy();

      splitView.deactivate();
      divider = container.querySelector('.split-view-divider');
      expect(divider).toBeNull();
    });
  });

  describe('Render Loop', () => {
    it('should render both viewports when active', () => {
      const renderSpy = vi.spyOn(renderer, 'render');
      splitView.render();
      // Should render twice: once for left (A) and once for right (B)
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it('should set correct viewport for left side', () => {
      const setViewportSpy = vi.spyOn(renderer, 'setViewport');
      splitView.render();
      // First call should be for left viewport
      expect(setViewportSpy).toHaveBeenCalledWith(0, 0, expect.any(Number), expect.any(Number));
    });

    it('should set correct viewport for right side', () => {
      const setViewportSpy = vi.spyOn(renderer, 'setViewport');
      splitView.render();
      // Last calls should include right viewport
      const calls = setViewportSpy.mock.calls;
      const rightViewportCall = calls.find(call => call[0] > 0); // x > 0
      expect(rightViewportCall).toBeTruthy();
    });
  });

  describe('Export Integration', () => {
    it('should have access to export method', () => {
      expect(splitView.render).toBeDefined();
      expect(splitView.resize).toBeDefined();
    });

    it('should maintain render method for export', () => {
      const renderFn = splitView.render.bind(splitView);
      expect(typeof renderFn).toBe('function');
    });
  });
});
