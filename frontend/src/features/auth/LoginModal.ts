/**
 * LoginModal.ts - Login/Register modal dialog
 */

import { authManager } from './AuthManager';
import { eventBus } from '../../app/state/eventBus';
import { backendHealthChecker } from './BackendHealthChecker';
import { notificationManager } from '../../ui/NotificationManager';

export class LoginModal {
  private modal: HTMLElement | null = null;
  private isOpen = false;
  private mode: 'login' | 'register' = 'login';

  constructor() {
    this.createModal();
    this.setupEventListeners();
  }

  /**
   * Create modal HTML structure
   */
  private createModal(): void {
    const modal = document.createElement('div');
    modal.className = 'login-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(10px);
    `;

    modal.innerHTML = `
      <div class="login-container" style="
        background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
        border-radius: 16px;
        padding: 40px;
        width: 90%;
        max-width: 400px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(0, 255, 136, 0.1);
      ">
        <h2 style="
          color: #00ff88;
          margin: 0 0 10px 0;
          font-size: 28px;
          font-weight: 700;
        " class="modal-title">ArxisVR Login</h2>
        
        <p style="
          color: #999;
          margin: 0 0 30px 0;
          font-size: 14px;
        " class="modal-subtitle">Entre para acessar seus projetos BIM</p>

        <form class="login-form">
          <div class="form-group" id="name-group" style="display: none; margin-bottom: 20px;">
            <label style="
              display: block;
              color: #fff;
              margin-bottom: 8px;
              font-size: 14px;
              font-weight: 500;
            ">Nome</label>
            <input 
              type="text" 
              id="name-input" 
              placeholder="Seu nome completo"
              style="
                width: 100%;
                padding: 12px 16px;
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: #fff;
                font-size: 14px;
                outline: none;
                transition: all 0.3s;
              "
            />
          </div>

          <div class="form-group" style="margin-bottom: 20px;">
            <label style="
              display: block;
              color: #fff;
              margin-bottom: 8px;
              font-size: 14px;
              font-weight: 500;
            ">Email</label>
            <input 
              type="email" 
              id="email-input" 
              placeholder="seu@email.com"
              required
              style="
                width: 100%;
                padding: 12px 16px;
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: #fff;
                font-size: 14px;
                outline: none;
                transition: all 0.3s;
              "
            />
          </div>

          <div class="form-group" style="margin-bottom: 24px;">
            <label style="
              display: block;
              color: #fff;
              margin-bottom: 8px;
              font-size: 14px;
              font-weight: 500;
            ">Senha</label>
            <input 
              type="password" 
              id="password-input" 
              placeholder="••••••••"
              required
              style="
                width: 100%;
                padding: 12px 16px;
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                color: #fff;
                font-size: 14px;
                outline: none;
                transition: all 0.3s;
              "
            />
          </div>

          <div class="error-message" style="
            display: none;
            padding: 12px;
            background: rgba(244, 67, 54, 0.1);
            border: 1px solid rgba(244, 67, 54, 0.3);
            border-radius: 8px;
            color: #f44336;
            margin-bottom: 20px;
            font-size: 14px;
          "></div>

          <button type="submit" class="submit-button" style="
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
            border: none;
            border-radius: 8px;
            color: #000;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            margin-bottom: 16px;
          ">Entrar</button>

          <div style="text-align: center;">
            <button type="button" class="toggle-mode-button" style="
              background: none;
              border: none;
              color: #00ff88;
              cursor: pointer;
              font-size: 14px;
              text-decoration: underline;
            ">Criar nova conta</button>
          </div>
        </form>

        <button class="skip-button" style="
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: #fff;
          padding: 8px 16px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.3s;
        ">Pular (modo offline)</button>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.modal) return;

    const form = this.modal.querySelector('.login-form') as HTMLFormElement;
    const toggleButton = this.modal.querySelector('.toggle-mode-button') as HTMLButtonElement;
    const skipButton = this.modal.querySelector('.skip-button') as HTMLButtonElement;

    // Form submit
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit();
    });

    // Toggle between login/register
    toggleButton.addEventListener('click', () => {
      this.toggleMode();
    });

    // Skip login (offline mode)
    skipButton.addEventListener('click', () => {
      console.log('⚠️ Skipping login - using offline mode');
      this.close();
      eventBus.emit('AuthSkipped', {});
    });

    // Close on background click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Listen for AuthRequired event
    eventBus.on('AuthRequired', () => {
      this.open();
    });
  }

  /**
   * Handle form submission
   */
  private async handleSubmit(): Promise<void> {
    if (!this.modal) return;

    const emailInput = this.modal.querySelector('#email-input') as HTMLInputElement;
    const passwordInput = this.modal.querySelector('#password-input') as HTMLInputElement;
    const nameInput = this.modal.querySelector('#name-input') as HTMLInputElement;
    const errorDiv = this.modal.querySelector('.error-message') as HTMLElement;
    const submitButton = this.modal.querySelector('.submit-button') as HTMLButtonElement;

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const name = nameInput.value.trim();

    // Hide previous errors
    errorDiv.style.display = 'none';

    // Validate
    if (!email || !password) {
      this.showError('Preencha todos os campos');
      return;
    }

    if (this.mode === 'register' && !name) {
      this.showError('Preencha seu nome');
      return;
    }

    // Check backend availability
    const isBackendAvailable = backendHealthChecker.isAvailable();
    if (!isBackendAvailable) {
      this.showError('Não foi possível conectar ao servidor. Verifique sua conexão.');
      notificationManager.warning('Backend offline. Tentando reconectar...', 3000);
      
      // Try to reconnect
      await backendHealthChecker.check();
      
      if (!backendHealthChecker.isAvailable()) {
        return;
      }
    }

    // Disable button during request
    submitButton.disabled = true;
    submitButton.textContent = this.mode === 'login' ? 'Entrando...' : 'Criando conta...';

    try {
      if (this.mode === 'login') {
        await authManager.login({ email, password });
      } else {
        await authManager.register({ name, email, password });
      }

      // Success - close modal
      this.close();
    } catch (error: any) {
      console.error('❌ Auth error:', error);
      
      // Parse error message
      let errorMessage = 'Erro ao autenticar. Tente novamente.';
      
      if (error.message) {
        if (error.message.includes('401') || error.message.includes('Invalid credentials')) {
          errorMessage = 'Email ou senha incorretos';
        } else if (error.message.includes('409') || error.message.includes('already exists')) {
          errorMessage = 'Este email já está cadastrado';
        } else if (error.message.includes('Network')) {
          errorMessage = 'Erro de conexão. Verifique sua internet.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Tempo esgotado. Tente novamente.';
        } else {
          errorMessage = error.message;
        }
      }
      
      this.showError(errorMessage);
      notificationManager.error(errorMessage, 4000);
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = this.mode === 'login' ? 'Entrar' : 'Criar conta';
    }
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    if (!this.modal) return;
    const errorDiv = this.modal.querySelector('.error-message') as HTMLElement;
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
  }

  /**
   * Toggle between login and register modes
   */
  private toggleMode(): void {
    if (!this.modal) return;

    this.mode = this.mode === 'login' ? 'register' : 'login';

    const title = this.modal.querySelector('.modal-title') as HTMLElement;
    const subtitle = this.modal.querySelector('.modal-subtitle') as HTMLElement;
    const nameGroup = this.modal.querySelector('#name-group') as HTMLElement;
    const submitButton = this.modal.querySelector('.submit-button') as HTMLButtonElement;
    const toggleButton = this.modal.querySelector('.toggle-mode-button') as HTMLButtonElement;

    if (this.mode === 'register') {
      title.textContent = 'Criar Conta';
      subtitle.textContent = 'Crie sua conta para começar';
      nameGroup.style.display = 'block';
      submitButton.textContent = 'Criar conta';
      toggleButton.textContent = 'Já tenho uma conta';
    } else {
      title.textContent = 'ArxisVR Login';
      subtitle.textContent = 'Entre para acessar seus projetos BIM';
      nameGroup.style.display = 'none';
      submitButton.textContent = 'Entrar';
      toggleButton.textContent = 'Criar nova conta';
    }
  }

  /**
   * Open modal
   */
  open(): void {
    if (!this.modal) return;
    this.modal.style.display = 'flex';
    this.isOpen = true;

    // Focus email input
    setTimeout(() => {
      const emailInput = this.modal?.querySelector('#email-input') as HTMLInputElement;
      emailInput?.focus();
    }, 100);
  }

  /**
   * Close modal
   */
  close(): void {
    if (!this.modal) return;
    this.modal.style.display = 'none';
    this.isOpen = false;

    // Reset form
    const form = this.modal.querySelector('.login-form') as HTMLFormElement;
    form.reset();

    // Hide errors
    const errorDiv = this.modal.querySelector('.error-message') as HTMLElement;
    errorDiv.style.display = 'none';
  }
}

// Export singleton instance
let loginModalInstance: LoginModal | null = null;

export function getLoginModal(): LoginModal {
  if (!loginModalInstance) {
    loginModalInstance = new LoginModal();
  }
  return loginModalInstance;
}
