/**
 * Project Explorer Panel - Explorador de projeto BIM
 * Navegação hierárquica do projeto e elementos IFC
 */

import { Card } from '../design-system/components/Card';
import { Input } from '../design-system/components/Input';
import { Button } from '../design-system/components/Button';
import { Checkbox } from '../design-system/components/Checkbox';
import { eventBus, EventType } from '../../../../core';

export interface ProjectNode {
  id: string;
  name: string;
  type: 'project' | 'site' | 'building' | 'storey' | 'space' | 'element';
  icon?: string;
  children?: ProjectNode[];
  visible?: boolean;
  selected?: boolean;
  userData?: any;
}

export class ProjectExplorer {
  private container: HTMLElement;
  private rootNodes: ProjectNode[] = [];
  private expandedNodes: Set<string> = new Set();
  private searchQuery: string = '';
  private searchInput: Input | null = null;

  constructor() {
    this.container = this.createContainer();
    this.applyStyles();
    this.setupEventListeners();
    this.loadMockProject();
  }

  /**
   * Cria o container
   */
  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'project-explorer';
    
    // Header
    const header = document.createElement('div');
    header.className = 'project-explorer-header';
    
    const title = document.createElement('h3');
    title.textContent = '🏗️ Estrutura do Projeto';
    title.title = 'Hierarquia espacial BIM (ISO 19650)';
    header.appendChild(title);

    const actions = document.createElement('div');
    actions.className = 'project-explorer-actions';
    
    // Expand all
    const expandBtn = new Button({
      icon: '⤢',
      variant: 'ghost',
      size: 'sm',
      tooltip: 'Expandir tudo',
      onClick: () => this.expandAll()
    });
    actions.appendChild(expandBtn.getElement());

    // Collapse all
    const collapseBtn = new Button({
      icon: '⤡',
      variant: 'ghost',
      size: 'sm',
      tooltip: 'Colapsar tudo',
      onClick: () => this.collapseAll()
    });
    actions.appendChild(collapseBtn.getElement());

    header.appendChild(actions);
    container.appendChild(header);

    // Search
    this.searchInput = new Input({
      placeholder: 'Buscar elemento...',
      icon: '🔍',
      size: 'sm',
      fullWidth: true,
      onChange: (value) => this.search(value)
    });
    container.appendChild(this.searchInput.getElement());

    // Tree content
    const content = document.createElement('div');
    content.className = 'project-explorer-content';
    container.appendChild(content);

    return container;
  }

  /**
   * Carrega projeto mock
   */
  private loadMockProject(): void {
    this.rootNodes = [
      {
        id: 'project-1',
        name: 'Edifício Residencial',
        type: 'project',
        icon: '🏗️',
        visible: true,
        children: [
          {
            id: 'site-1',
            name: 'Site Principal',
            type: 'site',
            icon: '🗺️',
            visible: true,
            children: [
              {
                id: 'building-1',
                name: 'Torre A',
                type: 'building',
                icon: '🏢',
                visible: true,
                children: [
                  {
                    id: 'storey-1',
                    name: 'Térreo',
                    type: 'storey',
                    icon: '📐',
                    visible: true,
                    children: [
                      { id: 'element-1', name: 'Pilar P1', type: 'element', icon: '⬜', visible: true },
                      { id: 'element-2', name: 'Pilar P2', type: 'element', icon: '⬜', visible: true },
                      { id: 'element-3', name: 'Viga V1', type: 'element', icon: '▬', visible: true },
                      { id: 'element-4', name: 'Viga V2', type: 'element', icon: '▬', visible: true },
                      { id: 'element-5', name: 'Laje L1', type: 'element', icon: '⬛', visible: true },
                    ]
                  },
                  {
                    id: 'storey-2',
                    name: '1° Pavimento',
                    type: 'storey',
                    icon: '📐',
                    visible: true,
                    children: [
                      { id: 'element-6', name: 'Pilar P1', type: 'element', icon: '⬜', visible: true },
                      { id: 'element-7', name: 'Parede W1', type: 'element', icon: '🧱', visible: true },
                      { id: 'element-8', name: 'Porta D1', type: 'element', icon: '🚪', visible: true },
                      { id: 'element-9', name: 'Janela W1', type: 'element', icon: '🪟', visible: true },
                    ]
                  },
                  {
                    id: 'storey-3',
                    name: '2° Pavimento',
                    type: 'storey',
                    icon: '📐',
                    visible: true,
                  }
                ]
              }
            ]
          }
        ]
      }
    ];
    
    this.render();
  }

  /**
   * Renderiza a árvore
   */
  private render(): void {
    const content = this.container.querySelector('.project-explorer-content');
    if (!content) return;

    content.innerHTML = '';
    
    this.rootNodes.forEach(node => {
      const nodeEl = this.renderNode(node, 0);
      content.appendChild(nodeEl);
    });
  }

  /**
   * Renderiza um nó
   */
  private renderNode(node: ProjectNode, level: number): HTMLElement {
    // Verifica se passa pelo filtro de busca
    if (this.searchQuery && !this.matchesSearch(node, this.searchQuery)) {
      const container = document.createElement('div');
      container.style.display = 'none';
      return container;
    }

    const nodeEl = document.createElement('div');
    nodeEl.className = 'project-node';
    nodeEl.style.paddingLeft = `${level * 20}px`;
    
    if (node.selected) {
      nodeEl.classList.add('project-node--selected');
    }

    // Expand/collapse button (se tiver filhos)
    if (node.children && node.children.length > 0) {
      const expandBtn = document.createElement('span');
      expandBtn.className = 'project-node-expand';
      expandBtn.textContent = this.expandedNodes.has(node.id) ? '▼' : '▶';
      expandBtn.onclick = (e) => {
        e.stopPropagation();
        this.toggleNode(node.id);
      };
      nodeEl.appendChild(expandBtn);
    } else {
      const spacer = document.createElement('span');
      spacer.className = 'project-node-spacer';
      nodeEl.appendChild(spacer);
    }

    // Visibility checkbox
    const checkbox = new Checkbox({
      checked: node.visible,
      onChange: (checked) => this.toggleVisibility(node, checked)
    });
    checkbox.getElement().onclick = (e) => e.stopPropagation();
    nodeEl.appendChild(checkbox.getElement());

    // Icon
    if (node.icon) {
      const icon = document.createElement('span');
      icon.className = 'project-node-icon';
      icon.textContent = node.icon;
      nodeEl.appendChild(icon);
    }

    // Label
    const label = document.createElement('span');
    label.className = 'project-node-label';
    label.textContent = node.name;
    nodeEl.appendChild(label);

    // Type badge
    const badge = document.createElement('span');
    badge.className = 'project-node-badge';
    badge.textContent = node.type;
    nodeEl.appendChild(badge);

    // Click handler
    nodeEl.onclick = () => this.selectNode(node);

    // Wrapper para incluir filhos
    const wrapper = document.createElement('div');
    wrapper.appendChild(nodeEl);

    // Children
    if (node.children && this.expandedNodes.has(node.id)) {
      node.children.forEach(child => {
        const childEl = this.renderNode(child, level + 1);
        wrapper.appendChild(childEl);
      });
    }

    return wrapper;
  }

  /**
   * Verifica se nó corresponde à busca
   */
  private matchesSearch(node: ProjectNode, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    return node.name.toLowerCase().includes(lowerQuery) ||
           node.type.toLowerCase().includes(lowerQuery);
  }

  /**
   * Toggle expansão de nó
   */
  private toggleNode(nodeId: string): void {
    if (this.expandedNodes.has(nodeId)) {
      this.expandedNodes.delete(nodeId);
    } else {
      this.expandedNodes.add(nodeId);
    }
    this.render();
  }

  /**
   * Seleciona um nó
   */
  private selectNode(node: ProjectNode): void {
    // Desmarca todos
    this.clearSelection(this.rootNodes);
    
    // Marca selecionado
    node.selected = true;
    
    this.render();

    // Emite evento
    eventBus.emit(EventType.OBJECT_SELECTED, {
      object: node.userData,
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type
    });
  }

  /**
   * Limpa seleção
   */
  private clearSelection(nodes: ProjectNode[]): void {
    nodes.forEach(node => {
      node.selected = false;
      if (node.children) {
        this.clearSelection(node.children);
      }
    });
  }

  /**
   * Toggle visibilidade
   */
  private toggleVisibility(node: ProjectNode, visible: boolean): void {
    node.visible = visible;
    
    // Aplica recursivamente aos filhos
    if (node.children) {
      node.children.forEach(child => {
        this.toggleVisibility(child, visible);
      });
    }

    eventBus.emit(EventType.VISIBILITY_CHANGED, {
      nodeId: node.id,
      visible
    });
  }

  /**
   * Busca
   */
  private search(query: string): void {
    this.searchQuery = query;
    this.render();
  }

  /**
   * Expande todos os nós
   */
  private expandAll(): void {
    this.getAllNodeIds(this.rootNodes).forEach(id => {
      this.expandedNodes.add(id);
    });
    this.render();
  }

  /**
   * Colapsa todos os nós
   */
  private collapseAll(): void {
    this.expandedNodes.clear();
    this.render();
  }

  /**
   * Retorna todos os IDs de nós
   */
  private getAllNodeIds(nodes: ProjectNode[]): string[] {
    const ids: string[] = [];
    nodes.forEach(node => {
      ids.push(node.id);
      if (node.children) {
        ids.push(...this.getAllNodeIds(node.children));
      }
    });
    return ids;
  }

  /**
   * Configura event listeners
   */
  private setupEventListeners(): void {
    // TODO: Escutar eventos de carregamento de projeto
  }

  /**
   * Aplica estilos CSS
   */
  private applyStyles(): void {
    if (document.getElementById('project-explorer-styles')) return;

    const style = document.createElement('style');
    style.id = 'project-explorer-styles';
    style.textContent = `
      .project-explorer {
        height: 100%;
        display: flex;
        flex-direction: column;
        background: rgba(20, 20, 20, 0.95);
      }

      .project-explorer-header {
        padding: 16px;
        background: rgba(0, 0, 0, 0.3);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .project-explorer-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: var(--theme-foreground, #fff);
      }

      .project-explorer-actions {
        display: flex;
        gap: 4px;
      }

      .project-explorer-content {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
      }

      .project-node {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.15s ease;
        user-select: none;
      }

      .project-node:hover {
        background: rgba(255, 255, 255, 0.05);
      }

      .project-node--selected {
        background: rgba(102, 126, 234, 0.2);
        border-left: 3px solid var(--theme-accent, #00ff88);
      }

      .project-node-expand {
        width: 16px;
        text-align: center;
        font-size: 10px;
        cursor: pointer;
        color: rgba(255, 255, 255, 0.6);
      }

      .project-node-spacer {
        width: 16px;
      }

      .project-node .arxis-checkbox {
        margin: 0;
      }

      .project-node-icon {
        font-size: 14px;
      }

      .project-node-label {
        flex: 1;
        font-size: 13px;
        color: var(--theme-foreground, #fff);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .project-node-badge {
        font-size: 10px;
        padding: 2px 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        color: rgba(255, 255, 255, 0.6);
        text-transform: uppercase;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Retorna o elemento
   */
  public getElement(): HTMLElement {
    return this.container;
  }

  /**
   * Destrói o explorer
   */
  public destroy(): void {
    if (this.searchInput) {
      this.searchInput.destroy();
    }
    this.container.remove();
  }
}
