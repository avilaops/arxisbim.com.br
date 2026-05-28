/**
 * AutomationEditor Component
 * Editor visual para criação e edição de automações e workflows
 * Interface drag-and-drop para construir fluxos de automação
 */

export interface AutomationNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'delay';
  name: string;
  config: Record<string, any>;
  position: { x: number; y: number };
  connections: string[]; // IDs de nós conectados
}

export interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  nodes: AutomationNode[];
  enabled: boolean;
  schedule?: string; // cron expression
  lastRun?: string;
}

export interface AutomationEditorProps {
  container?: HTMLElement;
  onSave?: (workflow: AutomationWorkflow) => void;
  onLoad?: (workflowId: string) => AutomationWorkflow | null;
}

class AutomationEditor {
  private container: HTMLElement;
  private onSaveCallback?: (workflow: AutomationWorkflow) => void;
  private onLoadCallback?: (workflowId: string) => AutomationWorkflow | null;
  private workflow: AutomationWorkflow | null = null;
  private selectedNode: AutomationNode | null = null;
  private isDragging: boolean = false;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };

  constructor(props: AutomationEditorProps = {}) {
    this.container = props.container || document.body;
    this.onSaveCallback = props.onSave;
    this.onLoadCallback = props.onLoad;
    this.init();
  }

  private init(): void {
    this.createEditorUI();
  }

  private createEditorUI(): void {
    const editor = document.createElement('div');
    editor.className = 'automation-editor';
    editor.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: #1e1e1e;
      display: flex;
      flex-direction: column;
      z-index: 2000;
    `;

    // Header
    const header = this.createHeader();
    editor.appendChild(header);

    // Main content
    const main = document.createElement('div');
    main.style.cssText = `
      flex: 1;
      display: flex;
      overflow: hidden;
    `;

    // Sidebar - Node palette
    const sidebar = this.createSidebar();
    main.appendChild(sidebar);

    // Canvas - Workflow editor
    const canvas = this.createCanvas();
    main.appendChild(canvas);

    // Properties panel
    const properties = this.createPropertiesPanel();
    main.appendChild(properties);

    editor.appendChild(main);
    this.container.appendChild(editor);
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 16px;
      background: #2d2d2d;
      border-bottom: 1px solid #404040;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const title = document.createElement('h2');
    title.textContent = 'Editor de Automações';
    title.style.cssText = `
      margin: 0;
      color: white;
      font-size: 18px;
    `;

    const actions = document.createElement('div');
    actions.style.cssText = `
      display: flex;
      gap: 8px;
    `;

    const saveButton = this.createButton('Salvar', '#4CAF50', () => this.saveWorkflow());
    const runButton = this.createButton('Executar', '#2196F3', () => this.runWorkflow());
    const closeButton = this.createButton('Fechar', '#f44336', () => this.close());

    actions.appendChild(saveButton);
    actions.appendChild(runButton);
    actions.appendChild(closeButton);

    header.appendChild(title);
    header.appendChild(actions);

    return header;
  }

  private createSidebar(): HTMLElement {
    const sidebar = document.createElement('div');
    sidebar.style.cssText = `
      width: 250px;
      background: #252525;
      border-right: 1px solid #404040;
      padding: 16px;
      overflow-y: auto;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Componentes';
    title.style.cssText = `
      margin: 0 0 16px 0;
      color: white;
      font-size: 14px;
    `;

    sidebar.appendChild(title);

    // Node types
    const nodeTypes = [
      { type: 'trigger', name: 'Gatilho', icon: '⚡' },
      { type: 'action', name: 'Ação', icon: '▶️' },
      { type: 'condition', name: 'Condição', icon: '❓' },
      { type: 'delay', name: 'Atraso', icon: '⏱️' },
    ];

    nodeTypes.forEach(nodeType => {
      const nodeButton = document.createElement('div');
      nodeButton.style.cssText = `
        padding: 12px;
        margin-bottom: 8px;
        background: #3d3d3d;
        border: 1px solid #505050;
        border-radius: 4px;
        cursor: grab;
        color: white;
        display: flex;
        align-items: center;
        gap: 8px;
      `;

      nodeButton.innerHTML = `
        <span>${nodeType.icon}</span>
        <span>${nodeType.name}</span>
      `;

      nodeButton.addEventListener('mousedown', (e) => {
        this.startDragNewNode(nodeType.type, e);
      });

      sidebar.appendChild(nodeButton);
    });

    return sidebar;
  }

  private createCanvas(): HTMLElement {
    const canvas = document.createElement('div');
    canvas.className = 'automation-canvas';
    canvas.style.cssText = `
      flex: 1;
      background: #1e1e1e;
      position: relative;
      overflow: hidden;
    `;

    // Grid background
    canvas.style.backgroundImage = `
      linear-gradient(#2d2d2d 1px, transparent 1px),
      linear-gradient(90deg, #2d2d2d 1px, transparent 1px)
    `;
    canvas.style.backgroundSize = '20px 20px';

    canvas.addEventListener('click', (e) => {
      if (e.target === canvas) {
        this.selectedNode = null;
        this.updatePropertiesPanel();
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      if (this.isDragging && this.selectedNode) {
        const rect = canvas.getBoundingClientRect();
        this.selectedNode.position = {
          x: e.clientX - rect.left - this.dragOffset.x,
          y: e.clientY - rect.top - this.dragOffset.y,
        };
        this.renderNodes();
      }
    });

    canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    return canvas;
  }

  private createPropertiesPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'properties-panel';
    panel.style.cssText = `
      width: 300px;
      background: #252525;
      border-left: 1px solid #404040;
      padding: 16px;
      overflow-y: auto;
    `;

    const title = document.createElement('h3');
    title.textContent = 'Propriedades';
    title.style.cssText = `
      margin: 0 0 16px 0;
      color: white;
      font-size: 14px;
    `;

    panel.appendChild(title);

    const content = document.createElement('div');
    content.id = 'properties-content';
    panel.appendChild(content);

    return panel;
  }

  private createButton(text: string, color: string, onClick: () => void): HTMLElement {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.cssText = `
      padding: 8px 16px;
      background: ${color};
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    `;

    button.addEventListener('click', onClick);

    return button;
  }

  private startDragNewNode(type: string, e: MouseEvent): void {
    const canvas = this.container.querySelector('.automation-canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const newNode: AutomationNode = {
      id: this.generateNodeId(),
      type: type as any,
      name: this.getDefaultName(type),
      config: {},
      position: {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      },
      connections: [],
    };

    if (!this.workflow) {
      this.workflow = {
        id: this.generateWorkflowId(),
        name: 'Nova Automação',
        description: '',
        nodes: [],
        enabled: true,
      };
    }

    this.workflow.nodes.push(newNode);
    this.selectedNode = newNode;
    this.isDragging = true;
    this.dragOffset = { x: 0, y: 0 };

    this.renderNodes();
    this.updatePropertiesPanel();
  }

  private renderNodes(): void {
    const canvas = this.container.querySelector('.automation-canvas');
    if (!canvas || !this.workflow) return;

    // Clear existing nodes
    canvas.querySelectorAll('.automation-node').forEach(el => el.remove());
    canvas.querySelectorAll('.connection-line').forEach(el => el.remove());

    // Render connections
    this.workflow.nodes.forEach(node => {
      node.connections.forEach(targetId => {
        const targetNode = this.workflow!.nodes.find(n => n.id === targetId);
        if (targetNode) {
          this.renderConnection(canvas, node, targetNode);
        }
      });
    });

    // Render nodes
    this.workflow.nodes.forEach(node => {
      const nodeElement = this.createNodeElement(node);
      canvas.appendChild(nodeElement);
    });
  }

  private createNodeElement(node: AutomationNode): HTMLElement {
    const element = document.createElement('div');
    element.className = 'automation-node';
    element.style.cssText = `
      position: absolute;
      left: ${node.position.x}px;
      top: ${node.position.y}px;
      width: 150px;
      padding: 12px;
      background: ${this.selectedNode?.id === node.id ? '#4a4a4a' : '#3d3d3d'};
      border: 2px solid ${this.selectedNode?.id === node.id ? '#2196F3' : '#505050'};
      border-radius: 8px;
      cursor: grab;
      color: white;
      user-select: none;
    `;

    element.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">${node.name}</div>
      <div style="font-size: 12px; color: #aaa;">${node.type}</div>
    `;

    element.addEventListener('mousedown', (e) => {
      this.selectedNode = node;
      this.isDragging = true;
      this.dragOffset = {
        x: e.clientX - node.position.x,
        y: e.clientY - node.position.y,
      };
      this.renderNodes();
      this.updatePropertiesPanel();
    });

    return element;
  }

  private renderConnection(canvas: HTMLElement, from: AutomationNode, to: AutomationNode): void {
    const line = document.createElement('div');
    line.className = 'connection-line';
    
    const fromX = from.position.x + 75;
    const fromY = from.position.y + 40;
    const toX = to.position.x + 75;
    const toY = to.position.y;

    const length = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
    const angle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;

    line.style.cssText = `
      position: absolute;
      left: ${fromX}px;
      top: ${fromY}px;
      width: ${length}px;
      height: 2px;
      background: #505050;
      transform-origin: 0 50%;
      transform: rotate(${angle}deg);
    `;

    canvas.appendChild(line);
  }

  private updatePropertiesPanel(): void {
    const content = this.container.querySelector('#properties-content');
    if (!content) return;

    if (!this.selectedNode) {
      content.innerHTML = '<p style="color: #aaa;">Selecione um nó para editar suas propriedades</p>';
      return;
    }

    content.innerHTML = `
      <div style="margin-bottom: 16px;">
        <label style="display: block; color: #aaa; margin-bottom: 4px;">Nome</label>
        <input type="text" value="${this.selectedNode.name}" 
          style="width: 100%; padding: 8px; background: #3d3d3d; border: 1px solid #505050; color: white; border-radius: 4px;"
          onchange="this.value" />
      </div>
      <div style="margin-bottom: 16px;">
        <label style="display: block; color: #aaa; margin-bottom: 4px;">Tipo</label>
        <div style="padding: 8px; background: #3d3d3d; border: 1px solid #505050; border-radius: 4px; color: white;">
          ${this.selectedNode.type}
        </div>
      </div>
      <div style="margin-bottom: 16px;">
        <label style="display: block; color: #aaa; margin-bottom: 4px;">Configuração (JSON)</label>
        <textarea 
          style="width: 100%; height: 150px; padding: 8px; background: #3d3d3d; border: 1px solid #505050; color: white; border-radius: 4px; font-family: monospace;"
        >${JSON.stringify(this.selectedNode.config, null, 2)}</textarea>
      </div>
      <button 
        style="width: 100%; padding: 8px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;"
        onclick="this"
      >
        Remover Nó
      </button>
    `;
  }

  private saveWorkflow(): void {
    if (!this.workflow) {
      console.warn('[AutomationEditor] No workflow to save');
      return;
    }

    if (this.onSaveCallback) {
      this.onSaveCallback(this.workflow);
    }

    console.log('[AutomationEditor] Workflow saved:', this.workflow.id);
  }

  private runWorkflow(): void {
    if (!this.workflow) {
      console.warn('[AutomationEditor] No workflow to run');
      return;
    }

    console.log('[AutomationEditor] Running workflow:', this.workflow.id);
    // Em produção, executar o workflow via AutomationService
  }

  private close(): void {
    const editor = this.container.querySelector('.automation-editor');
    if (editor) {
      editor.remove();
    }
  }

  private generateNodeId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateWorkflowId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private getDefaultName(type: string): string {
    const names: Record<string, string> = {
      trigger: 'Novo Gatilho',
      action: 'Nova Ação',
      condition: 'Nova Condição',
      delay: 'Novo Atraso',
    };
    return names[type] || 'Novo Nó';
  }

  loadWorkflow(workflow: AutomationWorkflow): void {
    this.workflow = workflow;
    this.renderNodes();
    console.log('[AutomationEditor] Workflow loaded:', workflow.id);
  }

  dispose(): void {
    this.close();
  }
}

export default AutomationEditor;
