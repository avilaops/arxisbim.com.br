// WorkspacePanel — gerência de workspaces e convites (Fase 2 multi-tenant).
// Trocar workspace ativo, criar workspace, convidar membros, aceitar convites.
const API_BASE_URL = (() => {
  if (typeof window !== 'undefined' && window.env && window.env.VITE_API_URL) return window.env.VITE_API_URL;
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return 'http://localhost:3001';
    return 'https://api.arxisvr.avilaops.com';
  }
  return 'http://localhost:3001';
})();

const esc = (s) => String(s == null ? '' : s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

class WorkspacePanel {
  constructor() {
    this.el = null;
    this.workspaces = [];
    this.invites = [];
  }

  _token() { return localStorage.getItem('arxisvr_token') || ''; }
  _authGet() { return { Authorization: 'Bearer ' + this._token() }; }
  _authJson() { return { Authorization: 'Bearer ' + this._token(), 'Content-Type': 'application/json' }; }

  async _fetchAll() {
    const [w, i] = await Promise.all([
      fetch(`${API_BASE_URL}/api/v1/workspaces`, { headers: this._authGet() }).then((r) => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API_BASE_URL}/api/v1/invites`, { headers: this._authGet() }).then((r) => r.ok ? r.json() : []).catch(() => []),
    ]);
    this.workspaces = Array.isArray(w) ? w : [];
    this.invites = Array.isArray(i) ? i : [];
  }

  async open() {
    if (!this.el) this._mount();
    this.el.style.display = 'flex';
    this._renderBody('<div style="padding:24px;text-align:center;color:#9CA3AF">Carregando…</div>');
    await this._fetchAll();
    this._render();
  }

  close() { if (this.el) this.el.style.display = 'none'; }

  _mount() {
    const overlay = document.createElement('div');
    overlay.id = 'workspace-panel';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.5);display:none;align-items:stretch;justify-content:flex-end';
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this.close(); });

    const panel = document.createElement('div');
    panel.style.cssText = 'width:420px;max-width:100vw;height:100%;background:#15151f;border-left:1px solid rgba(255,255,255,.08);box-shadow:-20px 0 60px rgba(0,0,0,.5);display:flex;flex-direction:column;color:#F9FAFB;font-family:DM Sans,sans-serif';
    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid rgba(255,255,255,.07)">
        <strong style="font-size:16px">Workspaces</strong>
        <button id="ws-close" style="background:none;border:none;color:#9CA3AF;font-size:20px;cursor:pointer">×</button>
      </div>
      <div id="ws-body" style="flex:1;overflow:auto;padding:18px 20px"></div>`;
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    this.el = overlay;
    panel.querySelector('#ws-close').addEventListener('click', () => this.close());
  }

  _renderBody(html) { this.el.querySelector('#ws-body').innerHTML = html; }

  _render() {
    const activeTenant = localStorage.getItem('arxisvr_tenant_id') || this._tokenTenant();
    const canInviteWs = this.workspaces.filter((w) => w.role === 'owner' || w.role === 'admin');

    const invitesHtml = this.invites.length ? `
      <div style="margin-bottom:22px">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6B7280;margin-bottom:10px">Convites pendentes</div>
        ${this.invites.map((i) => `
          <div style="background:rgba(124,58,237,.1);border:1px solid rgba(124,58,237,.3);border-radius:10px;padding:12px;margin-bottom:8px">
            <div style="font-weight:600">${esc(i.name || i.tenantId)}</div>
            <div style="font-size:12px;color:#9CA3AF;margin-bottom:8px">Convidado como ${esc(i.role)}</div>
            <button data-accept="${esc(i.token)}" style="padding:7px 14px;background:linear-gradient(135deg,#2563EB,#7C3AED);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">Aceitar</button>
            <button data-decline="${esc(i.token)}" style="padding:7px 14px;background:transparent;color:#9CA3AF;border:1px solid rgba(255,255,255,.14);border-radius:8px;font-size:13px;cursor:pointer;margin-left:6px">Recusar</button>
          </div>`).join('')}
      </div>` : '';

    const wsListHtml = `
      <div style="margin-bottom:22px">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6B7280;margin-bottom:10px">Meus workspaces</div>
        ${this.workspaces.length ? this.workspaces.map((w) => {
          const active = w.tenantId === activeTenant;
          return `<div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.04);border:1px solid ${active ? 'rgba(96,165,250,.5)' : 'rgba(255,255,255,.07)'};border-radius:10px;padding:12px;margin-bottom:8px">
            <div>
              <div style="font-weight:600">${esc(w.name)} ${active ? '<span style="color:#34D399;font-size:11px">● ativo</span>' : ''}</div>
              <div style="font-size:12px;color:#9CA3AF">${esc(w.role)}</div>
            </div>
            ${active ? '' : `<button data-switch="${esc(w.tenantId)}" style="padding:6px 12px;background:rgba(37,99,235,.15);color:#93C5FD;border:1px solid rgba(37,99,235,.3);border-radius:8px;font-size:12px;cursor:pointer">Entrar</button>`}
          </div>`;
        }).join('') : '<div style="color:#9CA3AF;font-size:13px">Nenhum workspace.</div>'}
      </div>`;

    const createHtml = `
      <div style="margin-bottom:22px">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6B7280;margin-bottom:10px">Criar workspace</div>
        <div style="display:flex;gap:8px">
          <input id="ws-new-name" placeholder="Nome do workspace" style="flex:1;padding:10px;background:#1e1e2e;border:1px solid rgba(255,255,255,.14);border-radius:8px;color:#fff;font-size:13px">
          <button id="ws-create" style="padding:10px 16px;background:linear-gradient(135deg,#2563EB,#7C3AED);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">Criar</button>
        </div>
      </div>`;

    const inviteHtml = canInviteWs.length ? `
      <div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6B7280;margin-bottom:10px">Convidar para um workspace</div>
        <select id="ws-inv-ws" style="width:100%;padding:10px;background:#1e1e2e;border:1px solid rgba(255,255,255,.14);border-radius:8px;color:#fff;font-size:13px;margin-bottom:8px">
          ${canInviteWs.map((w) => `<option value="${esc(w.tenantId)}">${esc(w.name)}</option>`).join('')}
        </select>
        <div style="display:flex;gap:8px">
          <input id="ws-inv-email" type="email" placeholder="email@convidado.com" style="flex:1;padding:10px;background:#1e1e2e;border:1px solid rgba(255,255,255,.14);border-radius:8px;color:#fff;font-size:13px">
          <select id="ws-inv-role" style="padding:10px;background:#1e1e2e;border:1px solid rgba(255,255,255,.14);border-radius:8px;color:#fff;font-size:13px">
            <option value="member">Membro</option>
            <option value="admin">Admin</option>
            <option value="viewer">Visualizador</option>
          </select>
          <button id="ws-invite" style="padding:10px 16px;background:rgba(37,99,235,.15);color:#93C5FD;border:1px solid rgba(37,99,235,.3);border-radius:8px;font-size:13px;cursor:pointer">Convidar</button>
        </div>
        <div id="ws-inv-status" style="font-size:12px;margin-top:8px"></div>
      </div>` : '';

    this._renderBody(invitesHtml + wsListHtml + createHtml + inviteHtml);
    this._wire();
  }

  _tokenTenant() {
    try {
      const p = JSON.parse(decodeURIComponent(atob(this._token().split('.')[1].replace(/-/g, '+').replace(/_/g, '/')).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
      return p.tenantId || '';
    } catch { return ''; }
  }

  _wire() {
    const body = this.el.querySelector('#ws-body');
    body.querySelectorAll('[data-switch]').forEach((b) => b.addEventListener('click', () => this._switch(b.getAttribute('data-switch'))));
    body.querySelectorAll('[data-accept]').forEach((b) => b.addEventListener('click', () => this._accept(b.getAttribute('data-accept'))));
    body.querySelectorAll('[data-decline]').forEach((b) => b.addEventListener('click', () => this._decline(b.getAttribute('data-decline'))));
    const createBtn = body.querySelector('#ws-create');
    if (createBtn) createBtn.addEventListener('click', () => this._create());
    const invBtn = body.querySelector('#ws-invite');
    if (invBtn) invBtn.addEventListener('click', () => this._invite());
  }

  async _switch(tenantId) {
    const r = await fetch(`${API_BASE_URL}/api/v1/workspaces/${tenantId}/switch`, { method: 'POST', headers: this._authGet() });
    const data = await r.json().catch(() => ({}));
    if (r.ok && data.token) {
      localStorage.setItem('arxisvr_token', data.token);
      localStorage.setItem('arxisvr_tenant_id', tenantId);
      window.location.reload();
    } else { alert(data.error || 'Não foi possível trocar de workspace.'); }
  }

  async _accept(token) {
    const r = await fetch(`${API_BASE_URL}/api/v1/invites/${token}/accept`, { method: 'POST', headers: this._authGet() });
    if (r.ok) { await this._fetchAll(); this._render(); }
    else { const d = await r.json().catch(() => ({})); alert(d.error || 'Falha ao aceitar.'); }
  }

  async _decline(token) {
    await fetch(`${API_BASE_URL}/api/v1/invites/${token}/decline`, { method: 'POST', headers: this._authGet() }).catch(() => {});
    await this._fetchAll(); this._render();
  }

  async _create() {
    const input = this.el.querySelector('#ws-new-name');
    const name = (input.value || '').trim();
    if (!name) { input.focus(); return; }
    const r = await fetch(`${API_BASE_URL}/api/v1/workspaces`, { method: 'POST', headers: this._authJson(), body: JSON.stringify({ name }) });
    if (r.ok) { await this._fetchAll(); this._render(); }
    else { const d = await r.json().catch(() => ({})); alert(d.error || 'Falha ao criar workspace.'); }
  }

  async _invite() {
    const ws = this.el.querySelector('#ws-inv-ws').value;
    const email = (this.el.querySelector('#ws-inv-email').value || '').trim();
    const role = this.el.querySelector('#ws-inv-role').value;
    const status = this.el.querySelector('#ws-inv-status');
    if (!email) { status.style.color = '#F87171'; status.textContent = 'Informe um email.'; return; }
    status.style.color = '#9CA3AF'; status.textContent = 'Enviando…';
    const r = await fetch(`${API_BASE_URL}/api/v1/workspaces/${ws}/invites`, { method: 'POST', headers: this._authJson(), body: JSON.stringify({ email, role }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok) { status.style.color = '#34D399'; status.textContent = '✅ Convite enviado para ' + email; this.el.querySelector('#ws-inv-email').value = ''; }
    else { status.style.color = '#F87171'; status.textContent = d.error || 'Falha ao convidar.'; }
  }
}

export { WorkspacePanel };
