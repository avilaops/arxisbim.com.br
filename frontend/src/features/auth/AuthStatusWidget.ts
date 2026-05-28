/**
 * AuthStatusWidget.ts - Widget visual mostrando status de autenticação
 * Exibe avatar, nome do usuário e botões de login/logout
 */

import { authManager } from './AuthManager';
import { getLoginModal } from './LoginModal';
import { eventBus } from '../../app/state/eventBus';
import { backendHealthChecker, type HealthStatus } from './BackendHealthChecker';

export class AuthStatusWidget {
  private container: HTMLElement;
  private widget: HTMLElement | null = null;
  private isAuthenticated = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.createWidget();
    this.setupEventListeners();
    this.updateStatus();
    
    // Start backend health monitoring
    backendHealthChecker.start(30000); // Check every 30s
  }

  /**
   * Create widget HTML
   */
  private createWidget(): void {
    const widget = document.createElement('div');
    widget.className = 'auth-status-widget';
    widget.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9000;
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(20, 20, 20, 0.95);
      backdrop-filter: blur(10px);
      padding: 10px 16px;
      border-radius: 12px;
      border: 1px solid rgba(0, 255, 136, 0.2);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      transition: all 0.3s ease;
    `;

    widget.innerHTML = `
      <div class="auth-status-content" style="
        display: flex;
        align-items: center;
        gap: 12px;
      ">
        <!-- Connection Status Indicator -->
        <div class="connection-indicator" style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #666;
          animation: pulse 2s infinite;
        "></div>

        <!-- User Avatar -->
        <div class="user-avatar" style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: #000;
          font-size: 14px;
          display: none;
        "></div>

        <!-- User Info -->
        <div class="user-info" style="
          display: none;
          flex-direction: column;
          gap: 2px;
        ">
          <div class="user-name" style="
            color: #fff;
            font-size: 13px;
            font-weight: 600;
          "></div>
          <div class="user-role" style="
            color: #999;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          "></div>
        </div>

        <!-- Login Button (shown when not authenticated) -->
        <button class="login-button" style="
          background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
          border: none;
          border-radius: 8px;
          padding: 8px 16px;
          color: #000;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 6px;
        ">
          <i class="iconoir-log-in"></i>
          <span>Entrar</span>
        </button>

        <!-- User Menu (shown when authenticated) -->
        <div class="user-menu" style="display: none;">
          <button class="menu-toggle-button" style="
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            padding: 6px 10px;
            color: #fff;
            cursor: pointer;
            transition: all 0.3s;
          ">
            <i class="iconoir-menu"></i>
          </button>
          
          <div class="dropdown-menu" style="
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 8px;
            background: rgba(20, 20, 20, 0.98);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(0, 255, 136, 0.2);
            border-radius: 12px;
            padding: 8px;
            min-width: 200px;
            display: none;
            flex-direction: column;
            gap: 4px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
          ">
            <button class="menu-item profile-button" style="
              background: none;
              border: none;
              padding: 10px 12px;
              color: #fff;
              text-align: left;
              cursor: pointer;
              border-radius: 8px;
              transition: all 0.2s;
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 13px;
            ">
              <i class="iconoir-user"></i>
              <span>Perfil</span>
            </button>
            
            <button class="menu-item settings-button" style="
              background: none;
              border: none;
              padding: 10px 12px;
              color: #fff;
              text-align: left;
              cursor: pointer;
              border-radius: 8px;
              transition: all 0.2s;
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 13px;
            ">
              <i class="iconoir-settings"></i>
              <span>Configurações</span>
            </button>

            <div style="
              height: 1px;
              background: rgba(255, 255, 255, 0.1);
              margin: 4px 0;
            "></div>

            <button class="menu-item logout-button" style="
              background: none;
              border: none;
              padding: 10px 12px;
              color: #f44336;
              text-align: left;
              cursor: pointer;
              border-radius: 8px;
              transition: all 0.2s;
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 13px;
            ">
              <i class="iconoir-log-out"></i>
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>

      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .auth-status-widget:hover {
          border-color: rgba(0, 255, 136, 0.4);
        }

        .login-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 255, 136, 0.4);
        }

        .menu-toggle-button:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .menu-item:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .connection-indicator.connected {
          background: #00ff88 !important;
          animation: none !important;
        }

        .connection-indicator.disconnected {
          background: #f44336 !important;
        }

        .connection-indicator.checking {
          background: #ffa726 !important;
        }
      </style>
    `;

    this.container.appendChild(widget);
    this.widget = widget;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.widget) return;

    // Login button
    const loginButton = this.widget.querySelector('.login-button') as HTMLButtonElement;
    loginButton?.addEventListener('click', () => {
      const loginModal = getLoginModal();
      loginModal.open();
    });

    // Menu toggle
    const menuToggle = this.widget.querySelector('.menu-toggle-button') as HTMLButtonElement;
    const dropdownMenu = this.widget.querySelector('.dropdown-menu') as HTMLElement;
    
    menuToggle?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdownMenu.style.display === 'flex';
      dropdownMenu.style.display = isOpen ? 'none' : 'flex';
    });

    // Close menu on outside click
    document.addEventListener('click', (e) => {
      if (!this.widget?.contains(e.target as Node)) {
        dropdownMenu.style.display = 'none';
      }
    });

    // Logout button
    const logoutButton = this.widget.querySelector('.logout-button') as HTMLButtonElement;
    logoutButton?.addEventListener('click', async () => {
      try {
        await authManager.logout();
        dropdownMenu.style.display = 'none';
        this.updateStatus();
      } catch (error) {
        console.error('❌ Logout failed:', error);
      }
    });

    // Profile button
    const profileButton = this.widget.querySelector('.profile-button') as HTMLButtonElement;
    profileButton?.addEventListener('click', () => {
      console.log('🔹 Profile clicked');
      dropdownMenu.style.display = 'none';
      eventBus.emit('ShowProfile', {});
    });

    // Settings button
    const settingsButton = this.widget.querySelector('.settings-button') as HTMLButtonElement;
    settingsButton?.addEventListener('click', () => {
      console.log('⚙️ Settings clicked');
      dropdownMenu.style.display = 'none';
      eventBus.emit('ShowSettings', {});
    });

    // Listen to auth events
    eventBus.on('AuthSuccess', () => {
      this.updateStatus();
    });

    eventBus.on('AuthLogout', () => {
      this.updateStatus();
    });
    
    // Listen to backend status changes
    eventBus.on('BackendStatusChanged', ({ status }: { status: HealthStatus }) => {
      this.updateConnectionStatus(status);
    });
  }

  /**
   * Update widget based on auth status
   */
  private updateStatus(): void {
    if (!this.widget) return;

    const user = authManager.getUser();
    this.isAuthenticated = authManager.isAuthenticated();

    const loginButton = this.widget.querySelector('.login-button') as HTMLElement;
    const userAvatar = this.widget.querySelector('.user-avatar') as HTMLElement;
    const userInfo = this.widget.querySelector('.user-info') as HTMLElement;
    const userName = this.widget.querySelector('.user-name') as HTMLElement;
    const userRole = this.widget.querySelector('.user-role') as HTMLElement;
    const userMenu = this.widget.querySelector('.user-menu') as HTMLElement;
    const connectionIndicator = this.widget.querySelector('.connection-indicator') as HTMLElement;

    if (this.isAuthenticated && user) {
      // Show authenticated state
      loginButton.style.display = 'none';
      userAvatar.style.display = 'flex';
      userInfo.style.display = 'flex';
      userMenu.style.display = 'block';

      // Set user data
      const initials = this.getInitials(user.name);
      userAvatar.textContent = initials;
      userName.textContent = user.name;
      userRole.textContent = user.role || 'USER';

      // Update connection status
      connectionIndicator.className = 'connection-indicator connected';
      connectionIndicator.title = 'Conectado';
    } else {
      // Show unauthenticated state
      loginButton.style.display = 'flex';
      userAvatar.style.display = 'none';
      userInfo.style.display = 'none';
      userMenu.style.display = 'none';

      // Update connection status
      connectionIndicator.className = 'connection-indicator disconnected';
      connectionIndicator.title = 'Offline';
    }
  }

  /**
   * Get initials from name
   */
  private getInitials(name: string): string {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  /**
   * Set connection status
   */
  public setConnectionStatus(status: 'connected' | 'disconnected' | 'checking'): void {
    if (!this.widget) return;
    
    const indicator = this.widget.querySelector('.connection-indicator') as HTMLElement;
    indicator.className = `connection-indicator ${status}`;
    
    const titles = {
      connected: 'Conectado ao servidor',
      disconnected: 'Desconectado',
      checking: 'Verificando conexão...'
    };
    
    indicator.title = titles[status];
  }

  /**
   * Update connection status based on health check
   */
  private updateConnectionStatus(healthStatus: HealthStatus): void {
    if (!this.widget) return;
    
    const indicator = this.widget.querySelector('.connection-indicator') as HTMLElement;
    
    const statusMap: Record<HealthStatus, string> = {
      healthy: 'connected',
      degraded: 'checking',
      down: 'disconnected',
      checking: 'checking'
    };
    
    const titleMap: Record<HealthStatus, string> = {
      healthy: 'Backend online e saudável',
      degraded: 'Backend com problemas',
      down: 'Backend offline',
      checking: 'Verificando conexão...'
    };
    
    const mappedStatus = statusMap[healthStatus];
    indicator.className = `connection-indicator ${mappedStatus}`;
    indicator.title = titleMap[healthStatus];
  }

  /**
   * Destroy widget
   */
  public destroy(): void {
    if (this.widget) {
      this.widget.remove();
      this.widget = null;
    }
  }
}
