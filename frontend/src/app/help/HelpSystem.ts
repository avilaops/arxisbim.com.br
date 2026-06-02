/**
 * HelpSystem - Tutorial estilo F1 (Windows Help) para todos os botões da UI.
 *
 * Recursos:
 * - Tooltip rico no hover (após 600ms)
 * - Tecla F1 mostra modal de ajuda para elemento focado/hover
 * - Botão "?" no header ativa "Modo Ajuda": cursor vira interrogação,
 *   clique mostra modal explicativo em vez de executar a ação
 * - Registry central por seletor → conteúdo de ajuda
 * - Suporte a data-help-id para sobrescrever em elementos custom
 */

export interface HelpEntry {
  title: string;
  what: string;        // O que faz
  why: string;         // Para que serve
  how?: string;        // Como usar (opcional)
  shortcut?: string;   // Atalho de teclado
}

/**
 * Registry mapeia identificador (id, seletor, ou texto) para conteúdo de ajuda.
 * Resolução por prioridade: data-help-id > id > seletor > texto exato.
 */
const HELP_REGISTRY: Record<string, HelpEntry> = {
  // ===== Header / Navegação =====
  'nav:Workspace': {
    title: 'Workspace 3D',
    what: 'Visualização principal do modelo BIM em 3D.',
    why: 'É a tela onde você navega no modelo, faz medições, cortes e consultas. Modo padrão de trabalho.',
    how: 'Clique para voltar à visualização 3D após abrir outras seções.',
  },
  'nav:Modelos': {
    title: 'Gerenciar Modelos IFC',
    what: 'Lista e carrega modelos IFC do projeto a partir do backend.',
    why: 'Permite trocar entre vários modelos IFC armazenados na nuvem do tenant/projeto.',
    how: 'Faça login antes para que a lista carregue do servidor.',
  },
  'nav:Planejamento': {
    title: 'Planejamento (BIM 4D)',
    what: 'Ativa funcionalidades de cronograma 4D vinculadas ao modelo.',
    why: 'Para acompanhar sequência de obra, fases e tarefas associadas a elementos IFC.',
    how: 'Combine com "Abrir Cronograma 4D" para gerenciar cronogramas.',
  },
  'nav:XR Imersivo': {
    title: 'XR Imersivo (Avatares)',
    what: 'Carrega o sistema de avatares para sessões imersivas (VR/AR).',
    why: 'Permite visitar o modelo em primeira pessoa com avatar e suporte a multiplayer XR.',
    how: 'Use óculos VR compatível ou navegue como avatar pelo teclado.',
  },
  'nav:Abrir Cronograma 4D': {
    title: 'Cronograma 4D',
    what: 'Abre o painel de cronogramas vinculados ao modelo.',
    why: 'Gerencia tarefas, datas, dependências e visualiza progresso da obra no tempo.',
    how: 'Crie um cronograma, vincule tarefas a elementos IFC, depois reproduza a simulação 4D.',
  },
  'nav:Reuniões XR': {
    title: 'Reuniões XR (Multiplayer)',
    what: 'Abre painel de salas de reunião com avatares em tempo real.',
    why: 'Coordene reuniões com outros usuários dentro do mesmo modelo 3D.',
    how: 'Requer login. Crie uma sala e compartilhe o link com a equipe.',
  },

  // ===== Header / Ações =====
  '#auth-login': {
    title: 'Entrar / Login',
    what: 'Abre o modal de autenticação.',
    why: 'Necessário para acessar projetos, salvar cenas, exportar dados e usar recursos colaborativos.',
    how: 'Informe e-mail e senha do seu tenant. Permanece logado entre sessões.',
  },
  '#btn-environment': {
    title: 'Cenário / Ambiente (Skybox)',
    what: 'Troca o fundo do mundo 3D (skybox HDRI) e ilumina a cena.',
    why: 'Apresenta o modelo em ambientes realistas: estúdio neutro, natureza, urbano, pôr-do-sol.',
    how: 'Clique para abrir menu. Escolha um preset. A iluminação ambiente acompanha o skybox.',
    shortcut: 'Comando: env.skybox.*',
  },
  'icon:Notificações': {
    title: 'Notificações',
    what: 'Mostra alertas e mensagens do sistema.',
    why: 'Recebe avisos de novos modelos, comentários, mudanças em projetos compartilhados.',
    how: 'Clique para abrir a lista. (Funcionalidade em desenvolvimento)',
  },
  'icon:Configurações': {
    title: 'Configurações',
    what: 'Preferências do usuário, tema, idioma e parâmetros do viewer.',
    why: 'Ajustar qualidade gráfica, controles, atalhos e integrações.',
    how: 'Clique para abrir. (Funcionalidade em desenvolvimento)',
  },

  // ===== Skybox Presets =====
  '[data-cmd="env.skybox.neutral"]': {
    title: 'Skybox Estúdio Neutro',
    what: 'Iluminação branca e limpa, sem fundo de cenário.',
    why: 'Ideal para análise técnica e revisão BIM sem distração visual.',
  },
  '[data-cmd="env.skybox.nature"]': {
    title: 'Skybox Exterior Natural',
    what: 'Ambiente externo com céu, árvores e iluminação natural.',
    why: 'Mostra como o projeto fica em contexto residencial/paisagístico.',
  },
  '[data-cmd="env.skybox.urban"]': {
    title: 'Skybox Urbano',
    what: 'Ambiente de cidade corporativa com prédios ao fundo.',
    why: 'Apresentação de projetos comerciais e empreendimentos urbanos.',
  },
  '[data-cmd="env.skybox.sunset"]': {
    title: 'Skybox Pôr-do-sol',
    what: 'Iluminação dramática com cores quentes do entardecer.',
    why: 'Apresentações premium para clientes, fotos institucionais.',
  },
  '[data-cmd="env.fog.toggle"]': {
    title: 'Alternar Névoa',
    what: 'Liga/desliga névoa atmosférica na cena.',
    why: 'Dá sensação de profundidade e atmosfera. Pode ser pesado em modelos grandes.',
  },

  // ===== Painéis =====
  '#btn-close-left': {
    title: 'Ocultar Painel Esquerdo',
    what: 'Recolhe a barra lateral com projetos, modelos e ferramentas.',
    why: 'Maximiza espaço do viewer 3D quando você precisa de mais área visual.',
    how: 'Clique novamente para reabrir.',
  },
  '#btn-close-right': {
    title: 'Ocultar Painel Direito',
    what: 'Recolhe o painel de propriedades e controles de câmera.',
    why: 'Mais espaço para o viewer ou apresentações em tela cheia.',
  },

  // ===== Sidebar / Modelos =====
  'text:Modelos Federados': {
    title: 'Modelos Federados',
    what: 'Abre gerenciador para combinar vários modelos IFC em uma única cena.',
    why: 'Federação une disciplinas (estrutura, elétrica, hidráulica) num modelo coordenado.',
    how: 'Selecione os modelos, alinhe origem/escala, salve a federação.',
  },
  'text:Abrir IFC': {
    title: 'Abrir Arquivo IFC',
    what: 'Carrega um arquivo IFC local no viewer.',
    why: 'Importa modelos BIM para visualização e análise.',
    how: 'Arraste o arquivo para o viewer ou clique para escolher do disco.',
  },

  // ===== Cortes =====
  '#sections-clear': {
    title: 'Remover Cortes',
    what: 'Desativa todos os planos de corte 3D ativos.',
    why: 'Retorna o modelo à visualização completa após inspecionar seção interna.',
    how: 'Use checkboxes Eixo X/Y/Z e sliders para criar cortes; clique aqui para limpar.',
  },

  // ===== Medições =====
  '#measurements-toggle': {
    title: 'Ativar / Encerrar Medição',
    what: 'Habilita ferramenta de medição ponto-a-ponto no modelo.',
    why: 'Mede distâncias reais entre dois pontos do projeto sem sair do viewer.',
    how: 'Ative, clique em dois pontos do modelo. ESC limpa, Enter finaliza.',
  },

  // ===== Consulta BIM =====
  '#query-run': {
    title: 'Executar Consulta BIM',
    what: 'Roda uma query SQL-like sobre propriedades dos elementos IFC.',
    why: 'Filtra/destaca elementos por atributo (tipo, material, dimensão, classe IFC).',
    how: 'Exemplo: SELECT * FROM IfcWall WHERE LoadBearing = true LIMIT 50',
  },
  '#query-clear': {
    title: 'Limpar Seleção',
    what: 'Remove o realce de elementos selecionados pela consulta.',
    why: 'Volta à visualização normal após investigar resultado da query.',
  },

  // ===== 5D =====
  '#takeoff-run': {
    title: 'Gerar Quantitativos (5D)',
    what: 'Extrai quantidades (volume, área, contagem) por tipo de elemento.',
    why: 'Base para orçamento e levantamento de materiais.',
    how: 'Carregue um IFC, clique aqui. Resultados aparecem na lista abaixo.',
  },
  '#takeoff-export': {
    title: 'Exportar CSV',
    what: 'Exporta os quantitativos para arquivo CSV.',
    why: 'Para abrir em Excel, integrar com sistemas de orçamento ou compartilhar.',
    how: 'Disponível só após gerar quantitativos.',
  },
  '#budget-create': {
    title: 'Criar Orçamento',
    what: 'Cria um novo orçamento vinculado ao projeto/modelo atual.',
    why: 'Organiza custos por categoria, vincula a quantitativos.',
    how: 'Digite o nome e clique Criar. Nome é obrigatório.',
  },

  // ===== Painel Direito / Ações Rápidas =====
  'text:Exportar modelo': {
    title: 'Exportar Modelo (GLB)',
    what: 'Salva o modelo atual como arquivo GLB/GLTF.',
    why: 'Formato leve para web, AR/VR, ferramentas de visualização externa.',
    how: 'Arquivo baixado pelo navegador. Atenção: tipos de luz não-padrão podem perder dados.',
  },
  'text:Capturar imagem': {
    title: 'Capturar Imagem (Snapshot PNG)',
    what: 'Tira screenshot do viewer 3D na resolução atual.',
    why: 'Documentação, apresentações, comparações antes/depois.',
    how: 'Imagem baixada como PNG. Posicione a câmera antes.',
  },

  // ===== Câmeras =====
  'text:1 Pessoa': {
    title: 'Câmera Primeira Pessoa',
    what: 'Navega pelo modelo em escala humana (1,7m de altura).',
    why: 'Sensação real de caminhar pelo ambiente, avaliar ergonomia e proporções.',
    how: 'WASD anda, mouse olha, Space pula. Clique no canvas para travar.',
    shortcut: 'Tecla: 1',
  },
  'text:2 Avatar': {
    title: 'Câmera Terceira Pessoa (Avatar)',
    what: 'Câmera orbital em torno do avatar do usuário.',
    why: 'Vê o personagem no contexto, útil para vídeos e demonstrações.',
    shortcut: 'Tecla: 2',
  },
  'text:3 Drone': {
    title: 'Câmera Drone',
    what: 'Voo livre 6DOF (sem gravidade).',
    why: 'Posicionar ângulos cinematográficos, inspeção aérea, fly-through.',
    shortcut: 'Tecla: 3',
  },
  'text:V Órbita': {
    title: 'Câmera Órbita',
    what: 'Orbita em torno de um ponto-alvo do modelo.',
    why: 'Inspeção de detalhe, modo padrão de revisão.',
    how: 'Mouse orbita, scroll dá zoom, botão direito faz pan.',
    shortcut: 'Tecla: V',
  },

  // ===== Navegação =====
  'text:Navegação WASD': {
    title: 'Navegação WASD',
    what: 'Ativa controles tipo FPS para mover pela cena.',
    why: 'Padrão de jogos: rápido e familiar para navegar em modelos grandes.',
    how: 'W/S frente/trás, A/D laterais, Shift acelera, Ctrl reduz, Space sobe.',
  },

  // ===== Copilot =====
  '.arxis-copilot-toggle': {
    title: 'Copilot AI',
    what: 'Abre o assistente de IA para o viewer BIM.',
    why: 'Executa comandos em linguagem natural: criar cenas, mudar câmera, analisar modelo.',
    how: 'Exemplo: "criar cena de coordenação BIM" ou "vista superior".',
  },
  '.arxis-copilot__close': {
    title: 'Fechar Copilot',
    what: 'Fecha o painel do assistente.',
    why: 'Libera espaço quando não está usando IA.',
  },
};

// ============================================================================
// Implementação
// ============================================================================

let helpModeActive = false;
let tooltipEl: HTMLDivElement | null = null;
let modalEl: HTMLDivElement | null = null;
let hoverTimer: number | null = null;
let lastHovered: Element | null = null;

function getEntry(el: Element | null): HelpEntry | null {
  if (!el) return null;
  // 1. data-help-id explícito
  const explicit = el.getAttribute?.('data-help-id');
  if (explicit && HELP_REGISTRY[explicit]) return HELP_REGISTRY[explicit];

  // 2. id direto
  const id = (el as HTMLElement).id;
  if (id && HELP_REGISTRY[`#${id}`]) return HELP_REGISTRY[`#${id}`];

  // 3. data-cmd
  const dataCmd = el.getAttribute?.('data-cmd');
  if (dataCmd && HELP_REGISTRY[`[data-cmd="${dataCmd}"]`]) {
    return HELP_REGISTRY[`[data-cmd="${dataCmd}"]`];
  }

  // 4. classe arxis-copilot*
  const cls = (el as HTMLElement).className?.toString?.() || '';
  for (const sel of Object.keys(HELP_REGISTRY)) {
    if (sel.startsWith('.') && cls.split(' ').includes(sel.slice(1))) {
      return HELP_REGISTRY[sel];
    }
  }

  // 5. nav-button por texto
  if (cls.includes('nav-button')) {
    const txt = el.textContent?.trim() || '';
    if (HELP_REGISTRY[`nav:${txt}`]) return HELP_REGISTRY[`nav:${txt}`];
  }

  // 6. icon-button por title
  if (cls.includes('icon-button')) {
    const t = el.getAttribute('title');
    if (t && HELP_REGISTRY[`icon:${t}`]) return HELP_REGISTRY[`icon:${t}`];
  }

  // 7. texto exato (botões sem id)
  if (el.tagName === 'BUTTON') {
    const txt = el.textContent?.trim() || '';
    if (HELP_REGISTRY[`text:${txt}`]) return HELP_REGISTRY[`text:${txt}`];
  }

  return null;
}

function findHelpTarget(el: Element | null): Element | null {
  let cur = el;
  while (cur) {
    if (getEntry(cur)) return cur;
    cur = cur.parentElement;
  }
  return null;
}

// ============================================================================
// Tooltip (hover)
// ============================================================================

function ensureTooltip(): HTMLDivElement {
  if (tooltipEl) return tooltipEl;
  tooltipEl = document.createElement('div');
  tooltipEl.id = 'arxis-help-tooltip';
  tooltipEl.style.cssText = `
    position: fixed; z-index: 99998; max-width: 320px; pointer-events: none;
    background: #ffffff; color: #1f2937; padding: 10px 14px; border-radius: 8px;
    border: 1px solid #e5e7eb;
    box-shadow: 0 12px 32px rgba(15,23,42,0.16); font-size: 13px; line-height: 1.45;
    display: none; font-family: system-ui, sans-serif;
  `;
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

function renderTooltip(entry: HelpEntry, x: number, y: number) {
  const tip = ensureTooltip();
  tip.innerHTML = `
    <div style="font-weight:600;color:#2563eb;margin-bottom:4px;">${escapeHtml(entry.title)}</div>
    <div style="margin-bottom:4px;color:#1f2937;">${escapeHtml(entry.what)}</div>
    <div style="color:#6b7280;font-size:12px;">${escapeHtml(entry.why)}</div>
    <div style="margin-top:6px;color:#9ca3af;font-size:11px;border-top:1px solid #f3f4f6;padding-top:6px;">Pressione <b style="color:#374151;">F1</b> para ajuda completa</div>
  `;
  tip.style.display = 'block';
  // posicionar
  const rect = tip.getBoundingClientRect();
  const pad = 12;
  let left = x + pad;
  let top = y + pad;
  if (left + rect.width > window.innerWidth) left = x - rect.width - pad;
  if (top + rect.height > window.innerHeight) top = y - rect.height - pad;
  tip.style.left = `${Math.max(8, left)}px`;
  tip.style.top = `${Math.max(8, top)}px`;
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.style.display = 'none';
}

// ============================================================================
// Modal (F1 ou Modo Ajuda)
// ============================================================================

function ensureModal(): HTMLDivElement {
  if (modalEl) return modalEl;
  modalEl = document.createElement('div');
  modalEl.id = 'arxis-help-modal';
  modalEl.style.cssText = `
    position: fixed; inset: 0; z-index: 99999; display: none;
    background: rgba(0,0,0,0.5); align-items: center; justify-content: center;
    font-family: system-ui, sans-serif;
  `;
  modalEl.innerHTML = `
    <div id="arxis-help-modal__content" style="
      background:#fff; border-radius:12px; max-width:520px; width:90%;
      box-shadow:0 24px 60px rgba(0,0,0,0.4); overflow:hidden;
    "></div>
  `;
  modalEl.addEventListener('click', (e) => {
    if (e.target === modalEl) hideModal();
  });
  document.body.appendChild(modalEl);
  return modalEl;
}

function renderModal(entry: HelpEntry) {
  const m = ensureModal();
  const content = m.querySelector<HTMLDivElement>('#arxis-help-modal__content')!;
  content.innerHTML = `
    <div style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;padding:18px 22px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-size:12px;opacity:0.85;letter-spacing:0.5px;text-transform:uppercase;">Ajuda</div>
        <div style="font-size:18px;font-weight:600;margin-top:2px;">${escapeHtml(entry.title)}</div>
      </div>
      <button id="arxis-help-close" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:32px;height:32px;border-radius:6px;cursor:pointer;font-size:20px;">×</button>
    </div>
    <div style="padding:20px 22px;color:#1f2937;font-size:14px;line-height:1.55;">
      <div style="margin-bottom:14px;">
        <div style="font-weight:600;color:#374151;margin-bottom:4px;">📌 O que faz</div>
        <div>${escapeHtml(entry.what)}</div>
      </div>
      <div style="margin-bottom:14px;">
        <div style="font-weight:600;color:#374151;margin-bottom:4px;">💡 Para que serve</div>
        <div>${escapeHtml(entry.why)}</div>
      </div>
      ${entry.how ? `
      <div style="margin-bottom:14px;">
        <div style="font-weight:600;color:#374151;margin-bottom:4px;">🔧 Como usar</div>
        <div>${escapeHtml(entry.how)}</div>
      </div>` : ''}
      ${entry.shortcut ? `
      <div style="background:#f3f4f6;padding:8px 12px;border-radius:6px;font-family:monospace;font-size:13px;color:#4b5563;">
        ⌨️ ${escapeHtml(entry.shortcut)}
      </div>` : ''}
    </div>
    <div style="padding:12px 22px;background:#f9fafb;color:#6b7280;font-size:11px;border-top:1px solid #e5e7eb;">
      Esc fecha · F1 em qualquer elemento abre esta ajuda · Botão ❓ ativa modo ajuda em todos os cliques
    </div>
  `;
  m.style.display = 'flex';
  content.querySelector<HTMLButtonElement>('#arxis-help-close')!.onclick = hideModal;
}

function renderNoHelpModal(el: Element | null) {
  const m = ensureModal();
  const content = m.querySelector<HTMLDivElement>('#arxis-help-modal__content')!;
  const desc = el ? `<code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">${escapeHtml(el.tagName.toLowerCase())}${(el as HTMLElement).id ? '#' + (el as HTMLElement).id : ''}</code>` : 'este elemento';
  content.innerHTML = `
    <div style="background:#6b7280;color:#fff;padding:18px 22px;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:16px;font-weight:600;">Ajuda não disponível</div>
      <button id="arxis-help-close" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:32px;height:32px;border-radius:6px;cursor:pointer;font-size:20px;">×</button>
    </div>
    <div style="padding:20px 22px;color:#374151;font-size:14px;line-height:1.55;">
      <p>Ainda não há tutorial cadastrado para ${desc}.</p>
      <p style="color:#6b7280;font-size:12px;margin-top:10px;">Você pode adicionar conteúdo em <code>frontend/src/app/help/HelpSystem.ts</code> no <code>HELP_REGISTRY</code>.</p>
    </div>
  `;
  m.style.display = 'flex';
  content.querySelector<HTMLButtonElement>('#arxis-help-close')!.onclick = hideModal;
}

function hideModal() {
  if (modalEl) modalEl.style.display = 'none';
}

// ============================================================================
// Modo Ajuda (toggle)
// ============================================================================

function setHelpMode(active: boolean) {
  helpModeActive = active;
  document.body.style.cursor = active ? 'help' : '';
  const btn = document.getElementById('arxis-help-toggle');
  if (btn) {
    btn.setAttribute('aria-pressed', String(active));
    btn.style.background = active ? '#fbbf24' : '';
    btn.style.color = active ? '#1f2937' : '';
    btn.title = active ? 'Sair do Modo Ajuda (clique nos botões para ver explicações)' : 'Modo Ajuda (F1)';
  }
  if (active) showToast('Modo Ajuda ativo — clique em qualquer botão para ver explicação. Esc para sair.');
}

function showToast(msg: string) {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:#ffffff;color:#1f2937;padding:10px 16px;border-radius:6px;
    border:1px solid #e5e7eb;
    z-index:99997;font-size:13px;box-shadow:0 8px 24px rgba(15,23,42,0.16);
    font-family:system-ui,sans-serif;
  `;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ============================================================================
// Botão "?" no header
// ============================================================================

function injectHelpToggleButton() {
  if (document.getElementById('arxis-help-toggle')) return;
  const actions = document.querySelector('.header__actions');
  if (!actions) return;
  const btn = document.createElement('button');
  btn.id = 'arxis-help-toggle';
  btn.className = 'icon-button';
  btn.setAttribute('title', 'Modo Ajuda (F1)');
  btn.setAttribute('aria-label', 'Ativar modo ajuda');
  btn.setAttribute('aria-pressed', 'false');
  btn.innerHTML = '<i class="lucide lucide-help-circle"></i><span style="font-weight:700;">?</span>';
  btn.style.cssText = 'transition: background 0.15s, color 0.15s;';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    setHelpMode(!helpModeActive);
  });
  // inserir antes do botão Notificações (segundo icon-button) se possível
  const firstIcon = actions.querySelector('.icon-button');
  if (firstIcon && firstIcon.parentElement === actions) {
    actions.insertBefore(btn, firstIcon);
  } else {
    actions.appendChild(btn);
  }
}

// ============================================================================
// Listeners globais
// ============================================================================

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!));
}

function wireGlobalListeners() {
  // Hover → tooltip
  document.addEventListener('mouseover', (e) => {
    const target = findHelpTarget(e.target as Element);
    if (target === lastHovered) return;
    lastHovered = target;
    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
    hideTooltip();
    if (!target) return;
    const entry = getEntry(target);
    if (!entry) return;
    hoverTimer = window.setTimeout(() => {
      const me = (window as any).__lastMouseEvent || { clientX: 0, clientY: 0 };
      renderTooltip(entry, me.clientX, me.clientY);
    }, 600);
  });
  document.addEventListener('mouseout', (e) => {
    const related = (e as MouseEvent).relatedTarget as Element | null;
    if (!related || !findHelpTarget(related)) {
      hideTooltip();
      lastHovered = null;
      if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
    }
  });
  document.addEventListener('mousemove', (e) => {
    (window as any).__lastMouseEvent = { clientX: (e as MouseEvent).clientX, clientY: (e as MouseEvent).clientY };
  });

  // Click em modo ajuda → intercepta
  document.addEventListener('click', (e) => {
    if (!helpModeActive) return;
    const raw = e.target as Element;
    // não interceptar cliques no próprio botão de toggle nem no modal
    if (raw?.closest?.('#arxis-help-toggle')) return;
    if (raw?.closest?.('#arxis-help-modal')) return;
    e.preventDefault();
    e.stopPropagation();
    const target = findHelpTarget(raw);
    const entry = target ? getEntry(target) : null;
    if (entry) renderModal(entry);
    else renderNoHelpModal(raw);
  }, true); // capture phase

  // F1 → modal para elemento hover/focado
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F1') {
      e.preventDefault();
      const target = findHelpTarget(lastHovered || (document.activeElement as Element));
      const entry = target ? getEntry(target) : null;
      if (entry) renderModal(entry);
      else renderNoHelpModal(target);
    }
    if (e.key === 'Escape') {
      if (modalEl && modalEl.style.display === 'flex') hideModal();
      else if (helpModeActive) setHelpMode(false);
    }
  });
}

// ============================================================================
// API pública
// ============================================================================

export function initHelpSystem() {
  if ((window as any).__arxisHelpInit) return;
  (window as any).__arxisHelpInit = true;
  injectHelpToggleButton();
  wireGlobalListeners();
  ensureTooltip();
  ensureModal();
  console.log('[HelpSystem] inicializado. F1 mostra ajuda; ❓ no header ativa modo ajuda.');
}

export function registerHelp(key: string, entry: HelpEntry) {
  HELP_REGISTRY[key] = entry;
}
