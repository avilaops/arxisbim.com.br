import { ViewerActionRouter } from '../assistant/ViewerActionRouter';
import { ViewerStateSnapshot, type ViewerSnapshot } from '../assistant/ViewerStateSnapshot';
import { ViewerActionType, type ViewerAction } from '../assistant/ActionDSL';
import { getScenariosService, type ScenarioPresetId } from '../api/v1/services/scenarios.service';
import type { ViewerHost } from '../viewer/ViewerHost';

export type CopilotScenarioId =
  | 'guided-tour'
  | 'bim-coordination'
  | 'construction-4d'
  | 'clash-review'
  | 'cost-review';

type MessageRole = 'user' | 'assistant' | 'system';

type ScenarioAction = {
  label: string;
  prompt: string;
};

type CopilotScenario = {
  id: CopilotScenarioId;
  title: string;
  icon: string;
  description: string;
  steps: string[];
  actions: ScenarioAction[];
};

type CopilotPlan = {
  message: string;
  actions: ViewerAction[];
  suggestions: string[];
  scenarioId?: CopilotScenarioId;
};

const SCENARIOS: CopilotScenario[] = [
  {
    id: 'guided-tour',
    title: 'Visita guiada',
    icon: 'TOUR',
    description: 'Prepara uma apresentação navegável para cliente, com câmera isométrica e foco no modelo.',
    steps: [
      'Abrir uma visão geral isométrica',
      'Validar elementos visíveis',
      'Guiar o usuário pelos principais pontos do projeto',
    ],
    actions: [
      { label: 'Iniciar visita', prompt: 'iniciar visita guiada' },
      { label: 'Visão geral', prompt: 'mostrar visão isométrica' },
    ],
  },
  {
    id: 'bim-coordination',
    title: 'Coordenação BIM',
    icon: 'BIM',
    description: 'Orienta análise de disciplinas, federação, alinhamento e validação de modelo.',
    steps: [
      'Revisar modelos carregados por disciplina',
      'Checar alinhamento e cobertura de arquitetura/estrutura/MEP',
      'Sugerir validações e relatório de coordenação',
    ],
    actions: [
      { label: 'Plano de coordenação', prompt: 'criar cenário de coordenação bim' },
      { label: 'Mostrar tudo', prompt: 'mostrar todos os elementos' },
    ],
  },
  {
    id: 'construction-4d',
    title: 'Simulação 4D',
    icon: '4D',
    description: 'Estrutura roteiro para sequência de obra, fases e vínculos IFC ↔ tarefas.',
    steps: [
      'Identificar fases e marcos de construção',
      'Preparar vínculos entre elementos e tarefas',
      'Reproduzir a sequência com timeline 4D',
    ],
    actions: [
      { label: 'Planejar 4D', prompt: 'criar cenário 4d de obra' },
      { label: 'Vista superior', prompt: 'mudar para vista superior' },
    ],
  },
  {
    id: 'clash-review',
    title: 'Revisão de clashes',
    icon: 'QA',
    description: 'Fluxo para revisar interferências, priorizar conflitos e registrar decisões.',
    steps: [
      'Focar áreas críticas e conflitos por disciplina',
      'Priorizar itens críticos/major/minor',
      'Registrar recomendação e responsável',
    ],
    actions: [
      { label: 'Revisar clashes', prompt: 'analisar colisões e conflitos' },
      { label: 'Isolar seleção', prompt: 'isolar seleção atual' },
    ],
  },
  {
    id: 'cost-review',
    title: 'Revisão 5D / custos',
    icon: '5D',
    description: 'Roteiro para analisar quantitativos, custos por categoria e variações de orçamento.',
    steps: [
      'Extrair quantitativos do IFC',
      'Agrupar custos por disciplina/categoria',
      'Sinalizar maiores itens de custo e oportunidades de otimização',
    ],
    actions: [
      { label: 'Plano de custos', prompt: 'criar cenário de orçamento 5d' },
      { label: 'Screenshot', prompt: 'capturar screenshot' },
    ],
  },
];

export class ArxisCopilot {
  private readonly viewerHost: ViewerHost;
  private readonly actionRouter: ViewerActionRouter;
  private readonly container: HTMLDivElement;
  private readonly messages: HTMLDivElement;
  private readonly input: HTMLInputElement;
  private readonly toggleButton: HTMLButtonElement;
  private isOpen = false;

  constructor(viewerHost: ViewerHost) {
    this.viewerHost = viewerHost;
    this.actionRouter = new ViewerActionRouter(viewerHost.scene, viewerHost.camera, {
      renderer: viewerHost.renderer,
      canvas: viewerHost.renderer.domElement as unknown as HTMLCanvasElement,
    });

    this.injectStyles();
    this.container = this.createPanel();
    this.messages = this.container.querySelector('[data-copilot-messages]') as HTMLDivElement;
    this.input = this.container.querySelector('[data-copilot-input]') as HTMLInputElement;
    this.toggleButton = this.createToggleButton();

    document.body.appendChild(this.container);
    document.body.appendChild(this.toggleButton);
    this.bindEvents();
    this.addMessage('assistant', this.createWelcomeMessage());
    this.renderScenarioCards();
  }

  public open(): void {
    this.isOpen = true;
    this.container.classList.add('arxis-copilot--open');
    this.toggleButton.classList.add('arxis-copilot-toggle--hidden');
    this.input.focus();
  }

  public close(): void {
    this.isOpen = false;
    this.container.classList.remove('arxis-copilot--open');
    this.toggleButton.classList.remove('arxis-copilot-toggle--hidden');
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  private createWelcomeMessage(): string {
    return 'Olá! Sou o Copilot do Arxis. Posso montar cenas, mudar câmera, preparar revisão BIM, sugerir fluxo 4D/5D e executar ações seguras no viewer. Experimente: “criar cena de coordenação BIM” ou “vista superior”.';
  }

  private createPanel(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'arxis-copilot';
    panel.innerHTML = `
      <div class="arxis-copilot__header">
        <div>
          <div class="arxis-copilot__eyebrow">Arxis Copilot</div>
          <h2>Assistente BIM</h2>
        </div>
        <button class="arxis-copilot__close" type="button" aria-label="Fechar Copilot">×</button>
      </div>
      <div class="arxis-copilot__messages" data-copilot-messages></div>
      <div class="arxis-copilot__composer">
        <input data-copilot-input type="text" placeholder="Peça uma cena, análise ou ação no viewer..." />
        <button data-copilot-send type="button">Enviar</button>
      </div>
    `;
    return panel;
  }

  private createToggleButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'arxis-copilot-toggle';
    // Ícone de assistente (bot) — sinaliza o assistente pessoal único.
    button.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 8V5"/><circle cx="12" cy="4" r="1.4"/><path d="M9 13h.01M15 13h.01"/><path d="M9.5 16.5h5"/></svg>';
    button.setAttribute('aria-label', 'Assistente Arxis');
    button.title = 'Assistente Arxis (Ctrl+K)';
    return button;
  }

  private bindEvents(): void {
    this.toggleButton.addEventListener('click', () => this.toggle());
    this.container.querySelector('.arxis-copilot__close')?.addEventListener('click', () => this.close());
    this.container.querySelector('[data-copilot-send]')?.addEventListener('click', () => this.sendCurrentMessage());

    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        this.sendCurrentMessage();
      }
    });

    document.addEventListener('keydown', (event) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        this.toggle();
      } else if (event.key === 'Escape' && this.isOpen && !isTyping) {
        this.close();
      }
    });
  }

  private async sendCurrentMessage(): Promise<void> {
    const text = this.input.value.trim();
    if (!text) return;

    this.input.value = '';
    this.addMessage('user', text);
    await this.processPrompt(text);
  }

  private async processPrompt(prompt: string): Promise<void> {
    const snapshot = this.captureSnapshot();
    const plan = this.planResponse(prompt, snapshot);

    this.addMessage('assistant', plan.message);

    if (plan.actions.length > 0) {
      const results = await this.actionRouter.executeAll(plan.actions);
      const successful = results.filter((result) => result.success).length;
      this.addMessage('system', `Ações executadas: ${successful}/${results.length}.`);
    }

    await this.persistScenarioIfPossible(plan, prompt, snapshot);

    if (plan.suggestions.length > 0) {
      this.renderSuggestions(plan.suggestions);
    }
  }

  private async persistScenarioIfPossible(plan: CopilotPlan, prompt: string, snapshot: ViewerSnapshot): Promise<void> {
    if (!plan.scenarioId) return;

    const token = localStorage.getItem('arxisvr_token');
    if (!token) {
      this.addMessage('system', 'Cenário preparado localmente. Faça login para salvar no backend.');
      return;
    }

    const projectId = this.resolveCurrentProjectId();
    if (!projectId) {
      this.addMessage('system', 'Cenário preparado localmente. Selecione um projeto para salvar no backend.');
      return;
    }

    const scenario = SCENARIOS.find((item) => item.id === plan.scenarioId);
    if (!scenario) return;

    // Exemplo de valores para cameraX, pode ser ajustado conforme contexto real
    const cameraX = this.viewerHost.camera.position.x;

    const scenarioData = {
      name: scenario.title,
      description: `${scenario.description}\n\nPrompt: ${prompt}`,
      config: {
        initialPosition: {
          x: cameraX,
          roll: 0,
        },
        enableMinimap: true,
      },
    };

    // Salvamento no backend desabilitado em modo anônimo
    this.addMessage('system', 'Cenário preparado localmente. Salvamento no backend desabilitado para uso anônimo.');
    return;

    // Se for salvar no backend, utilize scenarioData conforme necessário
    // const saved = await saveScenarioToBackend(scenarioData);
    // this.addMessage('system', `Cenário salvo no backend: ${saved.name}.`);
  }

  private resolveCurrentProjectId(): string | null {
    const params = new URLSearchParams(window.location.search);
    return (
      params.get('projectId') ||
      params.get('project') ||
      localStorage.getItem('arxisvr_project_id') ||
      localStorage.getItem('arxisvr_current_project_id')
    );
  }

  private captureSnapshot(): ViewerSnapshot {
    return ViewerStateSnapshot.capture(this.viewerHost.scene, this.viewerHost.camera, 60);
  }

  private planResponse(prompt: string, snapshot: ViewerSnapshot): CopilotPlan {
    const normalized = this.normalize(prompt);
    const scenario = this.findScenario(normalized);
    const actions: ViewerAction[] = [];
    const suggestions = [
      'mostrar todos os elementos',
      'mudar para vista isométrica',
      'criar cenário de revisão de clashes',
    ];

    if (this.matches(normalized, ['vista superior', 'topo', 'planta', 'top view'])) {
      actions.push({ type: ViewerActionType.SET_CAMERA, preset: 'top', description: 'Mudar câmera para vista superior' });
    }

    if (this.matches(normalized, ['isometrica', 'isométrica', 'isometric', 'visao geral', 'visão geral'])) {
      actions.push({ type: ViewerActionType.SET_CAMERA, preset: 'isometric', description: 'Mudar câmera para vista isométrica' });
    }

    if (this.matches(normalized, ['frontal', 'front'])) {
      actions.push({ type: ViewerActionType.SET_CAMERA, preset: 'front', description: 'Mudar câmera para vista frontal' });
    }

    if (this.matches(normalized, ['lateral', 'side'])) {
      actions.push({ type: ViewerActionType.SET_CAMERA, preset: 'side', description: 'Mudar câmera para vista lateral' });
    }

    if (this.matches(normalized, ['mostrar tudo', 'mostrar todos', 'show all', 'reexibir'])) {
      actions.push({ type: ViewerActionType.SHOW_ALL, description: 'Mostrar todos os objetos do modelo' });
    }

    if (this.matches(normalized, ['screenshot', 'captura', 'print'])) {
      actions.push({ type: ViewerActionType.TAKE_SCREENSHOT, quality: 'high', description: 'Capturar screenshot do viewer' });
    }

    const ifcClass = this.extractIfcClass(normalized);
    if (ifcClass) {
      actions.push({ type: ViewerActionType.HIDE_BY_CLASS, ifcClass, description: `Ocultar classe ${ifcClass}` });
    }

    if (scenario) {
      const scenarioMessage = this.describeScenario(scenario, snapshot);
      const scenarioActions = this.getScenarioActions(scenario.id);
      return {
        message: scenarioMessage,
        actions: [...scenarioActions, ...actions],
        suggestions: scenario.actions.map((action) => action.prompt),
        scenarioId: scenario.id,
      };
    }

    if (this.matches(normalized, ['colis', 'clash', 'conflito', 'interfer'])) {
      return {
        message: this.describeScenario(SCENARIOS.find((item) => item.id === 'clash-review')!, snapshot),
        actions: [{ type: ViewerActionType.SET_CAMERA, preset: 'isometric', description: 'Preparar câmera para revisão de conflitos' }, ...actions],
        suggestions: ['criar cenário de coordenação BIM', 'mostrar todos os elementos', 'capturar screenshot'],
        scenarioId: 'clash-review',
      };
    }

    if (actions.length > 0) {
      return {
        message: 'Entendido. Vou executar as ações seguras no viewer e manter o contexto do modelo para os próximos comandos.',
        actions,
        suggestions,
      };
    }

    return {
      message: this.describeCurrentState(snapshot),
      actions: [],
      suggestions,
    };
  }

  private describeScenario(scenario: CopilotScenario, snapshot: ViewerSnapshot): string {
    const modelState = `${snapshot.scene.visibleObjects}/${snapshot.scene.totalObjects} objetos visíveis`;
    return `${scenario.icon} **${scenario.title}**\n${scenario.description}\n\nRoteiro sugerido:\n${scenario.steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}\n\nContexto atual: ${modelState}, seleção com ${snapshot.selection.count} item(ns).`;
  }

  private describeCurrentState(snapshot: ViewerSnapshot): string {
    const classes = snapshot.scene.ifcClasses.length > 0 ? snapshot.scene.ifcClasses.slice(0, 6).join(', ') : 'sem classes IFC detectadas ainda';
    return `Estou pronto para ajudar. Estado atual: ${snapshot.scene.totalObjects} objetos na cena, ${snapshot.scene.visibleObjects} visíveis, seleção com ${snapshot.selection.count} item(ns), classes: ${classes}. Posso montar cenários de coordenação, visita guiada, 4D, clashes ou custos.`;
  }

  private getScenarioActions(id: CopilotScenarioId): ViewerAction[] {
    switch (id) {
      case 'guided-tour':
      case 'bim-coordination':
        return [{ type: ViewerActionType.SET_CAMERA, preset: 'isometric', description: 'Preparar visão geral' }];
      case 'construction-4d':
        return [{ type: ViewerActionType.SET_CAMERA, preset: 'top', description: 'Preparar visão em planta para sequência 4D' }];
      case 'clash-review':
        return [
          { type: ViewerActionType.SHOW_ALL, description: 'Garantir que todos os elementos estejam visíveis' },
          { type: ViewerActionType.SET_CAMERA, preset: 'isometric', description: 'Preparar revisão de interferências' },
        ];
      case 'cost-review':
        return [{ type: ViewerActionType.SET_CAMERA, preset: 'front', description: 'Preparar revisão visual de quantitativos/custos' }];
    }
  }

  private findScenario(normalizedPrompt: string): CopilotScenario | undefined {
    if (this.matches(normalizedPrompt, ['visita', 'cliente', 'tour', 'apresentacao', 'apresentação'])) {
      return SCENARIOS.find((scenario) => scenario.id === 'guided-tour');
    }
    if (this.matches(normalizedPrompt, ['coordenacao', 'coordenação', 'bim', 'federacao', 'federação', 'disciplina'])) {
      return SCENARIOS.find((scenario) => scenario.id === 'bim-coordination');
    }
    if (this.matches(normalizedPrompt, ['4d', 'obra', 'cronograma', 'timeline', 'construcao', 'construção'])) {
      return SCENARIOS.find((scenario) => scenario.id === 'construction-4d');
    }
    if (this.matches(normalizedPrompt, ['clash', 'colis', 'conflito', 'interfer'])) {
      return SCENARIOS.find((scenario) => scenario.id === 'clash-review');
    }
    if (this.matches(normalizedPrompt, ['5d', 'orcamento', 'orçamento', 'custo', 'quantitativo'])) {
      return SCENARIOS.find((scenario) => scenario.id === 'cost-review');
    }
    return undefined;
  }

  private extractIfcClass(normalizedPrompt: string): string | null {
    const classMap: Array<[string[], string]> = [
      [['parede', 'paredes', 'wall', 'walls'], 'IfcWall'],
      [['porta', 'portas', 'door', 'doors'], 'IfcDoor'],
      [['janela', 'janelas', 'window', 'windows'], 'IfcWindow'],
      [['viga', 'vigas', 'beam', 'beams'], 'IfcBeam'],
      [['pilar', 'pilares', 'coluna', 'colunas', 'column', 'columns'], 'IfcColumn'],
      [['laje', 'lajes', 'slab', 'slabs'], 'IfcSlab'],
    ];

    if (!this.matches(normalizedPrompt, ['ocultar', 'esconder', 'hide'])) {
      return null;
    }

    for (const [keywords, ifcClass] of classMap) {
      if (this.matches(normalizedPrompt, keywords)) {
        return ifcClass;
      }
    }

    return null;
  }

  private renderScenarioCards(): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'arxis-copilot__scenarios';

    for (const scenario of SCENARIOS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'arxis-copilot__scenario';
      button.innerHTML = `<span>${scenario.icon}</span><strong>${scenario.title}</strong><small>${scenario.description}</small>`;
      button.addEventListener('click', () => this.processPrompt(scenario.actions[0].prompt));
      wrapper.appendChild(button);
    }

    this.messages.appendChild(wrapper);
  }

  private renderSuggestions(suggestions: string[]): void {
    const wrapper = document.createElement('div');
    wrapper.className = 'arxis-copilot__suggestions';

    for (const suggestion of suggestions.slice(0, 4)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = suggestion;
      button.addEventListener('click', () => this.processPrompt(suggestion));
      wrapper.appendChild(button);
    }

    this.messages.appendChild(wrapper);
    this.scrollToBottom();
  }

  private addMessage(role: MessageRole, content: string): void {
    const item = document.createElement('div');
    item.className = `arxis-copilot__message arxis-copilot__message--${role}`;
    item.textContent = content;
    this.messages.appendChild(item);
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    this.messages.scrollTop = this.messages.scrollHeight;
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private matches(value: string, keywords: string[]): boolean {
    return keywords.some((keyword) => value.includes(this.normalize(keyword)));
  }

  private injectStyles(): void {
    if (document.getElementById('arxis-copilot-styles')) return;

    const style = document.createElement('style');
    style.id = 'arxis-copilot-styles';
    style.textContent = `
      .arxis-copilot {
        position: fixed;
        right: 20px;
        bottom: 20px;
        width: min(390px, calc(100vw - 32px));
        height: min(580px, calc(100vh - 32px));
        display: flex;
        flex-direction: column;
        background: rgba(255, 255, 255, 0.85);
        color: #1a1a1a;
        border: 1px solid rgba(0, 0, 0, 0.06);
        border-radius: 24px;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.08);
        backdrop-filter: blur(20px);
        z-index: 10030;
        overflow: hidden;
        transform: translateY(18px) scale(0.98);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: 'DM Sans', -apple-system, sans-serif;
      }

      .arxis-copilot--open {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0) scale(1);
      }

      .arxis-copilot__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        background: rgba(255, 255, 255, 0.5);
      }

      .arxis-copilot__header h2 {
        margin: 2px 0 0;
        font-size: 18px;
        font-weight: 700;
        color: #1a1a1a;
        letter-spacing: -0.4px;
      }

      .arxis-copilot__eyebrow {
        color: #8e8e93;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .arxis-copilot__close {
        width: 28px;
        height: 28px;
        border: 0;
        border-radius: 50%;
        background: #ffffff;
        border: 1px solid rgba(0, 0, 0, 0.06);
        color: #8e8e93;
        cursor: pointer;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      .arxis-copilot__close:hover {
        border-color: rgba(0, 0, 0, 0.15);
        color: #000000;
        transform: scale(1.05);
      }

      .arxis-copilot__messages {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 20px;
        overflow-y: auto;
        background: rgba(255, 255, 255, 0.2);
      }

      .arxis-copilot__message {
        max-width: 82%;
        white-space: pre-wrap;
        line-height: 1.45;
        padding: 10px 14px;
        font-size: 14px;
        font-weight: 400;
        letter-spacing: -0.1px;
      }

      .arxis-copilot__message--assistant {
        align-self: flex-start;
        background: #F2F2F7;
        color: #1a1a1a;
        border-radius: 18px 18px 18px 4px; /* Lu.ma received bubble */
        border: none;
      }

      .arxis-copilot__message--user {
        align-self: flex-end;
        background: #007AFF; /* iOS/Luma blue */
        color: #ffffff;
        border-radius: 18px 18px 4px 18px; /* Lu.ma sent bubble */
      }

      .arxis-copilot__message--system {
        align-self: center;
        max-width: 100%;
        padding: 6px 12px;
        color: #8e8e93;
        background: rgba(0, 0, 0, 0.03);
        border: 1px solid rgba(0, 0, 0, 0.05);
        border-radius: 50px;
        font-size: 12px;
        font-weight: 500;
      }

      .arxis-copilot__scenarios {
        display: grid;
        grid-template-columns: 1fr;
        gap: 8px;
        margin-top: 8px;
      }

      .arxis-copilot__scenario {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 2px 12px;
        width: 100%;
        padding: 12px 16px;
        text-align: left;
        color: #1a1a1a;
        background: #ffffff;
        border: 1px solid rgba(0, 0, 0, 0.05);
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .arxis-copilot__scenario:hover {
        border-color: rgba(0, 0, 0, 0.12);
        box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        transform: translateY(-1px);
      }
      .arxis-copilot__scenario:active {
        transform: scale(0.98);
      }

      .arxis-copilot__scenario span {
        grid-row: span 2;
        font-size: 20px;
        display: flex;
        align-items: center;
      }

      .arxis-copilot__scenario strong {
        font-size: 13px;
        font-weight: 600;
      }

      .arxis-copilot__scenario small {
        color: #8e8e93;
        font-size: 11px;
        line-height: 1.4;
      }

      .arxis-copilot__suggestions {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 4px;
      }

      .arxis-copilot__suggestions button {
        padding: 6px 14px;
        border: 1px solid rgba(0, 0, 0, 0.05);
        border-radius: 50px; /* Pill shapes */
        background: rgba(255, 255, 255, 0.9);
        color: #1a1a1a;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: all 0.2s ease;
        box-shadow: 0 1px 4px rgba(0,0,0,0.02);
      }
      .arxis-copilot__suggestions button:hover {
        background: #000000;
        border-color: #000000;
        color: #ffffff;
      }
      .arxis-copilot__suggestions button:active {
        transform: scale(0.97);
      }

      .arxis-copilot__composer {
        display: flex;
        gap: 8px;
        padding: 12px 16px;
        border-top: 1px solid rgba(0, 0, 0, 0.05);
        background: rgba(255, 255, 255, 0.9);
      }

      .arxis-copilot__composer input {
        flex: 1;
        min-width: 0;
        padding: 10px 18px;
        color: #1a1a1a;
        background: #ffffff;
        border: 1.5px solid rgba(0, 0, 0, 0.05);
        border-radius: 50px; /* Luma Pill Input */
        outline: none;
        font-size: 13px;
        font-family: inherit;
        transition: all 0.2s ease;
      }
      .arxis-copilot__composer input:focus {
        border-color: rgba(0, 0, 0, 0.15);
        box-shadow: inset 0 0 0 1px rgba(0,0,0,0.02);
      }

      .arxis-copilot__composer button {
        padding: 0 18px;
        color: #fff;
        border: none;
        border-radius: 50px; /* Luma Pill Button */
        background: #000000; /* Luma Solid Black Action */
        cursor: pointer;
        font-weight: 600;
        font-size: 13px;
        font-family: inherit;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      .arxis-copilot__composer button:hover {
        background: #222222;
      }
      .arxis-copilot__composer button:active {
        transform: scale(0.97);
      }

      .arxis-copilot-toggle {
        position: fixed;
        right: 20px;
        bottom: 20px;
        width: 50px;
        height: 50px;
        border: 1px solid rgba(0, 0, 0, 0.05);
        border-radius: 50%; /* Perfect Circle float button */
        background: #000000; /* Minimalist solid black */
        color: #ffffff;
        font-size: 14px;
        font-weight: 700;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        cursor: pointer;
        z-index: 10020;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'DM Sans', sans-serif;
      }
      .arxis-copilot-toggle:hover {
        background: #222222;
        transform: scale(1.05) translateY(-1px);
        box-shadow: 0 12px 28px rgba(0,0,0,0.2);
      }
      .arxis-copilot-toggle:active {
        transform: scale(0.97);
      }

      .arxis-copilot-toggle--hidden {
        display: none;
      }
    `;
    document.head.appendChild(style);
  }
}
