/**
 * FederationPanel - Painel de gerenciamento de modelos federados
 * Permite carregar, visualizar e coordenar múltiplos arquivos IFC
 */

import type { FederatedLoader, FederatedModel, ModelDiscipline, ConstructionPhase } from '../../../../systems/model/FederatedLoader';

export class FederationPanel {
  private container?: HTMLElement;
  private federatedLoader?: FederatedLoader;
  private models: FederatedModel[] = [];

  /**
   * Define o FederatedLoader
   */
  public setFederatedLoader(loader: FederatedLoader): void {
    this.federatedLoader = loader;
    this.refreshModelList();
  }

  /**
   * Abre o painel
   */
  public open(): void {
    if (this.container) {
      this.container.style.display = 'block';
      return;
    }

    this.createPanel();
  }

  /**
   * Fecha o painel
   */
  public close(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
   * Cria o painel HTML
   */
  private createPanel(): void {
    this.container = document.createElement('div');
    this.container.className = 'federation-panel';
    this.container.innerHTML = `
      <div class="federation-panel__header">
        <h2>
          <i class="iconoir-3d-select-solid"></i>
          Modelos Federados
        </h2>
        <button class="federation-panel__close" title="Fechar">
          <i class="iconoir-xmark"></i>
        </button>
      </div>

      <div class="federation-panel__content">
        <!-- Upload Section -->
        <div class="federation-panel__upload">
          <button class="federation-panel__upload-btn" id="addModelsBtn">
            <i class="iconoir-plus"></i>
            Adicionar Modelos IFC
          </button>
          <input
            type="file"
            id="fileInput"
            accept=".ifc"
            multiple
            style="display: none;"
          />
          <p class="federation-panel__help">
            Carregue múltiplos arquivos IFC (Arquitetura, Estrutura, MEP, etc.)
          </p>
        </div>

        <!-- Filters -->
        <div class="federation-panel__filters">
          <h3>Filtros de Visualização</h3>
          
          <div class="filter-group">
            <label>Por Disciplina:</label>
            <div class="filter-chips" id="disciplineFilters">
              <!-- Preenchido dinamicamente -->
            </div>
          </div>

          <div class="filter-group">
            <label>Por Fase:</label>
            <div class="filter-chips" id="phaseFilters">
              <!-- Preenchido dinamicamente -->
            </div>
          </div>

          <div class="filter-actions">
            <button id="showAllBtn" class="btn-secondary">Mostrar Todos</button>
            <button id="hideAllBtn" class="btn-secondary">Ocultar Todos</button>
            <button id="colorByDisciplineBtn" class="btn-secondary">Colorir por Disciplina</button>
          </div>
        </div>

        <!-- Model List -->
        <div class="federation-panel__models">
          <h3>Modelos Carregados (<span id="modelCount">0</span>)</h3>
          <div class="federation-panel__stats" id="statsContainer">
            <div class="stat">
              <span class="stat-label">Triângulos:</span>
              <span class="stat-value" id="totalTriangles">0</span>
            </div>
            <div class="stat">
              <span class="stat-label">Memória:</span>
              <span class="stat-value" id="totalMemory">0 MB</span>
            </div>
          </div>
          <ul class="model-list" id="modelList">
            <li class="model-list__empty">
              Nenhum modelo carregado
            </li>
          </ul>
        </div>

        <!-- Coordination Tools -->
        <div class="federation-panel__tools">
          <h3>Ferramentas de Coordenação</h3>
          <button id="detectClashesBtn" class="btn-primary">
            <i class="iconoir-warning-triangle"></i>
            Detectar Colisões
          </button>
          <button id="alignModelsBtn" class="btn-secondary">
            <i class="iconoir-align-center"></i>
            Alinhar Modelos
          </button>
          <button id="exportReportBtn" class="btn-secondary">
            <i class="iconoir-download"></i>
            Exportar Relatório
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
    this.attachEventListeners();
    this.initializeFilters();
  }

  /**
   * Anexa event listeners
   */
  private attachEventListeners(): void {
    if (!this.container) return;

    // Close button
    const closeBtn = this.container.querySelector('.federation-panel__close');
    closeBtn?.addEventListener('click', () => this.close());

    // Add models button
    const addBtn = this.container.querySelector('#addModelsBtn');
    const fileInput = this.container.querySelector('#fileInput') as HTMLInputElement;
    
    addBtn?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => this.handleFileSelection(e));

    // Filter buttons
    this.container.querySelector('#showAllBtn')?.addEventListener('click', () => this.showAll());
    this.container.querySelector('#hideAllBtn')?.addEventListener('click', () => this.hideAll());
    this.container.querySelector('#colorByDisciplineBtn')?.addEventListener('click', () => this.colorByDiscipline());

    // Tool buttons
    this.container.querySelector('#detectClashesBtn')?.addEventListener('click', () => this.detectClashes());
    this.container.querySelector('#alignModelsBtn')?.addEventListener('click', () => this.alignModels());
    this.container.querySelector('#exportReportBtn')?.addEventListener('click', () => this.exportReport());
  }

  /**
   * Inicializa filtros de disciplina e fase
   */
  private initializeFilters(): void {
    if (!this.container) return;

    // Disciplinas
    const disciplines = [
      { key: 'architecture', label: 'Arquitetura', color: '#E0E0E0' },
      { key: 'structure', label: 'Estrutura', color: '#FF6B6B' },
      { key: 'mep_electrical', label: 'Elétrica', color: '#FFD93D' },
      { key: 'mep_plumbing', label: 'Hidráulica', color: '#4ECDC4' },
      { key: 'mep_hvac', label: 'HVAC', color: '#95E1D3' },
      { key: 'mep_fire', label: 'Incêndio', color: '#FF6B9D' }
    ];

    const disciplineContainer = this.container.querySelector('#disciplineFilters');
    if (disciplineContainer) {
      disciplines.forEach((disc) => {
        const chip = document.createElement('button');
        chip.className = 'filter-chip active';
        chip.dataset.discipline = disc.key;
        chip.innerHTML = `
          <span class="filter-chip__dot" style="background: ${disc.color}"></span>
          ${disc.label}
        `;
        chip.addEventListener('click', () => this.toggleDiscipline(disc.key as ModelDiscipline, chip));
        disciplineContainer.appendChild(chip);
      });
    }

    // Fases
    const phases = [
      { key: 'existing', label: 'Existente' },
      { key: 'demolition', label: 'Demolição' },
      { key: 'new', label: 'Novo' },
      { key: 'renovation', label: 'Reforma' },
      { key: 'future', label: 'Futuro' }
    ];

    const phaseContainer = this.container.querySelector('#phaseFilters');
    if (phaseContainer) {
      phases.forEach((phase) => {
        const chip = document.createElement('button');
        chip.className = 'filter-chip active';
        chip.dataset.phase = phase.key;
        chip.textContent = phase.label;
        chip.addEventListener('click', () => this.togglePhase(phase.key as ConstructionPhase, chip));
        phaseContainer.appendChild(chip);
      });
    }
  }

  /**
   * Manipula seleção de arquivos
   */
  private async handleFileSelection(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    
    if (files.length === 0) return;

    console.log(`📂 ${files.length} arquivos selecionados`);

    if (!this.federatedLoader) {
      alert('FederatedLoader não está configurado. Configure-o primeiro.');
      return;
    }

    // Mostra loading
    this.showLoading(true);

    try {
      const result = await this.federatedLoader.loadFederatedModels(files, undefined, {
        autoAlign: true,
        detectClashes: false,
        colorByDiscipline: false
      });

      // Atualiza lista
      this.refreshModelList();

      // Mostra resultado
      if (result.success) {
        alert(`✅ ${result.modelsLoaded.length} modelos carregados com sucesso!\n\nTriângulos: ${result.totalTriangles.toLocaleString()}\nMemória: ${result.totalMemoryMB.toFixed(0)} MB\nTempo: ${(result.loadTime / 1000).toFixed(1)}s`);
      } else {
        alert(`⚠️ Alguns modelos falharam:\n\n${result.modelsFailed.join('\n')}`);
      }

    } catch (error) {
      console.error('Erro ao carregar modelos:', error);
      alert('❌ Erro ao carregar modelos. Verifique o console.');
    } finally {
      this.showLoading(false);
      input.value = ''; // Reset
    }
  }

  /**
   * Atualiza lista de modelos
   */
  private refreshModelList(): void {
    if (!this.federatedLoader || !this.container) return;

    this.models = this.federatedLoader.getFederatedModels();
    
    // Atualiza contador
    const countEl = this.container.querySelector('#modelCount');
    if (countEl) countEl.textContent = this.models.length.toString();

    // Atualiza stats
    const totalTriangles = this.models.reduce((sum, m) => sum + m.triangleCount, 0);
    const totalMemory = this.models.reduce((sum, m) => sum + m.estimatedMemoryMB, 0);

    const trianglesEl = this.container.querySelector('#totalTriangles');
    const memoryEl = this.container.querySelector('#totalMemory');

    if (trianglesEl) trianglesEl.textContent = totalTriangles.toLocaleString();
    if (memoryEl) memoryEl.textContent = `${totalMemory.toFixed(0)} MB`;

    // Atualiza lista
    const listEl = this.container.querySelector('#modelList');
    if (!listEl) return;

    if (this.models.length === 0) {
      listEl.innerHTML = '<li class="model-list__empty">Nenhum modelo carregado</li>';
      return;
    }

    listEl.innerHTML = this.models.map((model) => `
      <li class="model-item" data-model-id="${model.id}">
        <div class="model-item__header">
          <input
            type="checkbox"
            class="model-item__checkbox"
            ${model.visible ? 'checked' : ''}
            data-model-id="${model.id}"
          />
          <span class="model-item__discipline" style="background: ${this.getDisciplineColor(model.discipline)}"></span>
          <span class="model-item__name">${model.handle.displayName}</span>
        </div>
        <div class="model-item__meta">
          <span class="model-item__tag">${this.getDisciplineLabel(model.discipline)}</span>
          ${model.phase ? `<span class="model-item__tag">${this.getPhaseLabel(model.phase)}</span>` : ''}
          <span class="model-item__stat">${model.triangleCount.toLocaleString()} △</span>
          <span class="model-item__stat">${model.estimatedMemoryMB.toFixed(0)} MB</span>
        </div>
        <div class="model-item__actions">
          <button class="model-item__btn" data-action="isolate" data-model-id="${model.id}" title="Isolar">
            <i class="iconoir-eye"></i>
          </button>
          <button class="model-item__btn" data-action="focus" data-model-id="${model.id}" title="Focar">
            <i class="iconoir-target"></i>
          </button>
          <button class="model-item__btn" data-action="remove" data-model-id="${model.id}" title="Remover">
            <i class="iconoir-trash"></i>
          </button>
        </div>
      </li>
    `).join('');

    // Anexa listeners
    listEl.querySelectorAll('.model-item__checkbox').forEach((checkbox) => {
      checkbox.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const modelId = target.dataset.modelId;
        if (modelId) this.toggleModelVisibility(modelId, target.checked);
      });
    });

    listEl.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const action = target.dataset.action;
        const modelId = target.dataset.modelId;
        if (action && modelId) this.handleModelAction(action, modelId);
      });
    });
  }

  // Filter actions
  private toggleDiscipline(discipline: ModelDiscipline, chip: HTMLElement): void {
    chip.classList.toggle('active');
    const visible = chip.classList.contains('active');
    this.federatedLoader?.setDisciplineVisibility(discipline, visible);
  }

  private togglePhase(phase: ConstructionPhase, chip: HTMLElement): void {
    chip.classList.toggle('active');
    const visible = chip.classList.contains('active');
    this.federatedLoader?.setPhaseVisibility(phase, visible);
  }

  private showAll(): void {
    this.models.forEach((model) => {
      model.group.visible = true;
      model.visible = true;
    });
    this.refreshModelList();
  }

  private hideAll(): void {
    this.models.forEach((model) => {
      model.group.visible = false;
      model.visible = false;
    });
    this.refreshModelList();
  }

  private colorByDiscipline(): void {
    if (!this.federatedLoader) return;
    // A cor já é aplicada no FederatedLoader.applyDisciplineColors()
    console.log('🎨 Aplicando cores por disciplina...');
  }

  // Model actions
  private toggleModelVisibility(modelId: string, visible: boolean): void {
    const model = this.federatedLoader?.getModel(modelId);
    if (model) {
      model.group.visible = visible;
      model.visible = visible;
    }
  }

  private handleModelAction(action: string, modelId: string): void {
    const model = this.federatedLoader?.getModel(modelId);
    if (!model) return;

    switch (action) {
      case 'isolate':
        // Oculta todos exceto este
        this.models.forEach((m) => {
          m.group.visible = m.id === modelId;
          m.visible = m.id === modelId;
        });
        this.refreshModelList();
        break;

      case 'focus':
        // TODO: Frame camera on model bounds
        console.log('Focus:', modelId);
        break;

      case 'remove':
        if (confirm(`Remover modelo "${model.handle.displayName}"?`)) {
          this.federatedLoader?.removeModel(modelId);
          this.refreshModelList();
        }
        break;
    }
  }

  // Tool actions
  private async detectClashes(): Promise<void> {
    console.log('⚠️ Detectando colisões...');
    alert('Detecção de colisões será implementada em breve!');
  }

  private alignModels(): void {
    console.log('📐 Alinhando modelos...');
    alert('Os modelos já estão alinhados pela origem IFC!');
  }

  private exportReport(): void {
    console.log('📄 Exportando relatório...');
    
    const report = this.models.map((m) => ({
      nome: m.handle.displayName,
      disciplina: this.getDisciplineLabel(m.discipline),
      fase: m.phase ? this.getPhaseLabel(m.phase) : 'N/A',
      triangulos: m.triangleCount,
      memoria_mb: m.estimatedMemoryMB.toFixed(2)
    }));

    const csv = [
      'Nome,Disciplina,Fase,Triângulos,Memória (MB)',
      ...report.map((r) => `"${r.nome}",${r.disciplina},${r.fase},${r.triangulos},${r.memoria_mb}`)
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelos_federados.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Utilities
  private showLoading(show: boolean): void {
    // TODO: Implementar overlay de loading
    if (show) {
      console.log('⏳ Carregando...');
    } else {
      console.log('✅ Carregamento concluído');
    }
  }

  private getDisciplineColor(discipline: ModelDiscipline): string {
    const colors: Record<string, string> = {
      architecture: '#E0E0E0',
      structure: '#FF6B6B',
      mep_electrical: '#FFD93D',
      mep_plumbing: '#4ECDC4',
      mep_hvac: '#95E1D3',
      mep_fire: '#FF6B9D',
      landscape: '#6BCF7F',
      civil: '#8B4513',
      interior: '#B8A9C9',
      furniture: '#DEB887',
      site: '#A0522D',
      other: '#808080'
    };
    return colors[discipline] || '#808080';
  }

  private getDisciplineLabel(discipline: ModelDiscipline): string {
    const labels: Record<string, string> = {
      architecture: 'Arquitetura',
      structure: 'Estrutura',
      mep_electrical: 'Elétrica',
      mep_plumbing: 'Hidráulica',
      mep_hvac: 'HVAC',
      mep_fire: 'Incêndio',
      landscape: 'Paisagismo',
      civil: 'Civil',
      interior: 'Interior',
      furniture: 'Mobiliário',
      site: 'Terreno',
      other: 'Outro'
    };
    return labels[discipline] || 'Outro';
  }

  private getPhaseLabel(phase: ConstructionPhase): string {
    const labels: Record<string, string> = {
      existing: 'Existente',
      demolition: 'Demolição',
      new: 'Novo',
      renovation: 'Reforma',
      future: 'Futuro'
    };
    return labels[phase] || phase;
  }

  /**
   * Lifecycle methods
   */
  public mount(): void {
    this.open();
  }

  public destroy(): void {
    if (this.container?.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
    this.container = undefined;
  }

  public get element(): HTMLElement | undefined {
    return this.container;
  }
}
