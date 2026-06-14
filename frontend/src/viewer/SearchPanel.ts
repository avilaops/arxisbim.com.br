import { eventBus } from '../core';
import { BIMSearchAPIService, BIMSearchResultElement } from '../api/v1/services/bim-search.service';
import type { ViewerHost } from './ViewerHost';

export class SearchPanel {
  private container: HTMLElement;
  private viewerHost: ViewerHost;
  private panelEl: HTMLElement | null = null;
  
  // State
  private activeModelVersionId: string | null = null;
  private query: string = '';
  private selectedType: string = '';
  private psetName: string = '';
  private psetProp: string = '';
  private psetValue: string = '';
  
  private results: BIMSearchResultElement[] = [];
  private currentPage: number = 1;
  private itemsPerPage: number = 25;
  private loading: boolean = false;
  private error: string | null = null;
  private psetExpanded: boolean = false;
  private isCollapsed: boolean = true;

  private onIfcLoadedBind: (payload: any) => void;

  constructor(container: HTMLElement, viewerHost: ViewerHost) {
    this.container = container;
    this.viewerHost = viewerHost;
    
    this.onIfcLoadedBind = this.handleIfcLoaded.bind(this);
    this.init();
  }

  private init(): void {
    this.injectStyles();
    
    // Create panel container
    this.panelEl = document.createElement('div');
    this.panelEl.className = 'bim-search-panel collapsed';
    this.container.appendChild(this.panelEl);

    // Initial render
    this.render();

    // Listen to model loaded events
    eventBus.on('ifc:loaded', this.onIfcLoadedBind);

    // Check if there's already an active model loaded via window.__viewerHost
    // (useful if panel is instantiated after a model is already in scene)
    const currentModelId = (window as any).loadedIfcModelId || (this.viewerHost as any).loadedIfcModelId;
    if (currentModelId && typeof currentModelId === 'string' && currentModelId.includes('-')) {
      this.activeModelVersionId = currentModelId;
      this.render();
    }
  }

  private handleIfcLoaded(payload: any): void {
    if (payload?.model?.id) {
      this.activeModelVersionId = payload.model.id;
      this.currentPage = 1;
      this.results = [];
      this.render();
    }
  }

  private injectStyles(): void {
    if (document.getElementById('bim-search-styles')) return;

    const style = document.createElement('style');
    style.id = 'bim-search-styles';
    style.textContent = `
      .bim-search-panel {
        position: absolute;
        top: 24px;
        left: 24px;
        z-index: 20;
        background: rgba(15, 23, 42, 0.82);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 16px;
        width: 320px;
        max-height: calc(100vh - 120px);
        display: flex;
        flex-direction: column;
        color: #f8fafc;
        font-family: 'Inter', -apple-system, sans-serif;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        gap: 12px;
        box-sizing: border-box;
      }

      .bim-search-panel.collapsed {
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
        border-color: rgba(59, 130, 246, 0.4);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }

      .bim-search-panel.collapsed:hover {
        background: rgba(30, 41, 59, 0.9);
        border-color: rgba(59, 130, 246, 0.8);
        transform: scale(1.05);
      }

      .bim-search-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        padding-bottom: 8px;
        user-select: none;
      }

      .bim-search-title {
        font-size: 14px;
        font-weight: 700;
        color: #f1f5f9;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .bim-search-title svg {
        color: #3b82f6;
      }

      .bim-search-close-btn {
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

      .bim-search-close-btn:hover {
        background: rgba(255, 255, 255, 0.06);
        color: #f1f5f9;
      }

      .bim-search-body {
        display: flex;
        flex-direction: column;
        gap: 10px;
        overflow-y: auto;
        flex: 1;
        padding-right: 2px;
      }

      /* Estilização da scrollbar customizada */
      .bim-search-body::-webkit-scrollbar {
        width: 4px;
      }
      .bim-search-body::-webkit-scrollbar-track {
        background: transparent;
      }
      .bim-search-body::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 4px;
      }
      .bim-search-body::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .bim-search-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .bim-search-label {
        font-size: 11px;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }

      .bim-search-input {
        background: rgba(30, 41, 59, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 6px;
        padding: 8px 12px;
        color: #f1f5f9;
        font-size: 13px;
        transition: border-color 0.2s, background 0.2s;
        outline: none;
      }

      .bim-search-input:focus {
        border-color: rgba(59, 130, 246, 0.5);
        background: rgba(30, 41, 59, 0.8);
      }

      .bim-search-select {
        background: rgba(30, 41, 59, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 6px;
        padding: 8px 10px;
        color: #f1f5f9;
        font-size: 13px;
        outline: none;
        cursor: pointer;
        transition: border-color 0.2s;
      }

      .bim-search-select:focus {
        border-color: rgba(59, 130, 246, 0.5);
      }

      .bim-search-select option {
        background: #0f172a;
        color: #f1f5f9;
      }

      /* Accordion de Propriedades */
      .bim-search-accordion-toggle {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12px;
        font-weight: 600;
        color: #3b82f6;
        cursor: pointer;
        user-select: none;
        padding: 6px 0;
        border-top: 1px solid rgba(255, 255, 255, 0.04);
        margin-top: 4px;
      }

      .bim-search-accordion-content {
        display: none;
        flex-direction: column;
        gap: 8px;
        padding: 8px;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 6px;
        border: 1px dashed rgba(255, 255, 255, 0.05);
      }

      .bim-search-accordion-content.expanded {
        display: flex;
      }

      .bim-search-btn {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        border: none;
        color: #ffffff;
        font-size: 13px;
        font-weight: 600;
        padding: 9px 16px;
        border-radius: 6px;
        cursor: pointer;
        transition: transform 0.1s, opacity 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        margin-top: 6px;
      }

      .bim-search-btn:hover {
        opacity: 0.95;
      }

      .bim-search-btn:active {
        transform: scale(0.98);
      }

      .bim-search-btn:disabled {
        background: rgba(255, 255, 255, 0.08);
        color: #64748b;
        cursor: not-allowed;
      }

      .bim-search-results-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        padding-top: 12px;
      }

      .bim-search-results-header {
        font-size: 11px;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
        display: flex;
        justify-content: space-between;
      }

      .bim-search-results-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 240px;
        overflow-y: auto;
      }

      /* Scrollbar dos resultados */
      .bim-search-results-list::-webkit-scrollbar {
        width: 4px;
      }
      .bim-search-results-list::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }

      .bim-search-result-item {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        padding: 8px 10px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 3px;
        transition: background 0.2s, border-color 0.2s;
        text-align: left;
      }

      .bim-search-result-item:hover {
        background: rgba(59, 130, 246, 0.1);
        border-color: rgba(59, 130, 246, 0.3);
      }

      .bim-search-result-name {
        font-size: 12px;
        font-weight: 600;
        color: #f1f5f9;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .bim-search-result-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 10px;
        color: #94a3b8;
      }

      .bim-search-result-badge {
        background: rgba(59, 130, 246, 0.15);
        color: #60a5fa;
        padding: 1px 4px;
        border-radius: 4px;
        font-weight: 600;
        font-size: 9px;
      }

      .bim-search-result-id {
        font-family: monospace;
        color: #64748b;
      }

      .bim-search-pagination {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 6px;
        font-size: 11px;
        color: #94a3b8;
      }

      .bim-search-pag-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #e2e8f0;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 10px;
        transition: background 0.2s;
      }

      .bim-search-pag-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.1);
      }

      .bim-search-pag-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .bim-search-empty {
        text-align: center;
        padding: 16px;
        font-size: 12px;
        color: #64748b;
      }

      .bim-search-spinner {
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-top-color: #ffffff;
        border-radius: 50%;
        animation: bim-spin 0.8s linear infinite;
        display: inline-block;
      }

      @keyframes bim-spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  private async executeSearch(page = 1): Promise<void> {
    if (!this.activeModelVersionId) return;

    this.loading = true;
    this.error = null;
    this.currentPage = page;
    this.render();

    try {
      const pset: Record<string, any> = {};
      if (this.psetName.trim() && this.psetProp.trim()) {
        const pValRaw = this.psetValue.trim();
        let pVal: any = pValRaw;
        
        // Convert typing helper
        if (pValRaw.toLowerCase() === 'true') pVal = true;
        else if (pValRaw.toLowerCase() === 'false') pVal = false;
        else if (!isNaN(Number(pValRaw)) && pValRaw !== '') pVal = Number(pValRaw);
        
        pset[this.psetName.trim()] = {
          [this.psetProp.trim()]: pVal
        };
      }

      const offset = (page - 1) * this.itemsPerPage;
      const searchParams = {
        q: this.query.trim() || undefined,
        type: this.selectedType || undefined,
        pset: Object.keys(pset).length > 0 ? pset : undefined,
        limit: this.itemsPerPage,
        offset
      };

      const tStart = performance.now();
      const results = await BIMSearchAPIService.search(this.activeModelVersionId, searchParams);
      const tEnd = performance.now();
      console.log(`BIM Search executed in ${(tEnd - tStart).toFixed(2)}ms`);

      this.results = results;
    } catch (err: any) {
      console.error('BIM Search failure:', err);
      this.error = 'Falha na busca. Tente novamente.';
    } finally {
      this.loading = false;
      this.render();
    }
  }

  private render(): void {
    if (!this.panelEl) return;

    if (this.isCollapsed) {
      this.panelEl.classList.add('collapsed');
      this.panelEl.innerHTML = `
        <div class="bim-search-toggle" title="Buscar Elementos BIM (IFC)">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
      `;

      const toggleBtn = this.panelEl.querySelector('.bim-search-toggle');
      toggleBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isCollapsed = false;
        this.render();
      });
      return;
    }

    this.panelEl.classList.remove('collapsed');

    // Build the expanded panel HTML
    let bodyHtml = '';

    if (!this.activeModelVersionId) {
      bodyHtml = `
        <div class="bim-search-empty">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:8px; opacity:0.5;">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
          <p>Nenhum modelo ativo carregado no visualizador.</p>
        </div>
      `;
    } else {
      const ifcTypes = [
        'IfcWall', 'IfcWallStandardCase', 'IfcSlab', 'IfcWindow', 'IfcDoor', 
        'IfcColumn', 'IfcBeam', 'IfcMember', 'IfcFooting', 'IfcRoof', 
        'IfcSpace', 'IfcCovering', 'IfcStair', 'IfcRailing', 'IfcFlowTerminal', 
        'IfcPipeSegment', 'IfcDistributionElement', 'IfcFurnishingElement'
      ];

      bodyHtml = `
        <div class="bim-search-group">
          <label class="bim-search-label" for="bim-search-q-input">Texto / GUID</label>
          <input type="text" id="bim-search-q-input" class="bim-search-input" placeholder="Nome, expressID ou GUID..." value="${this.query}">
        </div>

        <div class="bim-search-group">
          <label class="bim-search-label" for="bim-search-type-select">Classe IFC</label>
          <select id="bim-search-type-select" class="bim-search-select">
            <option value="">Qualquer Classe</option>
            ${ifcTypes.map(t => `<option value="${t}" ${this.selectedType === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>

        <div class="bim-search-accordion-toggle" id="bim-search-pset-toggle">
          <span>Filtrar por Propriedades (Psets)</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: ${this.psetExpanded ? 'rotate(180deg)' : 'rotate(0)'}; transition: transform 0.2s;">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>

        <div class="bim-search-accordion-content ${this.psetExpanded ? 'expanded' : ''}">
          <div class="bim-search-group">
            <label class="bim-search-label" for="bim-search-pset-name">Property Set</label>
            <input type="text" id="bim-search-pset-name" class="bim-search-input" placeholder="ex: Pset_WallCommon" value="${this.psetName}">
          </div>
          <div class="bim-search-group">
            <label class="bim-search-label" for="bim-search-pset-prop">Propriedade</label>
            <input type="text" id="bim-search-pset-prop" class="bim-search-input" placeholder="ex: LoadBearing" value="${this.psetProp}">
          </div>
          <div class="bim-search-group">
            <label class="bim-search-label" for="bim-search-pset-value">Valor</label>
            <input type="text" id="bim-search-pset-value" class="bim-search-input" placeholder="ex: true ou 12.5" value="${this.psetValue}">
          </div>
        </div>

        <button class="bim-search-btn" id="bim-search-submit-btn" ${this.loading ? 'disabled' : ''}>
          ${this.loading ? '<span class="bim-search-spinner"></span> Pesquisando...' : 'Buscar Elementos'}
        </button>

        ${this.error ? `<div class="bim-search-empty" style="color:#f87171">${this.error}</div>` : ''}

        ${!this.loading && !this.error && this.results.length > 0 ? this.renderResultsSection() : ''}
        ${!this.loading && !this.error && this.results.length === 0 && (this.query || this.selectedType || this.psetName) ? `<div class="bim-search-empty">Nenhum elemento encontrado.</div>` : ''}
      `;
    }

    this.panelEl.innerHTML = `
      <div class="bim-search-header">
        <div class="bim-search-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span>Busca BIM</span>
        </div>
        <button class="bim-search-close-btn" title="Minimizar Busca">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="bim-search-body">
        ${bodyHtml}
      </div>
    `;

    // Hook up expanded panel events
    const closeBtn = this.panelEl.querySelector('.bim-search-close-btn');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isCollapsed = true;
      this.render();
    });

    if (this.activeModelVersionId) {
      const qInput = this.panelEl.querySelector('#bim-search-q-input') as HTMLInputElement;
      const typeSelect = this.panelEl.querySelector('#bim-search-type-select') as HTMLSelectElement;
      const psetToggle = this.panelEl.querySelector('#bim-search-pset-toggle');
      const submitBtn = this.panelEl.querySelector('#bim-search-submit-btn');

      // Bind input values to local state on change
      qInput?.addEventListener('input', () => { this.query = qInput.value; });
      typeSelect?.addEventListener('change', () => { this.selectedType = typeSelect.value; });
      
      // Property set input changes
      const psetNameInput = this.panelEl.querySelector('#bim-search-pset-name') as HTMLInputElement;
      const psetPropInput = this.panelEl.querySelector('#bim-search-pset-prop') as HTMLInputElement;
      const psetValueInput = this.panelEl.querySelector('#bim-search-pset-value') as HTMLInputElement;

      psetNameInput?.addEventListener('input', () => { this.psetName = psetNameInput.value; });
      psetPropInput?.addEventListener('input', () => { this.psetProp = psetPropInput.value; });
      psetValueInput?.addEventListener('input', () => { this.psetValue = psetValueInput.value; });

      // Trigger search on Enter inside inputs
      const triggerSearchOnEnter = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          this.executeSearch(1);
        }
      };
      qInput?.addEventListener('keydown', triggerSearchOnEnter);
      psetNameInput?.addEventListener('keydown', triggerSearchOnEnter);
      psetPropInput?.addEventListener('keydown', triggerSearchOnEnter);
      psetValueInput?.addEventListener('keydown', triggerSearchOnEnter);

      // Accordion toggle
      psetToggle?.addEventListener('click', () => {
        this.psetExpanded = !this.psetExpanded;
        this.render();
      });

      // Search submit
      submitBtn?.addEventListener('click', () => {
        this.executeSearch(1);
      });

      // Pagination events
      const prevBtn = this.panelEl.querySelector('#bim-search-prev-btn');
      const nextBtn = this.panelEl.querySelector('#bim-search-next-btn');

      prevBtn?.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.executeSearch(this.currentPage - 1);
        }
      });

      nextBtn?.addEventListener('click', () => {
        this.executeSearch(this.currentPage + 1);
      });

      // Result click events
      const resultItems = this.panelEl.querySelectorAll('.bim-search-result-item');
      resultItems.forEach(item => {
        item.addEventListener('click', () => {
          const expressIdAttr = item.getAttribute('data-express-id');
          if (expressIdAttr) {
            const expressId = parseInt(expressIdAttr, 10);
            if (!isNaN(expressId)) {
              // Click selects the object
              this.viewerHost.selectByExpressId(expressId);
              // Camera focus on object
              this.viewerHost.focusOnObject(expressId);
            }
          }
        });
      });
    }
  }

  private renderResultsSection(): string {
    const listHtml = this.results.map(elem => {
      // Clean type label
      const shortType = elem.ifcType.replace('Ifc', '').toUpperCase();
      // Compile metadata summary
      const metaParts: string[] = [];
      if (elem.areaM2) metaParts.push(`${parseFloat(elem.areaM2).toFixed(1)} m²`);
      if (elem.volumeM3) metaParts.push(`${parseFloat(elem.volumeM3).toFixed(1)} m³`);
      if (elem.lengthM) metaParts.push(`${parseFloat(elem.lengthM).toFixed(1)} m`);

      const metadataString = metaParts.length > 0 ? ` · ${metaParts.join(' · ')}` : '';

      return `
        <div class="bim-search-result-item" data-express-id="${elem.expressId}">
          <div class="bim-search-result-name">${elem.name || 'Sem Nome'}</div>
          <div class="bim-search-result-meta">
            <span class="bim-search-result-badge">${shortType}</span>
            <span class="bim-search-result-id">#${elem.expressId}</span>
            <span>${metadataString}</span>
          </div>
        </div>
      `;
    }).join('');

    // Pagination status
    const hasNext = this.results.length === this.itemsPerPage && (this.currentPage * this.itemsPerPage < 200);
    const hasPrev = this.currentPage > 1;

    return `
      <div class="bim-search-results-section">
        <div class="bim-search-results-header">
          <span>Resultados</span>
          <span>Página ${this.currentPage}</span>
        </div>
        <div class="bim-search-results-list">
          ${listHtml}
        </div>
        <div class="bim-search-pagination">
          <button class="bim-search-pag-btn" id="bim-search-prev-btn" ${!hasPrev ? 'disabled' : ''}>Anterior</button>
          <span>Pág. ${this.currentPage}</span>
          <button class="bim-search-pag-btn" id="bim-search-next-btn" ${!hasNext ? 'disabled' : ''}>Próximo</button>
        </div>
      </div>
    `;
  }

  public destroy(): void {
    eventBus.off('ifc:loaded', this.onIfcLoadedBind);
    this.panelEl?.remove();
    this.panelEl = null;
  }
}
