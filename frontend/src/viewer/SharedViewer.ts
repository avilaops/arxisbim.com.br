import * as THREE from 'three';
import { SharingAPIService } from '../api/v1/services/sharing.service';
import { ViewerHost } from './ViewerHost';
import { IFCSimpleLoader } from '../loaders/IFCSimpleLoader';

export class SharedViewer {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  
  private viewerHost: ViewerHost | null = null;
  private ifcLoader: IFCSimpleLoader | null = null;
  private token: string = '';
  private currentModels: any[] = [];
  
  constructor(container: HTMLElement, canvas: HTMLCanvasElement) {
    this.container = container;
    this.canvas = canvas;
  }

  /**
   * Initializes the shared visualizer with token
   */
  async initialize(token: string): Promise<void> {
    this.token = token;
    this.showLoading(true);

    try {
      // 1. Resolve token details
      const details = await SharingAPIService.resolvePublicLink(token);
      
      // Save project ID in localstorage so other components (like comments) can resolve it if needed
      if (details.project?.id) {
        localStorage.setItem('arxisvr_project_id', details.project.id);
      }

      // Update Header Info
      this.updateHeader(details.project.name, details.scenario?.name || 'Projeto Inteiro');

      // 2. Initialize Three.js ViewerHost
      this.viewerHost = new ViewerHost(this.canvas);
      (window as any).__viewerHost = this.viewerHost;
      
      // 3. Initialize IFCSimpleLoader
      this.ifcLoader = new IFCSimpleLoader(this.viewerHost.scene, this.viewerHost.camera, this.viewerHost.controls);
      (window as any).__ifcSimpleLoader = this.ifcLoader;

      // 4. Load Models
      const models = await SharingAPIService.listPublicModels(token);
      this.currentModels = models;

      if (models.length === 0) {
        this.showNoModelsMessage();
      } else {
        // Load all models in sequence
        for (const model of models) {
          const downloadUrl = SharingAPIService.getPublicModelDownloadUrl(token, model.id);
          const response = await fetch(downloadUrl);
          if (!response.ok) {
            throw new Error(`Erro ao baixar arquivo do modelo: ${response.statusText}`);
          }
          const blob = await response.blob();
          const file = new File([blob], model.originalName || 'model.ifc', { type: 'application/ifc' });
          await this.ifcLoader.load(file);
        }
      }

      // 5. Apply Scenario camera settings if present
      if (details.scenario && details.scenario.camera) {
        const cam = details.scenario.camera;
        if (cam.position) {
          this.viewerHost.camera.position.set(cam.position.x, cam.position.y, cam.position.z);
        }
        if (cam.fov) {
          this.viewerHost.camera.fov = cam.fov;
          this.viewerHost.camera.updateProjectionMatrix();
        }
        this.viewerHost.controls?.update();
      }

      // 6. Hook up click selection
      this.viewerHost.onSelect(async (expressId) => {
        await this.handleElementSelected(expressId);
      });

      // Show UI elements
      const header = document.getElementById('shared-header');
      const sidebar = document.getElementById('shared-sidebar');
      if (header) header.style.display = 'flex';
      if (sidebar) sidebar.style.display = 'flex';

    } catch (err: any) {
      console.error('[SharedViewer] Failed to initialize:', err);
      const statusCode = err.response?.status || err.statusCode || 500;
      if (statusCode === 410) {
        this.showErrorOverlay('Link Expirado ou Inativo', 'Este link de visualização pública expirou ou foi revogado pelo administrador.');
      } else if (statusCode === 404) {
        this.showErrorOverlay('Link Não Encontrado', 'O link informado não foi encontrado ou foi excluído.');
      } else {
        this.showErrorOverlay('Erro ao Carregar Visualizador', err.message || 'Erro inesperado.');
      }
    } finally {
      this.showLoading(false);
    }
  }

  private updateHeader(projectName: string, scenarioName: string): void {
    const titleEl = document.getElementById('project-title');
    const metaEl = document.getElementById('project-meta-info');
    if (titleEl) titleEl.textContent = projectName;
    if (metaEl) metaEl.textContent = `Visualização Pública • ${scenarioName}`;
  }

  private async handleElementSelected(expressId: number | null): Promise<void> {
    const infoEl = document.getElementById('model-info');
    if (!infoEl) return;

    if (!expressId) {
      infoEl.innerHTML = `
        <div style="padding:16px 0;text-align:center;color:var(--text-muted);">
          <div style="font-size:32px;margin-bottom:12px;opacity:0.4;">📐</div>
          <p style="font-size:12px;line-height:1.5;">Selecione um elemento para visualizar propriedades</p>
        </div>
      `;
      return;
    }

    infoEl.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted)">Carregando propriedades...</div>`;

    try {
      const element = await SharingAPIService.getPublicElementProperties(this.token, expressId);
      this.renderProperties(element);
    } catch (err) {
      console.error('[SharedViewer] Failed to load element properties:', err);
      infoEl.innerHTML = `<div style="text-align:center;padding:20px;color:#ef4444;font-size:12px">Erro ao carregar propriedades.</div>`;
    }
  }

  private renderProperties(element: any): void {
    const infoEl = document.getElementById('model-info');
    if (!infoEl) return;

    let propsHTML = `
      <style>
        .prop-section {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 12px;
        }
        .prop-section-title {
          font-size: 11px;
          font-weight: 700;
          color: var(--accent-color);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          padding-bottom: 4px;
        }
        .prop-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          padding: 4px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.02);
        }
        .prop-row:last-child {
          border-bottom: none;
        }
        .prop-key {
          color: var(--text-muted);
        }
        .prop-val {
          color: var(--text-secondary);
          font-family: monospace;
          text-align: right;
          word-break: break-all;
          max-width: 60%;
        }
      </style>
      <div style="margin-bottom:16px">
        <h4 style="font-size:14px;font-weight:700;color:var(--text-primary)">${element.name || 'Sem nome'}</h4>
        <span style="font-size:10px;color:var(--text-muted)">ID: #${element.expressId} • Tipo: ${element.type}</span>
      </div>
    `;

    const properties = element.properties || {};
    const keys = Object.keys(properties);

    if (keys.length === 0) {
      propsHTML += `<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:12px">Nenhuma propriedade pública disponível.</div>`;
    } else {
      for (const psetKey of keys) {
        const psetVal = properties[psetKey];
        if (psetVal && typeof psetVal === 'object' && !Array.isArray(psetVal)) {
          const subKeys = Object.keys(psetVal);
          if (subKeys.length > 0) {
            propsHTML += `
              <div class="prop-section">
                <div class="prop-section-title">${psetKey}</div>
            `;
            for (const propKey of subKeys) {
              propsHTML += `
                <div class="prop-row">
                  <span class="prop-key">${propKey}</span>
                  <span class="prop-val">${psetVal[propKey]}</span>
                </div>
              `;
            }
            propsHTML += `</div>`;
          }
        } else {
          propsHTML += `
            <div class="prop-row" style="padding: 6px 4px">
              <span class="prop-key" style="font-weight:600">${psetKey}</span>
              <span class="prop-val">${psetVal}</span>
            </div>
          `;
        }
      }
    }

    infoEl.innerHTML = propsHTML;
  }

  private showNoModelsMessage(): void {
    const infoEl = document.getElementById('model-info');
    if (infoEl) {
      infoEl.innerHTML = `
        <div style="padding:20px;text-align:center;color:var(--text-muted)">
          Nenhum modelo associado a este projeto.
        </div>
      `;
    }
  }

  private showLoading(show: boolean): void {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = show ? 'flex' : 'none';
  }

  private showErrorOverlay(title: string, desc: string): void {
    const overlay = document.createElement('div');
    overlay.className = 'error-overlay';
    overlay.innerHTML = `
      <div class="error-card">
        <div class="error-icon">⚠️</div>
        <h2 class="error-title">${title}</h2>
        <p class="error-desc">${desc}</p>
      </div>
    `;
    this.container.appendChild(overlay);
  }
}
