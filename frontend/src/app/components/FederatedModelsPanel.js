import { tenantService } from '../../api/v1/services/tenant.service';

class FederatedModelsPanel {
  constructor() {
    this.isOpen = false;
    this.projectId = null;
    this.federatedModels = [];
    this.ifcModels = [];
    this.selectedFederated = null;
    this.loading = false;
    this.error = null;
    this.showCreateInput = false;
    this.showAddModelInput = false;
  }

  open(projectId) {
    this.projectId = projectId;
    this.isOpen = true;
    this.loadFederatedModels();
    this.loadIFCModels();
    this.render();
  }

  close() {
    this.isOpen = false;
    this.render();
  }

  async loadFederatedModels() {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      this.federatedModels = await tenantService.getFederatedModels(this.projectId);
    } catch (err) {
      this.error = 'Failed to load federated models';
      console.error('Failed to load federated models:', err);
    } finally {
      this.loading = false;
      this.render();
    }
  }

  async loadIFCModels() {
    try {
      this.ifcModels = await tenantService.getIFCModels(this.projectId);
    } catch (err) {
      console.error('Failed to load IFC models:', err);
    }
  }

  async createFederatedModel() {
    this.showCreateInput = true;
    this.render();
  }

  async confirmCreateFederatedModel(data) {
    if (!data.name) {
      this.showCreateInput = false;
      this.render();
      return;
    }

    this.loading = true;
    this.error = null;
    this.showCreateInput = false;
    this.render();

    try {
      const newFederated = await tenantService.createFederatedModel(this.projectId, {
        name: data.name,
        description: data.description,
        modelReferences: [],
      });
      this.federatedModels.push(newFederated);
      this.selectedFederated = newFederated.id;
      this.loading = false;
      this.render();
    } catch (err) {
      this.error = 'Failed to create federated model';
      console.error('Failed to create federated model:', err);
      this.loading = false;
      this.render();
    }
  }

  async addModelToFederated(federatedId) {
    if (this.ifcModels.length === 0) {
      this.error = 'Nenhum modelo IFC disponível. Faça upload primeiro.';
      this.render();
      return;
    }

    this.showAddModelInput = true;
    this.selectedFederatedForAdd = federatedId;
    this.render();
  }

  async confirmAddModelToFederated(ifcModelId) {
    if (!ifcModelId) {
      this.showAddModelInput = false;
      this.render();
      return;
    }

    const selectedModel = this.ifcModels.find(m => m.id === ifcModelId);
    if (!selectedModel) {
      this.error = 'Seleção inválida';
      this.showAddModelInput = false;
      this.render();
      return;
    }

    this.loading = true;
    this.error = null;
    this.showAddModelInput = false;
    this.render();

    try {
      await tenantService.addModelToFederated(this.selectedFederatedForAdd, {
        ifcModelId: selectedModel.id,
      });
      await this.loadFederatedModels();
    } catch (err) {
      this.error = 'Failed to add model to federated model';
      console.error('Failed to add model:', err);
      this.loading = false;
      this.render();
    }
  }

  async removeModelFromFederated(federatedId, ifcModelId) {
    // TODO: Add custom confirmation UI
    this.loading = true;
    this.error = null;
    this.render();

    try {
      await tenantService.removeModelFromFederated(federatedId, ifcModelId);
      await this.loadFederatedModels();
    } catch (err) {
      this.error = 'Failed to remove model';
      console.error('Failed to remove model:', err);
      this.loading = false;
      this.render();
    }
  }

  async deleteFederatedModel(federatedId) {
    // TODO: Add custom confirmation UI
    this.loading = true;
    this.error = null;
    this.render();

    try {
      await tenantService.deleteFederatedModel(federatedId);
      await this.loadFederatedModels();
      if (this.selectedFederated === federatedId) {
        this.selectedFederated = null;
      }
    } catch (err) {
      this.error = 'Failed to delete federated model';
      console.error('Failed to delete federated model:', err);
      this.loading = false;
      this.render();
    }
  }

  selectFederated(federatedId) {
    this.selectedFederated = federatedId;
    this.render();
  }

  render() {
    let container = document.getElementById('federated-models-panel-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'federated-models-panel-container';
      document.body.appendChild(container);
    }

    if (!this.isOpen) {
      container.innerHTML = '';
      return;
    }

    const selectedFederated = this.federatedModels.find(f => f.id === this.selectedFederated);

    let html = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      ">
        <div style="
          background: var(--bg-primary);
          border-radius: 12px;
          padding: 32px;
          width: 900px;
          max-width: 95%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
            <h2 style="margin: 0; font-size: 24px; color: var(--text-primary);">
              Modelos Federados
            </h2>
            <button id="federated-close" style="
              background: none;
              border: none;
              color: var(--text-secondary);
              font-size: 24px;
              cursor: pointer;
              padding: 0;
              width: 32px;
              height: 32px;
            ">×</button>
          </div>
    `;

    if (this.error) {
      html += `
        <div style="
          padding: 12px;
          background: var(--accent-red);
          color: white;
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 14px;
        ">
          ${this.error}
        </div>
      `;
    }

    // List of federated models
    html += `
      <div style="margin-bottom: 24px;">
        <button id="federated-create" style="
          padding: 8px 16px;
          background: var(--accent-blue);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">+ Criar Modelo Federado</button>
      </div>

      <div style="display: flex; gap: 16px; margin-bottom: 24px;">
        <div style="flex: 1; border: 1px solid var(--border-color); border-radius: 8px; padding: 16px;">
          <h3 style="margin: 0 0 16px 0; font-size: 16px; color: var(--text-primary);">Modelos Federados</h3>
    `;

    if (this.showCreateInput) {
      html += `
        <div style="padding: 12px; background: var(--bg-secondary); border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 13px; color: var(--text-primary); margin-bottom: 8px;">Criar Modelo Federado</div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <input type="text" id="federated-name" placeholder="Nome" style="
              padding: 8px;
              border: 1px solid var(--border-color);
              border-radius: 4px;
              background: var(--bg-primary);
              color: var(--text-primary);
              font-size: 13px;
            " />
            <input type="text" id="federated-desc" placeholder="Descrição (opcional)" style="
              padding: 8px;
              border: 1px solid var(--border-color);
              border-radius: 4px;
              background: var(--bg-primary);
              color: var(--text-primary);
              font-size: 13px;
            " />
            <div style="display: flex; gap: 8px;">
              <button id="federated-create-confirm" style="
                padding: 8px 16px;
                background: var(--accent-blue);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
              ">Criar</button>
              <button id="federated-create-cancel" style="
                padding: 8px 16px;
                background: var(--bg-secondary);
                color: var(--text-primary);
                border: 1px solid var(--border-color);
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
              ">Cancelar</button>
            </div>
          </div>
        </div>
      `;
    }

    if (this.loading) {
      html += `<p style="color: var(--text-secondary);">Carregando...</p>`;
    } else if (this.federatedModels.length === 0) {
      html += `<p style="color: var(--text-secondary);">Nenhum modelo federado</p>`;
    } else {
      this.federatedModels.forEach(federated => {
        html += `
          <div style="
            padding: 12px;
            border: 1px solid ${this.selectedFederated === federated.id ? 'var(--accent-blue)' : 'var(--border-color)'};
            border-radius: 6px;
            margin-bottom: 8px;
            cursor: pointer;
            background: ${this.selectedFederated === federated.id ? 'var(--bg-secondary)' : 'transparent'};
          " class="federated-item" data-id="${federated.id}">
            <div style="font-weight: 600; color: var(--text-primary);">${federated.name}</div>
            <div style="font-size: 12px; color: var(--text-secondary);">${federated.models?.length || 0} modelos</div>
          </div>
        `;
      });
    }

    html += `
        </div>
    `;

    // Selected federated model details
    if (selectedFederated) {
      html += `
        <div style="flex: 1; border: 1px solid var(--border-color); border-radius: 8px; padding: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0; font-size: 16px; color: var(--text-primary);">${selectedFederated.name}</h3>
            <button class="federated-delete" data-id="${selectedFederated.id}" style="
              padding: 4px 8px;
              background: var(--accent-red);
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 12px;
            ">Deletar</button>
          </div>
          <button class="federated-add-model" data-id="${selectedFederated.id}" style="
            width: 100%;
            padding: 8px;
            background: var(--bg-secondary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            margin-bottom: 16px;
          ">+ Adicionar Modelo IFC</button>
      `;

      if (this.showAddModelInput && this.selectedFederatedForAdd === selectedFederated.id) {
        html += `
          <div style="padding: 12px; background: var(--bg-secondary); border-radius: 6px; margin-bottom: 16px;">
            <div style="font-size: 13px; color: var(--text-primary); margin-bottom: 8px;">Selecione o modelo IFC:</div>
            <select id="federated-add-model-select" style="
              width: 100%;
              padding: 8px;
              border: 1px solid var(--border-color);
              border-radius: 4px;
              background: var(--bg-primary);
              color: var(--text-primary);
              font-size: 13px;
              margin-bottom: 8px;
            ">
              <option value="">Selecione...</option>
              ${this.ifcModels.map(m => `<option value="${m.id}">${m.name} (${m.id.substring(0, 8)}...)</option>`).join('')}
            </select>
            <div style="display: flex; gap: 8px;">
              <button id="federated-add-model-confirm" style="
                padding: 8px 16px;
                background: var(--accent-blue);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
              ">Adicionar</button>
              <button id="federated-add-model-cancel" style="
                padding: 8px 16px;
                background: var(--bg-secondary);
                color: var(--text-primary);
                border: 1px solid var(--border-color);
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
              ">Cancelar</button>
            </div>
          </div>
        `;
      }

      if (selectedFederated.models && selectedFederated.models.length > 0) {
        html += `<div style="max-height: 300px; overflow-y: auto;">`;
        selectedFederated.models.forEach(model => {
          html += `
            <div style="
              padding: 12px;
              border: 1px solid var(--border-color);
              border-radius: 6px;
              margin-bottom: 8px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            ">
              <div>
                <div style="font-size: 13px; color: var(--text-primary);">${model.ifcModelId.substring(0, 8)}...</div>
                <div style="font-size: 11px; color: var(--text-secondary);">
                  ${model.transformation ? `Pos: (${model.transformation.position.x}, ${model.transformation.position.y}, ${model.transformation.position.z})` : 'Sem transformação'}
                </div>
              </div>
              <button class="federated-remove-model" data-federated="${selectedFederated.id}" data-model="${model.ifcModelId}" style="
                padding: 4px 8px;
                background: var(--accent-red);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
              ">Remover</button>
            </div>
          `;
        });
        html += `</div>`;
      } else {
        html += `<p style="color: var(--text-secondary);">Nenhum modelo adicionado</p>`;
      }

      html += `
        </div>
      `;
    } else {
      html += `
        <div style="flex: 1; border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; display: flex; align-items: center; justify-content: center;">
          <p style="color: var(--text-secondary);">Selecione um modelo federado</p>
        </div>
      `;
    }

    html += `
      </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Attach event listeners
    document.getElementById('federated-close')?.addEventListener('click', () => this.close());
    document.getElementById('federated-create')?.addEventListener('click', () => this.createFederatedModel());

    // Create federated input handlers
    document.getElementById('federated-create-confirm')?.addEventListener('click', () => {
      const name = document.getElementById('federated-name')?.value;
      const description = document.getElementById('federated-desc')?.value;
      this.confirmCreateFederatedModel({ name, description });
    });
    document.getElementById('federated-create-cancel')?.addEventListener('click', () => {
      this.showCreateInput = false;
      this.render();
    });

    // Add model input handlers
    document.getElementById('federated-add-model-confirm')?.addEventListener('click', () => {
      const ifcModelId = document.getElementById('federated-add-model-select')?.value;
      this.confirmAddModelToFederated(ifcModelId);
    });
    document.getElementById('federated-add-model-cancel')?.addEventListener('click', () => {
      this.showAddModelInput = false;
      this.render();
    });

    container.querySelectorAll('.federated-item').forEach(item => {
      item.addEventListener('click', () => this.selectFederated(item.dataset.id));
    });

    container.querySelectorAll('.federated-delete').forEach(btn => {
      btn.addEventListener('click', () => this.deleteFederatedModel(btn.dataset.id));
    });

    container.querySelectorAll('.federated-add-model').forEach(btn => {
      btn.addEventListener('click', () => this.addModelToFederated(btn.dataset.id));
    });

    container.querySelectorAll('.federated-remove-model').forEach(btn => {
      btn.addEventListener('click', () => this.removeModelFromFederated(btn.dataset.federated, btn.dataset.model));
    });

    // Close on backdrop click
    container.querySelector('div').addEventListener('click', (e) => {
      if (e.target === container.querySelector('div')) {
        this.close();
      }
    });
  }
}

export { FederatedModelsPanel };
