/**
 * ProfilePanel.ts - Painel de perfil do usuário
 * Mostra informações detalhadas e permite edição
 */

import { authManager, type User } from './AuthManager';
import { eventBus } from '../../app/state/eventBus';
import { licenseManager } from '../../systems/licensing/LicenseManager';

export class ProfilePanel {
  private overlay: HTMLElement | null = null;
  private isOpen = false;

  constructor() {
    this.createPanel();
    this.setupEventListeners();
  }

  /**
   * Create panel HTML
   */
  private createPanel(): void {
    const overlay = document.createElement('div');
    overlay.className = 'profile-panel-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(10px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 20px;
    `;

    overlay.innerHTML = `
      <div class="profile-panel" style="
        background: linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%);
        border-radius: 16px;
        width: 100%;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(0, 255, 136, 0.2);
      " onclick="event.stopPropagation()">
        <!-- Header -->
        <div style="
          padding: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        ">
          <h2 style="
            color: #00ff88;
            margin: 0;
            font-size: 24px;
            font-weight: 700;
          ">Perfil do Usuário</h2>
          
          <button class="close-button" style="
            background: rgba(255, 255, 255, 0.1);
            border: none;
            border-radius: 8px;
            width: 36px;
            height: 36px;
            color: #fff;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
          ">
            <i class="iconoir-xmark" style="font-size: 20px;"></i>
          </button>
        </div>

        <!-- Content -->
        <div style="padding: 24px;">
          <!-- Avatar Section -->
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 32px;
          ">
            <div class="profile-avatar" style="
              width: 100px;
              height: 100px;
              border-radius: 50%;
              background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 40px;
              font-weight: 700;
              color: #000;
              margin-bottom: 16px;
              box-shadow: 0 8px 24px rgba(0, 255, 136, 0.3);
            "></div>
            
            <h3 class="profile-name" style="
              color: #fff;
              margin: 0 0 8px 0;
              font-size: 20px;
              font-weight: 600;
            "></h3>
            
            <p class="profile-email" style="
              color: #999;
              margin: 0;
              font-size: 14px;
            "></p>
          </div>

          <!-- Info Cards -->
          <div style="
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 24px;
          ">
            <!-- Role Card -->
            <div style="
              background: rgba(0, 0, 0, 0.3);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 12px;
              padding: 16px;
            ">
              <div style="
                color: #999;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 8px;
              ">Função</div>
              <div class="profile-role" style="
                color: #fff;
                font-size: 16px;
                font-weight: 600;
              "></div>
            </div>

            <!-- Tenant Card -->
            <div style="
              background: rgba(0, 0, 0, 0.3);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 12px;
              padding: 16px;
            ">
              <div style="
                color: #999;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 8px;
              ">Organização</div>
              <div class="profile-tenant" style="
                color: #fff;
                font-size: 16px;
                font-weight: 600;
              "></div>
            </div>

            <!-- Status Card -->
            <div style="
              background: rgba(0, 0, 0, 0.3);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 12px;
              padding: 16px;
            ">
              <div style="
                color: #999;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 8px;
              ">Status</div>
              <div class="profile-status" style="
                color: #00ff88;
                font-size: 16px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 6px;
              ">
                <span style="
                  width: 8px;
                  height: 8px;
                  border-radius: 50%;
                  background: #00ff88;
                "></span>
                Ativo
              </div>
            </div>

            <!-- Billing Plan Card -->
            <div style="
              background: rgba(0, 0, 0, 0.3);
              border: 1px solid rgba(0, 255, 136, 0.2);
              border-radius: 12px;
              padding: 16px;
            ">
              <div style="
                color: #999;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 8px;
              ">Plano</div>
              <div class="profile-plan" style="
                color: #00ff88;
                font-size: 16px;
                font-weight: 700;
              "></div>
            </div>

            <!-- Member Since Card -->
            <div style="
              background: rgba(0, 0, 0, 0.3);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 12px;
              padding: 16px;
            ">
              <div style="
                color: #999;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 8px;
              ">Membro desde</div>
              <div class="profile-created" style="
                color: #fff;
                font-size: 16px;
                font-weight: 600;
              "></div>
            </div>
          </div>

          <!-- User ID Section -->
          <div style="
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
          ">
            <div style="
              color: #999;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 8px;
            ">ID do Usuário</div>
            <div class="profile-id" style="
              color: #fff;
              font-size: 13px;
              font-family: monospace;
              word-break: break-all;
            "></div>
          </div>

          <!-- Actions -->
          <div style="
            display: flex;
            gap: 12px;
          ">
            <button class="edit-profile-button" style="
              flex: 1;
              padding: 14px;
              background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
              border: none;
              border-radius: 8px;
              color: #000;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
            ">
              <i class="iconoir-edit"></i>
              <span>Editar Perfil</span>
            </button>

            <button class="change-password-button" style="
              flex: 1;
              padding: 14px;
              background: rgba(255, 255, 255, 0.1);
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 8px;
              color: #fff;
              font-size: 14px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
            ">
              <i class="iconoir-lock"></i>
              <span>Alterar Senha</span>
            </button>
          </div>
        </div>
      </div>

      <style>
        .close-button:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .edit-profile-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 255, 136, 0.4);
        }

        .change-password-button:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
        }
      </style>
    `;

    document.body.appendChild(overlay);
    this.overlay = overlay;
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    if (!this.overlay) return;

    // Close button
    const closeButton = this.overlay.querySelector('.close-button') as HTMLButtonElement;
    closeButton?.addEventListener('click', () => {
      this.close();
    });

    // Close on background click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Edit profile button
    const editButton = this.overlay.querySelector('.edit-profile-button') as HTMLButtonElement;
    editButton?.addEventListener('click', () => {
      console.log('✏️ Edit profile clicked');
      // TODO: Implement profile editing
      alert('Edição de perfil será implementada em breve!');
    });

    // Change password button
    const passwordButton = this.overlay.querySelector('.change-password-button') as HTMLButtonElement;
    passwordButton?.addEventListener('click', () => {
      console.log('🔒 Change password clicked');
      // TODO: Implement password change
      alert('Alteração de senha será implementada em breve!');
    });

    // Listen to ShowProfile event
    eventBus.on('ShowProfile', () => {
      this.open();
    });
  }

  /**
   * Open panel
   */
  public open(): void {
    if (!this.overlay) return;

    const user = authManager.getUser();
    if (!user) {
      console.warn('⚠️ Cannot open profile - no user logged in');
      return;
    }

    // Update user data
    this.updateUserData(user);

    this.overlay.style.display = 'flex';
    this.isOpen = true;
  }

  /**
   * Close panel
   */
  public close(): void {
    if (!this.overlay) return;
    this.overlay.style.display = 'none';
    this.isOpen = false;
  }

  /**
   * Update user data in the panel
   */
  private updateUserData(user: User): void {
    if (!this.overlay) return;

    // Avatar
    const avatar = this.overlay.querySelector('.profile-avatar') as HTMLElement;
    const initials = this.getInitials(user.name);
    avatar.textContent = initials;

    // Basic info
    const nameEl = this.overlay.querySelector('.profile-name') as HTMLElement;
    nameEl.textContent = user.name;

    const emailEl = this.overlay.querySelector('.profile-email') as HTMLElement;
    emailEl.textContent = user.email;

    // Cards
    const roleEl = this.overlay.querySelector('.profile-role') as HTMLElement;
    roleEl.textContent = user.role || 'USER';

    const tenantEl = this.overlay.querySelector('.profile-tenant') as HTMLElement;
    tenantEl.textContent = user.tenantId || 'N/A';

    const planEl = this.overlay.querySelector('.profile-plan') as HTMLElement;
    const currentPlan = licenseManager.getCurrentPlan();
    planEl.textContent = currentPlan ? currentPlan.name : 'Não carregado';

    const statusEl = this.overlay.querySelector('.profile-status') as HTMLElement;
    if (user.isActive) {
      statusEl.innerHTML = `
        <span style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #00ff88;
        "></span>
        Ativo
      `;
      statusEl.style.color = '#00ff88';
    } else {
      statusEl.innerHTML = `
        <span style="
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #f44336;
        "></span>
        Inativo
      `;
      statusEl.style.color = '#f44336';
    }

    const createdEl = this.overlay.querySelector('.profile-created') as HTMLElement;
    const createdDate = new Date(user.createdAt);
    createdEl.textContent = createdDate.toLocaleDateString('pt-BR');

    const idEl = this.overlay.querySelector('.profile-id') as HTMLElement;
    idEl.textContent = user.id;
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
   * Destroy panel
   */
  public destroy(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}

// Export singleton instance
let profilePanelInstance: ProfilePanel | null = null;

export function getProfilePanel(): ProfilePanel {
  if (!profilePanelInstance) {
    profilePanelInstance = new ProfilePanel();
  }
  return profilePanelInstance;
}
