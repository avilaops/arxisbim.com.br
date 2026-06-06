/**
 * Join Session entrypoint
 * URL: /join.html?token=<inviteToken>  or  /join/<inviteToken>
 *
 * Auth requirement: both host and guest MUST have an account (even free tier).
 * If not logged in, an auth wall is shown before the join form.
 */

import { resolveApiBaseUrl } from '../../config/apiBaseUrl';

const API = resolveApiBaseUrl();

function getToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  if (params.get('token')) return params.get('token');
  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] || null;
}

function getLoggedUser(): { id: string; name: string; email: string; plan?: string } | null {
  try {
    const u = localStorage.getItem('arxisvr_user');
    return u ? JSON.parse(u) : null;
  } catch { return null; }
}

// ── Auth wall ────────────────────────────────────────────────────────────────
function renderAuthWall(token: string, content: HTMLElement): void {
  content.innerHTML = `
    <h1>Você foi convidado</h1>
    <p class="auth-wall-desc">Para entrar nesta sessão colaborativa, você precisa ter uma conta ArxisVR.<br>É gratuito e leva menos de 1 minuto.</p>

    <div class="auth-tabs" id="auth-tabs">
      <button class="auth-tab active" data-tab="login">Já tenho conta</button>
      <button class="auth-tab" data-tab="register">Criar conta grátis</button>
    </div>

    <!-- LOGIN -->
    <div id="tab-login" class="auth-form">
      <div class="field">
        <label>E-mail</label>
        <input id="auth-email" type="email" placeholder="seu@email.com" autocomplete="email" />
      </div>
      <div class="field">
        <label>Senha</label>
        <input id="auth-password" type="password" placeholder="••••••••" autocomplete="current-password" />
      </div>
      <button id="auth-login-btn" class="btn-primary">Entrar →</button>
      <div class="status" id="auth-status" style="display:none"></div>
    </div>

    <!-- REGISTER -->
    <div id="tab-register" class="auth-form" style="display:none">
      <div class="field">
        <label>Nome completo</label>
        <input id="reg-name" type="text" placeholder="João Silva" autocomplete="name" />
      </div>
      <div class="field">
        <label>E-mail</label>
        <input id="reg-email" type="email" placeholder="seu@email.com" autocomplete="email" />
      </div>
      <div class="field">
        <label>Senha</label>
        <input id="reg-password" type="password" placeholder="Mínimo 8 caracteres" autocomplete="new-password" />
      </div>
      <p class="plan-note">✅ Plano <strong>Gratuito</strong> — acesso ao viewer e colaboração como convidado.</p>
      <button id="auth-register-btn" class="btn-primary">Criar conta e entrar →</button>
      <div class="status" id="reg-status" style="display:none"></div>
    </div>
  `;

  // Inject extra styles for auth wall
  if (!document.getElementById('auth-wall-styles')) {
    const s = document.createElement('style');
    s.id = 'auth-wall-styles';
    s.textContent = `
      .auth-wall-desc { color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 20px; }
      .auth-tabs { display: flex; gap: 4px; background: #0f172a; border-radius: 8px; padding: 4px; margin-bottom: 20px; }
      .auth-tab { flex: 1; padding: 8px 12px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; background: transparent; color: #64748b; transition: all .2s; }
      .auth-tab.active { background: #1e293b; color: #f1f5f9; }
      .auth-form { display: flex; flex-direction: column; gap: 14px; }
      .plan-note { font-size: 12px; color: #64748b; background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 8px 10px; margin: 0; }
      .plan-note strong { color: #34d399; }
    `;
    document.head.appendChild(s);
  }

  // Tab switching
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const which = (tab as HTMLElement).dataset.tab;
      (document.getElementById('tab-login') as HTMLElement).style.display = which === 'login' ? '' : 'none';
      (document.getElementById('tab-register') as HTMLElement).style.display = which === 'register' ? '' : 'none';
    });
  });

  // Login handler
  const loginBtn = document.getElementById('auth-login-btn') as HTMLButtonElement;
  const authStatus = document.getElementById('auth-status')!;
  loginBtn.addEventListener('click', async () => {
    const email = (document.getElementById('auth-email') as HTMLInputElement).value.trim();
    const password = (document.getElementById('auth-password') as HTMLInputElement).value;
    if (!email || !password) return;
    loginBtn.disabled = true;
    authStatus.className = 'status loading';
    authStatus.textContent = 'Entrando...';
    authStatus.style.display = 'block';
    try {
      const res = await fetch(`${API}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        authStatus.className = 'status error';
        authStatus.textContent = data.error ?? data.message ?? 'Credenciais inválidas.';
        loginBtn.disabled = false;
        return;
      }
      // Persist auth
      localStorage.setItem('arxisvr_token', data.accessToken ?? data.token ?? '');
      localStorage.setItem('arxisvr_user', JSON.stringify({
        id: data.user?.id ?? data.id,
        name: data.user?.name ?? data.name,
        email: data.user?.email ?? data.email,
        plan: data.user?.plan ?? data.plan ?? 'free',
      }));
      authStatus.className = 'status loading';
      authStatus.textContent = '✅ Autenticado!';
      setTimeout(() => renderJoinFormAuthenticated(token, content), 600);
    } catch {
      authStatus.className = 'status error';
      authStatus.textContent = 'Erro de conexão.';
      loginBtn.disabled = false;
    }
  });

  // Register handler
  const registerBtn = document.getElementById('auth-register-btn') as HTMLButtonElement;
  const regStatus = document.getElementById('reg-status')!;
  registerBtn.addEventListener('click', async () => {
    const name = (document.getElementById('reg-name') as HTMLInputElement).value.trim();
    const email = (document.getElementById('reg-email') as HTMLInputElement).value.trim();
    const password = (document.getElementById('reg-password') as HTMLInputElement).value;
    if (!name || !email || !password) return;
    registerBtn.disabled = true;
    regStatus.className = 'status loading';
    regStatus.textContent = 'Criando conta...';
    regStatus.style.display = 'block';
    try {
      const res = await fetch(`${API}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, plan: 'free' }),
      });
      const data = await res.json();
      if (!res.ok) {
        regStatus.className = 'status error';
        regStatus.textContent = data.error ?? data.message ?? 'Erro ao criar conta.';
        registerBtn.disabled = false;
        return;
      }
      localStorage.setItem('arxisvr_token', data.accessToken ?? data.token ?? '');
      localStorage.setItem('arxisvr_user', JSON.stringify({
        id: data.user?.id ?? data.id,
        name: data.user?.name ?? name,
        email: data.user?.email ?? email,
        plan: 'free',
      }));
      regStatus.className = 'status loading';
      regStatus.textContent = '✅ Conta criada!';
      setTimeout(() => renderJoinFormAuthenticated(token, content), 600);
    } catch {
      regStatus.className = 'status error';
      regStatus.textContent = 'Erro de conexão.';
      registerBtn.disabled = false;
    }
  });

  // Keyboard submit
  ['auth-email', 'auth-password'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') loginBtn.click();
    });
  });
  ['reg-name', 'reg-email', 'reg-password'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') registerBtn.click();
    });
  });

  (document.getElementById('auth-email') as HTMLInputElement)?.focus();
}

// ── Join form (shown only after authentication) ──────────────────────────────
function renderJoinFormAuthenticated(token: string, content: HTMLElement): void {
  const user = getLoggedUser();
  const shortId = token.startsWith('room_') ? token.slice(-8) : token.slice(0, 8);

  content.innerHTML = `
    <h1>Você foi convidado</h1>
    <div class="meta">
      <span>Sessão <strong>#${shortId}</strong></span>
      <span>Status: <strong>🟢 Em andamento</strong></span>
    </div>
    ${user ? `<p class="auth-wall-desc">Entrando como <strong style="color:#60a5fa">${user.name}</strong> (${user.email})</p>` : ''}
    <div class="field">
      <label>Seu nome na sessão</label>
      <input id="guest-name" type="text" placeholder="Ex: João Silva" autocomplete="name" value="${user?.name ?? ''}" />
    </div>
    <button id="join-btn">Entrar na sessão →</button>
    <div class="status" id="status-msg"></div>
  `;
  renderJoinForm(token, content);
}

async function init() {
  const token = getToken();
  const content = document.getElementById('content')!;

  if (!token || token === 'join') {
    content.innerHTML = `<div class="status error">Link de convite inválido.</div>`;
    return;
  }

  // ── Auth gate: require account (even free) before showing join form ─────────
  const loggedUser = getLoggedUser();
  if (!loggedUser) {
    renderAuthWall(token, content);
    return;
  }

  // ── Modo local: token room_XXX — pular API ──────────────────────────────────
  if (token.startsWith('room_')) {
    renderJoinFormAuthenticated(token, content);
    return;
  }

  // ── Modo backend: buscar info pública da sessão ─────────────────────────────
  let sessionInfo: any;
  try {
    const res = await fetch(`${API}/api/v1/sessions/join/${token}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      content.innerHTML = `<div class="status error">${err.error ?? 'Link expirado ou inválido.'}</div>`;
      return;
    }
    sessionInfo = await res.json();
  } catch {
    content.innerHTML = `<div class="status error">Não foi possível conectar ao servidor.</div>`;
    return;
  }

  content.innerHTML = `
    <h1>Você foi convidado</h1>
    <div class="meta">
      <span>Sessão <strong>#${sessionInfo.sessionId.slice(0, 8)}</strong></span>
      <span>Status: <strong>${sessionInfo.status === 'active' ? '🟢 Em andamento' : '🟡 Aguardando'}</strong></span>
    </div>
    <p class="auth-wall-desc">Entrando como <strong style="color:#60a5fa">${loggedUser.name}</strong></p>
    <div class="field">
      <label>Seu nome na sessão</label>
      <input id="guest-name" type="text" placeholder="Ex: João Silva" autocomplete="name" value="${loggedUser.name}" />
    </div>
    <button id="join-btn">Entrar na sessão →</button>
    <div class="status" id="status-msg"></div>
  `;
  renderJoinForm(token, content);
}

function renderJoinForm(token: string, _content: HTMLElement): void {
  const nameInput = document.getElementById('guest-name') as HTMLInputElement;
  const joinBtn = document.getElementById('join-btn') as HTMLButtonElement;
  const statusMsg = document.getElementById('status-msg')!;
  nameInput.focus();
  nameInput.select();

  const user = getLoggedUser();

  joinBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }

    joinBtn.disabled = true;
    statusMsg.className = 'status loading';
    statusMsg.textContent = 'Conectando...';
    statusMsg.style.display = 'block';

    // ── Modo local: room_XXX ──────────────────────────────────────────────────
    if (token.startsWith('room_')) {
      const guestId = user?.id ?? `guest_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem('arxisvr_guest_name', name);
      localStorage.setItem('arxisvr_session_id', token);
      localStorage.setItem('arxisvr_participant_id', guestId);
      localStorage.setItem('arxisvr_participant_role', 'viewer');
      localStorage.removeItem('arxisvr_session_token');
      localStorage.setItem('arxisvr_local_guest_id', guestId);
      statusMsg.textContent = '✅ Entrando...';
      setTimeout(() => { window.location.href = `/app.html?session=${token}`; }, 600);
      return;
    }

    // ── Modo backend ──────────────────────────────────────────────────────────
    try {
      const authToken = localStorage.getItem('arxisvr_token');
      const res = await fetch(`${API}/api/v1/sessions/join/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ guestName: name }),
      });

      const data = await res.json();
      if (!res.ok) {
        statusMsg.className = 'status error';
        statusMsg.textContent = data.error ?? 'Erro ao entrar na sessão.';
        joinBtn.disabled = false;
        return;
      }

      localStorage.setItem('arxisvr_session_token', data.accessToken);
      localStorage.setItem('arxisvr_session_id', data.sessionId);
      localStorage.setItem('arxisvr_participant_id', data.participant.id);
      localStorage.setItem('arxisvr_participant_role', data.participant.role);
      localStorage.setItem('arxisvr_guest_name', name);

      statusMsg.textContent = '✅ Entrando...';
      setTimeout(() => { window.location.href = `/app.html?session=${data.sessionId}`; }, 600);
    } catch {
      statusMsg.className = 'status error';
      statusMsg.textContent = 'Erro de conexão.';
      joinBtn.disabled = false;
    }
  });

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinBtn.click();
  });
}

init();
