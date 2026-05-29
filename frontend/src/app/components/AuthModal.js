const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3001';

class AuthModal {
  constructor() {
    this.isOpen = false;
    this.mode = 'login'; // 'login' or 'register'
    this.email = '';
    this.password = '';
    this.name = '';
    this.tenantId = '';
    this.loading = false;
    this.error = null;
  }

  open(mode = 'login') {
    this.mode = mode;
    this.isOpen = true;
    this.error = null;
    this.render();
  }

  close() {
    this.isOpen = false;
    this.render();
  }

  setMode(mode) {
    this.mode = mode;
    this.error = null;
    this.render();
  }

  async handleLogin() {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.email,
          password: this.password,
          tenantId: this.tenantId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Save token and user data
      localStorage.setItem('arxisvr_token', data.token);
      localStorage.setItem('arxisvr_refresh_token', data.refreshToken);
      localStorage.setItem('arxisvr_user', JSON.stringify(data.user));
      localStorage.setItem('arxisvr_tenant_id', data.user.tenantId);

      // Close modal and reload page to reinitialize
      this.close();
      window.location.reload();
    } catch (err) {
      this.error = err.message;
      this.loading = false;
      this.render();
    }
  }

  async handleRegister() {
    this.loading = true;
    this.error = null;
    this.render();

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.email,
          password: this.password,
          name: this.name,
          tenantId: this.tenantId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Auto-login after registration
      localStorage.setItem('arxisvr_token', data.token);
      localStorage.setItem('arxisvr_refresh_token', data.refreshToken);
      localStorage.setItem('arxisvr_user', JSON.stringify(data.user));
      localStorage.setItem('arxisvr_tenant_id', data.user.tenantId);

      this.close();
      window.location.reload();
    } catch (err) {
      this.error = err.message;
      this.loading = false;
      this.render();
    }
  }

  handleLogout() {
    localStorage.removeItem('arxisvr_token');
    localStorage.removeItem('arxisvr_user');
    localStorage.removeItem('arxisvr_tenant_id');
    localStorage.removeItem('arxisvr_project_id');
    window.location.reload();
  }

  getUser() {
    const userStr = localStorage.getItem('arxisvr_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated() {
    return Boolean(localStorage.getItem('arxisvr_token'));
  }

  render() {
    let container = document.getElementById('auth-modal-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'auth-modal-container';
      document.body.appendChild(container);
    }

    if (!this.isOpen) {
      container.innerHTML = '';
      return;
    }

    const user = this.getUser();

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
          width: 400px;
          max-width: 90%;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        ">
          <h2 style="margin: 0 0 24px 0; font-size: 24px; color: var(--text-primary);">
            ${this.mode === 'login' ? 'Entrar' : 'Criar Conta'}
          </h2>
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

    html += `
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-size: 14px; color: var(--text-secondary);">
              Tenant ID
            </label>
            <input
              type="text"
              id="auth-tenant-id"
              value="${this.tenantId}"
              placeholder="ex: acme-corp"
              ${this.loading ? 'disabled' : ''}
              style="
                width: 100%;
                padding: 12px;
                border: 1px solid var(--border-color);
                border-radius: 8px;
                background: var(--bg-secondary);
                color: var(--text-primary);
                font-size: 14px;
                box-sizing: border-box;
              "
            />
          </div>

          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-size: 14px; color: var(--text-secondary);">
              Email
            </label>
            <input
              type="email"
              id="auth-email"
              value="${this.email}"
              placeholder="seu@email.com"
              ${this.loading ? 'disabled' : ''}
              style="
                width: 100%;
                padding: 12px;
                border: 1px solid var(--border-color);
                border-radius: 8px;
                background: var(--bg-secondary);
                color: var(--text-primary);
                font-size: 14px;
                box-sizing: border-box;
              "
            />
          </div>
    `;

    if (this.mode === 'register') {
      html += `
          <div style="margin-bottom: 16px;">
            <label style="display: block; margin-bottom: 8px; font-size: 14px; color: var(--text-secondary);">
              Nome
            </label>
            <input
              type="text"
              id="auth-name"
              value="${this.name}"
              placeholder="Seu nome"
              ${this.loading ? 'disabled' : ''}
              style="
                width: 100%;
                padding: 12px;
                border: 1px solid var(--border-color);
                border-radius: 8px;
                background: var(--bg-secondary);
                color: var(--text-primary);
                font-size: 14px;
                box-sizing: border-box;
              "
            />
          </div>
      `;
    }

    html += `
          <div style="margin-bottom: 24px;">
            <label style="display: block; margin-bottom: 8px; font-size: 14px; color: var(--text-secondary);">
              Senha
            </label>
            <input
              type="password"
              id="auth-password"
              value="${this.password}"
              placeholder="••••••••"
              ${this.loading ? 'disabled' : ''}
              style="
                width: 100%;
                padding: 12px;
                border: 1px solid var(--border-color);
                border-radius: 8px;
                background: var(--bg-secondary);
                color: var(--text-primary);
                font-size: 14px;
                box-sizing: border-box;
              "
            />
          </div>

          <button
            id="auth-submit"
            ${this.loading ? 'disabled' : ''}
            style="
              width: 100%;
              padding: 12px;
              background: var(--accent-blue);
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: ${this.loading ? 'not-allowed' : 'pointer'};
              opacity: ${this.loading ? 0.6 : 1};
            "
          >
            ${this.loading ? 'Carregando...' : (this.mode === 'login' ? 'Entrar' : 'Criar Conta')}
          </button>

          <div style="margin-top: 16px; text-align: center; font-size: 14px; color: var(--text-secondary);">
            ${this.mode === 'login'
              ? 'Não tem conta? <a href="#" id="auth-toggle-mode" style="color: var(--accent-blue);">Criar conta</a>'
              : 'Já tem conta? <a href="#" id="auth-toggle-mode" style="color: var(--accent-blue);">Entrar</a>'
            }
          </div>

          <button
            id="auth-close"
            style="
              position: absolute;
              top: 16px;
              right: 16px;
              background: none;
              border: none;
              color: var(--text-secondary);
              font-size: 24px;
              cursor: pointer;
              padding: 0;
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
            "
          >
            ×
          </button>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Attach event listeners
    const tenantIdInput = document.getElementById('auth-tenant-id');
    if (tenantIdInput) {
      tenantIdInput.addEventListener('input', (e) => {
        this.tenantId = e.target.value;
      });
    }

    const emailInput = document.getElementById('auth-email');
    if (emailInput) {
      emailInput.addEventListener('input', (e) => {
        this.email = e.target.value;
      });
    }

    const nameInput = document.getElementById('auth-name');
    if (nameInput) {
      nameInput.addEventListener('input', (e) => {
        this.name = e.target.value;
      });
    }

    const passwordInput = document.getElementById('auth-password');
    if (passwordInput) {
      passwordInput.addEventListener('input', (e) => {
        this.password = e.target.value;
      });
    }

    const submitBtn = document.getElementById('auth-submit');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        if (this.mode === 'login') {
          this.handleLogin();
        } else {
          this.handleRegister();
        }
      });
    }

    const toggleModeBtn = document.getElementById('auth-toggle-mode');
    if (toggleModeBtn) {
      toggleModeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.setMode(this.mode === 'login' ? 'register' : 'login');
      });
    }

    const closeBtn = document.getElementById('auth-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Close on backdrop click
    container.querySelector('div').addEventListener('click', (e) => {
      if (e.target === container.querySelector('div')) {
        this.close();
      }
    });
  }

  renderAuthButton() {
    const container = document.getElementById('auth-button-container');
    if (!container) return;

    const user = this.getUser();
    const isAuthenticated = this.isAuthenticated();

    if (isAuthenticated && user) {
      container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 14px; color: var(--text-secondary);">
            ${user.name || user.email}
          </span>
          <button
            id="auth-logout"
            style="
              padding: 8px 16px;
              background: var(--bg-secondary);
              color: var(--text-primary);
              border: 1px solid var(--border-color);
              border-radius: 6px;
              font-size: 14px;
              cursor: pointer;
            "
          >
            Sair
          </button>
        </div>
      `;

      document.getElementById('auth-logout')?.addEventListener('click', () => this.handleLogout());
    } else {
      container.innerHTML = `
        <button
          id="auth-login"
          style="
            padding: 8px 16px;
            background: var(--accent-blue);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
          "
        >
          Entrar
        </button>
      `;

      document.getElementById('auth-login')?.addEventListener('click', () => this.open('login'));
    }
  }
}

export { AuthModal };
