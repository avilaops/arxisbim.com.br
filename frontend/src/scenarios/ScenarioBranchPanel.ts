import { getScenariosService, ScenarioRecord } from '../api/v1/services/scenarios.service';

export class ScenarioBranchPanel {
  private container: HTMLElement;
  private projectId: string;
  private currentScenarioId: string;
  private panelEl: HTMLElement | null = null;
  private scenarios: ScenarioRecord[] = [];
  private onForkCallback: () => void;
  private onMergeCallback: () => void;

  constructor(
    container: HTMLElement,
    projectId: string,
    currentScenarioId: string,
    onFork: () => void,
    onMerge: () => void
  ) {
    this.container = container;
    this.projectId = projectId;
    this.currentScenarioId = currentScenarioId;
    this.onForkCallback = onFork;
    this.onMergeCallback = onMerge;

    this.init();
  }

  private async init(): Promise<void> {
    this.injectStyles();
    this.panelEl = document.createElement('div');
    this.panelEl.className = 'scenario-branch-panel';
    this.container.appendChild(this.panelEl);

    await this.refresh();
  }

  public async refresh(): Promise<void> {
    try {
      const service = getScenariosService();
      const response = await service.list({ projectId: this.projectId });
      this.scenarios = response.data;
      this.render();
    } catch (err) {
      console.error('Failed to load scenarios for branch panel', err);
    }
  }

  private injectStyles(): void {
    if (document.getElementById('scenario-branch-styles')) return;

    const style = document.createElement('style');
    style.id = 'scenario-branch-styles';
    style.textContent = `
      .scenario-branch-panel {
        background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 20px;
        color: #f8fafc;
        font-family: 'Inter', -apple-system, sans-serif;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        display: flex;
        flex-direction: column;
        gap: 16px;
        width: 100%;
        box-sizing: border-box;
      }

      .branch-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        padding-bottom: 12px;
      }

      .branch-panel-title {
        font-size: 16px;
        font-weight: 700;
        letter-spacing: -0.025em;
        background: linear-gradient(135deg, #a78bfa 0%, #c084fc 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      .branch-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 240px;
        overflow-y: auto;
        padding-right: 4px;
      }

      .branch-item {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 10px 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        transition: all 0.2s ease;
      }

      .branch-item:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.1);
        transform: translateY(-1px);
      }

      .branch-item.active {
        background: rgba(124, 58, 237, 0.1);
        border-color: rgba(124, 58, 237, 0.3);
      }

      .branch-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .branch-name {
        font-size: 13px;
        font-weight: 600;
        color: #f1f5f9;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .branch-desc {
        font-size: 11px;
        color: #94a3b8;
      }

      .badge {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        padding: 2px 6px;
        border-radius: 4px;
        letter-spacing: 0.05em;
      }

      .badge-base {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.3);
      }

      .badge-archived {
        background: rgba(239, 68, 68, 0.15);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.3);
      }

      .branch-actions {
        display: flex;
        gap: 8px;
      }

      .action-btn {
        background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);
      }

      .action-btn:hover {
        transform: scale(1.02);
        box-shadow: 0 4px 16px rgba(124, 58, 237, 0.4);
      }

      .action-btn.secondary {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #cbd5e1;
        box-shadow: none;
      }

      .action-btn.secondary:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }

      .branch-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }

      .branch-modal-overlay.open {
        opacity: 1;
        pointer-events: auto;
      }

      .branch-modal {
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 16px;
        width: 400px;
        padding: 24px;
        box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        gap: 16px;
        transform: scale(0.95);
        transition: transform 0.3s ease;
      }

      .branch-modal-overlay.open .branch-modal {
        transform: scale(1);
      }

      .branch-modal-title {
        font-size: 16px;
        font-weight: 700;
        color: #f1f5f9;
      }

      .branch-input-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .branch-input-label {
        font-size: 11px;
        font-weight: 600;
        color: #94a3b8;
      }

      .branch-input {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
        padding: 10px;
        color: white;
        font-size: 13px;
        font-family: inherit;
        outline: none;
        transition: all 0.2s ease;
      }

      .branch-input:focus {
        border-color: #7c3aed;
        background: rgba(255, 255, 255, 0.08);
      }

      .branch-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 12px;
      }
    `;
    document.head.appendChild(style);
  }

  private render(): void {
    if (!this.panelEl) return;

    const currentScenario = this.scenarios.find(s => s.id === this.currentScenarioId);
    const isBase = currentScenario?.isBaseScenario ?? false;
    const isArchived = !!(currentScenario as any)?.archivedAt;

    let listHtml = '';
    for (const sc of this.scenarios) {
      const isActive = sc.id === this.currentScenarioId;
      const isScBase = sc.isBaseScenario;
      const isScArchived = !!(sc as any).archivedAt;

      let badgeHtml = '';
      if (isScBase) badgeHtml = `<span class="badge badge-base">Base</span>`;
      else if (isScArchived) badgeHtml = `<span class="badge badge-archived">Arquivado</span>`;

      listHtml += `
        <div class="branch-item ${isActive ? 'active' : ''}">
          <div class="branch-info">
            <div class="branch-name">${sc.name} ${badgeHtml}</div>
            <div class="branch-desc">${sc.description || 'Sem descrição'}</div>
          </div>
          <div style="font-size: 12px; color: #64748b;">
            ${isActive ? '⚡ Atual' : ''}
          </div>
        </div>
      `;
    }

    this.panelEl.innerHTML = `
      <div class="branch-panel-header">
        <span class="branch-panel-title">🌿 Cenários & Branching</span>
      </div>
      <div class="branch-list">
        ${listHtml || '<div style="font-size:12px;color:#64748b;text-align:center;padding:12px;">Nenhum cenário</div>'}
      </div>
      <div class="branch-actions">
        <button class="action-btn" id="fork-scenario-btn" ${isArchived ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
          <span>🌿 Bifurcar (Fork)</span>
        </button>
        ${!isBase && !isArchived ? `
          <button class="action-btn secondary" id="merge-scenario-btn">
            <span>🤝 Promover a Baseline</span>
          </button>
        ` : ''}
      </div>
    `;

    // Bind fork button
    document.getElementById('fork-scenario-btn')?.addEventListener('click', () => {
      this.showForkModal();
    });

    // Bind merge button
    document.getElementById('merge-scenario-btn')?.addEventListener('click', () => {
      this.showMergeConfirm();
    });
  }

  private showForkModal(): void {
    // Create modal if not exists
    let overlay = document.getElementById('fork-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'fork-modal-overlay';
      overlay.className = 'branch-modal-overlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="branch-modal">
        <div class="branch-modal-title">🌿 Criar Nova Bifurcação (Fork)</div>
        <div class="branch-input-group">
          <label class="branch-input-label">Nome do Cenário</label>
          <input type="text" id="fork-name-input" class="branch-input" value="Bifurcação de ${this.scenarios.find(s => s.id === this.currentScenarioId)?.name || 'Cenário'}" />
        </div>
        <div class="branch-input-group">
          <label class="branch-input-label">Descrição</label>
          <textarea id="fork-desc-input" class="branch-input" style="height: 60px; resize: none;"></textarea>
        </div>
        <div class="branch-modal-actions">
          <button class="action-btn secondary" id="fork-cancel-btn">Cancelar</button>
          <button class="action-btn" id="fork-confirm-btn">Confirmar</button>
        </div>
      </div>
    `;

    overlay.classList.add('open');

    const close = () => overlay?.classList.remove('open');

    document.getElementById('fork-cancel-btn')?.addEventListener('click', close);
    document.getElementById('fork-confirm-btn')?.addEventListener('click', async () => {
      const name = (document.getElementById('fork-name-input') as HTMLInputElement).value;
      const desc = (document.getElementById('fork-desc-input') as HTMLTextAreaElement).value;

      if (!name.trim()) return;

      try {
        const service = getScenariosService();
        await service.fork(this.currentScenarioId, this.projectId, name, desc);
        close();
        await this.refresh();
        if (this.onForkCallback) this.onForkCallback();
      } catch (err) {
        alert('Erro ao duplicar cenário: ' + String(err));
      }
    });
  }

  private showMergeConfirm(): void {
    const confirmOverlay = document.createElement('div');
    confirmOverlay.className = 'branch-modal-overlay open';
    document.body.appendChild(confirmOverlay);

    confirmOverlay.innerHTML = `
      <div class="branch-modal" style="width: 420px;">
        <div class="branch-modal-title" style="color: #ef4444; display: flex; align-items: center; gap: 8px;">
          ⚠️ Confirmar Mesclagem (Merge)
        </div>
        <div style="font-size: 13px; color: #cbd5e1; line-height: 1.5;">
          Você está promovendo o cenário atual a <strong>Baseline</strong> do projeto. 
          Todos os outros cenários ativos serão desativados e arquivados para auditoria histórica. 
          Essa ação não pode ser desfeita.
        </div>
        <div class="branch-modal-actions">
          <button class="action-btn secondary" id="merge-cancel-btn">Cancelar</button>
          <button class="action-btn" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);" id="merge-confirm-btn">Confirmar e Promover</button>
        </div>
      </div>
    `;

    const close = () => {
      confirmOverlay.remove();
    };

    document.getElementById('merge-cancel-btn')?.addEventListener('click', close);
    document.getElementById('merge-confirm-btn')?.addEventListener('click', async () => {
      try {
        const service = getScenariosService();
        await service.merge(this.currentScenarioId, this.projectId);
        close();
        await this.refresh();
        if (this.onMergeCallback) this.onMergeCallback();
      } catch (err) {
        alert('Erro ao mesclar cenário: ' + String(err));
      }
    });
  }
}
