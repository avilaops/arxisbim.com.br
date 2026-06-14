import { ScenarioPicker } from './ScenarioPicker';
import { SplitView } from '../viewer/SplitView';
import { ComparisonExport } from '../viewer/ComparisonExport';
import { ScenarioRecord } from '../api/v1/services/scenarios.service';
import type { ViewerHost } from '../viewer/ViewerHost';

export class ComparisonPage {
  private container: HTMLElement;
  private viewerHost: ViewerHost;
  
  private panelEl: HTMLElement | null = null;
  private pickerA: ScenarioPicker | null = null;
  private pickerB: ScenarioPicker | null = null;
  
  private scenarioA: ScenarioRecord | null = null;
  private scenarioB: ScenarioRecord | null = null;
  
  private splitView: SplitView | null = null;
  private cameraLocked: boolean = true;
  private isCollapsed: boolean = true;

  constructor(container: HTMLElement, viewerHost: ViewerHost) {
    this.container = container;
    this.viewerHost = viewerHost;

    this.init();
  }

  private init(): void {
    this.injectStyles();

    // Create main comparison floating panel
    this.panelEl = document.createElement('div');
    this.panelEl.className = 'bim-comparison-panel collapsed';
    this.container.appendChild(this.panelEl);

    this.render();
  }

  private injectStyles(): void {
    if (document.getElementById('bim-comparison-styles')) return;

    const style = document.createElement('style');
    style.id = 'bim-comparison-styles';
    style.textContent = `
      .bim-comparison-panel {
        position: absolute;
        top: 24px;
        left: 80px; /* offset from search panel */
        z-index: 20;
        background: rgba(15, 23, 42, 0.82);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 16px;
        width: 320px;
        display: flex;
        flex-direction: column;
        color: #f8fafc;
        font-family: 'Inter', -apple-system, sans-serif;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        gap: 12px;
        box-sizing: border-box;
      }

      .bim-comparison-panel.collapsed {
        width: 48px;
        height: 48px;
        padding: 0;
        overflow: hidden;
        border-radius: 50%;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        display: flex;
        background: rgba(15, 23, 42, 0.85);
        border-color: rgba(124, 58, 237, 0.4);
      }

      .bim-comparison-panel.collapsed:hover {
        background: rgba(30, 41, 59, 0.9);
        border-color: rgba(124, 58, 237, 0.8);
        transform: scale(1.05);
      }

      .bim-comparison-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        padding-bottom: 8px;
        user-select: none;
      }

      .bim-comparison-title {
        font-size: 14px;
        font-weight: 700;
        color: #f1f5f9;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .bim-comparison-close-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 4px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s, color 0.2s;
      }

      .bim-comparison-close-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #f1f5f9;
      }

      .bim-comparison-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 8px;
      }

      .bim-comparison-btn {
        background: var(--accent-color, #7c3aed);
        color: #ffffff;
        border: none;
        border-radius: 8px;
        padding: 10px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s, box-shadow 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }

      .bim-comparison-btn:hover {
        background: #6d28d9;
        box-shadow: 0 0 12px rgba(124, 58, 237, 0.4);
      }

      .bim-comparison-btn.secondary {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
      }

      .bim-comparison-btn.secondary:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
        box-shadow: none;
      }

      .bim-comparison-toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12px;
        color: #cbd5e1;
        padding: 6px 0;
      }
    `;
    document.head.appendChild(style);
  }

  private render(): void {
    if (!this.panelEl) return;

    if (this.isCollapsed) {
      this.panelEl.className = 'bim-comparison-panel collapsed';
      this.panelEl.innerHTML = `<span style="font-size: 20px;">⚖️</span>`;
      
      const clickHandler = () => {
        this.isCollapsed = false;
        this.render();
      };
      this.panelEl.onclick = clickHandler;
      return;
    }

    this.panelEl.onclick = null;
    this.panelEl.className = 'bim-comparison-panel';
    this.panelEl.innerHTML = `
      <div class="bim-comparison-header">
        <span class="bim-comparison-title">⚖️ Comparação de Cenários</span>
        <button class="bim-comparison-close-btn" id="bim-compare-close">✕</button>
      </div>
      <div id="picker-a-container"></div>
      <div id="picker-b-container"></div>
      <div class="bim-comparison-actions" id="comparison-controls" style="display:none">
        <div class="bim-comparison-toggle-row">
          <span>Sincronizar Câmeras</span>
          <input type="checkbox" id="camera-sync-lock" ${this.cameraLocked ? 'checked' : ''} style="cursor:pointer" />
        </div>
        <button class="bim-comparison-btn" id="export-comparison-btn">📸 Exportar PNG (A|B)</button>
        <button class="bim-comparison-btn secondary" id="deactivate-comparison-btn">Deixar Comparação</button>
      </div>
    `;

    document.getElementById('bim-compare-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isCollapsed = true;
      this.render();
    });

    const pickerAEl = document.getElementById('picker-a-container');
    const pickerBEl = document.getElementById('picker-b-container');

    if (pickerAEl) {
      this.pickerA = new ScenarioPicker(pickerAEl, 'Cenário A (Referência)', (sc) => {
        this.scenarioA = sc;
        this.checkAndStartComparison();
      });
    }

    if (pickerBEl) {
      this.pickerB = new ScenarioPicker(pickerBEl, 'Cenário B (Alternativa)', (sc) => {
        this.scenarioB = sc;
        this.checkAndStartComparison();
      });
    }
  }

  private checkAndStartComparison(): void {
    const controls = document.getElementById('comparison-controls');
    if (!this.scenarioA || !this.scenarioB) {
      if (controls) controls.style.display = 'none';
      if (this.splitView) {
        this.splitView.deactivate();
        this.splitView = null;
      }
      return;
    }

    if (controls) controls.style.display = 'flex';
    
    // Deactivate previous splitView if active
    if (this.splitView) {
      this.splitView.deactivate();
    }

    // Initialize SplitView
    this.splitView = new SplitView(this.container, this.viewerHost, this.scenarioA, this.scenarioB);
    this.splitView.setCameraLock(this.cameraLocked);

    // Bind event listeners for actions
    const syncLock = document.getElementById('camera-sync-lock') as HTMLInputElement | null;
    syncLock?.addEventListener('change', () => {
      this.cameraLocked = syncLock.checked;
      this.splitView?.setCameraLock(this.cameraLocked);
    });

    document.getElementById('deactivate-comparison-btn')?.addEventListener('click', () => {
      this.deactivate();
    });

    document.getElementById('export-comparison-btn')?.addEventListener('click', async () => {
      if (this.splitView) {
        await ComparisonExport.export(this.splitView, this.viewerHost.renderer, this.viewerHost.renderer.domElement);
      }
    });
  }

  private deactivate(): void {
    if (this.splitView) {
      this.splitView.deactivate();
      this.splitView = null;
    }
    this.scenarioA = null;
    this.scenarioB = null;
    this.render();
  }
}
