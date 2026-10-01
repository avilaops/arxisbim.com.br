(() => {
  const api = "/avila/api";
  const state = { module: new URLSearchParams(location.search).get("module") || "insights", days: 7 };
  const moduleTitles = {
    insights: "Insights", config: "Variables", spaces: "Projects", roles: "Roles",
    vault: "External secrets", environments: "Environments", sso: "SSO",
    directory: "LDAP", events: "Log streaming", copilot: "AI Assistant",
  };
  const content = document.querySelector("[data-content]");
  const title = document.querySelector("[data-page-title]");
  const user = document.querySelector("[data-user]");
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const number = (value) => new Intl.NumberFormat("pt-BR").format(Number(value || 0));
  const percent = (value, total) => total ? `${(100 * Number(value) / Number(total)).toFixed(1).replace(".", ",")}%` : "0%";
  const duration = (value) => Number(value) < 1 ? `${Math.round(Number(value) * 1000)} ms` : `${Number(value).toFixed(1).replace(".", ",")} s`;

  function loginUrl() {
    return `https://auth.avilaops.com/login?app=n8n&returnTo=${encodeURIComponent(location.href)}`;
  }

  async function request(path, options = {}) {
    const browserId = new URLSearchParams(location.hash.slice(1)).get("browserId") || localStorage.getItem("n8n-browserId") || "";
    const response = await fetch(`${api}${path}`, {
      credentials: "same-origin",
      ...options,
      headers: { "Content-Type": "application/json", ...(browserId ? { "browser-id": browserId } : {}), ...(options.headers || {}) },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const error = new Error(body.error || `Erro ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return response.status === 204 ? null : response.json();
  }

  function showError(error) {
    const denied = error.status === 401 || error.status === 403;
    content.innerHTML = `<section class="empty-state"><span class="empty-icon">${denied ? "◎" : "!"}</span><h2>${esc(error.message)}</h2><p>${denied ? "Use sua conta da equipe Ávila Ops para abrir os módulos do n8n." : "O serviço de validação não respondeu. Tente novamente em instantes."}</p><div class="empty-actions">${denied ? `<a class="button primary" href="${esc(loginUrl())}">Entrar com Ávila Ops</a>` : ""}<button class="button" data-retry>Tentar novamente</button></div></section>`;
    content.querySelector("[data-retry]")?.addEventListener("click", render);
  }

  function loading() {
    content.innerHTML = '<div class="loading"><i></i><span>Carregando dados reais</span></div>';
  }

  function formatDate(value) {
    if (!value) return "Sem expiração";
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(value));
  }

  function variableDialog(variable = null) {
    const dialog = document.createElement("dialog");
    dialog.className = "config-dialog";
    dialog.innerHTML = `<form method="dialog" data-config-form>
      <div class="dialog-head"><div><p class="eyebrow">${variable ? "Nova versão" : "Nova configuração"}</p><h3>${variable ? `Editar ${esc(variable.name)}` : "Criar variável"}</h3></div><button class="icon-button" value="cancel" aria-label="Fechar">×</button></div>
      <div class="form-grid">
        <label class="span-2">Nome<input name="name" required maxlength="80" pattern="[A-Za-z][A-Za-z0-9_]*" placeholder="MINHA_VARIAVEL" value="${esc(variable?.name || "")}"><small>Letras, números e sublinhado. O nome será salvo em maiúsculas.</small></label>
        <label>Tipo<select name="kind"><option value="text">Texto</option><option value="number">Número</option><option value="boolean">Booleano</option><option value="json">JSON</option></select></label>
        <label>Classificação<select name="sensitivity"><option value="low">Baixa</option><option value="internal">Interna</option><option value="confidential">Confidencial</option></select></label>
        <label>Escopo<select name="scopeType"><option value="global">Global</option><option value="space">Projeto</option><option value="environment">Ambiente</option></select></label>
        <label>Chave do escopo<input name="scopeKey" maxlength="80" placeholder="produção" value="${esc(variable?.scope_key === "global" ? "" : variable?.scope_key || "")}"></label>
        <label class="span-2">Valor<textarea name="value" required rows="5" spellcheck="false">${esc(variable?.value || "")}</textarea><small>Segredos não são aceitos aqui. Use External secrets.</small></label>
        <label class="span-2">Descrição<input name="description" maxlength="240" placeholder="Para que esta configuração é usada" value="${esc(variable?.description || "")}"></label>
        <label>Responsável<input name="ownerName" maxlength="120" placeholder="Equipe ou pessoa" value="${esc(variable?.owner_name || "")}"></label>
        <label>Expira em<input name="expiresAt" type="datetime-local" value="${variable?.expires_at ? esc(new Date(variable.expires_at).toISOString().slice(0, 16)) : ""}"></label>
        <label class="span-2">Schema JSON opcional<textarea name="schemaJson" rows="3" spellcheck="false" placeholder='{"type":"object"}'>${variable?.schema_json ? esc(JSON.stringify(variable.schema_json, null, 2)) : ""}</textarea></label>
      </div>
      <p class="form-error" data-form-error></p>
      <div class="dialog-actions"><button class="button" value="cancel">Cancelar</button><button class="button primary" value="default" data-save>Salvar</button></div>
    </form>`;
    document.body.appendChild(dialog);
    const form = dialog.querySelector("[data-config-form]");
    const kind = form.elements.kind;
    const sensitivity = form.elements.sensitivity;
    const scopeType = form.elements.scopeType;
    kind.value = variable?.kind || "text";
    sensitivity.value = variable?.sensitivity || "internal";
    scopeType.value = variable?.scope_type || "global";
    const syncScope = () => {
      const input = form.elements.scopeKey;
      input.disabled = scopeType.value === "global";
      input.required = scopeType.value !== "global";
      if (input.disabled) input.value = "";
    };
    scopeType.addEventListener("change", syncScope);
    syncScope();
    dialog.addEventListener("close", () => dialog.remove());
    form.addEventListener("submit", async (event) => {
      const submitter = event.submitter;
      if (submitter?.value === "cancel") return;
      event.preventDefault();
      const save = form.querySelector("[data-save]");
      const error = form.querySelector("[data-form-error]");
      save.disabled = true;
      save.textContent = "Salvando...";
      error.textContent = "";
      const data = new FormData(form);
      const payload = Object.fromEntries(data.entries());
      try {
        await request(variable ? `/variables/${variable.id}` : "/variables", {
          method: variable ? "PUT" : "POST",
          body: JSON.stringify(payload),
        });
        dialog.close();
        await renderConfig();
      } catch (failure) {
        error.textContent = failure.message;
        save.disabled = false;
        save.textContent = "Salvar";
      }
    });
    dialog.showModal();
  }

  async function renderInsights() {
    title.textContent = "Insights";
    const data = await request(`/insights?days=${state.days}`);
    const totals = data.totals;
    const max = Math.max(1, ...data.daily.map((item) => Number(item.total)));
    const failure = Number(totals.failed) / (Number(totals.total) || 1);
    const bars = data.daily.map((item) => `<div class="bar-day" title="${esc(item.day)}: ${item.success} sucessos e ${item.failed} falhas"><div class="bars"><i class="success" style="height:${100 * Number(item.success) / max}%"></i><i class="failure" style="height:${100 * Number(item.failed) / max}%"></i></div><span>${esc(item.day.slice(5).replace("-", "/"))}</span></div>`).join("");
    const rows = data.workflows.map((workflow) => {
      const rate = Number(workflow.failed) / (Number(workflow.total) || 1);
      return `<tr class="clickable-row" data-workflow="${esc(workflow.id)}" tabindex="0"><td><button class="workflow-link" data-workflow="${esc(workflow.id)}">${esc(workflow.name)}<span>Investigar →</span></button></td><td>${number(workflow.total)}</td><td>${number(workflow.failed)}</td><td><span class="status ${rate > 0.2 ? "bad" : "good"}">${percent(workflow.failed, workflow.total)}</span></td><td>${duration(workflow.avg_seconds)}</td></tr>`;
    }).join("");

    content.innerHTML = `<div class="section-head"><div><p class="eyebrow">Operação em produção</p><h2>Saúde das automações</h2></div><label>Período<select data-days><option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option></select></label></div><div class="metrics"><article><span>Execuções</span><strong>${number(totals.total)}</strong><small>em produção</small></article><article><span>Sucessos</span><strong class="green">${number(totals.success)}</strong><small>${percent(totals.success, totals.total)} do total</small></article><article><span>Falhas</span><strong class="red">${number(totals.failed)}</strong><small>${percent(totals.failed, totals.total)} do total</small></article><article><span>Duração média</span><strong>${duration(totals.avg_seconds)}</strong><small>por execução</small></article></div><div class="split"><article class="panel"><div class="panel-title"><h3>Execuções por dia</h3><span><i class="legend success"></i>Sucesso <i class="legend failure"></i>Falha</span></div><div class="chart">${bars}</div></article><article class="panel pulse"><span>Taxa de falha</span><strong class="${failure > 0.2 ? "red" : "green"}">${percent(totals.failed, totals.total)}</strong><p>${failure > 0.2 ? "A operação precisa de atenção. A lista abaixo prioriza os fluxos com maior impacto." : "A operação está em uma faixa saudável no período."}</p></article></div><article class="panel table-panel"><div class="panel-title"><h3>Workflows que precisam de atenção</h3><span>Ordenados por falhas</span></div><div class="table-wrap"><table><thead><tr><th>Workflow</th><th>Execuções</th><th>Falhas</th><th>Taxa</th><th>Média</th></tr></thead><tbody>${rows || '<tr><td colspan="5">Sem execuções no período.</td></tr>'}</tbody></table></div></article>`;
    content.querySelector(".section-head")?.insertAdjacentHTML("afterend", `<article class="audit-strip audit-strip-top"><span>Fonte</span><strong>PostgreSQL do n8n</strong><span>Tabelas</span><strong>execution_entity + workflow_entity</strong><span>Atualização</span><strong>ao abrir ou trocar o período</strong></article>`);
    const select = content.querySelector("[data-days]");
    select.value = String(state.days);
    select.addEventListener("change", () => { state.days = Number(select.value); loading(); renderInsights().catch(showError); });
    content.querySelectorAll("[data-workflow]").forEach((element) => element.addEventListener("click", (event) => {
      event.stopPropagation();
      loading();
      renderWorkflow(element.dataset.workflow).catch(showError);
    }));
  }

  async function renderWorkflow(workflowId) {
    const data = await request(`/insights/workflows/${encodeURIComponent(workflowId)}?days=${state.days}`);
    const workflow = data.workflow;
    const totals = data.totals;
    title.textContent = workflow.name;
    const rows = data.executions.map((execution) => {
      const elapsed = execution.stopped_at ? (new Date(execution.stopped_at) - new Date(execution.started_at)) / 1000 : 0;
      return `<tr class="clickable-row" data-execution="${execution.id}" tabindex="0"><td><button class="execution-link" data-execution="${execution.id}">#${execution.id}<span>${new Intl.DateTimeFormat("pt-BR", { dateStyle:"short", timeStyle:"medium", timeZone:"America/Sao_Paulo" }).format(new Date(execution.started_at))}</span></button></td><td><span class="status ${execution.status === "success" ? "good" : execution.status === "error" || execution.status === "crashed" ? "bad" : ""}">${esc(execution.status)}</span></td><td>${esc(execution.mode)}</td><td>${duration(elapsed)}</td><td>${execution.retry_of ? `repetição de #${esc(execution.retry_of)}` : "Original"}</td><td><span class="investigate">Ver detalhes →</span></td></tr>`;
    }).join("");
    content.innerHTML = `<div class="detail-nav"><button class="back-button" data-back-insights>← Insights</button><a class="native-link" href="/workflow/${esc(workflow.id)}" target="_top">Abrir workflow no n8n ↗</a></div>
      <div class="section-head"><div><p class="eyebrow">Evidência do período</p><h2>${esc(workflow.name)}</h2><p>${workflow.active ? "Workflow ativo" : "Workflow inativo"} · atualizado em ${formatDate(workflow.updated_at)}</p></div></div>
      <div class="metrics compact"><article><span>Execuções</span><strong>${number(totals.total)}</strong></article><article><span>Sucessos</span><strong class="green">${number(totals.success)}</strong></article><article><span>Falhas</span><strong class="red">${number(totals.failed)}</strong></article><article><span>P95</span><strong>${duration(totals.p95_seconds)}</strong></article></div>
      <article class="panel table-panel"><div class="panel-title"><h3>Execuções reais</h3><span>Últimas 40 no período · clique para abrir a causa</span></div><div class="table-wrap"><table><thead><tr><th>Execução</th><th>Status</th><th>Origem</th><th>Duração</th><th>Tentativa</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="6">Sem execuções no período.</td></tr>'}</tbody></table></div></article>`;
    content.querySelector("[data-back-insights]")?.addEventListener("click", () => { loading(); renderInsights().catch(showError); });
    content.querySelectorAll("[data-execution]").forEach((element) => element.addEventListener("click", (event) => {
      event.stopPropagation();
      loading();
      renderExecution(element.dataset.execution, workflowId).catch(showError);
    }));
  }

  async function renderExecution(executionId, workflowId) {
    const execution = await request(`/insights/executions/${encodeURIComponent(executionId)}`);
    title.textContent = `Execução #${execution.id}`;
    const elapsed = execution.stoppedAt ? (new Date(execution.stoppedAt) - new Date(execution.startedAt)) / 1000 : 0;
    const steps = execution.remediation.steps.map((step, index) => `<li><span>${index + 1}</span><p>${esc(step)}</p></li>`).join("");
    content.innerHTML = `<div class="detail-nav"><button class="back-button" data-back-workflow>← Voltar às execuções</button><a class="native-link" href="${esc(execution.nativeUrl)}" target="_top">Abrir execução no n8n ↗</a></div>
      <div class="execution-header"><div><p class="eyebrow">Evidência auditável</p><h2>Execução #${esc(execution.id)}</h2><p>${formatDate(execution.startedAt)} · ${duration(elapsed)} · ${esc(execution.mode)}</p></div><span class="status large ${execution.status === "success" ? "good" : "bad"}">${esc(execution.status)}</span></div>
      <div class="investigation-grid"><article class="panel error-evidence"><div class="panel-title"><h3>Causa registrada pelo n8n</h3><span>Nenhum payload é exibido</span></div><dl><div><dt>Nó afetado</dt><dd>${esc(execution.failingNode || execution.lastNode || "Não informado")}</dd></div><div><dt>Mensagem</dt><dd>${esc(execution.message)}</dd></div>${execution.description ? `<div><dt>Detalhe</dt><dd>${esc(execution.description)}</dd></div>` : ""}</dl></article>
      <article class="panel repair-guide"><p class="eyebrow">Diagnóstico orientado</p><h3>${esc(execution.remediation.title)}</h3><ol>${steps}</ol><p class="repair-disclaimer">A orientação é derivada da mensagem real. A correção só deve ser aplicada após conferir o nó e testar uma execução controlada.</p></article></div>
      <article class="audit-strip"><span>Fonte</span><strong>detalhe autenticado do n8n</strong><span>Workflow</span><strong>${esc(execution.workflowId)}</strong><span>Execução</span><strong>#${esc(execution.id)}</strong></article>`;
    content.querySelector("[data-back-workflow]")?.addEventListener("click", () => { loading(); renderWorkflow(workflowId).catch(showError); });
  }

  async function renderConfig() {
    title.textContent = "Variables";
    const data = await request("/variables");
    const rows = data.variables.map((variable) => `<tr>
      <td><strong>${esc(variable.name)}</strong><small>${esc(variable.description || "Sem descrição")}</small></td>
      <td><span class="tag">${esc(variable.kind)}</span></td>
      <td><span class="scope-dot ${esc(variable.scope_type)}"></span>${variable.scope_type === "global" ? "Global" : `${variable.scope_type === "space" ? "Projeto" : "Ambiente"}: ${esc(variable.scope_key)}`}</td>
      <td><code class="value-preview">${variable.sensitivity === "confidential" ? "••••••••" : esc(variable.value)}</code></td>
      <td><strong>v${number(variable.version)}</strong><small>${formatDate(variable.expires_at)}</small></td>
      <td><div class="row-actions"><button class="icon-button" data-history="${esc(variable.id)}" title="Histórico">↺</button><button class="icon-button" data-edit="${esc(variable.id)}" title="Editar">✎</button><button class="icon-button danger" data-delete="${esc(variable.id)}" title="Excluir">×</button></div></td>
    </tr>`).join("");
    content.innerHTML = `<div class="section-head config-heading"><div><p class="eyebrow">Configuração central</p><h2>Variables</h2><p>Valores reutilizáveis, com escopo e histórico. Segredos ficam em External secrets.</p></div><button class="button primary" data-new-variable>Nova variável</button></div>
      <div class="config-summary"><span><strong>${number(data.variables.length)}</strong> ativas</span><span><strong>${number(data.variables.filter((item) => item.scope_type === "global").length)}</strong> globais</span><span><strong>${number(data.variables.filter((item) => item.expires_at).length)}</strong> com expiração</span></div>
      <article class="panel table-panel"><div class="panel-title"><h3>Configurações persistidas</h3><span>Alterações criam uma versão auditável</span></div><div class="table-wrap"><table><thead><tr><th>Nome</th><th>Tipo</th><th>Escopo</th><th>Valor</th><th>Versão</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="6"><div class="compact-empty"><strong>Nenhuma variável criada</strong><span>Crie a primeira configuração reutilizável para seus workflows.</span></div></td></tr>'}</tbody></table></div></article>`;
    content.querySelector("[data-new-variable]")?.addEventListener("click", () => variableDialog());
    content.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => {
      variableDialog(data.variables.find((item) => item.id === button.dataset.edit));
    }));
    content.querySelectorAll("[data-history]").forEach((button) => button.addEventListener("click", async () => {
      const variable = data.variables.find((item) => item.id === button.dataset.history);
      if (!variable) return;
      try {
        const history = await request(`/variables/${variable.id}/versions`);
        const dialog = document.createElement("dialog");
        dialog.className = "config-dialog history-dialog";
        const versions = history.versions.map((version) => `<li><div><strong>v${number(version.version)} · ${esc(version.change_type)}</strong><small>${formatDate(version.changed_at)} · ${esc(version.actor_email || "sistema")}</small></div>${Number(version.version) === Number(variable.version) ? '<span class="current-version">Atual</span>' : version.change_type === "deleted" ? '<span class="current-version muted">Excluída</span>' : `<button class="button" data-rollback="${number(version.version)}">Restaurar</button>`}</li>`).join("");
        dialog.innerHTML = `<div class="dialog-history-head"><div><p class="eyebrow">Histórico auditável</p><h3>${esc(variable.name)}</h3></div><button class="icon-button" data-close-history aria-label="Fechar">×</button></div><ol class="version-list">${versions}</ol>`;
        document.body.appendChild(dialog);
        dialog.querySelector("[data-close-history]").addEventListener("click", () => dialog.close());
        dialog.addEventListener("close", () => dialog.remove());
        dialog.querySelectorAll("[data-rollback]").forEach((rollback) => rollback.addEventListener("click", async () => {
          const version = Number(rollback.dataset.rollback);
          if (!confirm(`Restaurar ${variable.name} para a versão ${version}? Uma nova versão será criada.`)) return;
          rollback.disabled = true;
          try {
            await request(`/variables/${variable.id}/rollback`, { method: "POST", body: JSON.stringify({ version }) });
            dialog.close();
            await renderConfig();
          } catch (failure) {
            rollback.disabled = false;
            alert(failure.message);
          }
        }));
        dialog.showModal();
      } catch (failure) {
        showError(failure);
      }
    }));
    content.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", async () => {
      const variable = data.variables.find((item) => item.id === button.dataset.delete);
      if (!variable || !confirm(`Excluir ${variable.name}? O histórico será preservado para auditoria.`)) return;
      try {
        await request(`/variables/${variable.id}`, { method: "DELETE" });
        await renderConfig();
      } catch (failure) {
        showError(failure);
      }
    }));
  }

  async function renderRoles(me) {
    title.textContent = "Permissões";
    const [integrity, audit] = await Promise.all([request("/v1/audit/verify"), request("/v1/audit?limit=12")]);
    const capabilityLabels = {
      "platform.admin": "Administrar plataforma", "insights.read": "Visualizar Insights",
      "config.read": "Visualizar configurações", "config.confidential.read": "Ler itens confidenciais", "config.write": "Alterar configurações", "audit.read": "Consultar auditoria",
    };
    const capabilities = (me.capabilities || []).map((item) => `<li><span>✓</span><div><strong>${esc(capabilityLabels[item] || item)}</strong><small>${esc(item)}</small></div></li>`).join("");
    const events = (audit.events || []).map((event) => `<tr><td><strong>${esc(event.action)}</strong><small>${esc(event.resource_type)} · ${esc(event.resource_id)}</small></td><td>${esc(event.actor_email || event.actor_id)}</td><td>${formatDate(event.occurred_at)}</td><td><code>#${number(event.sequence)}</code></td></tr>`).join("");
    content.innerHTML = `<div class="section-head roles-heading"><div><p class="eyebrow">Controle de acesso próprio</p><h2>Permissões efetivas</h2><p>As decisões são aplicadas no backend. Esconder um botão nunca concede nem remove acesso.</p></div><span class="integrity ${integrity.valid ? "is-valid" : "is-broken"}">${integrity.valid ? "Cadeia íntegra" : "Auditoria inconsistente"}</span></div>
      <div class="roles-grid"><article class="panel identity-card"><p class="eyebrow">Identidade sincronizada</p><div class="identity-person"><span>${esc((me.nome || "A").slice(0,1).toUpperCase())}</span><div><h3>${esc(me.nome)}</h3><p>${esc(me.email)}</p></div></div><dl><div><dt>Papel de origem</dt><dd>${esc(me.role)}</dd></div><div><dt>Principal</dt><dd><code>${esc(me.principalId)}</code></dd></div><div><dt>Organização</dt><dd>Ávila Ops</dd></div></dl></article>
      <article class="panel capabilities-card"><div class="panel-title"><h3>Capacidades concedidas</h3><span>${number(me.capabilities?.length)} ativas</span></div><ul>${capabilities || "<li>Nenhuma capacidade concedida.</li>"}</ul></article></div>
      <article class="panel table-panel"><div class="panel-title"><h3>Trilha de auditoria</h3><span>${number(integrity.events)} eventos · SHA-256 encadeado</span></div><div class="table-wrap"><table><thead><tr><th>Ação</th><th>Ator</th><th>Quando</th><th>Sequência</th></tr></thead><tbody>${events || '<tr><td colspan="4">Nenhum evento registrado.</td></tr>'}</tbody></table></div></article>`;
  }

  function renderPlaceholder() {
    const name = moduleTitles[state.module] || "Módulo Ávila";
    title.textContent = name;
    content.innerHTML = `<section class="empty-state"><span class="empty-icon">A</span><p class="eyebrow">Substituto próprio no local nativo</p><h2>${esc(name)}</h2><p>Este módulo já ocupa o ponto original do n8n. A implementação funcional será liberada por etapas, conforme o blueprint da Ávila Ops.</p></section>`;
  }

  async function render() {
    loading();
    try {
      const me = await request("/me");
      user.innerHTML = `<span>${esc((me.nome || "A").slice(0, 1).toUpperCase())}</span><div><strong>${esc(me.nome)}</strong><small>${esc(me.email)}</small></div>`;
      if (state.module === "config") await renderConfig();
      else if (state.module === "insights") await renderInsights();
      else if (state.module === "roles") await renderRoles(me);
      else renderPlaceholder();
    } catch (error) {
      showError(error);
    }
  }

  document.querySelectorAll("[data-module]").forEach((button) => button.addEventListener("click", () => {
    if (button.querySelector("small")) return;
    state.module = button.dataset.module;
    document.querySelectorAll("[data-module]").forEach((item) => item.classList.toggle("is-active", item === button));
    history.replaceState({}, "", `/avila/?module=${state.module}`);
    render();
  }));

  document.querySelector(`[data-module="${state.module}"]`)?.classList.add("is-active");
  render();
})();
