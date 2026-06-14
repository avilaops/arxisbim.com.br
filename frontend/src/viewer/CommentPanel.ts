import * as THREE from 'three';
import { CommentsAPIService, ElementComment } from '../api/v1/services/comments.service';
import type { ViewerHost } from './ViewerHost';

export class CommentPanel {
  private container: HTMLElement;
  private viewerHost: ViewerHost;
  private panelEl: HTMLElement | null = null;

  // State
  private projectId: string = '';
  private selectedExpressID: number | null = null;
  private selectedGlobalId: string | null = null;
  private selectedWorldPosition: { x: number; y: number; z: number } | null = null;

  private comments: ElementComment[] = [];
  private loading: boolean = false;
  private error: string | null = null;
  private isCollapsed: boolean = true;
  private activeReplyCommentId: string | null = null;

  // Listeners callbacks
  private onSelectUnsubscribe?: () => void;
  private markerClickListener?: (e: Event) => void;

  constructor(container: HTMLElement, viewerHost: ViewerHost) {
    this.container = container;
    this.viewerHost = viewerHost;
    this.projectId = localStorage.getItem('arxisvr_project_id') || '';

    this.init();
  }

  private init(): void {
    this.injectStyles();

    // Create panel container
    this.panelEl = document.createElement('div');
    this.panelEl.className = 'bim-comment-panel collapsed';
    this.container.appendChild(this.panelEl);

    // Initial render
    this.render();

    // Hook up Viewer Selection change
    this.onSelectUnsubscribe = this.viewerHost.onSelect((expressID) => {
      this.handleElementSelected(expressID);
    });

    // Hook up marker clicks
    this.markerClickListener = (e: Event) => {
      const { commentId, globalId } = (e as CustomEvent).detail;
      this.isCollapsed = false;
      this.activeReplyCommentId = null;

      // Find express ID in scene corresponding to the globalId to select it
      if (globalId) {
        let foundExpressID: number | null = null;
        this.viewerHost.scene.traverse((child) => {
          if (foundExpressID !== null) return;
          if ((child.userData as any)?.globalId === globalId || (child.userData as any)?.ifcGuid === globalId) {
            const id = (child.userData as any)?.expressID ?? Number(child.name);
            if (typeof id === 'number' && Number.isFinite(id)) {
              foundExpressID = id;
            }
          }
        });
        if (foundExpressID !== null) {
          this.viewerHost.selectByExpressId(foundExpressID);
        }
      }

      this.loadComments();
    };
    window.addEventListener('comment-marker-clicked', this.markerClickListener);
  }

  private handleElementSelected(expressID: number | null): void {
    this.selectedExpressID = expressID;
    this.activeReplyCommentId = null;

    if (expressID) {
      const object = this.viewerHost.scene.getObjectByName(String(expressID));
      if (object) {
        this.selectedGlobalId =
          (object.userData as any)?.globalId ||
          (object.userData as any)?.ifcGuid ||
          object.name ||
          null;

        const box = new THREE.Box3().setFromObject(object);
        if (!box.isEmpty()) {
          const center = new THREE.Vector3();
          box.getCenter(center);
          this.selectedWorldPosition = { x: center.x, y: center.y, z: center.z };
        } else {
          this.selectedWorldPosition = null;
        }
      } else {
        this.selectedGlobalId = null;
        this.selectedWorldPosition = null;
      }

      // Automatically expand panel when element is selected
      this.isCollapsed = false;
      this.loadComments();
    } else {
      this.selectedGlobalId = null;
      this.selectedWorldPosition = null;
      this.comments = [];
      this.render();
    }
  }

  private async loadComments(): Promise<void> {
    if (!this.projectId) return;

    this.loading = true;
    this.error = null;
    this.render();

    try {
      // Load comments for the selected element
      const list = await CommentsAPIService.list(this.projectId, this.selectedGlobalId || undefined);
      this.comments = list;
    } catch (err: any) {
      this.error = 'Erro ao carregar comentários.';
      console.error(err);
    } finally {
      this.loading = false;
      this.render();
    }
  }

  private async addComment(body: string, parentId?: string): Promise<void> {
    if (!this.projectId || !body.trim()) return;

    try {
      const params = {
        body,
        parentId,
        globalId: this.selectedGlobalId || undefined,
        worldPosition: this.selectedWorldPosition || undefined,
      };

      await CommentsAPIService.create(this.projectId, params);
      this.activeReplyCommentId = null;
      
      // Notify markers overlay to refresh sprites
      window.dispatchEvent(new CustomEvent('comments-updated'));

      await this.loadComments();
    } catch (err: any) {
      alert('Erro ao salvar comentário: ' + (err.message || err));
    }
  }

  private async toggleResolve(commentId: string): Promise<void> {
    if (!this.projectId) return;

    try {
      await CommentsAPIService.toggleResolve(this.projectId, commentId);
      
      // Notify markers overlay to refresh sprites
      window.dispatchEvent(new CustomEvent('comments-updated'));

      await this.loadComments();
    } catch (err: any) {
      alert('Erro ao alterar status: ' + (err.message || err));
    }
  }

  private async deleteComment(commentId: string): Promise<void> {
    if (!this.projectId || !confirm('Excluir este comentário definitivamente?')) return;

    try {
      await CommentsAPIService.delete(this.projectId, commentId);
      
      // Notify markers overlay to refresh sprites
      window.dispatchEvent(new CustomEvent('comments-updated'));

      await this.loadComments();
    } catch (err: any) {
      alert('Erro ao excluir comentário: ' + (err.message || err));
    }
  }

  private injectStyles(): void {
    if (document.getElementById('bim-comment-styles')) return;

    const style = document.createElement('style');
    style.id = 'bim-comment-styles';
    style.textContent = `
      .bim-comment-panel {
        position: absolute;
        top: 24px;
        right: 24px;
        z-index: 20;
        background: rgba(15, 23, 42, 0.82);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 16px;
        width: 340px;
        max-height: calc(100vh - 120px);
        display: flex;
        flex-direction: column;
        color: #f8fafc;
        font-family: 'Inter', -apple-system, sans-serif;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        gap: 12px;
        box-sizing: border-box;
      }

      .bim-comment-panel.collapsed {
        width: 48px;
        height: 48px;
        padding: 0;
        overflow: hidden;
        border-radius: 50%;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        display: flex;
        background: rgba(15, 23, 42, 0.85);
        border-color: rgba(124, 58, 237, 0.4);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }

      .bim-comment-panel.collapsed:hover {
        background: rgba(30, 41, 59, 0.9);
        border-color: rgba(124, 58, 237, 0.8);
        transform: scale(1.05);
      }

      .bim-comment-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        padding-bottom: 8px;
        user-select: none;
      }

      .bim-comment-title {
        font-size: 14px;
        font-weight: 700;
        color: #f1f5f9;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .bim-comment-title svg {
        color: #7c3aed;
      }

      .bim-comment-close-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 4px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s, color 0.2s;
      }

      .bim-comment-close-btn:hover {
        background: rgba(255, 255, 255, 0.06);
        color: #f1f5f9;
      }

      .bim-comment-body {
        display: flex;
        flex-direction: column;
        gap: 12px;
        overflow-y: auto;
        flex: 1;
        padding-right: 2px;
      }

      .bim-comment-body::-webkit-scrollbar {
        width: 4px;
      }
      .bim-comment-body::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 4px;
      }

      .bim-comment-empty {
        text-align: center;
        padding: 24px 16px;
        font-size: 13px;
        color: #94a3b8;
      }

      /* Thread List styles */
      .bim-comment-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .bim-comment-item {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .bim-comment-item.resolved {
        opacity: 0.65;
        border-color: rgba(16, 185, 129, 0.2);
        background: rgba(16, 185, 129, 0.02);
      }

      .bim-comment-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        color: #94a3b8;
      }

      .bim-comment-author {
        font-weight: 600;
        color: #f1f5f9;
      }

      .bim-comment-actions {
        display: flex;
        gap: 8px;
      }

      .bim-comment-action-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 2px;
        display: flex;
        align-items: center;
        transition: color 0.2s;
      }

      .bim-comment-action-btn:hover {
        color: #f1f5f9;
      }

      .bim-comment-action-btn.resolve-btn:hover {
        color: #10b981;
      }

      .bim-comment-action-btn.delete-btn:hover {
        color: #ef4444;
      }

      .bim-comment-text {
        font-size: 13px;
        line-height: 1.5;
        word-break: break-word;
      }

      .bim-comment-text mark {
        background: rgba(124, 58, 237, 0.25);
        color: #c084fc;
        padding: 0 2px;
        border-radius: 3px;
        font-weight: 600;
      }

      .bim-comment-resolution {
        font-size: 11px;
        color: #10b981;
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 2px;
        font-weight: 600;
      }

      /* Nested replies */
      .bim-comment-replies {
        margin-left: 14px;
        border-left: 2px solid rgba(255, 255, 255, 0.06);
        padding-left: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 4px;
      }

      .bim-reply-item {
        background: rgba(255, 255, 255, 0.015);
        border: 1px solid rgba(255, 255, 255, 0.03);
        border-radius: 6px;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      /* Reply form inside comments */
      .bim-comment-reply-form {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 6px;
      }

      /* Main Form */
      .bim-comment-form {
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        padding-top: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .bim-comment-textarea {
        background: rgba(30, 41, 59, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 6px;
        padding: 8px 10px;
        color: #f1f5f9;
        font-size: 13px;
        min-height: 50px;
        resize: vertical;
        outline: none;
        font-family: inherit;
        box-sizing: border-box;
        width: 100%;
      }

      .bim-comment-textarea:focus {
        border-color: rgba(124, 58, 237, 0.5);
        background: rgba(30, 41, 59, 0.8);
      }

      .bim-comment-submit-btn {
        background: linear-gradient(135deg, #7c3aed, #6d28d9);
        border: none;
        color: #ffffff;
        font-size: 12px;
        font-weight: 600;
        padding: 8px 14px;
        border-radius: 6px;
        cursor: pointer;
        transition: opacity 0.2s, transform 0.1s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }

      .bim-comment-submit-btn:hover {
        opacity: 0.95;
      }

      .bim-comment-submit-btn:active {
        transform: scale(0.98);
      }

      .bim-comment-spinner {
        width: 12px;
        height: 12px;
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-top-color: #ffffff;
        border-radius: 50%;
        animation: bim-comment-spin 0.8s linear infinite;
        display: inline-block;
      }

      @keyframes bim-comment-spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  private render(): void {
    if (!this.panelEl) return;

    if (this.isCollapsed) {
      this.panelEl.classList.add('collapsed');
      this.panelEl.innerHTML = `
        <div class="bim-comment-toggle" title="Anotações e Comentários">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
      `;

      const toggleBtn = this.panelEl.querySelector('.bim-comment-toggle');
      toggleBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isCollapsed = false;
        this.render();
        this.loadComments();
      });
      return;
    }

    this.panelEl.classList.remove('collapsed');

    let bodyHtml = '';

    if (!this.selectedExpressID) {
      bodyHtml = `
        <div class="bim-comment-empty">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:8px; opacity:0.5;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <p>Selecione um elemento IFC no modelo para visualizar ou adicionar anotações.</p>
        </div>
      `;
    } else {
      if (this.loading && this.comments.length === 0) {
        bodyHtml = `
          <div class="bim-comment-empty">
            <span class="bim-comment-spinner" style="width:24px; height:24px;"></span>
            <p>Carregando comentários...</p>
          </div>
        `;
      } else if (this.error) {
        bodyHtml = `
          <div class="bim-comment-empty" style="color:#f87171">
            <p>${this.error}</p>
          </div>
        `;
      } else {
        const commentListHtml = this.comments.map(c => this.renderCommentItem(c)).join('');

        bodyHtml = `
          <div class="bim-comment-list">
            ${commentListHtml || '<div class="bim-comment-empty" style="padding:12px 0;">Sem anotações neste elemento ainda.</div>'}
          </div>

          <div class="bim-comment-form">
            <textarea id="new-comment-body" class="bim-comment-textarea" placeholder="Adicione uma anotação... Use @nome para mencionar"></textarea>
            <button id="submit-comment-btn" class="bim-comment-submit-btn">Adicionar Anotação</button>
          </div>
        `;
      }
    }

    const elementTag = this.selectedExpressID ? `Elemento #${this.selectedExpressID}` : 'Comentários';

    this.panelEl.innerHTML = `
      <div class="bim-comment-header">
        <div class="bim-comment-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>${elementTag}</span>
        </div>
        <button class="bim-comment-close-btn" title="Fechar Painel">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="bim-comment-body">
        ${bodyHtml}
      </div>
    `;

    // Hook up expanded panel events
    const closeBtn = this.panelEl.querySelector('.bim-comment-close-btn');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.isCollapsed = true;
      this.render();
    });

    if (this.selectedExpressID && !this.loading && !this.error) {
      const textarea = this.panelEl.querySelector('#new-comment-body') as HTMLTextAreaElement;
      const submitBtn = this.panelEl.querySelector('#submit-comment-btn');

      // Submit main comment
      submitBtn?.addEventListener('click', () => {
        if (textarea && textarea.value.trim()) {
          this.addComment(textarea.value);
        }
      });

      // Submit on Enter (Cmd/Ctrl + Enter)
      textarea?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          if (textarea.value.trim()) {
            this.addComment(textarea.value);
          }
        }
      });

      // Bind actions (Resolve, Delete, Reply toggle, Reply submit)
      this.bindCommentActions();
    }
  }

  /**
   * Helper to format dates nicely
   */
  private formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  /**
   * Parse text and wrap @username mentions in <mark> tags
   */
  private formatCommentBody(body: string): string {
    // Escape HTML to prevent XSS
    const escaped = body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // Wrap @mentions
    return escaped.replace(
      /@([a-zA-Z0-9_.-]+(?:@[a-zA-Z0-9_.-]+\.[a-zA-Z]{2,})?)/g,
      '<mark>@$1</mark>'
    );
  }

  /**
   * Renders a comment item including its thread of replies
   */
  private renderCommentItem(comment: ElementComment): string {
    const formattedDate = this.formatDate(comment.createdAt);
    const bodyHtml = this.formatCommentBody(comment.body);
    const resolvedClass = comment.isResolved ? 'resolved' : '';

    // Render replies
    const repliesHtml = comment.replies
      .map(r => {
        const replyDate = this.formatDate(r.createdAt);
        const replyBody = this.formatCommentBody(r.body);
        return `
          <div class="bim-reply-item">
            <div class="bim-comment-meta">
              <span class="bim-comment-author">${r.authorName}</span>
              <div style="display:flex; gap:6px; align-items:center;">
                <span>${replyDate}</span>
                <button class="bim-comment-action-btn delete-btn" data-comment-id="${r.id}" title="Excluir Resposta">
                  🗑️
                </button>
              </div>
            </div>
            <div class="bim-comment-text">${replyBody}</div>
          </div>
        `;
      })
      .join('');

    // Check if reply input is currently toggled open for this comment
    const isReplyActive = this.activeReplyCommentId === comment.id;

    const replyFormHtml = isReplyActive
      ? `
        <div class="bim-comment-reply-form">
          <textarea id="reply-textarea-${comment.id}" class="bim-comment-textarea" placeholder="Sua resposta..."></textarea>
          <div style="display:flex; gap:6px;">
            <button class="bim-comment-submit-btn submit-reply-btn" data-parent-id="${comment.id}">Responder</button>
            <button class="bim-comment-submit-btn cancel-reply-btn" style="background:#475569" data-parent-id="${comment.id}">Cancelar</button>
          </div>
        </div>
      `
      : `
        <button class="bim-comment-submit-btn toggle-reply-btn" style="background:rgba(255,255,255,0.06); color:#cbd5e1; border:1px solid rgba(255,255,255,0.08); font-size:11px;" data-comment-id="${comment.id}">
          💬 Responder
        </button>
      `;

    return `
      <div class="bim-comment-item ${resolvedClass}">
        <div class="bim-comment-meta">
          <span class="bim-comment-author">${comment.authorName}</span>
          <div class="bim-comment-actions">
            <span>${formattedDate}</span>
            
            <button class="bim-comment-action-btn resolve-btn" data-comment-id="${comment.id}" title="${comment.isResolved ? 'Reabrir Anotação' : 'Marcar como Concluído'}">
              ${comment.isResolved ? '🔄' : '✅'}
            </button>

            <button class="bim-comment-action-btn delete-btn" data-comment-id="${comment.id}" title="Excluir Anotação">
              🗑️
            </button>
          </div>
        </div>
        
        <div class="bim-comment-text">${bodyHtml}</div>
        
        ${comment.isResolved ? `
          <div class="bim-comment-resolution">
            ✓ Resolvido por ${comment.resolvedByName || 'Membro'}
          </div>
        ` : ''}

        ${repliesHtml ? `<div class="bim-comment-replies">${repliesHtml}</div>` : ''}

        <div style="margin-top: 8px;">
          ${replyFormHtml}
        </div>
      </div>
    `;
  }

  /**
   * Bind event listeners to dynamic list items
   */
  private bindCommentActions(): void {
    if (!this.panelEl) return;

    // Resolve buttons
    const resolveBtns = this.panelEl.querySelectorAll('.resolve-btn');
    resolveBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const commentId = btn.getAttribute('data-comment-id');
        if (commentId) this.toggleResolve(commentId);
      });
    });

    // Delete buttons (covers both comments and replies)
    const deleteBtns = this.panelEl.querySelectorAll('.delete-btn');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const commentId = btn.getAttribute('data-comment-id');
        if (commentId) this.deleteComment(commentId);
      });
    });

    // Toggle Reply form buttons
    const toggleReplyBtns = this.panelEl.querySelectorAll('.toggle-reply-btn');
    toggleReplyBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const commentId = btn.getAttribute('data-comment-id');
        if (commentId) {
          this.activeReplyCommentId = commentId;
          this.render();
          setTimeout(() => {
            const el = this.panelEl?.querySelector(`#reply-textarea-${commentId}`) as HTMLElement;
            el?.focus();
          }, 50);
        }
      });
    });

    // Cancel Reply form buttons
    const cancelReplyBtns = this.panelEl.querySelectorAll('.cancel-reply-btn');
    cancelReplyBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.activeReplyCommentId = null;
        this.render();
      });
    });

    // Submit Reply buttons
    const submitReplyBtns = this.panelEl.querySelectorAll('.submit-reply-btn');
    submitReplyBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const parentId = btn.getAttribute('data-parent-id');
        if (parentId) {
          const textEl = this.panelEl?.querySelector(`#reply-textarea-${parentId}`) as HTMLTextAreaElement;
          if (textEl && textEl.value.trim()) {
            this.addComment(textEl.value, parentId);
          }
        }
      });
    });
  }

  public destroy(): void {
    if (this.onSelectUnsubscribe) {
      this.onSelectUnsubscribe();
    }
    if (this.markerClickListener) {
      window.removeEventListener('comment-marker-clicked', this.markerClickListener);
    }
    this.panelEl?.remove();
    this.panelEl = null;
  }
}
