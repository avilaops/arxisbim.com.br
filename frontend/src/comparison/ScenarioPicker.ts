import { getScenariosService, ScenarioRecord } from '../api/v1/services/scenarios.service';

export class ScenarioPicker {
  private container: HTMLElement;
  private label: string;
  private value: string = '';
  private scenarios: ScenarioRecord[] = [];
  private selectEl: HTMLSelectElement | null = null;
  private onChangeCb: (scenario: ScenarioRecord | null) => void;

  constructor(container: HTMLElement, label: string, onChange: (scenario: ScenarioRecord | null) => void) {
    this.container = container;
    this.label = label;
    this.onChangeCb = onChange;

    this.init();
  }

  private async init(): Promise<void> {
    const wrapper = document.createElement('div');
    wrapper.className = 'scenario-picker-wrapper';
    wrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 14px;
    `;

    const labelEl = document.createElement('label');
    labelEl.textContent = this.label;
    labelEl.style.cssText = `
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;
    wrapper.appendChild(labelEl);

    this.selectEl = document.createElement('select');
    this.selectEl.className = 'scenario-picker-select';
    this.selectEl.style.cssText = `
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #f1f5f9;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 13px;
      outline: none;
      cursor: pointer;
      width: 100%;
      transition: border-color 0.2s;
    `;
    this.selectEl.innerHTML = `<option value="">Carregando cenários...</option>`;
    
    this.selectEl.addEventListener('change', () => {
      const selectedId = this.selectEl?.value;
      const found = this.scenarios.find(s => s.id === selectedId) || null;
      this.onChangeCb(found);
    });

    wrapper.appendChild(this.selectEl);
    this.container.appendChild(wrapper);

    await this.loadScenarios();
  }

  private async loadScenarios(): Promise<void> {
    const projectId = localStorage.getItem('arxisvr_project_id') || '';
    if (!projectId) {
      if (this.selectEl) {
        this.selectEl.innerHTML = `<option value="">Nenhum projeto selecionado</option>`;
      }
      return;
    }

    try {
      const service = getScenariosService();
      const res = await service.list(projectId);
      this.scenarios = res.data || [];

      if (this.selectEl) {
        if (this.scenarios.length === 0) {
          this.selectEl.innerHTML = `<option value="">Nenhum cenário cadastrado</option>`;
        } else {
          this.selectEl.innerHTML = `
            <option value="">Selecione um cenário...</option>
            ${this.scenarios.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
          `;
        }
      }
    } catch (err) {
      console.error('[ScenarioPicker] Failed to load scenarios:', err);
      if (this.selectEl) {
        this.selectEl.innerHTML = `<option value="">Erro ao carregar</option>`;
      }
    }
  }

  public getElement(): HTMLElement {
    return this.selectEl as HTMLElement;
  }
}
