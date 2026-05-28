/**
 * Componentes UI para gerenciamento de licenças e upgrades
 */

import { Feature, PlanTier, PLANS } from '../licensing/LicenseManager';
import { useFeature, usePlan, useLimit } from '../licensing/LicenseHooks';

/**
 * Badge de plano atual
 */
export class PlanBadge {
  private container: HTMLElement;

  constructor(parentElement: HTMLElement) {
    this.container = this.createBadge();
    parentElement.appendChild(this.container);
    this.update();
  }

  private createBadge(): HTMLElement {
    const badge = document.createElement('div');
    badge.className = 'plan-badge';
    badge.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #ffffff;
      color: #111827;
      border: 1px solid #dbeafe;
      padding: 12px 20px;
      border-radius: 24px;
      font-weight: 600;
      font-size: 14px;
      box-shadow: 0 12px 24px rgba(15,23,42,0.12);
      z-index: 1000;
      cursor: pointer;
      transition: transform 0.2s;
    `;

    badge.addEventListener('mouseenter', () => {
      badge.style.transform = 'translateY(-2px)';
    });

    badge.addEventListener('mouseleave', () => {
      badge.style.transform = 'translateY(0)';
    });

    badge.addEventListener('click', () => {
      this.showPlanDetails();
    });

    return badge;
  }

  update(): void {
    const plan = usePlan();
    
    if (plan.isTrial) {
      this.container.innerHTML = `
        Trial • ${plan.daysRemaining} dias restantes
      `;
      this.container.style.background = '#fffbeb';
      this.container.style.borderColor = '#f59e0b';
    } else {
      this.container.innerHTML = `
        ${this.getPlanCode(plan.tier!)} • ${plan.name}
      `;
    }
  }

  private getPlanCode(tier: PlanTier): string {
    const codes = {
      [PlanTier.FREE]: 'FREE',
      [PlanTier.STARTER]: 'STARTER',
      [PlanTier.PROFESSIONAL]: 'PRO',
      [PlanTier.ENTERPRISE]: 'ENT'
    };
    return codes[tier] || 'PLAN';
  }

  private showPlanDetails(): void {
    const modal = new PlanDetailsModal();
    modal.show();
  }
}

/**
 * Modal com detalhes do plano
 */
export class PlanDetailsModal {
  private modal: HTMLElement;

  constructor() {
    this.modal = this.createModal();
  }

  private createModal(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.6);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;

    const content = document.createElement('div');
    content.className = 'modal-content';
    content.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 32px;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    `;

    const plan = usePlan();
    
    content.innerHTML = `
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">
          ${plan.name}
        </h2>
        <p style="color: #64748b; font-size: 14px;">
          ${plan.isTrial ? `Trial • ${plan.daysRemaining} dias restantes` : 'Plano Ativo'}
        </p>
      </div>

      <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
        <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">
          Limites de uso
        </h3>
        ${this.renderLimits(plan.limits!)}
      </div>

      <div style="margin-bottom: 24px;">
        <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 16px;">
          Recursos disponíveis
        </h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
          ${this.renderFeatures(plan.features!)}
        </div>
      </div>

      ${plan.canUpgradeTo(PlanTier.PROFESSIONAL) || plan.canUpgradeTo(PlanTier.ENTERPRISE) ? `
        <button id="upgradeBtn" style="
          width: 100%;
          background: #2563eb;
          color: white;
          border: none;
          padding: 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          transition: transform 0.2s;
        ">
          Fazer upgrade
        </button>
      ` : ''}

      <button id="closeBtn" style="
        width: 100%;
        margin-top: 12px;
        background: transparent;
        border: 2px solid #e2e8f0;
        color: #64748b;
        padding: 12px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
      ">
        Fechar
      </button>
    `;

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    // Event listeners
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.hide();
      }
    });

    const closeBtn = content.querySelector('#closeBtn');
    closeBtn?.addEventListener('click', () => this.hide());

    const upgradeBtn = content.querySelector('#upgradeBtn');
    upgradeBtn?.addEventListener('click', () => {
      window.location.href = '/pricing';
    });

    return overlay;
  }

  private renderLimits(limits: any): string {
    const formatLimit = (value: number, suffix: string = ''): string => {
      return value === -1 ? 'Ilimitado' : `${value}${suffix}`;
    };

    return `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #64748b;">Usuários</span>
          <strong>${formatLimit(limits.maxUsers)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #64748b;">Projetos</span>
          <strong>${formatLimit(limits.maxProjects)}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #64748b;">Armazenamento</span>
          <strong>${formatLimit(limits.storageGB, 'GB')}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="color: #64748b;">Tamanho máx. arquivo</span>
          <strong>${formatLimit(limits.maxFileSize, 'MB')}</strong>
        </div>
      </div>
    `;
  }

  private renderFeatures(features: Feature[]): string {
    const featureNames: Record<string, string> = {
      [Feature.IFC_VIEWER]: 'Visualizador IFC',
      [Feature.REAL_TIME_COLLABORATION]: 'Colaboração em tempo real',
      [Feature.CUSTOM_ENVIRONMENTS]: 'Ambientes personalizados',
      [Feature.CUSTOM_AVATARS]: 'Avatares customizados',
      [Feature.CLASH_DETECTION]: 'Detecção de colisões',
      [Feature.API_ACCESS]: 'Acesso à API',
      [Feature.PRIORITY_SUPPORT]: 'Suporte prioritário'
    };

    return features.slice(0, 10).map(f => `
      <div style="
        padding: 8px 12px;
        background: white;
        border-radius: 6px;
        font-size: 13px;
        color: #475569;
      ">
        ${featureNames[f] || f}
      </div>
    `).join('');
  }

  show(): void {
    this.modal.style.display = 'flex';
  }

  hide(): void {
    this.modal.style.display = 'none';
  }
}

/**
 * Bloqueio de feature com prompt de upgrade
 */
export class FeatureBlockOverlay {
  static show(feature: Feature): void {
    const plan = usePlan();
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 20000;
      animation: fadeIn 0.2s;
    `;

    overlay.innerHTML = `
      <div style="
        background: white;
        border-radius: 16px;
        padding: 40px;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      ">
        <div style="
          width: 80px;
          height: 80px;
          background: #eff6ff;
          color: #1d4ed8;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          font-size: 40px;
        ">
          PRO
        </div>
        
        <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 12px; color: #1e293b;">
          Recurso bloqueado
        </h2>
        
        <p style="color: #64748b; margin-bottom: 24px; line-height: 1.6;">
          Este recurso não está disponível no plano <strong>${plan.name}</strong>.
          Faça upgrade para desbloquear funcionalidades avançadas.
        </p>

        <button onclick="this.parentElement.parentElement.remove(); window.location.href='/pricing'" style="
          background: #2563eb;
          color: white;
          border: none;
          padding: 16px 32px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          margin-bottom: 12px;
          width: 100%;
        ">
          Ver planos
        </button>

        <button onclick="this.parentElement.parentElement.remove()" style="
          background: transparent;
          border: none;
          color: #64748b;
          padding: 12px;
          cursor: pointer;
          font-weight: 600;
        ">
          Voltar
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    // Auto-remove após 10 segundos
    setTimeout(() => {
      if (overlay.parentElement) {
        overlay.remove();
      }
    }, 10000);
  }
}

/**
 * Notificação de limite atingido
 */
export class LimitWarningToast {
  static show(limitKey: string, current: number, max: number): void {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 15000;
      max-width: 400px;
      animation: slideIn 0.3s;
    `;

    toast.innerHTML = `
      <div style="display: flex; align-items: start; gap: 12px;">
        <span style="font-size: 12px; font-weight: 700; color: #92400e; letter-spacing: 0.08em;">LIM</span>
        <div>
          <strong style="display: block; margin-bottom: 4px; color: #92400e;">
            Limite atingido
          </strong>
          <p style="color: #78350f; margin: 0; font-size: 14px; line-height: 1.5;">
            Você atingiu ${current} de ${max} ${limitKey}.
            Faça upgrade para aumentar seus limites.
          </p>
          <a href="/pricing" style="
            display: inline-block;
            margin-top: 8px;
            color: #2563eb;
            font-weight: 600;
            font-size: 13px;
            text-decoration: none;
          ">
            Ver planos →
          </a>
        </div>
      </div>
    `;

    document.body.appendChild(toast);

    // Auto-remove após 5 segundos
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }
}

// Adicionar animações CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
