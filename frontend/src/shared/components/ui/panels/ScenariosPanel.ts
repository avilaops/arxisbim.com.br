/**
 * ScenariosPanel - Lista, salva e aplica cenários 3D do projeto ativo.
 */

import { uiStore } from '../../../../app/state/uiStore';
import { getNotificationSystem } from '../NotificationSystem';
import {
  getScenariosService,
  type ScenarioPresetId,
  type ScenarioRecord,
} from '../../../../api/v1/services/scenarios.service';

interface PresetOption {
  id: ScenarioPresetId;
  label: string;
  description: string;
}

const PRESETS: PresetOption[] = [
  { id: 'guided-tour', label: 'Apresentação', description: 'Câmera e narrativa para tour arquitetônico.' },
  { id: 'bim-coordination', label: 'Coordenação BIM', description: 'Revisão técnica de disciplinas e modelo federado.' },
  { id: 'construction-4d', label: 'Sequência 4D', description: 'Cena orientada a fases e planejamento de obra.' },
  { id: 'clash-review', label: 'Interferências', description: 'Ambiente para análise de clashes e decisões.' },
  { id: 'cost-review', label: 'Custos 5D', description: 'Visualização de quantitativos e orçamento.' },
];

export class ScenariosPanel {
  private container: HTMLElement;
  private scenarios: ScenarioRecord[] = [];
  private loading = false;
  private error: string | null = null;
  private projectId: string | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.projectId = this.resolveProjectId();
    this.render();
    void this.refresh();
  }

  public destroy(): void {
    this.container.innerHTML = '';
  }

  // ---------- Data ----------

  private async refresh(): Promise<void> {
    if (!this.projectId) {
      this.scenarios = [];
      this.render();
      return;
    }
    this.loading = true;
    this.error = null;
    this.render();
    try {
      const response = await getScenariosService().list({ projectId: this.projectId, limit: 100 });
      this.scenarios = response.data ?? [];
    } catch (err: any) {
      this.error = err?.message ?? 'Falha ao carregar cenários.';
      this.scenarios = [];
    } finally {
      this.loading = false;
      this.render();
    }
  }

  private async createCurrent(name: string, presetId?: ScenarioPresetId, description?: string): Promise<void> {
    if (!this.projectId) {
      getNotificationSystem().show('Selecione um projeto antes de salvar cenário.', 'warning');
      return;
    }
    const viewer = (window as any).__viewerHost;
    if (!viewer?.camera) {
      getNotificationSystem().show('Viewer indisponível.', 'error');
      return;
    }
    const cam = viewer.camera;
    const euler = cam.rotation;
    try {
      const saved = await getScenariosService().create({
        projectId: this.projectId,
        name: name.trim() || 'Cenário sem nome',
        description: description?.trim() || undefined,
        presetId,
        config: {
          initialPosition: { x: cam.position.x, y: cam.position.y, z: cam.position.z },
          initialRotation: { pitch: euler.x, yaw: euler.y, roll: euler.z },
          enableMinimap: true,
        },
      });
      getNotificationSystem().show(`Cenário "${saved.name}" salvo.`, 'success');
      await this.refresh();
    } catch (err: any) {
      getNotificationSystem().show(err?.message ?? 'Erro ao salvar cenário.', 'error');
    }
  }

  private async renameScenario(scenario: ScenarioRecord): Promise<void> {
    const next = prompt('Renomear cenário:', scenario.name);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === scenario.name) return;
    try {
      await getScenariosService().update(scenario.id, { name: trimmed });
      getNotificationSystem().show('Cenário renomeado.', 'success');
      await this.refresh();
    } catch (err: any) {
      getNotificationSystem().show(err?.message ?? 'Erro ao renomear.', 'error');
    }
  }

  private async deleteScenario(id: string): Promise<void> {
    if (!confirm('Excluir este cenário? Esta ação não pode ser desfeita.')) return;
    try {
      await getScenariosService().delete(id);
      getNotificationSystem().show('Cenário excluído.', 'success');
      await this.refresh();
    } catch (err: any) {
      getNotificationSystem().show(err?.message ?? 'Erro ao excluir cenário.', 'error');
    }
  }

  private applyScenario(scenario: ScenarioRecord): void {
    const viewer = (window as any).__viewerHost;
    if (!viewer?.camera) {
      getNotificationSystem().show('Viewer indisponível.', 'error');
      return;
    }
    const cfg = scenario.config ?? ({} as any);
    const pos = cfg.initialPosition ?? scenario.camera?.position;
    const rot = cfg.initialRotation ?? scenario.camera?.rotation;
    if (pos && typeof pos.x === 'number') {
      viewer.camera.position.set(pos.x, pos.y, pos.z);
    }
    if (rot && typeof rot.yaw === 'number') {
      viewer.camera.rotation.set(rot.pitch ?? 0, rot.yaw ?? 0, rot.roll ?? 0);
    }
    const fps = viewer.fpsControls;
    if (fps) {
      if (typeof cfg.movementSpeed === 'number') fps.moveSpeed = cfg.movementSpeed;
      if (typeof cfg.rotationSpeed === 'number') fps.rotateSpeed = cfg.rotationSpeed;
    }
    getNotificationSystem().show(`Cenário "${scenario.name}" aplicado.`, 'success');
  }

  // ---------- Render ----------

  private render(): void {
    const hasProject = !!this.projectId;

    this.container.innerHTML = `
      <div class="panel scenarios-panel">
        <div class="panel__section">
          <h3 class="panel__section-title">Nova cena</h3>
          <form class="scenarios-panel__create" id="scenario-create-form">
            <input
              type="text"
              id="scenario-name"
              class="scenarios-panel__input"
              placeholder="Nome da cena (ex.: Living showroom)"
              ${hasProject ? '' : 'disabled'}
              required
            />
            <textarea
              id="scenario-description"
              class="scenarios-panel__input scenarios-panel__textarea"
              placeholder="Objetivo, materiais, iluminação ou narrativa"
              rows="2"
              ${hasProject ? '' : 'disabled'}
            ></textarea>
            <select id="scenario-preset" class="scenarios-panel__input" ${hasProject ? '' : 'disabled'}>
              <option value="">Cena livre</option>
              ${PRESETS.map(p => `<option value="${p.id}">${p.label}</option>`).join('')}
            </select>
            <button type="submit" class="btn btn--primary btn--block" ${hasProject ? '' : 'disabled'}>
              Salvar cena atual
            </button>
          </form>
          ${hasProject
            ? ''
            : '<p class="panel__empty panel__empty--compact">Abra um projeto para salvar cenários.</p>'}
        </div>

        <div class="panel__section">
          <h3 class="panel__section-title">Presets profissionais</h3>
          <div class="scenarios-panel__presets">
            ${PRESETS.map(p => `
              <button type="button" class="scenarios-panel__preset-card" data-preset="${p.id}" ${hasProject ? '' : 'disabled'}>
                <strong>${this.escape(p.label)}</strong>
                <span>${this.escape(p.description)}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="panel__section">
          <div class="scenarios-panel__list-header">
            <h3 class="panel__section-title">Cenas salvas</h3>
            <button type="button" class="scenarios-panel__refresh" id="scenario-refresh" title="Atualizar">
              ↻
            </button>
          </div>
          <div class="panel__list" id="scenario-list">
            ${this.renderList()}
          </div>
        </div>
      </div>
    `;

    this.attach();
  }

  private renderList(): string {
    if (this.loading) {
      return `<div class="panel__empty panel__empty--compact">Carregando cenas…</div>`;
    }
    if (this.error) {
      return `<div class="panel__empty panel__empty--compact">${this.escape(this.error)}</div>`;
    }
    if (!this.scenarios.length) {
      return `<div class="panel__empty panel__empty--compact">Nenhuma cena salva neste projeto.</div>`;
    }
    return this.scenarios
      .map(
        (s) => `
        <div class="panel__list-item scenarios-panel__item" data-id="${s.id}">
          <div class="scenarios-panel__item-info">
            <strong class="scenarios-panel__item-name">${this.escape(s.name)}</strong>
            ${s.description ? `<span class="scenarios-panel__item-desc">${this.escape(s.description)}</span>` : ''}
            <span class="scenarios-panel__item-meta">${this.formatDate(s.createdAt)}</span>
          </div>
          <div class="scenarios-panel__item-actions">
            <button type="button" class="btn btn--small" data-action="apply" data-id="${s.id}" title="Abrir cena">
              Abrir
            </button>
            <button type="button" class="btn btn--small btn--ghost" data-action="rename" data-id="${s.id}" title="Renomear">
              ✎
            </button>
            <button type="button" class="btn btn--small btn--ghost" data-action="delete" data-id="${s.id}" title="Excluir">
              ✕
            </button>
          </div>
        </div>
      `,
      )
      .join('');
  }

  private formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const now = Date.now();
    const diff = Math.max(0, now - d.getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `há ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `há ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `há ${days} d`;
    return d.toLocaleDateString('pt-BR');
  }

  private attach(): void {
    const form = this.container.querySelector<HTMLFormElement>('#scenario-create-form');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameEl = this.container.querySelector<HTMLInputElement>('#scenario-name');
      const presetEl = this.container.querySelector<HTMLSelectElement>('#scenario-preset');
      const descEl = this.container.querySelector<HTMLTextAreaElement>('#scenario-description');
      const name = nameEl?.value ?? '';
      const preset = (presetEl?.value || undefined) as ScenarioPresetId | undefined;
      const description = descEl?.value ?? '';
      void this.createCurrent(name, preset, description);
    });

    this.container.querySelector('#scenario-refresh')?.addEventListener('click', () => {
      void this.refresh();
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = PRESETS.find((item) => item.id === btn.dataset.preset);
        if (!preset) return;
        const nameEl = this.container.querySelector<HTMLInputElement>('#scenario-name');
        const presetEl = this.container.querySelector<HTMLSelectElement>('#scenario-preset');
        const descEl = this.container.querySelector<HTMLTextAreaElement>('#scenario-description');
        if (nameEl && !nameEl.value.trim()) nameEl.value = preset.label;
        if (presetEl) presetEl.value = preset.id;
        if (descEl && !descEl.value.trim()) descEl.value = preset.description;
      });
    });

    this.container.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((btn) => {
      const id = btn.dataset.id!;
      const action = btn.dataset.action;
      btn.addEventListener('click', () => {
        const scenario = this.scenarios.find((s) => s.id === id);
        if (!scenario) return;
        if (action === 'apply') this.applyScenario(scenario);
        if (action === 'rename') void this.renameScenario(scenario);
        if (action === 'delete') void this.deleteScenario(id);
      });
    });
  }

  // ---------- Helpers ----------

  private resolveProjectId(): string | null {
    const state = uiStore.getState();
    const params = new URLSearchParams(window.location.search);
    return (
      params.get('projectId') ||
      params.get('project') ||
      localStorage.getItem('arxisvr_project_id') ||
      localStorage.getItem('arxisvr_current_project_id') ||
      (state.projectContext as any)?.projectId ||
      null
    );
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
