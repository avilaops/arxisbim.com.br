/**
 * ShareModal Component - Compartilhar projeto
 * Integração real com backend APIs para gerenciamento de links públicos e membros
 */

import { Modal } from '../design-system/components/Modal.js';
import { Button } from '../design-system/components/Button.js';
import { Input } from '../design-system/components/Input.js';
import { Select } from '../design-system/components/Select.js';
import { SharingAPIService, SharedLink, ProjectMember } from '../../../../api/v1/services/sharing.service.js';

export class ShareModal {
  private modal: Modal;
  private projectId: string;
  private links: SharedLink[] = [];
  private members: ProjectMember[] = [];
  private activeTab: string = 'link';

  constructor() {
    this.projectId = localStorage.getItem('arxisvr_project_id') || '';

    this.modal = new Modal({
      title: '🔗 Compartilhar Projeto',
      size: 'lg',
      closeOnEscape: true
    });

    this.init();
    this.applyStyles();
  }

  private async init(): Promise<void> {
    if (this.projectId) {
      await this.loadData();
    }
    this.buildUI();
  }

  private async loadData(): Promise<void> {
    try {
      this.links = await SharingAPIService.listLinks(this.projectId);
      this.members = await SharingAPIService.listMembers(this.projectId);
    } catch (err) {
      console.error('Erro ao carregar dados do compartilhamento:', err);
    }
  }

  private buildUI(): void {
    const container = document.createElement('div');
    container.className = 'share-modal';

    // Tabs headers
    const tabsHeader = document.createElement('div');
    tabsHeader.className = 'share-tabs';

    const tabItems = [
      { id: 'link', label: '🔗 Links de Acesso' },
      { id: 'members', label: '👥 Membros do Projeto' }
    ];

    tabItems.forEach(tab => {
      const btn = document.createElement('button');
      btn.className = `share-tab-btn ${this.activeTab === tab.id ? 'active' : ''}`;
      btn.textContent = tab.label;
      btn.addEventListener('click', () => this.switchTab(tab.id));
      tabsHeader.appendChild(btn);
    });

    container.appendChild(tabsHeader);

    // Tab Content
    const contentArea = document.createElement('div');
    contentArea.className = 'share-tab-content';

    if (this.activeTab === 'link') {
      contentArea.appendChild(this.createLinkTab());
    } else {
      contentArea.appendChild(this.createMembersTab());
    }

    container.appendChild(contentArea);
    this.modal.setContent(container);
  }

  private switchTab(tabId: string): void {
    this.activeTab = tabId;
    this.buildUI();
  }

  /**
   * Links tab view
   */
  private createLinkTab(): HTMLElement {
    const tab = document.createElement('div');
    tab.className = 'share-tab-link';

    // 1. Create link form
    const form = document.createElement('div');
    form.className = 'share-create-form';
    form.innerHTML = `<h4>Gerar novo link público</h4>`;

    const levelSelect = new Select({
      label: 'Permissão',
      options: [
        { value: 'viewer', label: 'Visualizador (Somente Leitura)' },
        { value: 'commenter', label: 'Comentador (Visualização + Comentar)' }
      ],
      value: 'viewer'
    });

    const expirySelect = new Select({
      label: 'Expiração',
      options: [
        { value: '7', label: '7 dias' },
        { value: '30', label: '30 dias' },
        { value: '0', label: 'Nunca expira' }
      ],
      value: '7'
    });

    const createBtn = new Button({
      label: 'Gerar Link',
      variant: 'primary',
      onClick: async () => {
        const accessLevel = levelSelect.getElement().querySelector('select')?.value as 'viewer' | 'commenter' || 'viewer';
        const expiryDays = parseInt(expirySelect.getElement().querySelector('select')?.value || '7');

        try {
          await SharingAPIService.createLink(this.projectId, {
            accessLevel,
            expiresInDays: expiryDays > 0 ? expiryDays : undefined
          });
          this.showNotification('Link gerado com sucesso!');
          await this.loadData();
          this.buildUI();
        } catch (err) {
          alert('Erro ao gerar link: ' + err);
        }
      }
    });

    form.appendChild(levelSelect.getElement());
    form.appendChild(expirySelect.getElement());
    form.appendChild(createBtn.getElement());
    tab.appendChild(form);

    // 2. Active links list
    const listSection = document.createElement('div');
    listSection.className = 'share-links-list';
    listSection.innerHTML = `<h4>Links Ativos</h4>`;

    if (this.links.length === 0) {
      listSection.innerHTML += `<p class="empty-msg">Nenhum link ativo para este projeto.</p>`;
    } else {
      this.links.forEach(link => {
        const item = document.createElement('div');
        item.className = 'share-link-item';

        const linkUrl = `${window.location.origin}/shared.html?token=${link.token}`;
        
        const expiryLabel = link.expiresAt
          ? `Expira em: ${new Date(link.expiresAt).toLocaleDateString()}`
          : 'Nunca expira';

        item.innerHTML = `
          <div class="link-info">
            <span class="link-url-text">${linkUrl}</span>
            <span class="link-meta">${link.accessLevel.toUpperCase()} • ${expiryLabel} • Acessos: ${link.viewCount}</span>
          </div>
          <div class="link-actions">
            <button class="action-btn copy-btn" title="Copiar Link">📋</button>
            <button class="action-btn revoke-btn" title="Revogar Link">🗑️</button>
          </div>
        `;

        item.querySelector('.copy-btn')?.addEventListener('click', () => {
          navigator.clipboard.writeText(linkUrl).then(() => {
            this.showNotification('Link copiado!');
          });
        });

        item.querySelector('.revoke-btn')?.addEventListener('click', async () => {
          if (confirm('Revogar este link de compartilhamento imediatamente?')) {
            try {
              await SharingAPIService.revokeLink(this.projectId, link.token);
              this.showNotification('Link revogado!');
              await this.loadData();
              this.buildUI();
            } catch (err) {
              alert('Erro ao revogar: ' + err);
            }
          }
        });

        listSection.appendChild(item);
      });
    }

    tab.appendChild(listSection);
    return tab;
  }

  /**
   * Members tab view
   */
  private createMembersTab(): HTMLElement {
    const tab = document.createElement('div');
    tab.className = 'share-tab-members';

    // 1. Add member form
    const form = document.createElement('div');
    form.className = 'share-create-form';
    form.innerHTML = `<h4>Adicionar membro</h4>`;

    const userInput = new Input({
      label: 'ID do Usuário (UUID)',
      placeholder: 'Cole o ID do usuário',
      fullWidth: true
    });

    const roleSelect = new Select({
      label: 'Função',
      options: [
        { value: 'viewer', label: 'Visualizador' },
        { value: 'editor', label: 'Editor' },
        { value: 'admin', label: 'Administrador' }
      ],
      value: 'viewer'
    });

    const addBtn = new Button({
      label: 'Adicionar',
      variant: 'primary',
      onClick: async () => {
        const userUuid = userInput.getElement().querySelector('input')?.value.trim();
        const role = roleSelect.getElement().querySelector('select')?.value || 'viewer';

        if (!userUuid) {
          alert('Por favor insira o UUID do usuário');
          return;
        }

        try {
          await SharingAPIService.addMember(this.projectId, userUuid, role);
          this.showNotification('Membro adicionado!');
          await this.loadData();
          this.buildUI();
        } catch (err) {
          alert('Erro ao adicionar membro: ' + err);
        }
      }
    });

    form.appendChild(userInput.getElement());
    form.appendChild(roleSelect.getElement());
    form.appendChild(addBtn.getElement());
    tab.appendChild(form);

    // 2. Members list
    const listSection = document.createElement('div');
    listSection.className = 'share-links-list';
    listSection.innerHTML = `<h4>Membros Atuais</h4>`;

    if (this.members.length === 0) {
      listSection.innerHTML += `<p class="empty-msg">Nenhum membro vinculado.</p>`;
    } else {
      this.members.forEach(member => {
        const item = document.createElement('div');
        item.className = 'share-link-item';

        item.innerHTML = `
          <div class="link-info">
            <span class="link-url-text">${member.name || member.email || member.userId}</span>
            <span class="link-meta">Função: ${member.role.toUpperCase()}</span>
          </div>
          <div class="link-actions">
            <button class="action-btn remove-member-btn" title="Remover Membro">🗑️</button>
          </div>
        `;

        item.querySelector('.remove-member-btn')?.addEventListener('click', async () => {
          if (confirm('Remover este membro do projeto?')) {
            try {
              await SharingAPIService.removeMember(this.projectId, member.userId);
              this.showNotification('Membro removido!');
              await this.loadData();
              this.buildUI();
            } catch (err) {
              alert('Erro ao remover: ' + err);
            }
          }
        });

        listSection.appendChild(item);
      });
    }

    tab.appendChild(listSection);
    return tab;
  }

  private showNotification(message: string): void {
    const notification = document.createElement('div');
    notification.className = 'share-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2500);
  }

  public open(): void {
    this.modal.open();
  }

  public destroy(): void {
    this.modal.destroy();
  }

  private applyStyles(): void {
    if (document.getElementById('share-modal-styles-v2')) return;

    const style = document.createElement('style');
    style.id = 'share-modal-styles-v2';
    style.textContent = `
      .share-modal {
        display: flex;
        flex-direction: column;
        gap: 20px;
        color: #f8fafc;
        font-family: 'Inter', sans-serif;
      }
      .share-tabs {
        display: flex;
        gap: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 8px;
      }
      .share-tab-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        padding: 8px 12px;
        transition: color 0.2s, border-bottom 0.2s;
      }
      .share-tab-btn.active {
        color: #7c3aed;
        border-bottom: 2px solid #7c3aed;
      }
      .share-tab-btn:hover {
        color: #f1f5f9;
      }
      .share-create-form {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 20px;
      }
      .share-create-form h4 {
        margin: 0;
        font-size: 14px;
        color: #cbd5e1;
      }
      .share-links-list h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        color: #cbd5e1;
      }
      .share-link-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.04);
        border-radius: 6px;
        padding: 10px 12px;
        margin-bottom: 8px;
      }
      .link-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
        overflow: hidden;
      }
      .link-url-text {
        font-size: 13px;
        color: #7c3aed;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
      }
      .link-meta {
        font-size: 11px;
        color: #64748b;
      }
      .link-actions {
        display: flex;
        gap: 6px;
      }
      .action-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 4px;
        color: #cbd5e1;
        cursor: pointer;
        padding: 6px 8px;
        font-size: 14px;
        transition: background 0.2s;
      }
      .action-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #f8fafc;
      }
      .empty-msg {
        font-size: 12px;
        color: #64748b;
        text-align: center;
        padding: 16px;
      }
      .share-notification {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #10b981;
        color: #ffffff;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        z-index: 10001;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
      }
    `;
    document.head.appendChild(style);
  }
}

export function openShareModal(): ShareModal {
  const modal = new ShareModal();
  modal.open();
  return modal;
}
