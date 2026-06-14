import { getAPIClient } from '../../api/v1/client.js';

export class CostManagementPanel {
  constructor() {
    this.isOpen = false;
    this.view = 'tables'; // 'tables' | 'items'
    this.tables = [];
    this.currentTable = null;
    this.items = [];
    this.loading = false;
    this.error = null;
    this.modalElement = null;
  }

  open() {
    this.isOpen = true;
    this.loadTables();
  }

  close() {
    this.isOpen = false;
    this.render();
  }

  async loadTables() {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      const client = getAPIClient();
      const res = await client.get('/cost-tables');
      this.tables = res.data;
    } catch (err) {
      this.error = 'Erro ao carregar tabelas de custo';
      console.error(err);
    } finally {
      this.loading = false;
      this.render();
    }
  }

  async loadItems(tableId) {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      const client = getAPIClient();
      const res = await client.get(`/cost-tables/${tableId}/items`);
      this.items = res.data;
      this.currentTable = this.tables.find(t => t.id === tableId);
      this.view = 'items';
    } catch (err) {
      this.error = 'Erro ao carregar itens';
      console.error(err);
    } finally {
      this.loading = false;
      this.render();
    }
  }

  backToTables() {
    this.view = 'tables';
    this.currentTable = null;
    this.items = [];
    this.render();
  }

  async createTable(name, description) {
    try {
      const client = getAPIClient();
      await client.post('/cost-tables', { name, description });
      await this.loadTables();
    } catch (err) {
      this.error = 'Erro ao criar tabela';
      console.error(err);
    }
  }

  async deleteTable(tableId) {
    if (!confirm('Remover tabela de custos?')) return;
    try {
      const client = getAPIClient();
      await client.delete(`/cost-tables/${tableId}`);
      await this.loadTables();
    } catch (err) {
      this.error = 'Erro ao remover tabela';
    }
  }

  render() {
    if (!this.isOpen) return;

    const content = this.view === 'tables'
      ? this.renderTablesList()
      : this.renderItemsList();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>${this.view === 'tables' ? 'Tabelas de Custo' : this.currentTable?.name}</h2>
          <button class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    `;

    modal.querySelector('.modal-close').addEventListener('click', () => this.close());

    // Remove old modal
    const oldModal = document.querySelector('.cost-mgmt-modal');
    if (oldModal) oldModal.remove();

    modal.id = 'cost-mgmt-modal';
    modal.className += ' cost-mgmt-modal';
    document.body.appendChild(modal);
    this.modalElement = modal;
  }

  renderTablesList() {
    if (this.loading) return '<p>Carregando...</p>';
    if (this.error) return `<p class="error">${this.error}</p>`;

    return `
      <div class="tables-list">
        ${this.tables.length === 0
          ? '<p>Nenhuma tabela criada</p>'
          : `<table>
              <thead>
                <tr><th>Nome</th><th>Descrição</th><th>Ações</th></tr>
              </thead>
              <tbody>
                ${this.tables.map(t => `
                  <tr>
                    <td>${t.name}</td>
                    <td>${t.description || '—'}</td>
                    <td>
                      <button onclick="window.__costMgmt.loadItems('${t.id}')">Itens</button>
                      <button onclick="window.__costMgmt.deleteTable('${t.id}')">Remover</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>`
        }
      </div>
    `;
  }

  renderItemsList() {
    return `
      <div class="items-list">
        <button onclick="window.__costMgmt.backToTables()" class="btn-back">← Voltar</button>
        ${this.items.length === 0
          ? '<p>Nenhum item</p>'
          : `<table>
              <thead>
                <tr><th>Código</th><th>Descrição</th><th>Unidade</th><th>Preço</th></tr>
              </thead>
              <tbody>
                ${this.items.map(i => `
                  <tr>
                    <td><code>${i.code}</code></td>
                    <td>${i.description}</td>
                    <td>${i.unit}</td>
                    <td>R$ ${parseFloat(i.unit_price).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>`
        }
      </div>
    `;
  }
}

// Global instance
if (typeof window !== 'undefined') {
  (window as any).__costMgmt = new CostManagementPanel();
}
