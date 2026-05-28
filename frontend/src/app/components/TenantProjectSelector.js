import { tenantService } from '../../api/v1/services/tenant.service';

class TenantProjectSelector {
  constructor() {
    this.tenants = [];
    this.companies = [];
    this.projects = [];
    this.selectedTenant = localStorage.getItem('arxisvr_tenant_id') || null;
    this.selectedCompany = null;
    this.selectedProject = localStorage.getItem('arxisvr_project_id') || null;
    this.loading = false;
    this.error = null;
  }

  hasAuthToken() {
    return Boolean(localStorage.getItem('arxisvr_token'));
  }

  async init() {
    if (!this.hasAuthToken()) {
      this.render();
      return;
    }

    await this.loadTenants();
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

  handleTenantChange(tenantId) {
    this.selectedTenant = tenantId;
    this.selectedCompany = null;
    this.selectedProject = null;
    this.projects = [];
    localStorage.setItem('arxisvr_tenant_id', tenantId);
    localStorage.removeItem('arxisvr_project_id');
    this.loadCompanies(tenantId);
  }

  handleCompanyChange(companyId) {
    this.selectedCompany = companyId;
    this.selectedProject = null;
    this.projects = [];
    this.loadProjects(companyId);
  }

  handleProjectChange(projectId) {
    this.selectedProject = projectId;
    localStorage.setItem('arxisvr_project_id', projectId);
    // Trigger reload of IFC models
    window.dispatchEvent(new CustomEvent('project-changed', { detail: { projectId } }));
    this.render();
  }

  render() {
    const container = document.getElementById('tenant-project-selector');
    if (!container) return;

    if (!this.hasAuthToken()) {
      container.innerHTML = `
        <div style="padding: 16px; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 16px;">
          <p style="color: var(--text-secondary); font-size: 13px;">
            Faça login para acessar tenants e projetos.
          </p>
        </div>
      `;
      return;
    }

    let html = `
      <div style="padding: 16px; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: var(--text-primary);">
          Workspace
        </h3>
    `;

    if (this.error) {
      html += `
        <div style="padding: 8px; background: var(--accent-red); color: white; border-radius: 4px; margin-bottom: 12px; font-size: 12px;">
          ${this.error}
        </div>
      `;
    }

    // Tenant selector
    html += `
      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">
          Tenant
        </label>
        <select
          id="tenant-select"
          ${this.loading ? 'disabled' : ''}
          style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); font-size: 13px;"
        >
          <option value="">Selecione um tenant</option>
          ${this.tenants.map(t => `<option value="${t.tenantId}" ${this.selectedTenant === t.tenantId ? 'selected' : ''}>${t.name}</option>`).join('')}
        </select>
      </div>
    `;

    // Company selector
    if (this.selectedTenant) {
      html += `
        <div style="margin-bottom: 12px;">
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">
            Empresa
          </label>
          <select
            id="company-select"
            ${this.loading ? 'disabled' : ''}
            style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); font-size: 13px;"
          >
            <option value="">Selecione uma empresa</option>
            ${this.companies.map(c => `<option value="${c.companyId}" ${this.selectedCompany === c.companyId ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>
      `;
    }

    // Project selector
    if (this.selectedCompany) {
      html += `
        <div style="margin-bottom: 12px;">
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">
            Projeto
          </label>
          <select
            id="project-select"
            ${this.loading ? 'disabled' : ''}
            style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); font-size: 13px;"
          >
            <option value="">Selecione um projeto</option>
            ${this.projects.map(p => `<option value="${p.id}" ${this.selectedProject === p.id ? 'selected' : ''}>${p.name} (${p.status})</option>`).join('')}
          </select>
        </div>
      `;
    }

    if (this.selectedProject) {
      html += `
        <div style="padding: 8px; background: var(--accent-blue); color: white; border-radius: 4px; font-size: 12px;">
          ✓ Projeto selecionado
        </div>
      `;
    }

    if (this.selectedCompany) {
      html += `
        <button
          id="create-project-btn"
          ${this.loading ? 'disabled' : ''}
          style="
            width: 100%;
            padding: 8px;
            background: var(--bg-secondary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            cursor: ${this.loading ? 'not-allowed' : 'pointer'};
            font-size: 13px;
            margin-top: 8px;
          "
        >
          + Criar Projeto
        </button>
      `;
    }

    html += '</div>';
    container.innerHTML = html;

    // Attach event listeners
    const tenantSelect = document.getElementById('tenant-select');
    if (tenantSelect) {
      tenantSelect.addEventListener('change', (e) => this.handleTenantChange(e.target.value));
    }

    const companySelect = document.getElementById('company-select');
    if (companySelect) {
      companySelect.addEventListener('change', (e) => this.handleCompanyChange(e.target.value));
    }

    const projectSelect = document.getElementById('project-select');
    if (projectSelect) {
      projectSelect.addEventListener('change', (e) => this.handleProjectChange(e.target.value));
    }

    const createProjectBtn = document.getElementById('create-project-btn');
    if (createProjectBtn) {
      createProjectBtn.addEventListener('click', () => this.handleCreateProject());
    }
  }

  async handleCreateProject() {
    const name = prompt('Nome do projeto:');
    if (!name) return;

    const description = prompt('Descrição (opcional):') || undefined;

    this.loading = true;
    this.error = null;
    this.render();

    try {
      const newProject = await tenantService.createProject(this.selectedTenant, this.selectedCompany, {
        name,
        description,
      });
      this.selectedProject = newProject.id;
      localStorage.setItem('arxisvr_project_id', newProject.id);
      window.dispatchEvent(new CustomEvent('project-changed', { detail: { projectId: newProject.id } }));
      await this.loadProjects(this.selectedCompany);
    } catch (err) {
      this.error = 'Failed to create project';
      console.error('Failed to create project:', err);
    } finally {
      this.loading = false;
      this.render();
    }
  }
}

export { TenantProjectSelector };
