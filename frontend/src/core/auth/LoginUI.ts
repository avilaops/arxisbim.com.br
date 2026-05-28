/**
 * Login UI Component
 * Interface de login para autenticação
 */

import { getAuthManager } from './AuthManager';

export class LoginUI {
  private container: HTMLElement;
  private onLoginSuccess?: (user: any) => void;

  constructor(containerSelector: string = 'body') {
    const containerEl = document.querySelector(containerSelector);
    if (!containerEl) {
      throw new Error(`Container not found: ${containerSelector}`);
    }
    this.container = containerEl as HTMLElement;
  }

  /**
   * Renderiza UI de login
   */
  render(): void {
    const loginHTML = `
      <div id="login-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #f5f7fa;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      ">
        <div style="
          background: white;
          padding: 40px;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 24px 60px rgba(15,23,42,0.14);
          width: 100%;
          max-width: 400px;
        ">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="
              font-size: 2.5em;
              margin: 0 0 10px 0;
              color: #111827;
            ">ArxisVR</h1>
            <p style="color: #6b7280; margin: 0;">Plataforma BIM corporativa</p>
          </div>

          <form id="login-form" style="display: flex; flex-direction: column; gap: 15px;">
            <div>
              <label style="display: block; margin-bottom: 5px; color: #555; font-weight: 600;">Email</label>
              <input 
                type="email" 
                id="login-email" 
                required
                placeholder="seu@email.com"
                style="
                  width: 100%;
                  padding: 12px;
                  border: 2px solid #e0e0e0;
                  border-radius: 8px;
                  font-size: 16px;
                  transition: border-color 0.3s;
                  box-sizing: border-box;
                "
              />
            </div>

            <div>
              <label style="display: block; margin-bottom: 5px; color: #555; font-weight: 600;">Senha</label>
              <input 
                type="password" 
                id="login-password" 
                required
                placeholder="••••••••"
                style="
                  width: 100%;
                  padding: 12px;
                  border: 2px solid #e0e0e0;
                  border-radius: 8px;
                  font-size: 16px;
                  transition: border-color 0.3s;
                  box-sizing: border-box;
                "
              />
            </div>

            <div id="login-error" style="
              display: none;
              padding: 10px;
              background: #fee;
              border: 1px solid #fcc;
              border-radius: 8px;
              color: #c33;
              font-size: 14px;
            "></div>

            <button 
              type="submit" 
              id="login-submit"
              style="
                background: #2563eb;
                color: white;
                border: none;
                padding: 15px;
                border-radius: 10px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.2s, box-shadow 0.2s;
              "
              onmouseover="this.style.transform='scale(1.02)'; this.style.boxShadow='0 8px 20px rgba(37,99,235,0.25)'"
              onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'"
            >
              Entrar
            </button>

            <div style="text-align: center; margin-top: 10px;">
              <a href="#" id="register-link" style="color: #2563eb; text-decoration: none; font-size: 14px;">
                Não tem conta? Registre-se
              </a>
            </div>
          </form>

          <div id="loading-spinner" style="
            display: none;
            text-align: center;
            padding: 20px;
          ">
            <div style="
              border: 4px solid #f3f3f3;
              border-top: 4px solid #2563eb;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 0 auto;
            "></div>
          </div>
        </div>
      </div>

      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;

    this.container.insertAdjacentHTML('beforeend', loginHTML);
    this.attachEventListeners();
  }

  /**
   * Anexa event listeners
   */
  private attachEventListeners(): void {
    const form = document.getElementById('login-form') as HTMLFormElement;
    const registerLink = document.getElementById('register-link') as HTMLAnchorElement;

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleLogin();
    });

    registerLink?.addEventListener('click', (e) => {
      e.preventDefault();
      this.switchToRegister();
    });
  }

  /**
   * Processa login
   */
  private async handleLogin(): Promise<void> {
    const emailInput = document.getElementById('login-email') as HTMLInputElement;
    const passwordInput = document.getElementById('login-password') as HTMLInputElement;
    const errorDiv = document.getElementById('login-error') as HTMLDivElement;
    const submitBtn = document.getElementById('login-submit') as HTMLButtonElement;
    const spinner = document.getElementById('loading-spinner') as HTMLDivElement;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Validação básica
    if (!email || !password) {
      this.showError('Por favor, preencha todos os campos');
      return;
    }

    try {
      // Mostrar loading
      submitBtn.style.display = 'none';
      spinner.style.display = 'block';
      errorDiv.style.display = 'none';

      // Fazer login
      const authManager = getAuthManager();
      const user = await authManager.login(email, password);

      // Sucesso
      console.log('[LoginUI] Login successful:', user);
      this.onLoginSuccess?.(user);
      this.hide();

    } catch (error: any) {
      console.error('[LoginUI] Login error:', error);
      this.showError(error.message || 'Erro ao fazer login. Verifique suas credenciais.');
    } finally {
      submitBtn.style.display = 'block';
      spinner.style.display = 'none';
    }
  }

  /**
   * Mostra erro
   */
  private showError(message: string): void {
    const errorDiv = document.getElementById('login-error') as HTMLDivElement;
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }
  }

  /**
   * Troca para tela de registro
   */
  private switchToRegister(): void {
    // TODO: Implementar tela de registro
    this.showError('Funcionalidade de registro em desenvolvimento. Use: user3@avilaops.com / password123');
  }

  /**
   * Remove UI de login
   */
  hide(): void {
    const overlay = document.getElementById('login-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  /**
   * Define callback de sucesso
   */
  onSuccess(callback: (user: any) => void): void {
    this.onLoginSuccess = callback;
  }
}
