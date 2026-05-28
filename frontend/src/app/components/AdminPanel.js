import { tenantService } from '../../api/v1/services/tenant.service';

class AdminPanel {
  constructor() {
    this.isOpen = false;
    this.currentView = 'tenants'; // 'tenants', 'companies', 'projects'
    this.tenants = [];
    this.companies = [];
    this.projects = [];
    this.selectedTenant = null;
    this.selectedCompany = null;
    this.loading = false;
    this.error = null;
  }

  open() {
    this.isOpen = true;
    this.loadTenants();
    this.render();
  }

  close() {
    this.isOpen = false;
    this.render();
  }

  setView(view) {
    this.currentView = view;
    this.error = null;
    this.render();
  }

  async loadTenants() {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      this.tenants = await tenantService.getTenants();
    } catch (err) {
      this.error = 'Failed to load tenants';
      console.error('Failed to load tenants:', err);
    } finally {
      this.loading = false;
      this.render();
    }
  }

  async loadCompanies(tenantId) {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      this.companies = await tenantService.getCompanies(tenantId);
    } catch (err) {
      this.error = 'Failed to load companies';
      console.error('Failed to load companies:', err);
    } finally {
      this.loading = false;
      this.render();
    }
  }

  async loadProjects(companyId) {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      this.projects = await tenantService.getCompanyProjects(companyId);
    } catch (err) {
      this.error = 'Failed to load projects';
      console.error('Failed to load projects:', err);
    } finally {
      this.loading = false;
      this.render();
    }
  }

  async createTenant(data) {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      await tenantService.createTenant(data);
      await this.loadTenants();
    } catch (err) {
      this.error = 'Failed to create tenant';
      console.error('Failed to create tenant:', err);
      this.loading = false;
      this.render();
    }
  }

  async updateTenant(tenantId, data) {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      await tenantService.updateTenant(tenantId, data);
      await this.loadTenants();
    } catch (err) {
      this.error = 'Failed to update tenant';
      console.error('Failed to update tenant:', err);
      this.loading = false;
      this.render();
    }
  }

  async deleteTenant(tenantId) {
    if (!confirm('Tem certeza que deseja deletar este tenant?')) return;

    this.loading = true;
    this.error = null;
    this.render();

    try {
      await tenantService.deleteTenant(tenantId);
      await this.loadTenants();
    } catch (err) {
      this.error = 'Failed to delete tenant';
      console.error('Failed to delete tenant:', err);
      this.loading = false;
      this.render();
    }
  }

  async createCompany(tenantId, data) {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      await tenantService.createCompany(tenantId, data);
      await this.loadCompanies(tenantId);
    } catch (err) {
      this.error = 'Failed to create company';
      console.error('Failed to create company:', err);
      this.loading = false;
      this.render();
    }
  }

  async deleteCompany(companyId) {
    if (!confirm('Tem certeza que deseja deletar esta empresa?')) return;

    this.loading = true;
    this.error = null;
    this.render();

    try {
      await tenantService.deleteCompany(companyId);
      await this.loadCompanies(this.selectedTenant);
    } catch (err) {
      this.error = 'Failed to delete company';
      console.error('Failed to delete company:', err);
      this.loading = false;
      this.render();
    }
  }

  async createProject(tenantId, companyId, data) {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      await tenantService.createProject(tenantId, companyId, data);
      await this.loadProjects(companyId);
    } catch (err) {
      this.error = 'Failed to create project';
      console.error('Failed to create project:', err);
      this.loading = false;
      this.render();
    }
  }

  async deleteProject(projectId) {
    if (!confirm('Tem certeza que deseja deletar este projeto?')) return;

    this.loading = true;
    this.error = null;
    this.render();

    try {
      await tenantService.deleteProject(projectId);
      await this.loadProjects(this.selectedCompany);
    } catch (err) {
      this.error = 'Failed to delete project';
      console.error('Failed to delete project:', err);
      this.loading = false;
      this.render();
    }
  }

  render() {
    let container = document.getElementById('admin-panel-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'admin-panel-container';
      document.body.appendChild(container);
    }

    if (!this.isOpen) {
      container.innerHTML = '';
      return;
    }

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
              Admin Panel
            </h2>
            <button id="admin-close" style="
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

          <!-- Tabs -->
          <div style="display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 1px solid var(--border-color); padding-bottom: 16px;">
            <button
              class="admin-tab ${this.currentView === 'tenants' ? 'active' : ''}"
              data-view="tenants"
              style="
                padding: 8px 16px;
                background: ${this.currentView === 'tenants' ? 'var(--accent-blue)' : 'var(--bg-secondary)'};
                color: ${this.currentView === 'tenants' ? 'white' : 'var(--text-primary)'};
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
              "
            >Tenants</button>
            <button
              class="admin-tab ${this.currentView === 'companies' ? 'active' : ''}"
              data-view="companies"
              style="
                padding: 8px 16px;
                background: ${this.currentView === 'companies' ? 'var(--accent-blue)' : 'var(--bg-secondary)'};
                color: ${this.currentView === 'companies' ? 'white' : 'var(--text-primary)'};
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
              "
            >Empresas</button>
            <button
              class="admin-tab ${this.currentView === 'projects' ? 'active' : ''}"
              data-view="projects"
              style="
                padding: 8px 16px;
                background: ${this.currentView === 'projects' ? 'var(--accent-blue)' : 'var(--bg-secondary)'};
                color: ${this.currentView === 'projects' ? 'white' : 'var(--text-primary)'};
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
              "
            >Projetos</button>
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

    // Render current view
    if (this.currentView === 'tenants') {
      html += this.renderTenantsView();
    } else if (this.currentView === 'companies') {
      html += this.renderCompaniesView();
    } else if (this.currentView === 'projects') {
      html += this.renderProjectsView();
    }

    html += `
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Attach event listeners
    document.getElementById('admin-close')?.addEventListener('click', () => this.close());

    container.querySelectorAll('.admin-tab').forEach(tab => {
      tab.addEventListener('click', () => this.setView(tab.dataset.view));
    });

    // View-specific listeners
    if (this.currentView === 'tenants') {
      this.attachTenantsListeners();
    } else if (this.currentView === 'companies') {
      this.attachCompaniesListeners();
    } else if (this.currentView === 'projects') {
      this.attachProjectsListeners();
    }

    // Close on backdrop click
    container.querySelector('div').addEventListener('click', (e) => {
      if (e.target === container.querySelector('div')) {
        this.close();
      }
    });
  }

  renderTenantsView() {
    let html = `
      <div style="margin-bottom: 16px;">
        <button id="admin-create-tenant" style="
          padding: 8px 16px;
          background: var(--accent-blue);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">+ Criar Tenant</button>
      </div>

      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <th style="text-align: left; padding: 12px; color: var(--text-secondary); font-size: 14px;">ID</th>
            <th style="text-align: left; padding: 12px; color: var(--text-secondary); font-size: 14px;">Nome</th>
            <th style="text-align: left; padding: 12px; color: var(--text-secondary); font-size: 14px;">Status</th>
            <th style="text-align: left; padding: 12px; color: var(--text-secondary); font-size: 14px;">Ações</th>
          </tr>
        </thead>
        <tbody>
    `;

    if (this.loading) {
      html += `<tr><td colspan="4" style="padding: 24px; text-align: center; color: var(--text-secondary);">Carregando...</td></tr>`;
    } else if (this.tenants.length === 0) {
      html += `<tr><td colspan="4" style="padding: 24px; text-align: center; color: var(--text-secondary);">Nenhum tenant encontrado</td></tr>`;
    } else {
      this.tenants.forEach(tenant => {
        html += `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 12px; font-size: 13px; color: var(--text-primary);">${tenant.tenantId}</td>
            <td style="padding: 12px; font-size: 13px; color: var(--text-primary);">${tenant.name}</td>
            <td style="padding: 12px; font-size: 13px; color: ${tenant.isActive ? 'var(--accent-green)' : 'var(--accent-red)'};">${tenant.isActive ? 'Ativo' : 'Inativo'}</td>
            <td style="padding: 12px;">
              <button class="admin-view-companies" data-tenant-id="${tenant.tenantId}" style="
                padding: 4px 8px;
                background: var(--bg-secondary);
                color: var(--text-primary);
                border: 1px solid var(--border-color);
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                margin-right: 4px;
              ">Empresas</button>
              <button class="admin-delete-tenant" data-tenant-id="${tenant.tenantId}" style="
                padding: 4px 8px;
                background: var(--accent-red);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
              ">Deletar</button>
            </td>
          </tr>
        `;
      });
    }

    html += `
        </tbody>
      </table>
    `;

    return html;
  }

  renderCompaniesView() {
    let html = `
      <div style="margin-bottom: 16px;">
        <button id="admin-back-tenants" style="
          padding: 8px 16px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          margin-right: 8px;
        ">← Voltar</button>
        <button id="admin-create-company" style="
          padding: 8px 16px;
          background: var(--accent-blue);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">+ Criar Empresa</button>
      </div>

      <p style="margin-bottom: 16px; color: var(--text-secondary); font-size: 14px;">
        Tenant: ${this.selectedTenant || 'Nenhum selecionado'}
      </p>

      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <th style="text-align: left; padding: 12px; color: var(--text-secondary); font-size: 14px;">ID</th>
            <th style="text-align: left; padding: 12px; color: var(--text-secondary); font-size: 14px;">Nome</th>
            <th style="text-align: left; padding: 12px; color: var(--text-secondary); font-size: 14px;">Status</th>
            <th style="text-align: left; padding: 12px; color: var(--text-secondary); font-size: 14px;">Ações</th>
          </tr>
        </thead>
        <tbody>
    `;

    if (this.loading) {
      html += `<tr><td colspan="4" style="padding: 24px; text-align: center; color: var(--text-secondary);">Carregando...</td></tr>`;
    } else if (this.companies.length === 0) {
      html += `<tr><td colspan="4" style="padding: 24px; text-align: center; color: var(--text-secondary);">Nenhuma empresa encontrada</td></tr>`;
    } else {
      this.companies.forEach(company => {
        html += `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 12px; font-size: 13px; color: var(--text-primary);">${company.companyId}</td>
            <td style="padding: 12px; font-size: 13px; color: var(--text-primary);">${company.name}</td>
            <td style="padding: 12px; font-size: 13px; color: ${company.isActive ? 'var(--accent-green)' : 'var(--accent-red)'};">${company.isActive ? 'Ativo' : 'Inativo'}</td>
            <td style="padding: 12px;">
              <button class="admin-view-projects" data-company-id="${company.companyId}" style="
                padding: 4px 8px;
                background: var(--bg-secondary);
                color: var(--text-primary);
                border: 1px solid var(--border-color);
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                margin-right: 4px;
              ">Projetos</button>
              <button class="admin-delete-company" data-company-id="${company.companyId}" style="
                padding: 4px 8px;
                background: var(--accent-red);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
              ">Deletar</button>
            </td>
          </tr>
        `;
      });
    }

    html += `
        </tbody>
      </table>
    `;

    return html;
  }

  renderProjectsView() {
    let html = `
      <div style="margin-bottom: 16px;">
        <button id="admin-back-companies" style="
          padding: 8px 16px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          margin-right: 8px;
        ">← Voltar</button>
        <button id="admin-create-project" style="
          padding: 8px 16px;
          background: var(--accent-blue);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">+ Criar Projeto</button>
      </div>

      <p style="margin-bottom: 16px; color: var(--text-secondary); font-size: 14px;">
        Empresa: ${this.selectedCompany || 'Nenhuma selecionada'}
      </p>

      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-color);">
            <th style="text-align: left; padding: 12px; color: var(--text-secondary); font-size: 14px;">ID</th>
            <th style="text-align: left; padding: 12px; color: var(--text-secondary); font-size: 14px;">Nome</th>
            <th style="text-align: left; padding: 12px; color: var(--text-secondary); font-size: 14px;">Status</th>
            <th style="text-align: left; padding: 12px; color: var(--text-secondary); font-size: 14px;">Ações</th>
          </tr>
        </thead>
        <tbody>
    `;

    if (this.loading) {
      html += `<tr><td colspan="4" style="padding: 24px; text-align: center; color: var(--text-secondary);">Carregando...</td></tr>`;
    } else if (this.projects.length === 0) {
      html += `<tr><td colspan="4" style="padding: 24px; text-align: center; color: var(--text-secondary);">Nenhum projeto encontrado</td></tr>`;
    } else {
      this.projects.forEach(project => {
        html += `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 12px; font-size: 13px; color: var(--text-primary);">${project.id.substring(0, 8)}...</td>
            <td style="padding: 12px; font-size: 13px; color: var(--text-primary);">${project.name}</td>
            <td style="padding: 12px; font-size: 13px; color: var(--text-primary);">${project.status}</td>
            <td style="padding: 12px;">
              <button class="admin-delete-project" data-project-id="${project.id}" style="
                padding: 4px 8px;
                background: var(--accent-red);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
              ">Deletar</button>
            </td>
          </tr>
        `;
      });
    }

    html += `
        </tbody>
      </table>
    `;

    return html;
  }

  attachTenantsListeners() {
    document.getElementById('admin-create-tenant')?.addEventListener('click', () => {
      const name = prompt('Nome do tenant:');
      if (name) {
        this.createTenant({ name });
      }
    });

    document.querySelectorAll('.admin-view-companies').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedTenant = btn.dataset.tenantId;
        this.loadCompanies(this.selectedTenant);
        this.setView('companies');
      });
    });

    document.querySelectorAll('.admin-delete-tenant').forEach(btn => {
      btn.addEventListener('click', () => {
        this.deleteTenant(btn.dataset.tenantId);
      });
    });
  }

  attachCompaniesListeners() {
    document.getElementById('admin-back-tenants')?.addEventListener('click', () => {
      this.selectedTenant = null;
      this.setView('tenants');
    });

    document.getElementById('admin-create-company')?.addEventListener('click', () => {
      const name = prompt('Nome da empresa:');
      if (name) {
        this.createCompany(this.selectedTenant, { name });
      }
    });

    document.querySelectorAll('.admin-view-projects').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedCompany = btn.dataset.companyId;
        this.loadProjects(this.selectedCompany);
        this.setView('projects');
      });
    });

    document.querySelectorAll('.admin-delete-company').forEach(btn => {
      btn.addEventListener('click', () => {
        this.deleteCompany(btn.dataset.companyId);
      });
    });
  }

  attachProjectsListeners() {
    document.getElementById('admin-back-companies')?.addEventListener('click', () => {
      this.selectedCompany = null;
      this.setView('companies');
    });

    document.getElementById('admin-create-project')?.addEventListener('click', () => {
      const name = prompt('Nome do projeto:');
      if (name) {
        this.createProject(this.selectedTenant, this.selectedCompany, { name });
      }
    });

    document.querySelectorAll('.admin-delete-project').forEach(btn => {
      btn.addEventListener('click', () => {
        this.deleteProject(btn.dataset.projectId);
      });
    });
  }
}

export { AdminPanel };
