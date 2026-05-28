/**
 * ShareModal Component - Compartilhar projeto
 * Geração de links e código embed
 */

import { Modal } from '../design-system/components/Modal';
import { Button } from '../design-system/components/Button';
import { Input } from '../design-system/components/Input';
import { Toggle } from '../design-system/components/Toggle';
import { Select } from '../design-system/components/Select';

export interface ShareSettings {
  allowComments: boolean;
  allowMeasurements: boolean;
  allowDownload: boolean;
  expiresIn: number; // dias (0 = nunca)
  password: string;
  accessLevel: 'public' | 'private' | 'restricted';
}

export class ShareModal {
  private modal: Modal;
  private shareLink: string = '';
  private embedCode: string = '';
  private settings: ShareSettings;

  constructor() {
    this.settings = {
      allowComments: true,
      allowMeasurements: true,
      allowDownload: false,
      expiresIn: 30,
      password: '',
      accessLevel: 'private'
    };

    this.modal = new Modal({
      title: '🔗 Compartilhar Projeto',
      size: 'md',
      closeOnEscape: true
    });

    this.generateShareLink();
    this.buildUI();
    this.applyStyles();
  }

  /**
   * Gera link de compartilhamento
   */
  private generateShareLink(): void {
    const projectId = Math.random().toString(36).substring(2, 10);
    const baseUrl = window.location.origin;
    this.shareLink = `${baseUrl}/view/${projectId}`;
    
    this.embedCode = `<iframe 
  src="${this.shareLink}?embed=true" 
  width="800" 
  height="600" 
  frameborder="0" 
  allowfullscreen>
</iframe>`;
  }

  /**
   * Constrói a UI
   */
  private buildUI(): void {
    const container = document.createElement('div');
    container.className = 'share-modal';

    // Tabs
    const tabs = this.createTabs();
    container.appendChild(tabs);

    // Tab contents
    const linkTab = this.createLinkTab();
    const embedTab = this.createEmbedTab();
    const settingsTab = this.createSettingsTab();

    linkTab.classList.add('share-tab--active');

    container.appendChild(linkTab);
    container.appendChild(embedTab);
    container.appendChild(settingsTab);

    this.modal.setContent(container);
  }

  /**
   * Cria tabs
   */
  private createTabs(): HTMLElement {
    const tabs = document.createElement('div');
    tabs.className = 'share-tabs';

    const tabItems = [
      { id: 'link', label: '🔗 Link', icon: '🔗' },
      { id: 'embed', label: '📦 Embed', icon: '📦' },
      { id: 'settings', label: '⚙️ Configurações', icon: '⚙️' }
    ];

    tabItems.forEach((tab, index) => {
      const btn = new Button({
        label: tab.label,
        variant: index === 0 ? 'primary' : 'ghost',
        size: 'sm',
        onClick: () => this.switchTab(tab.id)
      });

      const tabEl = btn.getElement();
      tabEl.setAttribute('data-tab', tab.id);
      tabs.appendChild(tabEl);
    });

    return tabs;
  }

  /**
   * Switch tab
   */
  private switchTab(tabId: string): void {
    // Update buttons
    const btns = this.modal.getElement().querySelectorAll('[data-tab]');
    btns.forEach(btn => {
      const btnTabId = btn.getAttribute('data-tab');
      if (btnTabId === tabId) {
        btn.classList.add('arxis-btn--primary');
        btn.classList.remove('arxis-btn--ghost');
      } else {
        btn.classList.add('arxis-btn--ghost');
        btn.classList.remove('arxis-btn--primary');
      }
    });

    // Update content
    const tabs = this.modal.getElement().querySelectorAll('.share-tab');
    tabs.forEach(tab => {
      const contentTabId = tab.getAttribute('data-tab-content');
      tab.classList.toggle('share-tab--active', contentTabId === tabId);
    });
  }

  /**
   * Cria tab de link
   */
  private createLinkTab(): HTMLElement {
    const tab = document.createElement('div');
    tab.className = 'share-tab';
    tab.setAttribute('data-tab-content', 'link');

    const description = document.createElement('p');
    description.className = 'share-description';
    description.textContent = 'Compartilhe este link para visualização do projeto:';
    tab.appendChild(description);

    // Link display
    const linkContainer = document.createElement('div');
    linkContainer.className = 'share-link-container';

    const linkInput = new Input({
      value: this.shareLink,
      fullWidth: true,
      readonly: true
    });

    const copyBtn = new Button({
      label: '📋',
      variant: 'primary',
      onClick: () => this.copyToClipboard(this.shareLink, 'Link copiado!')
    });

    linkContainer.appendChild(linkInput.getElement());
    linkContainer.appendChild(copyBtn.getElement());
    tab.appendChild(linkContainer);

    // Quick share buttons
    const quickShare = document.createElement('div');
    quickShare.className = 'share-quick-buttons';

    const shareButtons = [
      { label: 'Email', icon: '📧', action: () => this.shareViaEmail() },
      { label: 'WhatsApp', icon: '💬', action: () => this.shareViaWhatsApp() },
      { label: 'Teams', icon: '👥', action: () => this.shareViaTeams() },
      { label: 'Slack', icon: '💼', action: () => this.shareViaSlack() }
    ];

    shareButtons.forEach(btn => {
      const button = new Button({
        label: `${btn.icon} ${btn.label}`,
        variant: 'ghost',
        size: 'sm',
        onClick: btn.action
      });
      quickShare.appendChild(button.getElement());
    });

    tab.appendChild(quickShare);

    // QR Code
    const qrSection = document.createElement('div');
    qrSection.className = 'share-qr-section';
    qrSection.innerHTML = `
      <div class="share-qr-title">QR Code</div>
      <div class="share-qr-code">
        <div class="share-qr-placeholder">📱</div>
        <div class="share-qr-text">Escaneie para visualizar</div>
      </div>
    `;
    tab.appendChild(qrSection);

    return tab;
  }

  /**
   * Cria tab de embed
   */
  private createEmbedTab(): HTMLElement {
    const tab = document.createElement('div');
    tab.className = 'share-tab';
    tab.setAttribute('data-tab-content', 'embed');

    const description = document.createElement('p');
    description.className = 'share-description';
    description.textContent = 'Incorpore o visualizador em seu site:';
    tab.appendChild(description);

    // Embed code
    const codeContainer = document.createElement('div');
    codeContainer.className = 'share-code-container';

    const codeArea = document.createElement('textarea');
    codeArea.className = 'share-code-textarea';
    codeArea.value = this.embedCode;
    codeArea.readOnly = true;
    codeContainer.appendChild(codeArea);

    const copyBtn = new Button({
      label: '📋 Copiar Código',
      variant: 'primary',
      fullWidth: true,
      onClick: () => this.copyToClipboard(this.embedCode, 'Código copiado!')
    });
    codeContainer.appendChild(copyBtn.getElement());

    tab.appendChild(codeContainer);

    // Preview
    const previewSection = document.createElement('div');
    previewSection.className = 'share-preview-section';
    previewSection.innerHTML = `
      <div class="share-preview-title">Preview</div>
      <div class="share-preview-frame">
        <div class="share-preview-mockup">
          <div class="share-preview-header"></div>
          <div class="share-preview-content">🏗️ Visualizador BIM</div>
        </div>
      </div>
    `;
    tab.appendChild(previewSection);

    return tab;
  }

  /**
   * Cria tab de configurações
   */
  private createSettingsTab(): HTMLElement {
    const tab = document.createElement('div');
    tab.className = 'share-tab';
    tab.setAttribute('data-tab-content', 'settings');

    const description = document.createElement('p');
    description.className = 'share-description';
    description.textContent = 'Configure as permissões de visualização:';
    tab.appendChild(description);

    // Access level
    const accessSelect = new Select({
      label: 'Nível de Acesso',
      options: [
        { value: 'public', label: '🌐 Público - Qualquer pessoa com o link' },
        { value: 'private', label: '🔒 Privado - Apenas usuários autorizados' },
        { value: 'restricted', label: '🔐 Restrito - Requer senha' }
      ],
      value: this.settings.accessLevel,
      onChange: (value) => {
        this.settings.accessLevel = value as any;
      }
    });
    tab.appendChild(accessSelect.getElement());

    // Expiration
    const expiresSelect = new Select({
      label: 'Expiração do Link',
      options: [
        { value: '1', label: '1 dia' },
        { value: '7', label: '7 dias' },
        { value: '30', label: '30 dias' },
        { value: '90', label: '90 dias' },
        { value: '0', label: 'Nunca expira' }
      ],
      value: this.settings.expiresIn.toString(),
      onChange: (value) => {
        this.settings.expiresIn = parseInt(value);
      }
    });
    tab.appendChild(expiresSelect.getElement());

    // Password (if restricted)
    const passwordInput = new Input({
      label: 'Senha (opcional)',
      type: 'password',
      placeholder: 'Digite uma senha',
      fullWidth: true,
      onChange: (value) => {
        this.settings.password = value;
      }
    });
    tab.appendChild(passwordInput.getElement());

    // Permissions toggles
    const permissionsTitle = document.createElement('div');
    permissionsTitle.className = 'share-section-title';
    permissionsTitle.textContent = 'Permissões';
    tab.appendChild(permissionsTitle);

    const permissions = [
      { key: 'allowComments', label: 'Permitir comentários' },
      { key: 'allowMeasurements', label: 'Permitir medições' },
      { key: 'allowDownload', label: 'Permitir download' }
    ];

    permissions.forEach(({ key, label }) => {
      const toggle = new Toggle({
        label,
        checked: (this.settings as any)[key],
        onChange: (checked) => {
          (this.settings as any)[key] = checked;
        }
      });
      tab.appendChild(toggle.getElement());
    });

    return tab;
  }

  /**
   * Copia para clipboard
   */
  private copyToClipboard(text: string, message: string): void {
    navigator.clipboard.writeText(text).then(() => {
      console.log(`✅ ${message}`);
      // Feedback visual
      const notification = document.createElement('div');
      notification.className = 'share-notification';
      notification.textContent = message;
      document.body.appendChild(notification);
      
      setTimeout(() => notification.remove(), 2000);
    });
  }

  /**
   * Compartilha via email
   */
  private shareViaEmail(): void {
    const subject = encodeURIComponent('Visualize este projeto BIM');
    const body = encodeURIComponent(`Confira este projeto: ${this.shareLink}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }

  /**
   * Compartilha via WhatsApp
   */
  private shareViaWhatsApp(): void {
    const text = encodeURIComponent(`Visualize este projeto BIM: ${this.shareLink}`);
    window.open(`https://wa.me/?text=${text}`);
  }

  /**
   * Compartilha via Teams
   */
  private shareViaTeams(): void {
    const url = encodeURIComponent(this.shareLink);
    window.open(`https://teams.microsoft.com/share?url=${url}`);
  }

  /**
   * Compartilha via Slack
   */
  private shareViaSlack(): void {
    const url = encodeURIComponent(this.shareLink);
    window.open(`https://slack.com/intl/pt-br/share?url=${url}`);
  }

  /**
   * Abre o modal
   */
  public open(): void {
    this.modal.open();
  }

  /**
   * Aplica estilos CSS
   */
  private applyStyles(): void {
    if (document.getElementById('share-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'share-modal-styles';
    style.textContent = `
      .share-modal {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .share-tabs {
        display: flex;
        gap: 8px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .share-tab {
        display: none;
        flex-direction: column;
        gap: 16px;
      }

      .share-tab--active {
        display: flex;
      }

      .share-description {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.7);
        margin: 0;
      }

      .share-link-container {
        display: flex;
        gap: 8px;
      }

      .share-link-container .arxis-input-container {
        flex: 1;
      }

      .share-quick-buttons {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }

      .share-qr-section {
        margin-top: 8px;
      }

      .share-qr-title {
        font-size: 13px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 12px;
      }

      .share-qr-code {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 24px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        border: 2px dashed rgba(255, 255, 255, 0.2);
      }

      .share-qr-placeholder {
        font-size: 64px;
        margin-bottom: 8px;
      }

      .share-qr-text {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }

      .share-code-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .share-code-textarea {
        width: 100%;
        height: 120px;
        padding: 12px;
        background: rgba(20, 20, 20, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        color: var(--theme-accent, #00ff88);
        font-family: 'Courier New', monospace;
        font-size: 11px;
        resize: vertical;
      }

      .share-preview-section {
        margin-top: 8px;
      }

      .share-preview-title {
        font-size: 13px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 12px;
      }

      .share-preview-frame {
        padding: 16px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
      }

      .share-preview-mockup {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        overflow: hidden;
      }

      .share-preview-header {
        height: 30px;
        background: rgba(255, 255, 255, 0.05);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .share-preview-content {
        padding: 40px;
        text-align: center;
        font-size: 14px;
        color: rgba(255, 255, 255, 0.6);
      }

      .share-section-title {
        font-size: 14px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
        margin-top: 8px;
      }

      .share-notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 24px;
        background: rgba(0, 255, 136, 0.9);
        color: #000;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 600;
        z-index: 10001;
        animation: share-notification-show 0.3s ease;
      }

      @keyframes share-notification-show {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Destrói o modal
   */
  public destroy(): void {
    this.modal.destroy();
  }
}

/**
 * Helper para abrir modal de compartilhamento
 */
export function openShareModal(): ShareModal {
  const modal = new ShareModal();
  modal.open();
  return modal;
}
